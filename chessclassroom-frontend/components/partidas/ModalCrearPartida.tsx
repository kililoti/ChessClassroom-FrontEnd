'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, AlertTriangle, Clock, ClipboardPaste } from 'lucide-react';
import { useChallenges, ChallengeEmitir } from '@/contexts/ChallengesContext';

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
  esProfesor: boolean;
  onClose: () => void;
  onCreada: (partidaId: string) => void;
}

export default function ModalCrearPartida({ claseId, esProfesor, onClose, onCreada }: Props) {
  const usuario = getUsuario();
  const { emitirChallenge } = useChallenges();

  const [rivales, setRivales]               = useState<Usuario[]>([]);
  const [rivalId, setRivalId]               = useState('');
  const [colorPropio, setColorPropio]       = useState<'blancas' | 'negras' | 'aleatorio'>('aleatorio');

  const [tiempoMin, setTiempoMin]         = useState(5);
  const [incrementoSeg, setIncrementoSeg] = useState(0);

  const [fenPgn, setFenPgn]                 = useState('');
  const [jugadorBlancasId, setJugadorBlancasId] = useState('');
  const [jugadorNegrasId, setJugadorNegrasId]   = useState('');
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState('');

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/clases/${claseId}/miembros`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(r => r.json())
      .then(d => {
        const todos: Usuario[] = d.miembros ?? d.data ?? [];
        setRivales(todos.filter(u => u.id !== usuario?.id));
      })
      .catch(() => {});
  }, [claseId]);

  // Calcular ms totales
  const tiempoMs     = tiempoMin * 60000;
  const incrementoMs = incrementoSeg * 1000;

  const tiempoValido = tiempoMs >= 60000 && tiempoMs <= 5400000;

  const crear = async () => {
    if (!tiempoValido) {
      setError('El tiempo debe estar entre 1 y 90 minutos.');
      return;
    }
    setLoading(true); setError('');
    try {
      let blancasId: string | null = null;
      let negrasId:  string | null = null;

      if (esProfesor) {
        blancasId = jugadorBlancasId || null;
        negrasId  = jugadorNegrasId  || null;

        if (!blancasId && !negrasId) {
          setError('Debes asignar al menos un jugador.');
          setLoading(false);
          return;
        }

        if (blancasId && negrasId && blancasId === negrasId) {
          setError('No puedes asignar el mismo jugador a ambos colores.');
          setLoading(false);
          return;
        }
      } else {
        if (rivalId) {
          const aleatorio = Math.random() < 0.5;
          if (colorPropio === 'blancas' || (colorPropio === 'aleatorio' && aleatorio)) {
            blancasId = usuario?.id;
            negrasId  = rivalId;
          } else {
            blancasId = rivalId;
            negrasId  = usuario?.id;
          }
        } else {
          if (colorPropio === 'blancas') blancasId = usuario?.id;
          else if (colorPropio === 'negras') negrasId = usuario?.id;
          else if (Math.random() < 0.5) blancasId = usuario?.id;
          else negrasId = usuario?.id;
        }
      }

      const body: any = {
        clase_id: claseId,
        tiempo_blancas_ms: tiempoMs,
        tiempo_negras_ms:  tiempoMs,
        incremento_ms:     incrementoMs,
      };
      if (blancasId) body.jugador_blancas_id = blancasId;
      if (negrasId)  body.jugador_negras_id  = negrasId;
      if (fenPgn.trim()) {
        const esPgn = fenPgn.includes('[') || fenPgn.match(/\d+\./);
        if (esPgn) body.pgn_inicial = fenPgn.trim();
        else body.fen_inicial = fenPgn.trim();
      }

      const res = await fetch(`${API}/partidas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Error al crear la partida');

      const usuariosAInvitar: string[] = [];

      if (esProfesor) {
        // Enviar notificación a cada alumno asignado, omitiendo al propio profesor si juega
        if (jugadorBlancasId && jugadorBlancasId !== usuario?.id) usuariosAInvitar.push(jugadorBlancasId);
        if (jugadorNegrasId && jugadorNegrasId !== usuario?.id) usuariosAInvitar.push(jugadorNegrasId);
      } else {
        // Modo alumno: Solo se invita al rival directo
        if (rivalId && rivalId !== usuario?.id) usuariosAInvitar.push(rivalId);
      }

      // Ejecutar secuencialmente las peticiones de invitación y eventos socket
      for (const paraUsuarioId of usuariosAInvitar) {
        try {
          const resInv = await fetch(`${API}/invitaciones`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
            body: JSON.stringify({ partida_id: d.partida.id, para_usuario_id: paraUsuarioId }),
          });
          const inv = await resInv.json();
          
          if (resInv.ok && inv.invitacion) {
            const ch: ChallengeEmitir = {
              invitacionId: inv.invitacion.id,
              partidaId:    d.partida.id,
              claseId:      claseId,
              deUsuarioId:  usuario?.id,
              deNombre:     `${usuario?.nombre} ${usuario?.apellidos}`,
              tiempoMs,
              incrementoMs,
              paraUsuarioId,
            };
            emitirChallenge(ch);
          }
        } catch (err) {
          console.error(`Error al enviar invitación al usuario ${paraUsuarioId}:`, err);
        }
      }

      onCreada(d.partida.id);
      onClose();
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl my-4" onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-slate-900">Nueva partida</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg mb-4">
            <AlertTriangle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}

        <div className="space-y-5">

          {/* Asignación de jugadores */}
          {esProfesor ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5 block">♔ Blancas</label>
                <select
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-600"
                  value={jugadorBlancasId}
                  onChange={e => setJugadorBlancasId(e.target.value)}
                >
                  <option value="">Sin asignar</option>
                  {rivales.concat([usuario]).filter(Boolean).map((u: Usuario) => (
                    <option key={u.id} value={u.id}>{u.nombre} {u.apellidos}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5 block">♚ Negras</label>
                <select
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-600"
                  value={jugadorNegrasId}
                  onChange={e => setJugadorNegrasId(e.target.value)}
                >
                  <option value="">Sin asignar</option>
                  {rivales.concat([usuario]).filter(Boolean).map((u: Usuario) => (
                    <option key={u.id} value={u.id}>{u.nombre} {u.apellidos}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5 block">
                Rival <span className="text-slate-400 font-normal normal-case">(opcional)</span>
              </label>
              <select
                className="w-full p-2.5 border border-slate-300 rounded-xl text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-600"
                value={rivalId}
                onChange={e => setRivalId(e.target.value)}
              >
                <option value="">Partida abierta</option>
                {rivales.map(u => (
                  <option key={u.id} value={u.id}>{u.nombre} {u.apellidos}</option>
                ))}
              </select>

              <div className="mt-3">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5 block">Mi color</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'blancas',   label: '♔ Blancas' },
                    { value: 'negras',    label: '♚ Negras' },
                    { value: 'aleatorio', label: '🔀 Aleatorio' },
                  ] as const).map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setColorPropio(value)}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border-2 transition-all ${
                        colorPropio === value
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

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
              {!tiempoValido && tiempoMs > 0 && (
                <p className="text-xs text-red-500 mt-1">Entre 1 y 90 min.</p>
              )}
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

          {/* FEN / PGN */}
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5 flex items-center gap-1">
              <ClipboardPaste className="w-3.5 h-3.5" /> Posición inicial
              <span className="text-slate-400 font-normal normal-case ml-1">(opcional — FEN o PGN)</span>
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
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium text-sm transition-colors">
            Cancelar
          </button>
          <button
            type="button"
            onClick={crear}
            disabled={loading || !tiempoValido}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold text-sm transition-colors disabled:opacity-40 flex items-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Crear partida
          </button>
        </div>
      </div>
    </div>
  );
}