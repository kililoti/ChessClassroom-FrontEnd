'use client';

import { useState, useRef } from 'react';
import { X, Upload, FileText, AlertTriangle, Loader2, ClipboardPaste, Calendar } from 'lucide-react';

const API = `${process.env.NEXT_PUBLIC_API_URL}/ejercicios`;

type Categoria = 'apertura' | 'tactica' | 'estrategia' | 'final' | 'partida' | 'calculo';

const CATEGORIA_LABELS: Record<Categoria, { label: string; color: string }> = {
  apertura:   { label: 'Apertura',   color: 'bg-violet-100 text-violet-700' },
  tactica:    { label: 'Táctica',    color: 'bg-red-100 text-red-700' },
  estrategia: { label: 'Estrategia', color: 'bg-blue-100 text-blue-700' },
  final:      { label: 'Final',      color: 'bg-amber-100 text-amber-700' },
  partida:    { label: 'Partida',    color: 'bg-emerald-100 text-emerald-700' },
  calculo:    { label: 'Cálculo',    color: 'bg-gray-100 text-gray-700' },
};

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';
}

interface Props {
  carpetaId: string;
  onClose: () => void;
  onSubido: () => void;
}

export default function ModalSubirEjercicio({ carpetaId, onClose, onSubido }: Props) {
  const [nombre, setNombre]             = useState('');
  const [categoria, setCategoria]       = useState<Categoria | ''>('');
  const [archivos, setArchivos]         = useState<File[]>([]);
  const [textoFenPgn, setTextoFenPgn]   = useState('');
  const [fechaInicio, setFechaInicio]   = useState('');
  const [fechaEntrega, setFechaEntrega] = useState('');
  const [loading, setLoading]           = useState(false);
  const [progreso, setProgreso]         = useState(0);
  const [error, setError]               = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const tieneArchivos = archivos.length > 0;
  const tieneTexto    = textoFenPgn.trim().length > 0;
  const hayConflicto  = tieneArchivos && tieneTexto;
  const puedeSubir    = !hayConflicto && (tieneArchivos || tieneTexto) && !!categoria && !loading;

  const quitarArchivo = (index: number) => {
    setArchivos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubir = async () => {
    if (!puedeSubir) return;
    setLoading(true); setError(''); setProgreso(0);

    if (fechaInicio && fechaEntrega && new Date(fechaInicio) > new Date(fechaEntrega)) {
      setError('La fecha de inicio no puede ser posterior a la fecha de entrega.');
      setLoading(false);
      return;
    }

    try {
      if (tieneArchivos) {
        // Subir cada archivo individualmente
        for (let i = 0; i < archivos.length; i++) {
          const archivo = archivos[i];

          // Nombre: si el profesor puso un nombre base, usar "nombre N"
          // Sino, usar el nombre original del archivo (sin extensión)
          const nombreFinal = nombre.trim()
            ? archivos.length === 1
              ? nombre.trim()
              : `${nombre.trim()} ${i + 1}`
            : archivo.name.replace(/\.[^/.]+$/, ''); // quita extensión

          const form = new FormData();
          form.append('carpeta_id', carpetaId);
          form.append('categoria', categoria as string);
          form.append('nombre', nombreFinal);
          if (fechaInicio)  form.append('fecha_inicio',  new Date(`${fechaInicio}T00:00:00`).toISOString());
          if (fechaEntrega) form.append('fecha_entrega', new Date(`${fechaEntrega}T23:59:59`).toISOString());
          form.append('visible', 'true');
          form.append('file', archivo);

          const res = await fetch(API, {
            method: 'POST',
            headers: { Authorization: `Bearer ${getToken()}` },
            body: form,
          });
          const d = await res.json();
          if (!res.ok) throw new Error(`${nombreFinal}: ${d.error || 'Error al subir'}`);

          setProgreso(i + 1);
        }
      } else {
        // Subir texto FEN/PGN (un único ejercicio)
        const form = new FormData();
        form.append('carpeta_id', carpetaId);
        form.append('categoria', categoria as string);
        if (nombre.trim()) form.append('nombre', nombre.trim());
        if (fechaInicio)   form.append('fecha_inicio',  new Date(`${fechaInicio}T00:00:00`).toISOString());
        if (fechaEntrega)  form.append('fecha_entrega', new Date(`${fechaEntrega}T23:59:59`).toISOString());
        form.append('visible', 'true');
        form.append('texto_fen_o_pgn', textoFenPgn.trim());

        const res = await fetch(API, {
          method: 'POST',
          headers: { Authorization: `Bearer ${getToken()}` },
          body: form,
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || 'Error al subir el ejercicio');
        setProgreso(1);
      }

      onSubido(); onClose();
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const categorias = Object.entries(CATEGORIA_LABELS) as [Categoria, { label: string; color: string }][];

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl my-4" onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">Subir ejercicio</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg mb-4">
            <AlertTriangle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}

        {hayConflicto && (
          <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 p-3 rounded-lg mb-4">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Tienes archivos seleccionados <strong>y</strong> texto pegado. Usa solo uno de los dos métodos.</span>
          </div>
        )}

        <div className="space-y-5">

          {/* Opción A: archivos múltiples */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5 block">
              Opción A — Archivo(s) PGN / FEN
            </label>
            <div
              onClick={() => inputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                tieneArchivos
                  ? hayConflicto ? 'border-amber-400 bg-amber-50' : 'border-blue-400 bg-blue-50'
                  : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50'
              }`}
            >
              {tieneArchivos ? (
                <div className="flex flex-col gap-1.5">
                  {archivos.map((f, i) => (
                    <div key={i} className="flex items-center justify-between bg-white/70 rounded-lg px-3 py-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                        <p className="text-sm font-semibold text-blue-600 truncate">{f.name}</p>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); quitarArchivo(i); }}
                        className="ml-2 text-slate-400 hover:text-red-500 shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}
                    className="text-xs text-blue-500 hover:text-blue-700 font-semibold mt-1"
                  >
                    + Añadir más archivos
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <Upload className="w-6 h-6 text-slate-400" />
                  <p className="text-sm text-slate-500">
                    Haz clic para seleccionar <span className="font-semibold">uno o varios archivos .pgn</span>
                  </p>
                  <p className="text-[11px] text-slate-400">Cada archivo se sube como un ejercicio independiente</p>
                </div>
              )}
            </div>
            <input
              ref={inputRef} type="file" accept=".pgn,.fen" multiple className="hidden"
              onChange={e => {
                const nuevos = Array.from(e.target.files ?? []);
                setArchivos(prev => {
                  // Evitar duplicados por nombre
                  const nombresExistentes = new Set(prev.map(f => f.name));
                  return [...prev, ...nuevos.filter(f => !nombresExistentes.has(f.name))];
                });
                // Reset input para poder seleccionar el mismo archivo otra vez
                e.target.value = '';
              }}
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">o</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Opción B: texto */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <ClipboardPaste className="w-3.5 h-3.5" /> Opción B — Pegar FEN o PGN como texto
            </label>
            <textarea
              rows={3}
              className={`w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 text-xs font-mono resize-none transition-all ${
                tieneTexto && hayConflicto ? 'border-amber-400 bg-amber-50' : 'border-slate-300'
              }`}
              value={textoFenPgn}
              onChange={e => setTextoFenPgn(e.target.value)}
              placeholder={'FEN: rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1\n\no PGN: 1. e4 e5 2. Nf3 ...'}
            />
          </div>

          {/* Nombre */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5 block">
              Nombre <span className="text-slate-400 font-normal normal-case">
                {tieneArchivos && archivos.length > 1
                  ? '(opcional — se usará como base: "nombre 1", "nombre 2"...)'
                  : '(opcional — si se deja vacío se usa el nombre del archivo)'}
              </span>
            </label>
            <input
              className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm"
              value={nombre} onChange={e => setNombre(e.target.value)}
              placeholder="Ej: Táctica del alfil"
            />
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-blue-500" /> Fecha de inicio
                <span className="text-slate-400 font-normal normal-case ml-1">(opcional)</span>
              </label>
              <input type="date" lang="es-ES"
                className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm"
                value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-red-500" /> Fecha de entrega
                <span className="text-slate-400 font-normal normal-case ml-1">(opcional)</span>
              </label>
              <input type="date" lang="es-ES"
                className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm"
                value={fechaEntrega} onChange={e => setFechaEntrega(e.target.value)} />
            </div>
          </div>

          {/* Categoría */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5 block">
              Categoría <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {categorias.map(([key, { label, color }]) => (
                <button
                  key={key} type="button" onClick={() => setCategoria(key)}
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

        {/* Barra de progreso al subir múltiples archivos */}
        {loading && tieneArchivos && archivos.length > 1 && (
          <div className="mt-4">
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${(progreso / archivos.length) * 100}%` }} />
            </div>
            <p className="text-xs text-slate-400 mt-1 text-center">{progreso} / {archivos.length} archivos</p>
          </div>
        )}

        <div className="flex gap-2 justify-end mt-6">
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium text-sm transition-colors">
            Cancelar
          </button>
          <button
            type="button" onClick={handleSubir} disabled={!puedeSubir}
            title={hayConflicto ? 'Usa solo un método de entrada' : !categoria ? 'Selecciona una categoría' : ''}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {tieneArchivos && archivos.length > 1
              ? `Subir ${archivos.length} ejercicios`
              : 'Subir ejercicio'}
          </button>
        </div>
      </div>
    </div>
  );
}