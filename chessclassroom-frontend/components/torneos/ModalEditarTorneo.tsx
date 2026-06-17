'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, AlertTriangle, Clock, ClipboardPaste } from 'lucide-react';

const API = `${process.env.NEXT_PUBLIC_API_URL}`;

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';
}

interface Props {
  torneoId: string;
  claseId: string;
  onClose: () => void;
  onEditado: () => void;
}

export default function ModalEditarTorneo({ torneoId, claseId, onClose, onEditado }: Props) {
  const [nombre, setNombre]           = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [horaInicio, setHoraInicio]   = useState('');
  const [fechaFin, setFechaFin]       = useState('');
  const [horaFin, setHoraFin]         = useState('');
  const [tiempoMin, setTiempoMin]     = useState(5);
  const [incrementoSeg, setIncrementoSeg] = useState(0);
  const [fenPgn, setFenPgn]           = useState('');
  const [loading, setLoading]         = useState(true);
  const [guardando, setGuardando]     = useState(false);
  const [error, setError]             = useState('');
  const [estadoTorneo, setEstado]     = useState<string>('');

  const tiempoMs     = tiempoMin * 60000;
  const incrementoMs = incrementoSeg * 1000;
  const tiempoValido = tiempoMs >= 60000 && tiempoMs <= 5400000;

  // Cargar datos del torneo
  useEffect(() => {
    fetch(`${API}/torneos/${torneoId}`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then(d => {
        const t = d.torneo;
        setNombre(t.nombre ?? '');
        setTiempoMin(Math.round((t.tiempo_ms ?? 300000) / 60000));
        setIncrementoSeg(Math.round((t.incremento_ms ?? 0) / 1000));
        if (t.fen_inicial || t.pgn_inicial) {
          setFenPgn(t.pgn_inicial ?? t.fen_inicial ?? '');
        }
        // Convertir fechas UTC a hora local para los inputs
        if (t.fecha_inicio) {
          const d = new Date(t.fecha_inicio);
          setFechaInicio(d.toLocaleDateString('sv'));
          setHoraInicio(d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false }));
        }
        if (t.fecha_fin) {
          const d = new Date(t.fecha_fin);
          setFechaFin(d.toLocaleDateString('sv'));
          setHoraFin(d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false }));
        }
        setEstado(t.estado);
      })
      .catch(() => setError('No se pudo cargar el torneo.'))
      .finally(() => setLoading(false));
  }, [torneoId]);

  const guardar = async () => {
    if (!nombre.trim())  { setError('El nombre es obligatorio.'); return; }
    if (!tiempoValido)   { setError('El tiempo debe estar entre 1 y 90 minutos.'); return; }

    setGuardando(true); setError('');
    try {
      const FEN_STD = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

      // Siempre enviar ambos campos para evitar inconsistencias
      let fen_inicial = FEN_STD;
      let pgn_inicial: string | null = null;

      if (fenPgn.trim()) {
        const esPgn = fenPgn.includes('[') || !!fenPgn.match(/\d+\./);
        if (esPgn) {
          pgn_inicial = fenPgn.trim();
          fen_inicial = FEN_STD; // PGN tiene prioridad, FEN se resetea
        } else {
          fen_inicial = fenPgn.trim();
          pgn_inicial = null;   // FEN tiene prioridad, PGN se limpia
        }
      }

      const body: any = {
        nombre:        nombre.trim(),
        tiempo_ms:     tiempoMs,
        incremento_ms: incrementoMs,
        fen_inicial,
        pgn_inicial,
      };

      if (fechaInicio && horaInicio) {
        body.fecha_inicio = new Date(`${fechaInicio}T${horaInicio}`).toISOString();
      }
      if (fechaFin && horaFin) {
        body.fecha_fin = new Date(`${fechaFin}T${horaFin}`).toISOString();
      }

      const res = await fetch(`${API}/torneos/${torneoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Error al guardar');
      onEditado();
    } catch (e: any) { setError(e.message); }
    finally { setGuardando(false); }
  };

  const resetearPosicion = async () => {
    if (!confirm('¿Resetear la posición inicial a la estándar? Esto afectará a las próximas partidas del torneo.')) return;
    setGuardando(true); setError('');
    try {
      const FEN_STD = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      const res = await fetch(`${API}/torneos/${torneoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ fen_inicial: FEN_STD, pgn_inicial: null }),
      });
      if (!res.ok) throw new Error('Error al resetear');
      setFenPgn('');
      setError('');
    } catch (e: any) { setError(e.message); }
    finally { setGuardando(false); }
  };

  const inputCls = "w-full p-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-600";

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl my-4" onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-slate-900">Editar torneo</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg mb-4">
            <AlertTriangle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="space-y-5">

            {/* Nombre */}
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5 block">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input className={inputCls} value={nombre} onChange={e => setNombre(e.target.value)}
                placeholder="Ej: Torneo de diciembre" />
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-2 gap-4">
              {estadoTorneo !== 'activo' && (
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5 block">
                    Fecha inicio
                  </label>
                  <input type="date" className={`${inputCls} mb-2`} value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
                  <input type="time" className={inputCls} value={horaInicio} onChange={e => setHoraInicio(e.target.value)} />
                </div>
              )}
              <div className={estadoTorneo === 'activo' ? 'col-span-2' : ''}>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5 block">
                  Fecha fin
                </label>
                <input type="date" className={`${inputCls} mb-2`} value={fechaFin} onChange={e => setFechaFin(e.target.value)} />
                <input type="time" className={inputCls} value={horaFin} onChange={e => setHoraFin(e.target.value)} />
              </div>
            </div>

            {/* Tiempo e incremento */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Tiempo
                  <span className="text-slate-400 font-normal normal-case">(min, 1–90)</span>
                </label>
                <input type="number" min={1} max={90} value={tiempoMin}
                  onChange={e => setTiempoMin(Math.min(90, Math.max(1, e.target.valueAsNumber || 1)))}
                  className={`${inputCls} font-mono`} />
                {!tiempoValido && <p className="text-xs text-red-500 mt-1">Entre 1 y 90 min.</p>}
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5 block">
                  Incremento
                  <span className="text-slate-400 font-normal normal-case ml-1">(seg, 0–30)</span>
                </label>
                <input type="number" min={0} max={30} value={incrementoSeg}
                  onChange={e => setIncrementoSeg(Math.min(30, Math.max(0, e.target.valueAsNumber || 0)))}
                  className={`${inputCls} font-mono`} />
              </div>
            </div>

            {/* FEN / PGN */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1">
                  <ClipboardPaste className="w-3.5 h-3.5" /> Posición inicial
                  <span className="text-slate-400 font-normal normal-case ml-1">(opcional)</span>
                </label>
                {fenPgn.trim() && (
                  <button type="button" onClick={resetearPosicion}
                    className="text-xs text-red-500 hover:text-red-600 font-semibold cursor-pointer">
                    Resetear a posición estándar
                  </button>
                )}
              </div>
              <textarea rows={2}
                className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 text-slate-900 text-xs font-mono resize-none"
                value={fenPgn} onChange={e => setFenPgn(e.target.value)}
                placeholder="FEN: rnbqkbnr/... o PGN: 1. e4 e5 ..." />
            </div>
          </div>
        )}

        <div className="flex gap-2 justify-end mt-6">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium text-sm transition-colors cursor-pointer">
            Cancelar
          </button>
          <button type="button" onClick={guardar} disabled={guardando || loading || !tiempoValido}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold text-sm transition-colors disabled:opacity-40 flex items-center gap-2 cursor-pointer">
            {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}