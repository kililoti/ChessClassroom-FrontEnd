'use client';

import { useState, useRef } from 'react';
import { X, Upload, FileText, AlertTriangle, Loader2, ClipboardPaste } from 'lucide-react';
import { Categoria, CATEGORIA_LABELS } from '@/types/explorador';

const API = 'http://localhost:3001/api/recursos';

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';
}

interface Props {
  carpetaId: string;
  onClose: () => void;
  onSubido: () => void;
}

export default function ModalSubirPGN({ carpetaId, onClose, onSubido }: Props) {
  const [nombre, setNombre]       = useState('');
  const [categoria, setCategoria] = useState<Categoria | ''>('');
  const [archivo, setArchivo]     = useState<File | null>(null);
  const [pgnTexto, setPgnTexto]   = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const tieneArchivo = !!archivo;
  const tieneTexto   = pgnTexto.trim().length > 0;
  const hayConflicto = tieneArchivo && tieneTexto;
  const puedeSubir   = !hayConflicto && (tieneArchivo || tieneTexto) && !!categoria && !loading;

  const buildFormData = (): FormData => {
    const form = new FormData();
    form.append('carpeta_id', carpetaId);
    form.append('categoria', categoria as string);
    if (nombre.trim()) form.append('nombre', nombre.trim());
    form.append('visible', 'true');

    if (tieneArchivo && archivo) {
      form.append('file', archivo);
    } else {
      const blob = new Blob([pgnTexto.trim()], { type: 'application/x-chess-pgn' });
      form.append('file', blob, (nombre.trim() || 'partida') + '.pgn');
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
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl my-4" onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">Subir archivo PGN</h3>
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
            <span>Tienes un archivo seleccionado <strong>y</strong> texto PGN pegado. Usa solo uno de los dos métodos para poder subir.</span>
          </div>
        )}

        <div className="space-y-5">
          {/* Opción A: Archivo */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5 block">Opción A — Archivo .pgn</label>
            <div
              onClick={() => inputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${tieneArchivo ? hayConflicto ? 'border-amber-400 bg-amber-50' : 'border-blue-400 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50'}`}
            >
              {archivo ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <p className="text-sm font-semibold text-blue-600">{archivo.name}</p>
                  <button onClick={e => { e.stopPropagation(); setArchivo(null); if (inputRef.current) inputRef.current.value = ''; }} className="ml-1 text-slate-400 hover:text-red-500 transition-colors">
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

          {/* Opción B: Texto */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <ClipboardPaste className="w-3.5 h-3.5" /> Opción B — Pegar PGN como texto
            </label>
            <textarea
              rows={5}
              className={`w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 text-xs font-mono resize-none transition-all ${tieneTexto && hayConflicto ? 'border-amber-400 bg-amber-50' : 'border-slate-300'}`}
              value={pgnTexto}
              onChange={e => setPgnTexto(e.target.value)}
              placeholder={'[Event "Casual"]\n[White "Kasparov"]\n[Black "Deep Blue"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 ...'}
            />
          </div>

          {/* Nombre */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5 block">
              Nombre <span className="text-slate-400 font-normal normal-case">(opcional)</span>
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
                <button key={key} onClick={() => setCategoria(key)}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border-2 transition-all text-left ${categoria === key ? `${color} border-current` : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'}`}
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
            onClick={handleSubir} disabled={!puedeSubir}
            title={hayConflicto ? 'Elimina el archivo o borra el texto para continuar' : !categoria ? 'Selecciona una categoría' : ''}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />} Subir
          </button>
        </div>
      </div>
    </div>
  );
}