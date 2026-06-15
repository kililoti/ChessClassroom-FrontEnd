'use client';

import { useState } from 'react';
import { X, AlertTriangle, Loader2, Plus, ChevronRight, ArrowLeft, Calendar } from 'lucide-react';
import { Categoria, CATEGORIA_LABELS } from '@/types/explorador';

const API_RECURSOS  = 'http://localhost:3001/api/recursos';
const API_EJERCICIOS = 'http://localhost:3001/api/ejercicios';

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';
}

interface Carpeta {
  id: string;
  nombre: string;
}

interface Props {
  claseId: string;
  pgn: string;
  onClose: () => void;
  onGuardado: () => void;
}

type Modulo = 'estudio' | 'ejercicio';
type Vista = 'seleccionModulo' | 'explorador' | 'formulario';

export default function ModalGuardarPartida({ claseId, pgn, onClose, onGuardado }: Props) {
  const [vista, setVista] = useState<Vista>('seleccionModulo');
  const [modulo, setModulo] = useState<Modulo>('estudio');

  // Explorador
  const [carpetas, setCarpetas] = useState<Carpeta[]>([]);
  const [carpetaActual, setCarpetaActual] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; nombre: string }[]>([]);
  const [cargandoExplorador, setCargandoExplorador] = useState(false);
  const [modalNuevaCarpeta, setModalNuevaCarpeta] = useState(false);
  const [nombreNuevaCarpeta, setNombreNuevaCarpeta] = useState('');
  const [creandoCarpeta, setCreandoCarpeta] = useState(false);

  // Formulario
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState<Categoria | ''>('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaEntrega, setFechaEntrega] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const categorias = Object.entries(CATEGORIA_LABELS) as [Categoria, { label: string; color: string }][];

  const puedeGuardar = !!nombre.trim() && !!categoria && !loading;

  // Cargar carpetas del explorador
  const cargarCarpetas = async (carpetaId: string | null, mod: Modulo) => {
    setCargandoExplorador(true); setError('');
    try {
      const url = `${API_RECURSOS}/carpetas?clase_id=${claseId}&modulo=${mod}${carpetaId ? `&carpeta_padre_id=${carpetaId}` : ''}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      setCarpetas(data.carpetas ?? []);
    } catch (e: any) { setError(e.message); }
    finally { setCargandoExplorador(false); }
  };

  const abrirExplorador = (mod: Modulo) => {
    setModulo(mod);
    setCarpetaActual(null);
    setBreadcrumbs([]);
    setVista('explorador');
    cargarCarpetas(null, mod);
  };

  const entrarCarpeta = (carpeta: Carpeta) => {
    setCarpetaActual(carpeta.id);
    setBreadcrumbs(prev => [...prev, { id: carpeta.id, nombre: carpeta.nombre }]);
    cargarCarpetas(carpeta.id, modulo);
  };

  const navegarBreadcrumb = (index: number) => {
    const bc = breadcrumbs[index];
    setBreadcrumbs(prev => prev.slice(0, index + 1));
    setCarpetaActual(bc.id);
    cargarCarpetas(bc.id, modulo);
  };

  const navegarRaiz = () => {
    setBreadcrumbs([]);
    setCarpetaActual(null);
    cargarCarpetas(null, modulo);
  };

  const seleccionarCarpeta = () => {
    if (!carpetaActual) return;
    setVista('formulario');
  };

  // Crear nueva carpeta
  const crearCarpeta = async () => {
    if (!nombreNuevaCarpeta.trim()) return;
    setCreandoCarpeta(true); setError('');
    try {
      const res = await fetch(`${API_RECURSOS}/carpetas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          nombre: nombreNuevaCarpeta.trim(),
          modulo,
          clase_id: claseId,
          carpeta_padre_id: carpetaActual ?? undefined,
          visible: true
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear la carpeta');
      setNombreNuevaCarpeta('');
      setModalNuevaCarpeta(false);
      cargarCarpetas(carpetaActual, modulo);
    } catch (e: any) { setError(e.message); }
    finally { setCreandoCarpeta(false); }
  };

  // Guardar partida
  const handleGuardar = async () => {
    if (!puedeGuardar || !carpetaActual) return;
    setLoading(true); setError('');

    if (fechaInicio && fechaEntrega && new Date(fechaInicio) > new Date(fechaEntrega)) {
      setError('La fecha de inicio no puede ser posterior a la fecha de entrega.');
      setLoading(false);
      return;
    }

    try {
      const blob = new Blob([pgn], { type: 'application/x-chess-pgn' });
      const form = new FormData();
      form.append('carpeta_id', carpetaActual);
      form.append('categoria', categoria as string);
      form.append('nombre', nombre.trim());
      form.append('visible', 'true');

      if (modulo === 'estudio') {
        form.append('file', blob, nombre.trim() + '.pgn');
        const res = await fetch(`${API_RECURSOS}/upload-pgn`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${getToken()}` },
          body: form
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al guardar');
      } else {
        if (fechaInicio)  form.append('fecha_inicio',  new Date(`${fechaInicio}T00:00:00`).toISOString());
        if (fechaEntrega) form.append('fecha_entrega', new Date(`${fechaEntrega}T23:59:59`).toISOString());
        form.append('texto_fen_o_pgn', pgn);
        const res = await fetch(API_EJERCICIOS, {
          method: 'POST',
          headers: { Authorization: `Bearer ${getToken()}` },
          body: form
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al guardar');
      }

      onGuardado();
      onClose();
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const volverAtras = () => {
    if (vista === 'formulario') { setVista('explorador'); setError(''); }
    else if (vista === 'explorador') { setVista('seleccionModulo'); setError(''); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Cabecera */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center gap-2">
            {vista !== 'seleccionModulo' && (
              <button onClick={volverAtras} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 cursor-pointer">
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <h3 className="text-lg font-bold text-slate-900">
              {vista === 'seleccionModulo' && 'Guardar partida'}
              {vista === 'explorador' && `Guardar en ${modulo === 'estudio' ? 'Estudios' : 'Ejercicios'}`}
              {vista === 'formulario' && 'Detalles del archivo'}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg mb-4 shrink-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}

        {/* Vista: selección de módulo */}
        {vista === 'seleccionModulo' && (
          <div className="flex flex-col gap-4 flex-1">
            <p className="text-sm text-slate-500">¿Dónde quieres guardar la partida actual?</p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => abrirExplorador('estudio')}
                className="flex flex-col items-center gap-3 p-6 border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50 rounded-2xl transition-all cursor-pointer"
              >
                <span className="text-4xl">📚</span>
                <div className="text-center">
                  <p className="font-bold text-slate-800">Estudios</p>
                  <p className="text-xs text-slate-500 mt-1">Material de estudio y análisis</p>
                </div>
              </button>
              <button
                onClick={() => abrirExplorador('ejercicio')}
                className="flex flex-col items-center gap-3 p-6 border-2 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 rounded-2xl transition-all cursor-pointer"
              >
                <span className="text-4xl">🧩</span>
                <div className="text-center">
                  <p className="font-bold text-slate-800">Ejercicios</p>
                  <p className="text-xs text-slate-500 mt-1">Problemas y tácticas asignables</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Vista: explorador de carpetas */}
        {vista === 'explorador' && (
          <div className="flex flex-col flex-1 overflow-hidden">

            {/* Breadcrumbs */}
            <nav className="flex items-center gap-1 text-sm text-slate-500 font-medium mb-3 flex-wrap shrink-0">
              <button onClick={navegarRaiz} className="hover:text-blue-600 transition-colors cursor-pointer">Raíz</button>
              {breadcrumbs.map((bc, i) => (
                <span key={bc.id} className="flex items-center gap-1">
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  <button onClick={() => navegarBreadcrumb(i)} className="hover:text-blue-600 transition-colors cursor-pointer">
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
                    className="flex-1 p-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                    value={nombreNuevaCarpeta}
                    onChange={e => setNombreNuevaCarpeta(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') crearCarpeta(); if (e.key === 'Escape') setModalNuevaCarpeta(false); }}
                    placeholder="Nombre de la carpeta"
                  />
                  <button
                    onClick={crearCarpeta}
                    disabled={!nombreNuevaCarpeta.trim() || creandoCarpeta}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    {creandoCarpeta ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear'}
                  </button>
                  <button
                    onClick={() => { setModalNuevaCarpeta(false); setNombreNuevaCarpeta(''); }}
                    className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setModalNuevaCarpeta(true)}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-semibold transition-colors cursor-pointer"
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
                  {carpetaActual ? 'No hay subcarpetas.' : 'No hay carpetas creadas.'}
                </div>
              ) : (
                carpetas.map(carpeta => (
                  <button
                    key={carpeta.id}
                    onClick={() => entrarCarpeta(carpeta)}
                    className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-xl transition-all text-left cursor-pointer"
                  >
                    <span className="text-lg">📁</span>
                    <span className="text-sm font-semibold text-slate-800 flex-1">{carpeta.nombre}</span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                ))
              )}
            </div>

            {/* Botón guardar aquí */}
            <div className="flex gap-2 justify-end mt-4 shrink-0 pt-4 border-t border-slate-100">
              <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium text-sm transition-colors cursor-pointer">
                Cancelar
              </button>
              <button
                onClick={seleccionarCarpeta}
                disabled={!carpetaActual}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Guardar aquí
              </button>
            </div>
          </div>
        )}

        {/* Vista: formulario */}
        {vista === 'formulario' && (
          <div className="flex flex-col gap-5 overflow-y-auto flex-1">

            {/* Carpeta seleccionada */}
            <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm">
              <span className="text-lg">📁</span>
              <span className="text-slate-600 font-medium truncate">
                {breadcrumbs.length > 0
                  ? breadcrumbs.map(b => b.nombre).join(' / ')
                  : 'Raíz'}
              </span>
            </div>

            {/* Nombre */}
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5 block">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                autoFocus
                className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Ej: Gambito de Dama — Lección 3"
              />
            </div>

            {/* Fechas — solo ejercicios */}
            {modulo === 'ejercicio' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-blue-500" /> Fecha de inicio
                    <span className="text-slate-400 font-normal normal-case ml-1">(opcional)</span>
                  </label>
                  <input
                    type="date"
                    className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm"
                    value={fechaInicio}
                    onChange={e => setFechaInicio(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-red-500" /> Fecha de entrega
                    <span className="text-slate-400 font-normal normal-case ml-1">(opcional)</span>
                  </label>
                  <input
                    type="date"
                    className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm"
                    value={fechaEntrega}
                    onChange={e => setFechaEntrega(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Categoría */}
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5 block">
                Categoría <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {categorias.map(([key, { label, color }]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCategoria(key)}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border-2 transition-all text-left cursor-pointer ${
                      categoria === key
                        ? `${color} border-current`
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-2 justify-end pt-2 shrink-0">
              <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium text-sm transition-colors cursor-pointer">
                Cancelar
              </button>
              <button
                onClick={handleGuardar}
                disabled={!puedeGuardar}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Guardar partida
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}