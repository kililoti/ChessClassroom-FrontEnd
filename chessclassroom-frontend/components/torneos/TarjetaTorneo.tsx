'use client';

import { useState } from 'react';
import { Trophy, Clock, Users, Trash2, Loader2, Pencil, Calendar, PlayCircle } from 'lucide-react';
import type { Torneo } from '@/types/partidas';

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

function formatFecha(fecha: string | null): string {
  if (!fecha) return '—';
  return new Date(fecha).toLocaleDateString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

interface Props {
  torneo: Torneo;
  usuarioId: string;
  esProfesor: boolean;
  onEntrar: () => void;
  onEliminado: () => void;
  onEditar?: () => void;
}

export default function TarjetaTorneo({ torneo, usuarioId, esProfesor, onEntrar, onEliminado, onEditar }: Props) {
  const [eliminando, setEliminando] = useState(false);

  const esParticipante   = torneo.torneo_participantes?.some(p => p.usuario_id === usuarioId);
  const puedeEliminar    = esProfesor && torneo.estado !== 'finalizado';
  const puedeEditar      = esProfesor && ['configurando', 'esperando', 'activo', 'programado'].includes(torneo.estado);

  const tiempoLabel      = `${formatTiempo(torneo.tiempo_ms)}${torneo.incremento_ms > 0 ? ` +${torneo.incremento_ms / 1000}s` : ''}`;
  const numParticipantes = torneo.torneo_participantes?.length ?? 0;

  const estadoBadge = {
    configurando: { label: 'Configurando', color: 'bg-slate-100 text-slate-600' },
    esperando:    { label: 'En espera',    color: 'bg-blue-100 text-blue-700' },
    programado:   { label: 'Programado',   color: 'bg-blue-100 text-blue-700' },
    finalizado:   { label: 'Finalizado',   color: 'bg-slate-100 text-slate-500' },
  }[torneo.estado as 'configurando' | 'esperando' | 'programado' | 'finalizado'] ?? { label: torneo.estado, color: 'bg-slate-100 text-slate-600' };

  const eliminar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('¿Eliminar este torneo?')) return;
    setEliminando(true);
    try {
      await fetch(`${API}/torneos/${torneo.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      onEliminado();
    } catch {}
    finally { setEliminando(false); }
  };

  const editar = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEditar?.();
  };

  return (
    <div
      onClick={onEntrar}
      className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
    >
      <div className="flex items-center justify-between gap-4">

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-4 h-4 text-blue-600 shrink-0" />
            <h3 className="font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
              {torneo.nombre}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
              <Users className="w-3 h-3" /> {numParticipantes} participantes
            </span>
            {torneo.fecha_inicio && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                <Calendar className="w-3 h-3" /> Inicio: {formatFecha(torneo.fecha_inicio)}
              </span>
            )}
            {torneo.fecha_fin && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-50 text-slate-500 border border-slate-200">
                <Calendar className="w-3 h-3" /> Fin: {formatFecha(torneo.fecha_fin)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-slate-500 flex items-center gap-1 justify-end">
              <Clock className="w-3 h-3" /> {tiempoLabel}
            </p>
            {esParticipante && torneo.estado !== 'finalizado' && (
              <p className="text-xs text-blue-600 font-bold mt-0.5">Participas</p>
            )}
          </div>

          {torneo.estado === 'activo' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
              <PlayCircle className="w-2.5 h-2.5" /> Activo
            </span>
          ) : torneo.estado === 'programado' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
              <Clock className="w-2.5 h-2.5" /> Programado
            </span>
          ) : (
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${estadoBadge?.color}`}>
              {estadoBadge?.label}
            </span>
          )}

          <div className="flex items-center gap-1">
            {puedeEditar && onEditar && (
              <button
                onClick={editar}
                className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                title="Editar torneo"
              >
                <Pencil className="w-4 h-4" />
              </button>
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