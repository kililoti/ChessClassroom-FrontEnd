'use client';

import { useState } from 'react';
import { Swords, Clock, Trophy, Eye, Trash2, Loader2, UserPlus, PlayCircle } from 'lucide-react';
import { Partida } from '@/types/partidas';

const API = `${process.env.NEXT_PUBLIC_API_URL}`;

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';
}

function formatTiempo(ms: number): string {
  const min = Math.floor(ms / 60000);
  const seg = Math.floor((ms % 60000) / 1000);
  if (seg === 0) return `${min}min`;
  return `${min}:${String(seg).padStart(2, '0')}`;
}

function formatResultado(resultado: string | null, blancas: string, negras: string): string {
  if (!resultado) return '';
  if (resultado === '1-0') return `Gana ${blancas}`;
  if (resultado === '0-1') return `Gana ${negras}`;
  return 'Empate';
}

function nombreJugador(jugador: { nombre: string; apellidos: string } | null): string {
  if (!jugador) return 'Libre';
  return `${jugador.nombre} ${jugador.apellidos}`;
}

interface Props {
  partida: Partida;
  usuarioId: string;
  esProfesor: boolean;
  onEntrar: () => void;
  onEliminada: () => void;
}

export default function TarjetaPartida({ partida, usuarioId, esProfesor, onEntrar, onEliminada }: Props) {
  const [eliminando, setEliminando] = useState(false);

  const esJugador = partida.jugador_blancas_id === usuarioId || partida.jugador_negras_id === usuarioId;
  const esCreador = partida.creador?.id === usuarioId;
  const puedeEliminar = esProfesor && partida.estado !== 'iniciada';
  const puedeUnirse = partida.estado === 'esperando' && !esJugador &&
    (partida.jugador_blancas_id === null || partida.jugador_negras_id === null);

  const nombreBlancas = nombreJugador(partida.blancas);
  const nombreNegras  = nombreJugador(partida.negras);
  const tiempoLabel   = `${formatTiempo(partida.tiempo_blancas_ms)}${partida.incremento_ms > 0 ? ` +${partida.incremento_ms / 1000}s` : ''}`;

  const eliminar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('¿Eliminar esta partida?')) return;
    setEliminando(true);
    try {
      await fetch(`${API}/partidas/${partida.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      onEliminada();
    } catch {}
    finally { setEliminando(false); }
  };

  const estadoBadge = {
    esperando: { label: 'En espera',   color: 'bg-blue-100 text-blue-700' },
    finalizada:{ label: 'Finalizada',  color: 'bg-slate-100 text-slate-600' },
    abortada:  { label: 'Abortada',    color: 'bg-red-100 text-red-600' },
  }[partida.estado as 'esperando' | 'finalizada' | 'abortada'];

  return (
    <div
      onClick={onEntrar}
      className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
    >
      <div className="flex items-center justify-between gap-4">

        {/* Jugadores */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-white border-2 border-slate-300 shadow-sm shrink-0" />
              <span className="font-semibold text-slate-800 text-sm truncate">{nombreBlancas}</span>
            </div>
            <Swords className="w-4 h-4 text-slate-300 shrink-0" />
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-slate-800 border-2 border-slate-600 shadow-sm shrink-0" />
              <span className="font-semibold text-slate-800 text-sm truncate">{nombreNegras}</span>
            </div>
          </div>

          {/* Resultado si finalizada */}
          {partida.estado === 'finalizada' && partida.resultado && (
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <Trophy className="w-3 h-3 text-blue-600" />
              {formatResultado(partida.resultado, nombreBlancas, nombreNegras)}
              {partida.motivo_fin && <span className="text-slate-400">· {partida.motivo_fin}</span>}
            </p>
          )}
        </div>

        {/* Info derecha */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-slate-500 flex items-center gap-1 justify-end">
              <Clock className="w-3 h-3" /> {tiempoLabel}
            </p>
            {esJugador && (
              <p className="text-xs text-blue-600 font-bold mt-0.5">Tu partida</p>
            )}
          </div>

          {partida.estado === 'iniciada' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
              <PlayCircle className="w-2.5 h-2.5" /> Activa
            </span>
          ) : (
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${estadoBadge?.color}`}>
              {estadoBadge?.label}
            </span>
          )}

          {/* Acciones */}
          <div className="flex items-center gap-1">
            {puedeUnirse && (
              <span className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Unirse">
                <UserPlus className="w-4 h-4" />
              </span>
            )}
            {partida.estado === 'iniciada' && !esJugador && (
              <span className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors" title="Espectar">
                <Eye className="w-4 h-4" />
              </span>
            )}
            {puedeEliminar && (
              <button
                onClick={eliminar}
                disabled={eliminando}
                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                title="Eliminar"
              >
                {eliminando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}