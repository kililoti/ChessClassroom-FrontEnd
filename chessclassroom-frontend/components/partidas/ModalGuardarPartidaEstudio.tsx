'use client';

import { useState } from 'react';
import { X, AlertTriangle, Loader2, Plus, ChevronRight, ArrowLeft } from 'lucide-react';

const API_RECURSOS = 'http://localhost:3001/api/recursos';
const API_PARTIDAS = 'http://localhost:3001/api/partidas';

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';
}

interface Carpeta {
  id: string;
  nombre: string;
}

interface Props {
  partidaId: string;
  claseId: string;
  onClose: () => void;
  onGuardado: () => void;
}

export default function ModalGuardarPartidaEstudio({ partidaId, claseId, onClose, onGuardado }: Props) {
  const [carpetas, setCarpetas]                     = useState<Carpeta[]>([]);
  const [carpetaActual, setCarpetaActual]           = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs]               = useState<{ id: string; nombre: string }[]>([]);
  const [cargandoExplorador, setCargandoExplorador] = useState(false);
  const [modalNuevaCarpeta, setModalNuevaCarpeta]   = useState(false);
  const [nombreNuevaCarpeta, setNombreNuevaCarpeta] = useState('');
  const [creandoCarpeta, setCreandoCarpeta]         = useState(false);
  const [loading, setLoading]                       = useState(false);
  const [error, setError]                           = useState('');
  const [inicializado, setInicializado]             = useState(false);

  const cargarCarpetas = async (carpetaId: string | null) => {
    setCargandoExplorador(true); setError('');
    try {
      const url = `${API_RECURSOS}/carpetas?clase_id=${claseId}&modulo=estudio${carpetaId ? `&carpeta_padre_id=${carpetaId}` : ''}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      setCarpetas(data.carpetas ?? []);
    } catch (e: any) { setError(e.message); }
    finally { setCargandoExplorador(false); }
  };

  // Cargar al primer render
  if (!inicializado) {
    setInicializado(true);
    cargarCarpetas(null);
  }

  const entrarCarpeta = (carpeta: Carpeta) => {
    setCarpetaActual(carpeta.id);
    setBreadcrumbs(prev => [...prev, { id: carpeta.id, nombre: carpeta.nombre }]);
    cargarCarpetas(carpeta.id);
  };

  const navegarBreadcrumb = (index: number) => {
    const bc = breadcrumbs[index];
    setBreadcrumbs(prev => prev.slice(0, index + 1));
    setCarpetaActual(bc.id);
    cargarCarpetas(bc.id);
  };

  const navegarRaiz = () => {
    setBreadcrumbs([]);
    setCarpetaActual(null);
    cargarCarpetas(null);
  };

  const crearCarpeta = async () => {
    if (!nombreNuevaCarpeta.trim()) return;
    setCreandoCarpeta(true); setError('');
    try {
      const res = await fetch(`${API_RECURSOS}/carpetas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          nombre: nombreNuevaCarpeta.trim(),
          modulo: 'estudio',
          clase_id: claseId,
          carpeta_padre_id: carpetaActual ?? undefined,
          visible: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear la carpeta');
      setNombreNuevaCarpeta('');
      setModalNuevaCarpeta(false);
      cargarCarpetas(carpetaActual);
    } catch (e: any) { setError(e.message); }
    finally { setCreandoCarpeta(false); }
  };

  const guardar = async () => {
    if (!carpetaActual) return;
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_PARTIDAS}/${partidaId}/guardar-estudio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ carpeta_id: carpetaActual }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');
      onGuardado();
      onClose();
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Cabecera */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h3 className="text-lg font-bold text-slate-900">Guardar partida en estudio</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg mb-4 shrink-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}

        <div className="flex flex-col flex-1 overflow-hidden">

          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1 text-sm text-slate-500 font-medium mb-3 flex-wrap shrink-0">
            <button onClick={navegarRaiz} className="hover:text-blue-600 transition-colors">Raíz</button>
            {breadcrumbs.map((bc, i) => (
              <span key={bc.id} className="flex items-center gap-1">
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <button onClick={() => navegarBreadcrumb(i)} className="hover:text-blue-600 transition-colors">
                  {bc.nombre}
                </button>
              </span>
            ))}
          </nav>

          {/* Botón nueva carpeta */}
          <div className="mb-3 shrink-0">
            {modalNuevaCarpeta ? (
              <div className="flex gap-2">
                <input
                  autoFocus
                  className="flex-1 p-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-600 text-slate-900"
                  value={nombreNuevaCarpeta}
                  onChange={e => setNombreNuevaCarpeta(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') crearCarpeta(); if (e.key === 'Escape') setModalNuevaCarpeta(false); }}
                  placeholder="Nombre de la carpeta"
                />
                <button
                  onClick={crearCarpeta}
                  disabled={!nombreNuevaCarpeta.trim() || creandoCarpeta}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors flex items-center gap-1"
                >
                  {creandoCarpeta ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear'}
                </button>
                <button
                  onClick={() => { setModalNuevaCarpeta(false); setNombreNuevaCarpeta(''); }}
                  className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setModalNuevaCarpeta(true)}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-semibold transition-colors"
              >
                <Plus className="w-4 h-4" />
                {carpetaActual ? 'Nueva subcarpeta' : 'Nueva carpeta'}
              </button>
            )}
          </div>

          {/* Lista carpetas */}
          <div className="flex-1 overflow-y-auto flex flex-col gap-2">
            {cargandoExplorador ? (
              <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Cargando...</span>
              </div>
            ) : carpetas.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                {carpetaActual ? 'No hay subcarpetas.' : 'No hay carpetas de estudio creadas.'}
              </div>
            ) : (
              carpetas.map(carpeta => (
                <button
                  key={carpeta.id}
                  onClick={() => entrarCarpeta(carpeta)}
                  className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl transition-all text-left"
                >
                  <span className="text-lg">📁</span>
                  <span className="text-sm font-semibold text-slate-800 flex-1">{carpeta.nombre}</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              ))
            )}
          </div>

          {/* Acción (Botones Guardar/Cancelar) */}
          <div className="mt-4 pt-4 border-t border-slate-100 shrink-0">
            <div className="flex gap-2 justify-end">
              <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium text-sm transition-colors">
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={!carpetaActual || loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold text-sm transition-colors disabled:opacity-40 flex items-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Guardar aquí
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}