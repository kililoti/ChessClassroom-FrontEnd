'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Folder, Plus, Upload, ChevronRight, FileText, Database, ArrowLeft, Loader2, AlertTriangle, Trash2, Calendar, X } from 'lucide-react';
import { Carpeta, Archivo } from '@/types/explorador';
import { TarjetaCarpeta, TarjetaDatabase, FilaPartida } from './ExploradorCartas';
import ModalSubirPGN from './ModalSubirPGN';
import ModalSubirEjercicio from '@/components/ejercicios/ModalSubirEjercicio';
import ModalFechaEntrega, { FechasGrupoPayload } from '@/components/ejercicios/ModalFechaEntrega';

const API = `${process.env.NEXT_PUBLIC_API_URL}/recursos`;
const API_EJ = `${process.env.NEXT_PUBLIC_API_URL}/ejercicios`;

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';
}
function getUsuario(): any {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem('usuario') ?? '{}'); } catch { return {}; }
}

function ModalCrearCarpeta({ claseId, carpetaPadreId, modulo, onClose, onCreada }: {
  claseId: string; carpetaPadreId: string | null; modulo: string;
  onClose: () => void; onCreada: () => void;
}) {
  const [nombre, setNombre]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleCrear = async () => {
    if (!nombre.trim()) return;
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/carpetas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ nombre: nombre.trim(), modulo, clase_id: claseId, carpeta_padre_id: carpetaPadreId ?? undefined, visible: true }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Error al crear la carpeta');
      onCreada(); onClose();
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-slate-900 mb-4">{carpetaPadreId ? 'Nueva subcarpeta' : 'Nueva carpeta'}</h3>
        {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg mb-3">{error}</p>}
        <input autoFocus
          className="w-full p-3 border border-slate-300 rounded-xl mb-4 outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm"
          value={nombre} onChange={e => setNombre(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCrear()}
          placeholder="Nombre de la carpeta"
        />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium text-sm transition-colors cursor-pointer">Cancelar</button>
          <button onClick={handleCrear} disabled={!nombre.trim() || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />} Crear
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalFechasGrupo({ ejercicioIds, onClose, onGuardado }: {
  ejercicioIds: string[];
  onClose: () => void;
  onGuardado: () => void;
}) {
  const [progreso, setProgreso]   = useState(0);
  const [guardando, setGuardando] = useState(false);

  const handleGuardar = async (payload: FechasGrupoPayload) => {
    setGuardando(true); setProgreso(0);
    try {
      for (const id of ejercicioIds) {
        await fetch(`${API_EJ}/${id}/fechas`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify(payload),
        });
        setProgreso(p => p + 1);
      }
      onGuardado(); onClose();
    } catch (e: any) { alert(e.message); }
    finally { setGuardando(false); }
  };

  return (
    <ModalFechaEntrega
      archivoId=""
      nombreEjercicio={`${ejercicioIds.length} ejercicio${ejercicioIds.length !== 1 ? 's' : ''} seleccionado${ejercicioIds.length !== 1 ? 's' : ''}`}
      onClose={onClose}
      onGuardada={onClose}
      onGuardarGrupo={handleGuardar}
      progresoGrupo={guardando ? { actual: progreso, total: ejercicioIds.length } : undefined}
    />
  );
}

export interface ExploradorConfig {
  modulo: string;
  titulo: string;
  icono: React.ReactNode;
  claseId: string;
  carpetaId?: string;
  archivoId?: string;
  basePath: string;
  onAbrirPartida: (archivo: Archivo, indexPartida?: number) => void;
  chatSlot?: React.ReactNode;
  rutaVolver?: string;
}

export default function ExploradorArchivos({
  modulo, titulo, icono, claseId, carpetaId, archivoId, basePath, onAbrirPartida, chatSlot, noPadding = false, rutaVolver,
}: ExploradorConfig & { noPadding?: boolean }) {
  const router     = useRouter();

  const [carpetas, setCarpetas] = useState<Carpeta[]>([]);
  const [archivos, setArchivos] = useState<Archivo[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; nombre: string }[]>([]);
  const [databaseActual, setDatabaseActual] = useState<Archivo | null>(null);
  const [ejerciciosDatabase, setEjerciciosDatabase] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [cargandoPgn, setCargandoPgn] = useState(false);
  const [error, setError] = useState('');
  const [modalCarpeta, setModalCarpeta] = useState(false);
  const [modalPgn, setModalPgn] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [modalFechasGrupo, setModalFechasGrupo] = useState(false);
  const [mensajeBorrando, setMensajeBorrando] = useState<string | null>(null);

  const [archivoFechaEntrega, setArchivoFechaEntrega] = useState<Archivo | null>(null);

  const [esProfesor, setEsProfesor] = useState(false);

  useEffect(() => {
    const usuario = getUsuario();
    setEsProfesor(usuario?.rol === 'profesor');
  }, []);

  const estamosEnRaiz = !carpetaId;

  useEffect(() => { setSelectedIds(new Set()); }, [carpetaId]);

  useEffect(() => {
    if (!carpetaId) { setBreadcrumbs([]); return; }
    fetch(`${API}/carpetas/ancestros/${carpetaId}`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json()).then(d => { if (d.success) setBreadcrumbs(d.ancestros); }).catch(() => {});
  }, [carpetaId]);

  const recargarEjerciciosDatabase = () => {
    if (!archivoId) return;
    if (modulo === 'ejercicio') {
      fetch(`${API_EJ}/archivo/${archivoId}`, { headers: { Authorization: `Bearer ${getToken()}` } })
        .then(r => r.json()).then(d => { if (d.success) setEjerciciosDatabase(d.ejercicios); }).catch(() => {});
    }
    fetch(`${API}/archivos/${archivoId}`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json()).then(d => { if (d.success) setDatabaseActual(d.archivo); }).catch(() => {});
  };

  useEffect(() => {
    if (!archivoId) { setDatabaseActual(null); setEjerciciosDatabase([]); return; }
    fetch(`${API}/archivos/${archivoId}`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json()).then(d => { if (d.success) setDatabaseActual(d.archivo); }).catch(() => {});
    if (modulo === 'ejercicio') {
      recargarEjerciciosDatabase();
    }
  }, [archivoId, modulo]);

  const cargarDatos = async () => {
    setCargando(true); setError('');
    try {
      const h = { Authorization: `Bearer ${getToken()}` };
      const urlC = `${API}/carpetas?clase_id=${claseId}&modulo=${modulo}${carpetaId ? `&carpeta_padre_id=${carpetaId}` : ''}`;
      const resC = await fetch(urlC, { headers: h });
      const datC = await resC.json();
      if (!resC.ok) throw new Error(datC.error || 'Error al cargar carpetas');
      setCarpetas(datC.carpetas ?? []);

      if (carpetaId) {
        const resA = await fetch(`${API}/archivos/carpeta/${carpetaId}?modulo=${modulo}`, { headers: h });
        const datA = await resA.json();
        if (!resA.ok) throw new Error(datA.error || 'Error al cargar archivos');
        setArchivos(datA.archivos ?? []);
      } else {
        setArchivos([]);
      }
    } catch (e: any) { setError(e.message); }
    finally { setCargando(false); }
  };

  useEffect(() => {
    if (claseId) cargarDatos();
  }, [claseId, carpetaId]);

  const entrarCarpeta  = (id: string) => router.push(`${basePath}/${id}`);
  const entrarDatabase = (id: string) => router.push(`${basePath}/${carpetaId}/db/${id}`);

  const volverAtras = () => {
    if (rutaVolver) { router.push(rutaVolver); return; }
    if (archivoId) { router.push(`${basePath}/${carpetaId}`); }
    else if (carpetaId) {
      if (breadcrumbs.length > 1) router.push(`${basePath}/${breadcrumbs[breadcrumbs.length - 2].id}`);
      else router.push(basePath);
    } else { router.back(); }
  };

  const eliminarCarpeta = async (id: string) => {
    if (!confirm('¿Eliminar esta carpeta y todo su contenido?')) return;
    setMensajeBorrando('la carpeta');
    try {
      const res = await fetch(`${API}/carpetas/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      cargarDatos();
    } catch (e: any) { setError(e.message); }
    finally { setMensajeBorrando(null); }
  };

  const toggleVisibilidadCarpeta = async (id: string, visible: boolean) => {
    try {
      const res = await fetch(`${API}/carpetas/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ visible: !visible }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setCarpetas(prev => prev.map(c => c.id === id ? { ...c, visible: !visible } : c));
    } catch (e: any) { setError(e.message); }
  };

  const eliminarArchivo = async (id: string) => {
    if (!confirm('¿Eliminar este archivo de forma permanente?')) return;
    setMensajeBorrando('el archivo');
    try {
      const res = await fetch(`${API}/archivos/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setArchivos(prev => prev.filter(a => a.id !== id));
      setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next; });
    } catch (e: any) { setError(e.message); }
    finally { setMensajeBorrando(null); }
  };

  const eliminarEjercicioDeDatabase = async (ejercicioId: string) => {
    if (!confirm('¿Eliminar esta partida? Se borrará del archivo PGN, se perderá el progreso de los alumnos y los índices del resto de partidas se actualizarán.')) return;
    setMensajeBorrando('la partida y reindexando el archivo PGN');
    try {
      const res = await fetch(`${API_EJ}/${ejercicioId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      recargarEjerciciosDatabase();
    } catch (e: any) { setError(e.message); }
    finally { setMensajeBorrando(null); }
  };

  // Eliminar partida de database en modo estudio
  const eliminarPartidaDeEstudio = async (partidaIndex: number) => {
    if (!databaseActual) return;
    if (!confirm('¿Eliminar esta partida del archivo PGN? Esta acción es irreversible.')) return;
    setMensajeBorrando('la partida del archivo PGN');
    try {
      const res = await fetch(`${API}/archivos/${databaseActual.id}/partida/${partidaIndex}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      recargarEjerciciosDatabase();
    } catch (e: any) { setError(e.message); }
    finally { setMensajeBorrando(null); }
  };

  // Toggle visibilidad de ejercicio individual en database de ejercicio
  const toggleVisibilidadEjercicioDeDatabase = async (ejercicioId: string) => {
    try {
      const res = await fetch(`${API_EJ}/${ejercicioId}/visibilidad`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      // Actualizar ejerciciosDatabase localmente
      setEjerciciosDatabase(prev =>
        prev.map(e => e.id === ejercicioId ? { ...e, visible: d.ejercicio.visible } : e)
      );
    } catch (e: any) { setError(e.message); }
  };

  // Toggle visibilidad de partida individual en database de estudio
  const toggleVisibilidadPartidaDeEstudio = async (partidaIndex: number) => {
    if (!databaseActual) return;
    try {
      const res = await fetch(`${API}/archivos/${databaseActual.id}/partida/${partidaIndex}/visibilidad`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      // Actualizar metadata local para reflejar el cambio sin recargar
      setDatabaseActual(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          metadata: {
            ...prev.metadata,
            partidas_ocultas: d.partidas_ocultas ?? [],
          },
        };
      });
    } catch (e: any) { setError(e.message); }
  };

  const toggleVisibilidadArchivo = async (id: string, visible: boolean) => {
    try {
      const res = await fetch(`${API}/archivos/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ visible: !visible }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setArchivos(prev => prev.map(a => a.id === id ? { ...a, visible: !visible } : a));
      // Si es la database actual (vista interior), actualizar también su estado
      if (databaseActual && databaseActual.id === id) {
        setDatabaseActual(prev => prev ? { ...prev, visible: !visible } : prev);
      }
    } catch (e: any) { setError(e.message); }
  };

  const abrirPartidaIndividual = async (archivo: Archivo) => {
    if (modulo === 'ejercicio') {
      const ejercicioId = archivo.metadata_ejercicio?.id_ejercicio;
      if (ejercicioId) {
        router.push(`${basePath}/${carpetaId}/ejercicio/${ejercicioId}`);
        return;
      }
    }
    try {
      setCargandoPgn(true);
      const res  = await fetch(`${API}/descargar/${archivo.id}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const fileRes = await fetch(data.url);
      await fileRes.text();
      onAbrirPartida({ ...archivo, metadata: { ...archivo.metadata, partidas: [{ ...archivo.metadata.partidas[0] }] } });
    } catch (e: any) { setError('No se pudo cargar el archivo PGN.'); }
    finally { setCargandoPgn(false); }
  };

  const abrirPartidaDeDatabase = (database: Archivo, indexPartida: number, ejercicioId?: string) => {
    if (modulo === 'ejercicio' && ejercicioId) {
      router.push(`${basePath}/${carpetaId}/ejercicio/${ejercicioId}`);
      return;
    }
    setCargandoPgn(true);
    setTimeout(() => { onAbrirPartida(database, indexPartida); }, 50);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const seleccionarTodos = () => {
    const idsTodos = partidas.map(a => a.id);
    const todosSeleccionados = idsTodos.every(id => selectedIds.has(id));
    if (todosSeleccionados) setSelectedIds(new Set());
    else setSelectedIds(new Set(idsTodos));
  };

  const eliminarSeleccionados = async () => {
    const n = selectedIds.size;
    if (!confirm(`¿Eliminar ${n} archivo${n !== 1 ? 's' : ''} de forma permanente?`)) return;
    setMensajeBorrando(`${n} archivo${n !== 1 ? 's' : ''}`);
    try {
      await Promise.all([...selectedIds].map(id =>
        fetch(`${API}/archivos/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } })
      ));
      setArchivos(prev => prev.filter(a => !selectedIds.has(a.id)));
      setSelectedIds(new Set());
    } catch (e: any) { setError(e.message); }
    finally { setMensajeBorrando(null); }
  };

  const databases = archivos.filter(a => a.metadata?.es_base_datos);
  const partidas  = archivos.filter(a => !a.metadata?.es_base_datos);
  const tieneSeccionSuperior = carpetas.length > 0 || databases.length > 0;
  const tieneContenido = tieneSeccionSuperior || partidas.length > 0;
  const todosSeleccionados = partidas.length > 0 && partidas.every(a => selectedIds.has(a.id));

  const ejercicioIdsSeleccionados = modulo === 'ejercicio'
    ? archivoId
      ? [...selectedIds]
      : [...selectedIds]
          .map(aid => partidas.find(a => a.id === aid)?.metadata_ejercicio?.id_ejercicio)
          .filter(Boolean) as string[]
    : [];

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 relative">

      {cargandoPgn && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl px-8 py-6 shadow-xl flex items-center gap-4">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-slate-700 font-semibold">Cargando partida...</span>
          </div>
        </div>
      )}

      <div className="max-w-screen-2xl mx-auto">

        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <button onClick={volverAtras} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm text-slate-600 shrink-0 cursor-pointer">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                {icono} {titulo}
              </h1>
              <nav className="flex items-center gap-1 mt-1 text-sm text-slate-500 font-medium flex-wrap cursor-pointer">
                <button onClick={() => router.push(basePath)} className="hover:text-blue-600 transition-colors cursor-pointer">Raíz</button>
                {breadcrumbs.map((bc, i) => (
                  <React.Fragment key={bc.id}>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    <button onClick={() => router.push(`${basePath}/${bc.id}`)}
                      className={`hover:text-blue-600 cursor-pointer transition-colors ${!archivoId && i === breadcrumbs.length - 1 ? 'text-slate-800 font-semibold' : ''}`}>
                      {bc.nombre}
                    </button>
                  </React.Fragment>
                ))}
                {databaseActual && (
                  <>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-800 font-semibold flex items-center gap-1">
                      {databaseActual.nombre}
                    </span>
                  </>
                )}
              </nav>
            </div>
          </div>

          {esProfesor && (
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {!archivoId && (
                <button onClick={() => setModalCarpeta(true)} className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-all font-semibold text-sm shadow-sm cursor-pointer">
                  <Plus className="w-4 h-4" />{estamosEnRaiz ? 'Nueva carpeta' : 'Subcarpeta'}
                </button>
              )}
              {carpetaId && !archivoId && (
                <button onClick={() => setModalPgn(true)} className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-semibold text-sm shadow-sm cursor-pointer">
                  <Upload className="w-4 h-4" /> {modulo === 'ejercicio' ? 'Subir ejercicio' : 'Subir PGN'}
                </button>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 text-rose-700 bg-rose-50 border border-rose-200 rounded-2xl text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}

        {mensajeBorrando && (
          <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-medium shadow-sm animate-pulse">
            <Loader2 className="w-5 h-5 animate-spin shrink-0" />
            <span>Eliminando {mensajeBorrando}... Por favor, espera.</span>
          </div>
        )}

        <div className={chatSlot ? 'grid grid-cols-1 lg:grid-cols-12 gap-8 items-start' : ''}>
          {chatSlot && (
            <div className="lg:col-span-4 xl:col-span-3 flex flex-col h-full">{chatSlot}</div>
          )}

          <div className={`space-y-8 ${chatSlot ? 'lg:col-span-8 xl:col-span-9' : ''}`}>
            {cargando ? (
              <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-sm font-medium">Cargando recursos...</span>
              </div>
            ) : (
              <div className="space-y-10">

                {archivoId && databaseActual ? (
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xs font-bold text-slate-500 flex items-center gap-2 uppercase tracking-widest">
                        <FileText className="w-4 h-4 text-violet-500" />
                        {modulo === 'ejercicio' ? 'Ejercicios' : 'Partidas indexadas'} ({databaseActual.metadata?.partidas?.length ?? 0})
                      </h2>
                      {esProfesor && (
                        (modulo === 'ejercicio' && ejerciciosDatabase.length > 0) ||
                        (modulo === 'estudio' && (databaseActual.metadata?.partidas?.length ?? 0) > 0)
                      ) && (
                        <button
                          onClick={() => {
                            const ids = modulo === 'ejercicio'
                              ? ejerciciosDatabase.map(e => e.id)
                              : (databaseActual.metadata?.partidas ?? []).map((p: any) => `p-${p.index}`);
                            const todos = ids.every((id: string) => selectedIds.has(id));
                            setSelectedIds(todos ? new Set() : new Set(ids));
                          }}
                          className="text-xs text-slate-400 hover:text-blue-600 font-semibold transition-colors flex items-center gap-1.5"
                        >
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                            (() => {
                              const ids = modulo === 'ejercicio'
                                ? ejerciciosDatabase.map(e => e.id)
                                : (databaseActual.metadata?.partidas ?? []).map((p: any) => `p-${p.index}`);
                              return ids.length > 0 && ids.every((id: string) => selectedIds.has(id));
                            })() ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                          }`}>
                            {(() => {
                              const ids = modulo === 'ejercicio'
                                ? ejerciciosDatabase.map(e => e.id)
                                : (databaseActual.metadata?.partidas ?? []).map((p: any) => `p-${p.index}`);
                              return ids.length > 0 && ids.every((id: string) => selectedIds.has(id));
                            })() && (
                              <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          Seleccionar todos
                        </button>
                      )}
                    </div>

                    {esProfesor && modulo === 'ejercicio' && selectedIds.size > 0 && !mensajeBorrando && (
                      <div className="mb-4 bg-blue-600 text-white rounded-2xl px-5 py-3 flex items-center justify-between gap-4 shadow-lg">
                        <span className="text-sm font-semibold">
                          {selectedIds.size} ejercicio{selectedIds.size !== 1 ? 's' : ''} seleccionado{selectedIds.size !== 1 ? 's' : ''}
                        </span>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setModalFechasGrupo(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-semibold transition-colors">
                            <Calendar className="w-4 h-4" /> Asignar fechas
                          </button>
                          <button
                            onClick={async () => {
                              const n = selectedIds.size;
                              if (!confirm(`¿Eliminar ${n} partida${n !== 1 ? 's' : ''}? Se borrarán del archivo PGN y se perderá el progreso de los alumnos.`)) return;
                              setMensajeBorrando(`${n} ejercicio${n !== 1 ? 's' : ''} y reindexando el archivo PGN`);
                              try {
                                const res = await fetch(`${API_EJ}/bloque`, {
                                  method: 'DELETE',
                                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
                                  body: JSON.stringify({ ids: [...selectedIds] }),
                                });
                                const d = await res.json();
                                if (!res.ok) throw new Error(d.error);
                                setSelectedIds(new Set());
                                recargarEjerciciosDatabase();
                              } catch (e: any) { setError(e.message); }
                              finally { setMensajeBorrando(null); }
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 rounded-lg text-sm font-semibold transition-colors">
                            <Trash2 className="w-4 h-4" /> Eliminar
                          </button>
                          <button onClick={() => setSelectedIds(new Set())}
                            className="flex items-center gap-1 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-semibold transition-colors">
                            <X className="w-4 h-4" /> Cancelar
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Barra de acciones en grupo para estudio */}
                    {esProfesor && modulo === 'estudio' && selectedIds.size > 0 && !mensajeBorrando && (
                      <div className="mb-4 bg-blue-600 text-white rounded-2xl px-5 py-3 flex items-center justify-between gap-4 shadow-lg">
                        <span className="text-sm font-semibold">
                          {selectedIds.size} partida{selectedIds.size !== 1 ? 's' : ''} seleccionada{selectedIds.size !== 1 ? 's' : ''}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={async () => {
                              const n = selectedIds.size;
                              if (!confirm(`¿Eliminar ${n} partida${n !== 1 ? 's' : ''} del archivo PGN? Esta acción es irreversible.`)) return;
                              setMensajeBorrando(`${n} partida${n !== 1 ? 's' : ''} del archivo PGN`);
                              try {
                                const indices = [...selectedIds].map(id => parseInt(id.replace('p-', ''), 10));
                                const res = await fetch(`${API}/archivos/${databaseActual!.id}/partidas`, {
                                  method: 'DELETE',
                                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
                                  body: JSON.stringify({ indices }),
                                });
                                const d = await res.json();
                                if (!res.ok) throw new Error(d.error);
                                setSelectedIds(new Set());
                                recargarEjerciciosDatabase();
                              } catch (e: any) { setError(e.message); }
                              finally { setMensajeBorrando(null); }
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 rounded-lg text-sm font-semibold transition-colors">
                            <Trash2 className="w-4 h-4" /> Eliminar
                          </button>
                          <button onClick={() => setSelectedIds(new Set())}
                            className="flex items-center gap-1 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-semibold transition-colors">
                            <X className="w-4 h-4" /> Cancelar
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-3">
                      {databaseActual.metadata?.partidas?.map((partida: any) => {
                        const ejData = modulo === 'ejercicio'
                          ? ejerciciosDatabase.find(e => e.partida_index === partida.index)
                          : null;

                        if (modulo === 'ejercicio' && !esProfesor && !ejData) return null;

                        // Para alumnos en estudio: ocultar partidas marcadas como ocultas
                        const partidasOcultas: number[] = databaseActual.metadata?.partidas_ocultas ?? [];
                        if (modulo === 'estudio' && !esProfesor && partidasOcultas.includes(partida.index)) return null;

                        const esPartidaOculta = (databaseActual.metadata?.partidas_ocultas ?? []).includes(partida.index);
                        const fake: Archivo = {
                          ...databaseActual,
                          id: ejData?.id ?? `${databaseActual.id}-p-${partida.index}`,
                          visible: modulo === 'ejercicio' && ejData
                            ? ejData.visible ?? true
                            : modulo === 'estudio'
                              ? !esPartidaOculta
                              : databaseActual.visible,
                          nombre: partida.negras && partida.negras !== '?'
                            ? `${partida.blancas} - ${partida.negras}`
                            : `Partida ${partida.index + 1}`,
                          metadata: { ...databaseActual.metadata, es_base_datos: false, partidas: [partida] },
                          metadata_ejercicio: ejData ? {
                            id_ejercicio:      ejData.id,
                            partida_index:     ejData.partida_index,
                            fecha_inicio:      ejData.fecha_inicio,
                            fecha_entrega:     ejData.fecha_entrega,
                            solucion_pgn:      ejData.solucion_pgn,
                            estado_alumno:     ejData.estado_alumno,
                            puntuacion_alumno: ejData.puntuacion_alumno,
                          } : undefined,
                        };

                        return (
                          <FilaPartida
                            key={fake.id}
                            archivo={fake}
                            esProfesor={esProfesor}
                            onClick={() => abrirPartidaDeDatabase(databaseActual, partida.index, ejData?.id)}
                            onToggleVisibilidad={
                              modulo === 'estudio'
                                ? () => toggleVisibilidadPartidaDeEstudio(partida.index)
                                : modulo === 'ejercicio' && ejData
                                  ? () => toggleVisibilidadEjercicioDeDatabase(ejData.id)
                                  : () => toggleVisibilidadArchivo(databaseActual.id, databaseActual.visible)
                            }
                            // CAMBIO: onEliminar distingue modo ejercicio y modo estudio
                            onEliminar={esProfesor
                              ? modulo === 'ejercicio' && ejData
                                ? () => eliminarEjercicioDeDatabase(ejData.id)
                                : modulo === 'estudio'
                                  ? () => eliminarPartidaDeEstudio(partida.index)
                                  : undefined
                              : undefined
                            }
                            onFechaEntrega={modulo === 'ejercicio' && ejData && esProfesor
                              ? () => setArchivoFechaEntrega(fake)
                              : undefined
                            }
                            selected={modulo === 'ejercicio'
                              ? (ejData ? selectedIds.has(ejData.id) : false)
                              : selectedIds.has(`p-${partida.index}`)
                            }
                            onToggleSelect={esProfesor && (
                              (modulo === 'ejercicio' && ejData) || modulo === 'estudio'
                            )
                              ? () => toggleSelect(modulo === 'ejercicio' ? ejData!.id : `p-${partida.index}`)
                              : undefined
                            }
                          />
                        );
                      })}
                    </div>
                  </section>

                ) : !tieneContenido ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                      <Folder className="w-8 h-8 text-slate-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700">{estamosEnRaiz ? 'No hay carpetas creadas' : 'Esta carpeta está vacía'}</p>
                      <p className="text-sm text-slate-400 mt-1">{estamosEnRaiz ? 'Crea una carpeta para organizar el material.' : 'Sube archivos PGN o crea subcarpetas.'}</p>
                    </div>
                  </div>

                ) : (
                  <>
                    {tieneSeccionSuperior && (
                      <section>
                        <h2 className="text-xs font-bold text-slate-500 mb-4 flex items-center gap-2 uppercase tracking-widest">
                          <Folder className="w-4 h-4 text-amber-500" />
                          {estamosEnRaiz ? 'Carpetas' : 'Subcarpetas y Colecciones'}
                        </h2>
                        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-5 ${chatSlot ? 'xl:grid-cols-3' : 'lg:grid-cols-3 xl:grid-cols-4'}`}>
                          {carpetas.map(c => (
                            <TarjetaCarpeta key={c.id} carpeta={c} esProfesor={esProfesor}
                              onClick={() => entrarCarpeta(c.id)}
                              onEliminar={() => eliminarCarpeta(c.id)}
                              onToggleVisibilidad={() => toggleVisibilidadCarpeta(c.id, c.visible)}
                            />
                          ))}
                          {databases.map(a => (
                            <TarjetaDatabase key={a.id} archivo={a} esProfesor={esProfesor}
                              onClick={() => entrarDatabase(a.id)}
                              onToggleVisibilidad={() => toggleVisibilidadArchivo(a.id, a.visible)}
                              onEliminar={() => eliminarArchivo(a.id)}
                            />
                          ))}
                        </div>
                      </section>
                    )}

                    {carpetaId && (
                      <section>
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="text-xs font-bold text-slate-500 flex items-center gap-2 uppercase tracking-widest">
                            <FileText className="w-4 h-4 text-blue-500" /> Partidas Individuales
                          </h2>
                          {esProfesor && partidas.length > 0 && (
                            <button onClick={seleccionarTodos}
                              className="text-xs text-slate-400 hover:text-blue-600 font-semibold transition-colors flex items-center gap-1.5 cursor-pointer">
                              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${todosSeleccionados ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                                {todosSeleccionados && (
                                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              Seleccionar todos
                            </button>
                          )}
                        </div>

                        {esProfesor && selectedIds.size > 0 && !mensajeBorrando && (
                          <div className="mb-4 bg-blue-600 text-white rounded-2xl px-5 py-3 flex items-center justify-between gap-4 shadow-lg">
                            <span className="text-sm font-semibold">
                              {selectedIds.size} archivo{selectedIds.size !== 1 ? 's' : ''} seleccionado{selectedIds.size !== 1 ? 's' : ''}
                            </span>
                            <div className="flex items-center gap-2 flex-wrap">
                              {modulo === 'ejercicio' && ejercicioIdsSeleccionados.length > 0 && (
                                <button onClick={() => setModalFechasGrupo(true)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-semibold transition-colors">
                                  <Calendar className="w-4 h-4" /> Asignar fechas
                                </button>
                              )}
                              <button onClick={eliminarSeleccionados}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 rounded-lg text-sm font-semibold transition-colors cursor-pointer">
                                <Trash2 className="w-4 h-4" /> Eliminar
                              </button>
                              <button onClick={() => setSelectedIds(new Set())}
                                className="flex items-center gap-1 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-semibold transition-colors cursor-pointer">
                                <X className="w-4 h-4" /> Cancelar
                              </button>
                            </div>
                          </div>
                        )}

                        {partidas.length > 0 ? (
                          <div className="flex flex-col gap-3">
                            {partidas.map(a => (
                              <FilaPartida key={a.id} archivo={a} esProfesor={esProfesor}
                                onClick={() => abrirPartidaIndividual(a)}
                                onToggleVisibilidad={() => toggleVisibilidadArchivo(a.id, a.visible)}
                                onEliminar={() => eliminarArchivo(a.id)}
                                onFechaEntrega={modulo === 'ejercicio'
                                  ? () => setArchivoFechaEntrega(a)
                                  : undefined
                                }
                                selected={selectedIds.has(a.id)}
                                onToggleSelect={esProfesor ? () => toggleSelect(a.id) : undefined}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="p-8 bg-white border border-dashed border-slate-300 rounded-2xl text-center">
                            <p className="text-slate-500 text-sm">No hay partidas individuales en esta carpeta.</p>
                            {esProfesor && (
                              <button onClick={() => setModalPgn(true)} className="mt-3 inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-semibold transition-colors">
                                <Upload className="w-4 h-4" /> Subir primera partida
                              </button>
                            )}
                          </div>
                        )}
                      </section>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {modalCarpeta && (
        <ModalCrearCarpeta claseId={claseId} carpetaPadreId={carpetaId ?? null} modulo={modulo}
          onClose={() => setModalCarpeta(false)} onCreada={cargarDatos} />
      )}
      {modalPgn && carpetaId && (
        modulo === 'ejercicio'
          ? <ModalSubirEjercicio carpetaId={carpetaId} onClose={() => setModalPgn(false)} onSubido={cargarDatos} />
          : <ModalSubirPGN carpetaId={carpetaId} onClose={() => setModalPgn(false)} onSubido={cargarDatos} />
      )}

      {archivoFechaEntrega && (
        <ModalFechaEntrega
          archivoId={
            modulo === 'ejercicio'
              ? archivoFechaEntrega.metadata_ejercicio?.id_ejercicio ?? archivoFechaEntrega.id
              : archivoFechaEntrega.id
          }
          nombreEjercicio={archivoFechaEntrega.nombre}
          fechaInicioActual={archivoFechaEntrega.metadata_ejercicio?.fecha_inicio}
          fechaEntregaActual={archivoFechaEntrega.metadata_ejercicio?.fecha_entrega}
          onClose={() => setArchivoFechaEntrega(null)}
          onGuardada={() => { setArchivoFechaEntrega(null); cargarDatos(); recargarEjerciciosDatabase(); }}
        />
      )}

      {modalFechasGrupo && (
        <ModalFechasGrupo
          ejercicioIds={ejercicioIdsSeleccionados}
          onClose={() => setModalFechasGrupo(false)}
          onGuardado={() => { setModalFechasGrupo(false); setSelectedIds(new Set()); cargarDatos(); recargarEjerciciosDatabase(); }}
        />
      )}
    </div>
  );
}