'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, AlertTriangle, Clock, Users, ClipboardPaste } from 'lucide-react';

const API = `${process.env.NEXT_PUBLIC_API_URL}`;

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';
}
function getUsuario() {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem('usuario') ?? 'null'); } catch { return null; }
}

interface Usuario {
  id: string;
  nombre: string;
  apellidos: string;
  rol: string;
}

interface Props {
  claseId: string;
  onClose: () => void;
  onCreado: (torneoId: string) => void;
}

export default function ModalCrearTorneo({ claseId, onClose, onCreado }: Props) {
  const usuario = getUsuario();

  const [nombre, setNombre]               = useState('');
  const [fechaInicio, setFechaInicio]     = useState('');
  const [horaInicio, setHoraInicio]       = useState('');
  const [fechaFin, setFechaFin]           = useState('');
  const [horaFin, setHoraFin]             = useState('');
  const [tiempoMin, setTiempoMin]         = useState(5);
  const [incrementoSeg, setIncrementoSeg] = useState(0);
  const [fenPgn, setFenPgn]               = useState('');
  const [miembros, setMiembros]           = useState<Usuario[]>([]);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');

  const tiempoMs     = tiempoMin * 60000;
  const incrementoMs = incrementoSeg * 1000;
  const tiempoValido = tiempoMs >= 60000 && tiempoMs <= 5400000;

  const camposBasicosListos = !!nombre.trim() && !!fechaInicio && !!horaInicio && !!fechaFin && !!horaFin;

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/clases/${claseId}/miembros`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(r => r.json())
      .then(d => setMiembros(d.miembros ?? d.data ?? []))
      .catch(() => {});
  }, [claseId]);

  const toggleMiembro = (id: string) => {
    setSeleccionados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const seleccionarTodos = () => setSeleccionados(new Set(miembros.map(m => m.id)));

  const crear = async () => {
    // Doble verificación por seguridad
    if (!camposBasicosListos) return;

    // Validación de concordancia de fechas
    const fechaInicioDoc = new Date(`${fechaInicio}T${horaInicio}`);
    const fechaFinDoc = new Date(`${fechaFin}T${horaFin}`);
    if (fechaFinDoc <= fechaInicioDoc) {
      setError('La fecha y hora de fin deben ser posteriores a las de inicio.');
      return;
    }

    // Validación de quórum de participantes (Salta error al clickear si falta)
    if (seleccionados.size < 2) { 
      setError('Debes seleccionar al menos 2 participantes para un formato Arena.'); 
      return; 
    }

    // Validación de tiempos límite (Salta error al clickear si es inválido)
    if (!tiempoValido) { 
      setError('El tiempo de juego por jugador debe estar entre 1 y 90 minutos.'); 
      return; 
    }

    setLoading(true); 
    setError('');
    
    try {
      const body: any = {
        clase_id:      claseId,
        nombre:        nombre.trim(),
        tiempo_ms:     tiempoMs,
        incremento_ms: incrementoMs,
        participantes: [...seleccionados],
        fecha_inicio:  fechaInicioDoc.toISOString(),
        fecha_fin:     fechaFinDoc.toISOString(),
      };

      if (fenPgn.trim()) {
        const esPgn = fenPgn.includes('[') || fenPgn.match(/\d+\./);
        if (esPgn) body.pgn_inicial = fenPgn.trim();
        else body.fen_inicial = fenPgn.trim();
      }

      const res = await fetch(`${API}/torneos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Error al crear el torneo');
      onCreado(d.torneo.id);
      onClose();
    } catch (e: any) { 
      setError(e.message); 
    } finally { 
      setLoading(false); 
    }
  };

  const inputFecha = "w-full p-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-600";

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl my-4" onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-slate-900">Nuevo torneo</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg mb-4 animate-in fade-in duration-200">
            <AlertTriangle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}

        <div className="space-y-5">
          {/* Nombre */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5 block">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 text-slate-900 text-sm"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Ej: Torneo de diciembre"
            />
          </div>

          {/* Fechas en formato 24h */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5 block">
                Fecha inicio <span className="text-red-500">*</span>
              </label>
              <input type="date" className={`${inputFecha} mb-2`}
                value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
              <input type="time" className={inputFecha}
                value={horaInicio} onChange={e => setHoraInicio(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5 block">
                Fecha fin <span className="text-red-500">*</span>
              </label>
              <input type="date" className={`${inputFecha} mb-2`}
                value={fechaFin} onChange={e => setFechaFin(e.target.value)} />
              <input type="time" className={inputFecha}
                value={horaFin} onChange={e => setHoraFin(e.target.value)} />
            </div>
          </div>

          {/* Tiempo e incremento */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Tiempo
                <span className="text-slate-400 font-normal normal-case">(min, 1–90)</span>
              </label>
              <input
                type="number"
                min={1}
                max={90}
                value={tiempoMin}
                onChange={e => setTiempoMin(Math.min(90, Math.max(1, e.target.valueAsNumber || 1)))}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                placeholder="5"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5 block">
                Incremento
                <span className="text-slate-400 font-normal normal-case ml-1">(seg, 0–30)</span>
              </label>
              <input
                type="number"
                min={0}
                max={30}
                value={incrementoSeg}
                onChange={e => setIncrementoSeg(Math.min(30, Math.max(0, e.target.valueAsNumber || 0)))}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                placeholder="0"
              />
            </div>
          </div>

          {/* Participantes */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> Participantes
                <span className="font-normal normal-case ml-1 text-slate-400">
                  ({seleccionados.size} seleccionados)
                </span>
              </label>
              <button type="button" onClick={seleccionarTodos}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold cursor-pointer">
                Añadir toda la clase
              </button>
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
              {miembros.map(m => (
                <label key={m.id}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0">
                  <input type="checkbox"
                    checked={seleccionados.has(m.id)}
                    onChange={() => toggleMiembro(m.id)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                  />
                  <span className="text-sm text-slate-800">{m.nombre} {m.apellidos}</span>
                  {m.rol === 'profesor' && (
                    <span className="text-xs text-slate-400 ml-auto">Profesor</span>
                  )}
                </label>
              ))}
              {miembros.length === 0 && (
                <p className="text-sm text-slate-400 p-3 text-center">No hay miembros disponibles</p>
              )}
            </div>
          </div>

          {/* FEN / PGN */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5 flex items-center gap-1">
              <ClipboardPaste className="w-3.5 h-3.5" /> Posición inicial para todas las partidas
              <span className="text-slate-400 font-normal normal-case ml-1">(opcional)</span>
            </label>
            <textarea
              rows={2}
              className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 text-slate-900 text-xs font-mono resize-none"
              value={fenPgn}
              onChange={e => setFenPgn(e.target.value)}
              placeholder="FEN: rnbqkbnr/... o PGN: 1. e4 e5 ..."
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-6">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium text-sm transition-colors cursor-pointer">
            Cancelar
          </button>
          <button
            type="button"
            onClick={crear}
            disabled={loading || !camposBasicosListos} 
            className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold text-sm transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Crear torneo
          </button>
        </div>
      </div>
    </div>
  );
}