// Página de Material Adicional.
// Va en: app/clases/[id]/material/[[...carpeta_id]]/page.tsx
//
// Reutiliza el sistema de carpetas (recursos_carpetas con modulo='material')
// con la misma API que ya usa ExploradorArchivos (/api/recursos/carpetas/...),
// pero el contenido de cada carpeta son "materiales" (foto/vídeo/youtube)
// en lugar de "archivos" PGN.
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { FolderOpen, Folder, Plus, ChevronRight, ArrowLeft, Loader2, AlertTriangle, ImageIcon } from 'lucide-react';
import { Carpeta } from '@/types/explorador';
import { Material } from '@/types/materiales';
import TarjetaMaterial from '@/components/materiales/TarjetaMaterial';
import ModalSubirMaterial from '@/components/materiales/ModalSubirMaterial';
import ReproductorMaterial from '@/components/materiales/ReproductorMaterial';

const API_RECURSOS = `${process.env.NEXT_PUBLIC_API_URL}/recursos`;
const API_MATERIALES = `${process.env.NEXT_PUBLIC_API_URL}/materiales`;
const MODULO = 'material';

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';
}
function getUsuario(): any {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem('usuario') ?? '{}'); } catch { return {}; }
}

// ── Modal crear carpeta (idéntico patrón al de ExploradorArchivos) ──
function ModalCrearCarpeta({ claseId, carpetaPadreId, onClose, onCreada }: {
  claseId: string; carpetaPadreId: string | null; onClose: () => void; onCreada: () => void;
}) {
  const [nombre, setNombre] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCrear = async () => {
    if (!nombre.trim()) return;
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_RECURSOS}/carpetas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ nombre: nombre.trim(), modulo: MODULO, clase_id: claseId, carpeta_padre_id: carpetaPadreId ?? undefined, visible: true }),
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
          <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium text-sm transition-colors cursor-pointer">Cancelar</button>
          <button onClick={handleCrear} disabled={!nombre.trim() || loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-sm transition-colors disabled:opacity-40 flex items-center gap-2 cursor-pointer">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />} Crear
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tarjeta de carpeta (versión simplificada, sin visibilidad/eliminar para no duplicar lógica compleja) ──
function TarjetaCarpetaSimple({ carpeta, onClick }: { carpeta: Carpeta; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-300 flex items-center gap-4 text-left cursor-pointer"
    >
      <div className="w-12 h-12 shrink-0 rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white flex items-center justify-center transition-colors">
        <Folder className="w-6 h-6" />
      </div>
      <div className="min-w-0">
        <h3 className="font-bold text-slate-900 truncate group-hover:text-amber-600 transition-colors">{carpeta.nombre}</h3>
        <p className="text-xs text-slate-400 mt-0.5">Carpeta</p>
      </div>
    </button>
  );
}

export default function MaterialPage() {
  const router = useRouter();
  const params = useParams();
  const claseId = params.id as string;
  // catch-all opcional: /material o /material/carpetaA/carpetaB...
  const segmentos = (params.carpeta_id as string[] | undefined) ?? [];
  const carpetaId = segmentos.length > 0 ? segmentos[segmentos.length - 1] : undefined;

  const [carpetas, setCarpetas] = useState<Carpeta[]>([]);
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; nombre: string }[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [esProfesor, setEsProfesor] = useState(false);
  const [modalCarpeta, setModalCarpeta] = useState(false);
  const [modalMaterial, setModalMaterial] = useState(false);
  const [materialAbierto, setMaterialAbierto] = useState<Material | null>(null);

  const basePath = `/clases/${claseId}/material`;
  const estamosEnRaiz = !carpetaId;

  useEffect(() => {
    const usuario = getUsuario();
    setEsProfesor(usuario?.rol === 'profesor');
  }, []);

  // Breadcrumbs
  useEffect(() => {
    if (!carpetaId) { setBreadcrumbs([]); return; }
    fetch(`${API_RECURSOS}/carpetas/ancestros/${carpetaId}`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setBreadcrumbs(d.ancestros); })
      .catch(() => {});
  }, [carpetaId]);

  const cargarDatos = async () => {
    setCargando(true); setError('');
    try {
      const h = { Authorization: `Bearer ${getToken()}` };

      const urlC = `${API_RECURSOS}/carpetas?clase_id=${claseId}&modulo=${MODULO}${carpetaId ? `&carpeta_padre_id=${carpetaId}` : ''}`;
      const resC = await fetch(urlC, { headers: h });
      const datC = await resC.json();
      if (!resC.ok) throw new Error(datC.error || 'Error al cargar carpetas');
      setCarpetas(datC.carpetas ?? []);

      if (carpetaId) {
        const resM = await fetch(`${API_MATERIALES}/carpeta/${carpetaId}`, { headers: h });
        const datM = await resM.json();
        if (!resM.ok) throw new Error(datM.message || 'Error al cargar materiales');
        setMateriales(datM.materiales ?? []);
      } else {
        setMateriales([]);
      }
    } catch (e: any) { setError(e.message); }
    finally { setCargando(false); }
  };

  useEffect(() => { if (claseId) cargarDatos(); }, [claseId, carpetaId]);

  const entrarCarpeta = (id: string) => router.push(`${basePath}/${id}`);
  const volverAtras = () => router.back();

  const toggleVisibilidad = async (id: string, visible: boolean) => {
    try {
      const res = await fetch(`${API_MATERIALES}/${id}/visibilidad`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ visible: !visible }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.message);
      setMateriales(prev => prev.map(m => m.id === id ? { ...m, visible: !visible } : m));
    } catch (e: any) { setError(e.message); }
  };

  const renombrar = async (id: string, nuevoNombre: string) => {
    try {
      const res = await fetch(`${API_MATERIALES}/${id}/nombre`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ nombre: nuevoNombre }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.message);
      setMateriales(prev => prev.map(m => m.id === id ? { ...m, nombre: nuevoNombre } : m));
    } catch (e: any) { setError(e.message); }
  };

  const eliminar = async (id: string) => {
    if (!confirm('¿Eliminar este material de forma permanente?')) return;
    try {
      const res = await fetch(`${API_MATERIALES}/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } });
      const d = await res.json();
      if (!d.success) throw new Error(d.message);
      setMateriales(prev => prev.filter(m => m.id !== id));
    } catch (e: any) { setError(e.message); }
  };

  const tieneContenido = carpetas.length > 0 || materiales.length > 0;

  // Reproductor a pantalla completa
  if (materialAbierto) {
    return <ReproductorMaterial material={materialAbierto} onClose={() => setMaterialAbierto(null)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6">
      <div className="max-w-screen-2xl mx-auto">

        {/* Cabecera */}
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <button onClick={volverAtras} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm text-slate-600 shrink-0 cursor-pointer">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <FolderOpen className="w-6 h-6 text-teal-600" /> Material Adicional
              </h1>
              <nav className="flex items-center gap-1 mt-1 text-sm text-slate-500 font-medium flex-wrap">
                <button onClick={() => router.push(basePath)} className="hover:text-blue-600 transition-colors cursor-pointer">Inicio</button>
                {breadcrumbs.map((bc, i) => (
                  <React.Fragment key={bc.id}>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    <button
                      onClick={() => router.push(`${basePath}/${bc.id}`)}
                      className={`hover:text-blue-600 transition-colors cursor-pointer ${i === breadcrumbs.length - 1 ? 'text-slate-800 font-semibold' : ''}`}
                    >
                      {bc.nombre}
                    </button>
                  </React.Fragment>
                ))}
              </nav>
            </div>
          </div>

          {esProfesor && (
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button onClick={() => setModalCarpeta(true)} className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-all font-semibold text-sm shadow-sm cursor-pointer">
                <Plus className="w-4 h-4" /> {estamosEnRaiz ? 'Nueva carpeta' : 'Subcarpeta'}
              </button>
              {carpetaId && (
                <button onClick={() => setModalMaterial(true)} className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-all font-semibold text-sm shadow-sm cursor-pointer">
                  <Plus className="w-4 h-4" /> Añadir material
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

        {cargando ? (
          <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-sm font-medium">Cargando...</span>
          </div>
        ) : !tieneContenido ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
              {estamosEnRaiz ? <Folder className="w-8 h-8 text-slate-400" /> : <ImageIcon className="w-8 h-8 text-slate-400" />}
            </div>
            <div>
              <p className="font-semibold text-slate-700">
                {estamosEnRaiz ? 'No hay carpetas creadas' : 'Esta carpeta está vacía'}
              </p>
              <p className="text-sm text-slate-400 mt-1">
                {estamosEnRaiz ? 'Crea una carpeta para organizar el material.' : 'Añade fotos, vídeos o enlaces de YouTube.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-10">

            {/* Carpetas */}
            {carpetas.length > 0 && (
              <section>
                <h2 className="text-xs font-bold text-slate-500 mb-4 flex items-center gap-2 uppercase tracking-widest">
                  <Folder className="w-4 h-4 text-amber-500" />
                  {estamosEnRaiz ? 'Carpetas' : 'Subcarpetas'}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {carpetas.map(c => (
                    <TarjetaCarpetaSimple key={c.id} carpeta={c} onClick={() => entrarCarpeta(c.id)} />
                  ))}
                </div>
              </section>
            )}

            {/* Materiales */}
            {carpetaId && materiales.length > 0 && (
              <section>
                <h2 className="text-xs font-bold text-slate-500 mb-4 flex items-center gap-2 uppercase tracking-widest">
                  <ImageIcon className="w-4 h-4 text-teal-500" /> Material
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {materiales.map(m => (
                    <TarjetaMaterial
                      key={m.id}
                      material={m}
                      esProfesor={esProfesor}
                      onClick={() => setMaterialAbierto(m)}
                      onToggleVisibilidad={() => toggleVisibilidad(m.id, m.visible)}
                      onEliminar={() => eliminar(m.id)}
                      onRenombrar={(nuevo) => renombrar(m.id, nuevo)}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {modalCarpeta && (
        <ModalCrearCarpeta
          claseId={claseId}
          carpetaPadreId={carpetaId ?? null}
          onClose={() => setModalCarpeta(false)}
          onCreada={cargarDatos}
        />
      )}
      {modalMaterial && carpetaId && (
        <ModalSubirMaterial
          carpetaId={carpetaId}
          onClose={() => setModalMaterial(false)}
          onSubido={cargarDatos}
        />
      )}
    </div>
  );
}