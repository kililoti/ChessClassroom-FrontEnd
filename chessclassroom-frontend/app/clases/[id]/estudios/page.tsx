'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Folder, Plus, Upload, ChevronRight, FileText, Tag,
  Calendar, Database, ArrowLeft, BookOpen, X, Loader2,
  Trash2, Eye, EyeOff, User, AlertTriangle, ClipboardPaste
} from 'lucide-react';
import JuegoAjedrez from '@/components/ajedrez/JuegoAjedrez'; // <-- Ajusta la ruta real

// ─── Constantes ───────────────────────────────────────────────────────────────
const API    = 'http://localhost:3001/api/recursos';
const MODULO = 'estudio';

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Categoria = 'apertura' | 'tactica' | 'estrategia' | 'final' | 'partida' | 'cálculo';

interface Carpeta {
  id: string;
  nombre: string;
  profesor_id: string;
  clase_id: string;
  carpeta_padre_id: string | null;
  visible: boolean;
  created_at: string;
  usuarios?: { nombre: string; apellidos: string };
}

interface Archivo {
  id: string;
  nombre: string;
  carpeta_id: string;
  profesor_id: string;
  categoria: Categoria;
  storage_path: string;
  visible: boolean;
  created_at: string;
  usuarios?: { nombre: string; apellidos: string };
  metadata: {
    es_base_datos: boolean;
    total_partidas: number;
    partidas: {
      index: number; blancas: string; negras: string;
      resultado: string; fecha: string; evento: string;
    }[];
  };
}

interface BreadcrumbItem { id: string; nombre: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────
const CATEGORIA_LABELS: Record<Categoria, { label: string; color: string }> = {
  apertura:        { label: 'Apertura',       color: 'bg-violet-100 text-violet-700' },
  tactica:         { label: 'Táctica',         color: 'bg-red-100 text-red-700' },
  estrategia:      { label: 'Estrategia',      color: 'bg-blue-100 text-blue-700' },
  final:           { label: 'Final',           color: 'bg-amber-100 text-amber-700' },
  partida:         { label: 'Partida',         color: 'bg-emerald-100 text-emerald-700' },
  cálculo:         { label: 'Cálculo',         color: 'bg-gray-100 text-gray-700' },
};

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';
}
function getUsuario(): any {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem('usuario') ?? '{}'); } catch { return {}; }
}
function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function nombreProfesor(u?: { nombre: string; apellidos: string }) {
  return u ? `${u.nombre} ${u.apellidos}` : 'Profesor';
}

function CategoriaTag({ categoria }: { categoria?: Categoria }) {
  if (!categoria || !CATEGORIA_LABELS[categoria]) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500">Sin categoría</span>
  );
  const { label, color } = CATEGORIA_LABELS[categoria];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${color}`}>
      <Tag className="w-2.5 h-2.5" />{label}
    </span>
  );
}

// Pill de visibilidad reutilizable
function VisibilidadPill({ visible }: { visible: boolean }) {
  return visible ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-100 text-green-700">
      <Eye className="w-2.5 h-2.5" /> Visible
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500">
      <EyeOff className="w-2.5 h-2.5" /> Oculto
    </span>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function ExploradorEstudiosPage() {
  const router   = useRouter();
  const params   = useParams();
  const clase_id = params?.id as string;

  const usuario    = getUsuario();
  const esProfesor = usuario?.rol === 'profesor';

  const [carpetas, setCarpetas] = useState<Carpeta[]>([]);
  const [archivos, setArchivos] = useState<Archivo[]>([]);
  const [cargando, setCargando] = useState(true);
// Estado que guarda el texto PGN si estamos en modo visor
  const [visorPgn, setVisorPgn] = useState<string | null>(null);
  const [error, setError]       = useState('');

  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const carpetaActualId = breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1].id : null;
  const estamosEnRaiz   = breadcrumbs.length === 0;

  const [databaseActual, setDatabaseActual] = useState<Archivo | null>(null);

  const [modalCarpeta, setModalCarpeta] = useState(false);
  const [modalPgn, setModalPgn]         = useState(false);

  // ── Carga ────────────────────────────────────────────────────────────────────
  useEffect(() => { if (clase_id) cargarDatos(); }, [clase_id, carpetaActualId]);

  const cargarDatos = async () => {
    setCargando(true); setError('');
    try {
      const h = { Authorization: `Bearer ${getToken()}` };

      const urlC = `${API}/carpetas?clase_id=${clase_id}&modulo=${MODULO}${carpetaActualId ? `&carpeta_padre_id=${carpetaActualId}` : ''}`;
      const resC = await fetch(urlC, { headers: h });
      const datC = await resC.json();
      if (!resC.ok) throw new Error(datC.error || 'Error al cargar carpetas');

      const todas: Carpeta[] = datC.carpetas ?? [];
      setCarpetas(todas.filter(c => carpetaActualId ? c.carpeta_padre_id === carpetaActualId : c.carpeta_padre_id === null));

      if (carpetaActualId) {
        const resA = await fetch(`${API}/archivos/${carpetaActualId}`, { headers: h });
        const datA = await resA.json();
        if (!resA.ok) throw new Error(datA.error || 'Error al cargar archivos');
        setArchivos(datA.archivos ?? []);
      } else {
        setArchivos([]);
      }
    } catch (e: any) { setError(e.message); }
    finally { setCargando(false); }
  };

  // ── Navegación ───────────────────────────────────────────────────────────────
  const entrarCarpeta      = (id: string, nombre: string) => setBreadcrumbs(p => [...p, { id, nombre }]);
// Actualiza tu función volverAtras
  const volverAtras = () => {
    if (databaseActual) {
      setDatabaseActual(null); // Si está en una DB, sale a la carpeta
    } else if (!estamosEnRaiz) {
      setBreadcrumbs(p => p.slice(0, -1)); // Si está en una carpeta, sube de nivel
    } else {
      router.back(); // Si está en la raíz, vuelve a la pantalla anterior
    }
  };

  // Actualiza tu función navegarBreadcrumb
  const navegarBreadcrumb = (i: number) => {
    setDatabaseActual(null); // Al moverte por el breadcrumb de carpetas, limpias la DB actual
    setBreadcrumbs(p => i < 0 ? [] : p.slice(0, i + 1));
  };

  // ── Eliminar carpeta ─────────────────────────────────────────────────────────
  const eliminarCarpeta = async (id: string) => {
    if (!confirm('¿Eliminar esta carpeta y todo su contenido?')) return;
    try {
      const res = await fetch(`${API}/carpetas/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } });
      const d   = await res.json();
      if (!res.ok) throw new Error(d.error);
      cargarDatos();
    } catch (e: any) { setError(e.message); }
  };

  // ── Eliminar archivo ─────────────────────────────────────────────────────────
  const eliminarArchivo = async (id: string) => {
    if (!confirm('¿Eliminar este archivo de forma permanente?')) return;
    try {
      const res = await fetch(`${API}/archivos/${id}`, { 
        method: 'DELETE', 
        headers: { Authorization: `Bearer ${getToken()}` } 
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      
      // Actualizamos la vista localmente para que sea instantáneo
      setArchivos(prev => prev.filter(a => a.id !== id));
    } catch (e: any) { 
      setError(e.message); 
    }
  };

  // ── Abrir Partida en el Visor ────────────────────────────────────────────────
  const abrirPartidaIndividual = async (archivo: Archivo) => {
    try {
      setCargando(true);
      setError('');

      // 1. Detectar si el ID es de una database (contiene '-p-')
      const esDatabase = archivo.id.includes('-p-');
      // Sacamos el ID real del archivo PGN padre
      const idReal = esDatabase ? archivo.id.split('-p-')[0] : archivo.id;
      const indexPartida = esDatabase ? parseInt(archivo.id.split('-p-')[1], 10) : 0;

      // 2. Descargar el archivo PGN real del backend (¡URL CORREGIDA!)
      const urlDescarga = `${API}/descargar/${idReal}`;
      console.log(`Intentando descargar desde: ${urlDescarga}`);
      
      const res = await fetch(urlDescarga, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Detalle del error del servidor:", res.status, errorText);
        throw new Error(`Error del servidor (${res.status}): No se pudo descargar.`);
      }
      
      let data = await res.text(); 
      
      // (Por si tu backend devuelve un JSON { url: "..." } en lugar del texto puro)
      try {
        const json = JSON.parse(data);
        if (json.url) {
          const fileRes = await fetch(json.url);
          data = await fileRes.text();
        }
      } catch (e) { /* Es texto puro */ }

      // 3. Si es una Database, extraer solo la partida que nos interesa
      let pgnFinal = data;
      if (esDatabase) {
         // Dividimos el PGN gigante usando el tag [Event como cuchillo
         const partidasSplit = data.split(/(?=\[Event ")/g).filter(p => p.trim().startsWith('[Event'));
         pgnFinal = partidasSplit[indexPartida] || data;
      }

      setVisorPgn(pgnFinal.trim());
      
    } catch (e: any) {
      console.error("Error abriendo partida:", e);
      setError("No se pudo cargar el archivo PGN.");
    } finally {
      setCargando(false);
    }
  };

  // ── Cambiar visibilidad carpeta ───────────────────────────────────────────────
  // Nota: necesitarás añadir este endpoint en el backend (PATCH /carpetas/:id)
  const toggleVisibilidadCarpeta = async (id: string, visible: boolean) => {
    try {
      const res = await fetch(`${API}/carpetas/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ visible: !visible }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      // Actualizar localmente para respuesta inmediata sin recargar
      setCarpetas(prev => prev.map(c => c.id === id ? { ...c, visible: !visible } : c));
    } catch (e: any) { setError(e.message); }
  };

  // ── Cambiar visibilidad archivo ───────────────────────────────────────────────
  // Nota: necesitarás añadir este endpoint en el backend (PATCH /archivos/:id)
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

  // ── Separar archivos ─────────────────────────────────────────────────────────
  const databases = archivos.filter(a => a.metadata?.es_base_datos);
  const partidas  = archivos.filter(a => !a.metadata?.es_base_datos);
  const tieneSeccionSuperior = carpetas.length > 0 || databases.length > 0;
  const tieneContenido       = tieneSeccionSuperior || partidas.length > 0;

  // ─── Render ───────────────────────────────────────────────────────────────────

  // ─── Render del Visor de Ajedrez (Interrumpe el explorador) ─────────────────
  if (visorPgn !== null) {
    return (
      <div className="min-h-screen bg-slate-50 py-8">
         <JuegoAjedrez pgnInicial={visorPgn} onClose={() => setVisorPgn(null)} />
      </div>
    );
  }

  // ─── Render del Explorador normal ───────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Cabecera */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <button onClick={volverAtras} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm text-slate-600 shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-blue-600" /> Material de Estudio
              </h1>
              <nav className="flex items-center gap-1 mt-1 text-sm text-slate-500 font-medium flex-wrap">
                <button onClick={() => navegarBreadcrumb(-1)} className="hover:text-blue-600 transition-colors">Raíz</button>
                {breadcrumbs.map((bc, i) => (
                  <React.Fragment key={bc.id}>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    <button onClick={() => navegarBreadcrumb(i)} className={`hover:text-blue-600 transition-colors ${i === breadcrumbs.length - 1 ? 'text-slate-800 font-semibold' : ''}`}>
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
              <button onClick={() => setModalCarpeta(true)} className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-all font-semibold text-sm shadow-sm">
                <Plus className="w-4 h-4" />{estamosEnRaiz ? 'Nueva carpeta' : 'Subcarpeta'}
              </button>
              {!estamosEnRaiz && (
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
          <div className="space-y-10">

            {/* VISTA A: Interior de un PGN Database (Se activa si el usuario ha hecho clic en una colección) */}
            {databaseActual ? (
              <section>
                <SectionTitle icon={<FileText className="w-4 h-4 text-violet-500" />}>
                  Partidas indexadas en la Base de Datos ({databaseActual.metadata?.partidas?.length ?? 0})
                </SectionTitle>
                
                <div className="flex flex-col gap-3">
                  {databaseActual.metadata?.partidas && databaseActual.metadata.partidas.length > 0 ? (
                    databaseActual.metadata.partidas.map((partida) => {
                      
                      // Construimos el objeto simulado forzando el nombre uniforme
                      const archivoPartidaFake: any = {
                        id: `${databaseActual.id}-p-${partida.index}`,
                        nombre: `Partida ${partida.index + 1}`,
                        categoria: databaseActual.categoria,
                        created_at: databaseActual.created_at,
                        usuarios: databaseActual.usuarios,
                        visible: databaseActual.visible,
                        metadata: {
                          es_base_datos: false,
                          partidas: [partida]
                        }
                      };

                      return (
                        <FilaPartida
                          key={archivoPartidaFake.id}
                          archivo={archivoPartidaFake}
                          esProfesor={esProfesor}
                          onClick={() => abrirPartidaIndividual(archivoPartidaFake)} // 🌟 ¡ESTA LÍNEA ES LA QUE FALTA CONECTAR!
                          onToggleVisibilidad={() => toggleVisibilidadArchivo(databaseActual.id, databaseActual.visible)}
                          onEliminar={() => alert("Para eliminar una partida específica, debes borrar o actualizar el archivo PGN Database completo.")}
                        />
                      );
                    })
                  ) : (
                    <div className="p-8 bg-white border border-dashed border-slate-300 rounded-2xl text-center">
                      <p className="text-slate-500 text-sm">Esta base de datos no contiene partidas individuales válidas.</p>
                    </div>
                  )}
                </div>
              </section>
            ) : (
                <>
              {/* VISTA B: Vista estándar de explorador (Carpetas, Bases de datos y Partidas sueltas) */}
              
                {/* SECCIÓN SUPERIOR: Carpetas + Databases */}
                {tieneSeccionSuperior && (
                  <section>
                    <SectionTitle icon={<Folder className="w-4 h-4 text-amber-500" />}>
                      {estamosEnRaiz ? 'Carpetas' : 'Subcarpetas y Colecciones'}
                    </SectionTitle>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                      {carpetas.map(c => (
                        <TarjetaCarpeta
                          key={c.id} carpeta={c} esProfesor={esProfesor}
                          onClick={() => entrarCarpeta(c.id, c.nombre)}
                          onEliminar={() => eliminarCarpeta(c.id)}
                          onToggleVisibilidad={() => toggleVisibilidadCarpeta(c.id, c.visible)}
                        />
                      ))}
                      {databases.map(a => (
                        <TarjetaDatabase
                          key={a.id} archivo={a} esProfesor={esProfesor}
                          onClick={() => setDatabaseActual(a)}
                          onToggleVisibilidad={() => toggleVisibilidadArchivo(a.id, a.visible)}
                          onEliminar={() => eliminarArchivo(a.id)}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* SECCIÓN INFERIOR: Partidas individuales */}
                {!estamosEnRaiz && (
                  <section>
                    <SectionTitle icon={<FileText className="w-4 h-4 text-blue-500" />}>
                      Partidas Individuales
                    </SectionTitle>
                    {partidas.length > 0 ? (
                      <div className="flex flex-col gap-3">
                        {partidas.map(a => (
                            <FilaPartida
                            key={a.id} 
                            archivo={a} 
                            esProfesor={esProfesor}
                            onClick={() => abrirPartidaIndividual(a)} // <--- AÑADE ESTO
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
          claseId={clase_id} carpetaPadreId={carpetaActualId} modulo={MODULO}
          onClose={() => setModalCarpeta(false)} onCreada={cargarDatos}
        />
      )}
      {modalPgn && carpetaActualId && (
        <ModalSubirPgn
          carpetaId={carpetaActualId}
          onClose={() => setModalPgn(false)} onSubido={cargarDatos}
        />
      )}
    </div>
  );
}

// ─── Subcomponentes ───────────────────────────────────────────────────────────

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-bold text-slate-500 mb-4 flex items-center gap-2 uppercase tracking-widest">
      {icon}{children}
    </h2>
  );
}

function Modal({ children, onClose, wide }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={onClose}>
      <div className={`bg-white rounded-2xl p-6 w-full shadow-xl my-4 ${wide ? 'max-w-lg' : 'max-w-sm'}`} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

// Botón de visibilidad reutilizable
function BtnVisibilidad({ visible, onClick }: { visible: boolean; onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      onClick={onClick}
      title={visible ? 'Ocultar para alumnos' : 'Hacer visible para alumnos'}
      className={`p-1.5 rounded-lg transition-all cursor-pointer ${visible ? 'text-green-600 hover:bg-green-50' : 'text-slate-400 hover:bg-slate-100'}`}
    >
      {visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
    </button>
  );
}

// ── Tarjeta Carpeta ───────────────────────────────────────────────────────────
function TarjetaCarpeta({ carpeta, esProfesor, onClick, onEliminar, onToggleVisibilidad }: {
  carpeta: Carpeta; esProfesor: boolean;
  onClick: () => void; onEliminar: () => void; onToggleVisibilidad: () => void;
}) {
  return (
    <div className={`group relative bg-white border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all ${!carpeta.visible ? 'border-slate-200 opacity-70' : 'border-slate-200 hover:border-amber-300'}`}>
      <button onClick={onClick} className="flex items-center gap-4 w-full text-left cursor-pointer">
        <div className="w-12 h-12 shrink-0 rounded-xl flex items-center justify-center bg-amber-50 text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-all shadow-sm">
          <Folder className="w-6 h-6" />
        </div>
        <div className="overflow-hidden min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-800 truncate group-hover:text-amber-700 transition-colors">{carpeta.nombre}</p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <User className="w-3 h-3" />{nombreProfesor(carpeta.usuarios)}
            </span>
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Calendar className="w-3 h-3" />{formatFecha(carpeta.created_at)}
            </span>
          </div>
          {esProfesor && <div className="mt-1.5"><VisibilidadPill visible={carpeta.visible} /></div>}
        </div>
      </button>

      {/* Acciones del profesor (aparecen al hover) */}
      {esProfesor && (
        <div className="absolute bottom-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <BtnVisibilidad visible={carpeta.visible} onClick={e => { e.stopPropagation(); onToggleVisibilidad(); }} />
          <button onClick={e => { e.stopPropagation(); onEliminar(); }} title="Eliminar carpeta" className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Tarjeta Database ──────────────────────────────────────────────────────────
function TarjetaDatabase({ archivo, esProfesor, onClick, onToggleVisibilidad, onEliminar }: {
  archivo: Archivo; 
  esProfesor: boolean; 
  onClick: () => void; // <--- Añadido a los tipos de TypeScript
  onToggleVisibilidad: () => void; 
  onEliminar: () => void;
}) {
  return (
    <div className={`group relative bg-white border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer ${!archivo.visible ? 'border-slate-200 opacity-70' : 'border-slate-200 hover:border-violet-300'}`}>
      
      {/* Envolvemos el contenido interactivo en un botón que dispara el acceso a la DB */}
      <button onClick={onClick} className="w-full text-left flex items-center gap-4 cursor-pointer">
        <div className="w-12 h-12 shrink-0 rounded-xl flex items-center justify-center bg-violet-50 text-violet-500 group-hover:bg-violet-500 group-hover:text-white transition-all shadow-sm">
          <Database className="w-6 h-6" />
        </div>
        <div className="overflow-hidden min-w-0 flex-1 pr-12">
          <p className="text-sm font-bold text-slate-800 truncate group-hover:text-violet-700 transition-colors">{archivo.nombre}</p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <User className="w-3 h-3" />{nombreProfesor(archivo.usuarios)}
            </span>
            <span className="text-[11px] text-violet-600 font-semibold">{archivo.metadata.total_partidas} partidas</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Calendar className="w-3 h-3" />{formatFecha(archivo.created_at)}
            </span>
            {esProfesor && <VisibilidadPill visible={archivo.visible} />}
          </div>
        </div>
      </button>

      {/* Acciones del profesor (se mantienen flotantes de forma absoluta en la esquina inferior derecha) */}
      {esProfesor && (
        <div className="absolute bottom-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <BtnVisibilidad visible={archivo.visible} onClick={e => { e.stopPropagation(); onToggleVisibilidad(); }} />
          <button onClick={e => { e.stopPropagation(); onEliminar(); }} title="Eliminar archivo" className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Fila Partida ──────────────────────────────────────────────────────────────
function FilaPartida({ archivo, esProfesor, onToggleVisibilidad, onEliminar, onClick }: {
  archivo: Archivo; esProfesor: boolean; onToggleVisibilidad: () => void; onEliminar: () => void; onClick?: () => void;
}) {
  const partida = archivo.metadata?.partidas?.[0];
  
  return (
    <div onClick={onClick} className={`group relative bg-white border rounded-xl px-5 py-4 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer ${!archivo.visible ? 'border-slate-200 opacity-70' : 'border-slate-200 hover:border-blue-200'}`}>
      
      {/* 1. Lado Izquierdo: Icono y Textos */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="w-10 h-10 shrink-0 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
          <FileText className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors text-sm">{archivo.nombre}</p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <CategoriaTag categoria={archivo.categoria} />
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <User className="w-3 h-3" />{nombreProfesor(archivo.usuarios)}
            </span>
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Calendar className="w-3 h-3" />{formatFecha(archivo.created_at)}
            </span>
            {esProfesor && <VisibilidadPill visible={archivo.visible} />}
          </div>
        </div>
      </div>

      {/* 2. Lado Derecho: Metadatos + Botones de Acción agrupadados en un Flex */}
      <div className="flex items-center gap-3 shrink-0">
        
        {/* Blancas vs Negras */}
        {partida && (
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-lg px-4 py-2.5">
            <div className="flex flex-col gap-0.5 text-right">
              <span className="text-xs font-semibold text-slate-800 flex items-center justify-end gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-white border border-slate-300 inline-block" />{partida.blancas}
              </span>
              <span className="text-xs font-semibold text-slate-800 flex items-center justify-end gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-800 inline-block" />{partida.negras}
              </span>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <span className="text-sm font-black text-slate-700 bg-white border border-slate-200 rounded-md px-2 py-1 shadow-sm min-w-[40px] text-center">
              {partida.resultado}
            </span>
          </div>
        )}

        {/* Botones (Integrados en el flujo flex, sin 'absolute') */}
        {esProfesor && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <BtnVisibilidad visible={archivo.visible} onClick={e => { e.stopPropagation(); onToggleVisibilidad(); }} />
            <button onClick={e => { e.stopPropagation(); onEliminar(); }} title="Eliminar archivo" className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        
      </div>
    </div>
  );
}

// ── Modal: Crear Carpeta ──────────────────────────────────────────────────────
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
    <Modal onClose={onClose}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-900">{carpetaPadreId ? 'Nueva subcarpeta' : 'Nueva carpeta'}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
      </div>
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
    </Modal>
  );
}

// ── Modal: Subir PGN ──────────────────────────────────────────────────────────
function ModalSubirPgn({ carpetaId, onClose, onSubido }: {
  carpetaId: string; onClose: () => void; onSubido: () => void;
}) {
  const [nombre, setNombre]       = useState('');
  const [categoria, setCategoria] = useState<Categoria | ''>('');
  const [archivo, setArchivo]     = useState<File | null>(null);
  const [pgnTexto, setPgnTexto]   = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Validación de conflicto ──────────────────────────────────────────────────
  const tieneArchivo = !!archivo;
  const tieneTexto   = pgnTexto.trim().length > 0;
  const hayConflicto = tieneArchivo && tieneTexto;

  // El formulario está listo para enviar si hay exactamente una fuente y categoría seleccionada
  const puedeSubir = !hayConflicto && (tieneArchivo || tieneTexto) && !!categoria && !loading;

  // ── Convertir texto PGN a File para enviar con el mismo endpoint ─────────────
  const buildFormData = (): FormData => {
    const form = new FormData();
    form.append('carpeta_id', carpetaId);
    form.append('categoria', categoria as string);
    if (nombre.trim()) form.append('nombre', nombre.trim());
    form.append('visible', 'true');

    if (tieneArchivo && archivo) {
      form.append('file', archivo);
    } else {
      // Convertir el texto PGN a un Blob con tipo .pgn
      const blob = new Blob([pgnTexto.trim()], { type: 'application/x-chess-pgn' });
      const nombreArchivo = (nombre.trim() || 'partida') + '.pgn';
      form.append('file', blob, nombreArchivo);
    }
    return form;
  };

  const handleSubir = async () => {
    if (!puedeSubir) return;
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/upload-pgn`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: buildFormData(),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Error al subir el archivo');
      onSubido(); onClose();
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const categorias = Object.entries(CATEGORIA_LABELS) as [Categoria, { label: string; color: string }][];

  return (
    <Modal onClose={onClose} wide>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-900">Subir archivo PGN</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg mb-4">
          <AlertTriangle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {/* Alerta de conflicto archivo + texto */}
      {hayConflicto && (
        <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 p-3 rounded-lg mb-4">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Tienes un archivo seleccionado <strong>y</strong> texto PGN pegado. Usa solo uno de los dos métodos para poder subir.</span>
        </div>
      )}

      <div className="space-y-5">

        {/* Fuente 1: Archivo */}
        <div>
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5 block">
            Opción A — Archivo .pgn
          </label>
          <div
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
              tieneArchivo
                ? hayConflicto ? 'border-amber-400 bg-amber-50' : 'border-blue-400 bg-blue-50'
                : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50'
            }`}
          >
            {archivo ? (
              <div className="flex items-center justify-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <p className="text-sm font-semibold text-blue-600">{archivo.name}</p>
                <button
                  onClick={e => { e.stopPropagation(); setArchivo(null); if (inputRef.current) inputRef.current.value = ''; }}
                  className="ml-1 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <Upload className="w-6 h-6 text-slate-400" />
                <p className="text-sm text-slate-500">Haz clic para seleccionar un archivo <span className="font-semibold">.pgn</span></p>
                <p className="text-[11px] text-slate-400">Un PGN con múltiples partidas se registrará como Database automáticamente</p>
              </div>
            )}
          </div>
          <input ref={inputRef} type="file" accept=".pgn" className="hidden" onChange={e => setArchivo(e.target.files?.[0] ?? null)} />
        </div>

        {/* Separador */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">o</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* Fuente 2: Texto PGN */}
        <div>
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
            <ClipboardPaste className="w-3.5 h-3.5" /> Opción B — Pegar PGN como texto
          </label>
          <textarea
            rows={5}
            className={`w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 text-xs font-mono resize-none transition-all ${
              tieneTexto && hayConflicto ? 'border-amber-400 bg-amber-50' : 'border-slate-300'
            }`}
            value={pgnTexto}
            onChange={e => setPgnTexto(e.target.value)}
            placeholder={'[Event "Casual"]\n[White "Kasparov"]\n[Black "Deep Blue"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 ...'}
          />
        </div>

        {/* Nombre personalizado */}
        <div>
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5 block">
            Nombre <span className="text-slate-400 font-normal normal-case">(opcional — si no se indica, se usa el nombre del archivo o el evento del PGN)</span>
          </label>
          <input
            className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm"
            value={nombre} onChange={e => setNombre(e.target.value)}
            placeholder="Ej: Gambito de Dama — Lección 3"
          />
        </div>

        {/* Categoría */}
        <div>
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5 block">
            Categoría <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {categorias.map(([key, { label, color }]) => (
              <button
                key={key} onClick={() => setCategoria(key)}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border-2 transition-all text-left ${
                  categoria === key ? `${color} border-current` : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2 justify-end mt-6">
        <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium text-sm transition-colors">Cancelar</button>
        <button
          onClick={handleSubir}
          disabled={!puedeSubir}
          title={hayConflicto ? 'Elimina el archivo o borra el texto para continuar' : !categoria ? 'Selecciona una categoría' : ''}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />} Subir
        </button>
      </div>
    </Modal>
  );
}