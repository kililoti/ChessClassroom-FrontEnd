'use client';

import { Trophy, Medal } from 'lucide-react';

interface Participante {
  usuario_id: string;
  puntos: number;
  partidas_jugadas: number;
  libre: boolean;
  ultimo_ping_at: string | null;
  usuarios: {
    id: string;
    nombre: string;
    apellidos: string;
  };
}

interface Props {
  participantes: Participante[];
  usuarioId: string;
  torneoActivo: boolean;
}

const VENTANA_PING_MS = 30 * 1000;

function estadoJugador(p: Participante): { color: string; titulo: string } {
  if (!p.libre) {
    return { color: 'bg-blue-500', titulo: 'Jugando' };
  }
  if (!p.ultimo_ping_at || Date.now() - new Date(p.ultimo_ping_at).getTime() > VENTANA_PING_MS) {
    return { color: 'bg-red-400', titulo: 'No disponible' };
  }
  return { color: 'bg-emerald-400', titulo: 'Disponible' };
}

export default function TablaPuntuaciones({ participantes, usuarioId, torneoActivo }: Props) {
  if (participantes.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <Trophy className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Sin participantes aún</p>
      </div>
    );
  }

  const medalColor = (pos: number) => {
    if (pos === 0) return 'text-yellow-500';
    if (pos === 1) return 'text-slate-400';
    if (pos === 2) return 'text-amber-600';
    return 'text-slate-300';
  };

  return (
    <div className="w-full flex flex-col bg-transparent">
      {/* Cabecera Plana (Sin recuadros ni fondos grises) */}
      <div className="grid grid-cols-12 gap-2 px-2 pb-2.5 border-b border-slate-200/80 bg-transparent shrink-0">
        <span className="col-span-1 text-xs font-bold text-slate-400">#</span>
        <span className="col-span-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Jugador</span>
        <span className="col-span-2 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Pts</span>
        <span className="col-span-2 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Part</span>
        {torneoActivo && (
          <span className="col-span-1 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Est</span>
        )}
      </div>

      {/* Lista de Filas con División sutil */}
      <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 pr-1 mt-1">
        {participantes.map((p, i) => {
          const soyYo   = p.usuario_id === usuarioId;
          const nombre  = `${p.usuarios?.nombre ?? ''} ${p.usuarios?.apellidos ?? ''}`.trim();
          const esLider = i === 0 && p.puntos > 0;
          const estado  = estadoJugador(p);

          return (
            <div
              key={p.usuario_id}
              className={`grid grid-cols-12 gap-2 px-2 py-3 items-center transition-colors rounded-xl ${
                soyYo ? 'bg-blue-50/80 font-medium' : 'hover:bg-slate-50'
              }`}
            >
              {/* Posición */}
              <div className="col-span-1 flex items-center">
                {i < 3 ? (
                  <Medal className={`w-4 h-4 ${medalColor(i)}`} />
                ) : (
                  <span className="text-xs font-bold text-slate-400 tabular-nums">{i + 1}</span>
                )}
              </div>

              {/* Nombre */}
              <div className="col-span-6 min-w-0">
                <p className={`text-sm font-semibold truncate ${soyYo ? 'text-blue-700' : 'text-slate-700'}`}>
                  {nombre}
                  {soyYo && <span className="text-xs font-normal text-blue-400 ml-1">(tú)</span>}
                </p>
                {esLider && (
                  <p className="text-[10px] text-yellow-600 font-bold uppercase tracking-wider mt-0.5">Líder</p>
                )}
              </div>

              {/* Puntos */}
              <div className="col-span-2 text-center">
                <span className={`text-sm font-bold tabular-nums ${soyYo ? 'text-blue-700' : 'text-slate-800'}`}>
                  {p.puntos}
                </span>
              </div>

              {/* Partidas jugadas */}
              <div className="col-span-2 text-center">
                <span className="text-sm text-slate-400 font-medium tabular-nums">{p.partidas_jugadas}</span>
              </div>

              {/* Estado */}
              {torneoActivo && (
                <div className="col-span-1 flex justify-center">
                  <span
                    className={`w-2 h-2 rounded-full shadow-sm animate-pulse ${estado.color}`}
                    title={estado.titulo}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}