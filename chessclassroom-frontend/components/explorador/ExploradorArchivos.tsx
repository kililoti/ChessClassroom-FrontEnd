// Explorador genérico reutilizable para estudios, ejercicios y tareas.
// La navegación de carpetas se gestiona por URL (Next.js App Router).
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Folder, Plus, Upload, ChevronRight, FileText, Database, ArrowLeft, Loader2, AlertTriangle } from 'lucide-react';
import { Carpeta, Archivo } from '@/types/explorador';
import { TarjetaCarpeta, TarjetaDatabase, FilaPartida } from './ExploradorCartas';
import ModalSubirPGN from './ModalSubirPGN';

const API = 'http://localhost:3001/api/recursos';

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';
}
function getUsuario(): any {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem('usuario') ?? '{}'); } catch { return {}; }
}

// Tipos de configuración

export interface ExploradorConfig {
  modulo: string;                    // 'estudio' | 'ejercicio' | 'tarea'
  titulo: string;                    // Título de la cabecera
  icono: React.ReactNode;            // Icono de la cabecera
  claseId: string;                   // ID de la clase (de los params de la URL)
  carpetaId?: string;                // ID de carpeta actual (undefined = raíz)
  archivoId?: string;                // ID de database actual (undefined = no estamos en una)
  // Rutas base para la navegación — el explorador añade el segmento correspondiente
  basePath: string;                  // ej: /clase/123/estudios
  onAbrirPartida: (archivo: Archivo, indexPartida?: number) => void;
}

// Modal: Crear Carpeta

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
        <input
          autoFocus
          className="w-full p-3 border border-slate-300 rounded-xl mb-4 outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm"
          value={nombre} onChange={e => setNombre(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCrear()}
          placeholder="Nombre de la carpeta"
        />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium text-sm transition-colors">Cancelar</button>
          <button onClick={handleCrear} disabled={!nombre.trim() || loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-sm transition-colors disabled:opacity-40 flex items-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />} Crear
          </button>
        </div>
      </div>
    </div>
  );
}

// Componente principal

export default function ExploradorArchivos({
  modulo, titulo, icono, claseId, carpetaId, archivoId, basePath, onAbrirPartida,
}: ExploradorConfig) {
  const router     = useRouter();
  const usuario    = getUsuario();
  const esProfesor = usuario?.rol === 'profesor';

  const [carpetas, setCarpetas]   = useState<Carpeta[]>([]);
  const [archivos, setArchivos]   = useState<Archivo[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; nombre: string }[]>([]);
  const [databaseActual, setDatabaseActual] = useState<Archivo | null>(null);
  const [cargando, setCargando]     = useState(true);
  const [cargandoPgn, setCargandoPgn] = useState(false);
  const [error, setError]         = useState('');
  const [modalCarpeta, setModalCarpeta] = useState(false);
  const [modalPgn, setModalPgn]         = useState(false);

  const estamosEnRaiz = !carpetaId;

  // Carga de breadcrumbs desde URL
  // Cuando el usuario aterriza directamente en una URL anidada, pedimos al backend
  // la cadena de ancestros para reconstruir el breadcrumb completo
  useEffect(() => {
    if (!carpetaId) { setBreadcrumbs([]); return; }
    fetch(`${API}/carpetas/ancestros/${carpetaId}`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setBreadcrumbs(d.ancestros); })
      .catch(() => {});
  }, [carpetaId]);

  // Carga del archivo (database) actual desde URL
  useEffect(() => {
    if (!archivoId) { setDatabaseActual(null); return; }
    fetch(`${API}/archivos/${archivoId}`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setDatabaseActual(d.archivo); })
      .catch(() => {});
  }, [archivoId]);

  // Carga de datos del nivel actual
  useEffect(() => {
    if (claseId) cargarDatos();
  }, [claseId, carpetaId]);

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
        const resA = await fetch(`${API}/archivos/carpeta/${carpetaId}`, { headers: h });
        const datA = await resA.json();
        if (!resA.ok) throw new Error(datA.error || 'Error al cargar archivos');
        setArchivos(datA.archivos ?? []);
      } else {
        setArchivos([]);
      }
    } catch (e: any) { setError(e.message); }
    finally { setCargando(false); }
  };

  // Navegación por URL
  const entrarCarpeta = (id: string) => router.push(`${basePath}/${id}`);
  const entrarDatabase = (id: string) => router.push(`${basePath}/${carpetaId}/db/${id}`);
  const volverAtras   = () => router.back();

  // Acciones de carpetas
  const eliminarCarpeta = async (id: string) => {
    if (!confirm('¿Eliminar esta carpeta y todo su contenido?')) return;
    try {
      const res = await fetch(`${API}/carpetas/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      cargarDatos();
    } catch (e: any) { setError(e.message); }
  };

  const toggleVisibilidadCarpeta = async (id: string, visible: boolean) => {
    try {
      const res = await fetch(`${API}/carpetas/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ visible: !visible }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setCarpetas(prev => prev.map(c => c.id === id ? { ...c, visible: !visible } : c));
    } catch (e: any) { setError(e.message); }
  };

  // Acciones de archivos
  const eliminarArchivo = async (id: string) => {
    if (!confirm('¿Eliminar este archivo de forma permanente?')) return;
    try {
      const res = await fetch(`${API}/archivos/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setArchivos(prev => prev.filter(a => a.id !== id));
    } catch (e: any) { setError(e.message); }
  };

  const toggleVisibilidadArchivo = async (id: string, visible: boolean) => {
    try {
      const res = await fetch(`${API}/archivos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ visible: !visible }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setArchivos(prev => prev.map(a => a.id === id ? { ...a, visible: !visible } : a));
    } catch (e: any) { setError(e.message); }
  };

  // Abrir partida individual
  const abrirPartidaIndividual = async (archivo: Archivo) => {
    try {
      setCargandoPgn(true);
      const res  = await fetch(`${API}/descargar/${archivo.id}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const fileRes = await fetch(data.url);
      await fileRes.text(); // descargar pero el PGN lo gestiona la página

      onAbrirPartida({ ...archivo, metadata: { ...archivo.metadata, partidas: [{ ...archivo.metadata.partidas[0] }] } });
    } catch (e: any) { setError('No se pudo cargar el archivo PGN.'); }
    finally { setCargandoPgn(false); }
  };

  // Abrir partida de una PGN Database
  const abrirPartidaDeDatabase = (database: Archivo, indexPartida: number) => {
    setCargandoPgn(true);
    // Dejar un tick para que React renderice el overlay antes de continuar
    setTimeout(() => {
      onAbrirPartida(database, indexPartida);
    }, 50);
  };

  const databases = archivos.filter(a => a.metadata?.es_base_datos);
  const partidas  = archivos.filter(a => !a.metadata?.es_base_datos);
  const tieneSeccionSuperior = carpetas.length > 0 || databases.length > 0;
  const tieneContenido       = tieneSeccionSuperior || partidas.length > 0;

  // Render
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 relative">

      {/* Overlay de carga de PGN — se superpone sin ocultar el explorador */}
      {cargandoPgn && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl px-8 py-6 shadow-xl flex items-center gap-4">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-slate-700 font-semibold">Cargando partida...</span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-8">

        {/* Cabecera */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <button onClick={volverAtras} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm text-slate-600 shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                {icono} {titulo}
              </h1>
              {/* Breadcrumbs */}
              <nav className="flex items-center gap-1 mt-1 text-sm text-slate-500 font-medium flex-wrap">
                <button onClick={() => router.push(basePath)} className="hover:text-blue-600 transition-colors">Raíz</button>
                {breadcrumbs.map((bc, i) => (
                  <React.Fragment key={bc.id}>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    <button
                      onClick={() => router.push(`${basePath}/${bc.id}`)}
                      className={`hover:text-blue-600 transition-colors ${!archivoId && i === breadcrumbs.length - 1 ? 'text-slate-800 font-semibold' : ''}`}
                    >
                      {bc.nombre}
                    </button>
                  </React.Fragment>
                ))}
                {databaseActual && (
                  <>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-800 font-semibold flex items-center gap-1">
                      📦 {databaseActual.nombre}
                    </span>
                  </>
                )}
              </nav>
            </div>
          </div>

          {esProfesor && (
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* No mostrar botón de subcarpeta cuando está dentro de una database */}
              {!archivoId && (
                <button onClick={() => setModalCarpeta(true)} className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-all font-semibold text-sm shadow-sm">
                  <Plus className="w-4 h-4" />{estamosEnRaiz ? 'Nueva carpeta' : 'Subcarpeta'}
                </button>
              )}
              {/* Solo mostrar subir PGN cuando está en una carpeta (no en raíz ni en database) */}
              {carpetaId && !archivoId && (
                <button onClick={() => setModalPgn(true)} className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-semibold text-sm shadow-sm">
                  <Upload className="w-4 h-4" /> Subir PGN
                </button>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="p-4 text-rose-700 bg-rose-50 border border-rose-200 rounded-2xl text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}

        {cargando ? (
          <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-sm font-medium">Cargando recursos...</span>
          </div>
        ) : (
          <div className="space-y-10">

            {/* Interior de PGN Database */}
            {archivoId && databaseActual ? (
              <section>
                <h2 className="text-xs font-bold text-slate-500 mb-4 flex items-center gap-2 uppercase tracking-widest">
                  <FileText className="w-4 h-4 text-violet-500" />
                  Partidas indexadas ({databaseActual.metadata?.partidas?.length ?? 0})
                </h2>
                <div className="flex flex-col gap-3">
                  {databaseActual.metadata?.partidas?.map((partida) => {
                    const fake: Archivo = {
                      ...databaseActual,
                      id: `${databaseActual.id}-p-${partida.index}`,
                      nombre: `Partida ${partida.index + 1}`,
                      metadata: { ...databaseActual.metadata, es_base_datos: false, partidas: [partida] },
                    };
                    return (
                      <FilaPartida
                        key={fake.id} archivo={fake} esProfesor={esProfesor}
                        onClick={() => abrirPartidaDeDatabase(databaseActual, partida.index)}
                        onToggleVisibilidad={() => toggleVisibilidadArchivo(databaseActual.id, databaseActual.visible)}
                        onEliminar={() => alert('Para eliminar una partida específica, borra o actualiza el archivo PGN Database completo.')}
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
                {/* SECCIÓN SUPERIOR: Carpetas + Databases */}
                {tieneSeccionSuperior && (
                  <section>
                    <h2 className="text-xs font-bold text-slate-500 mb-4 flex items-center gap-2 uppercase tracking-widest">
                      <Folder className="w-4 h-4 text-amber-500" />
                      {estamosEnRaiz ? 'Carpetas' : 'Subcarpetas y Colecciones'}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
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

                {/* SECCIÓN INFERIOR: Partidas individuales */}
                {carpetaId && (
                  <section>
                    <h2 className="text-xs font-bold text-slate-500 mb-4 flex items-center gap-2 uppercase tracking-widest">
                      <FileText className="w-4 h-4 text-blue-500" /> Partidas Individuales
                    </h2>
                    {partidas.length > 0 ? (
                      <div className="flex flex-col gap-3">
                        {partidas.map(a => (
                          <FilaPartida key={a.id} archivo={a} esProfesor={esProfesor}
                            onClick={() => abrirPartidaIndividual(a)}
                            onToggleVisibilidad={() => toggleVisibilidadArchivo(a.id, a.visible)}
                            onEliminar={() => eliminarArchivo(a.id)}
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

      {modalCarpeta && (
        <ModalCrearCarpeta
          claseId={claseId} carpetaPadreId={carpetaId ?? null} modulo={modulo}
          onClose={() => setModalCarpeta(false)} onCreada={cargarDatos}
        />
      )}
      {modalPgn && carpetaId && (
        <ModalSubirPGN carpetaId={carpetaId} onClose={() => setModalPgn(false)} onSubido={cargarDatos} />
      )}
    </div>
  );
}