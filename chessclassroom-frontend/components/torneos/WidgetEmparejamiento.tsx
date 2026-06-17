'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy, Swords, Loader2 } from 'lucide-react';
import { useTorneoRealtime } from '@/hooks/useTorneoRealtime';

function getUsuario() {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem('usuario') ?? 'null'); } catch { return null; }
}

interface Emparejamiento {
  torneoId: string;
  partidaId: string;
  jugadorBlancasId: string;
  jugadorNegrasId: string;
  colorPropio: 'blancas' | 'negras';
}

interface Props {
  torneoId: string | null;
  claseId: string;
}

export default function WidgetEmparejamiento({ torneoId, claseId }: Props) {
  const router  = useRouter();
  const usuario = getUsuario();

  const [emparejamiento, setEmparejamiento] = useState<Emparejamiento | null>(null);
  const [segundos, setSegundos]             = useState(10);
  const [yendo, setYendo]                   = useState(false);

  // Refs para acceso siempre actualizado dentro de callbacks/intervals
  const emparejamientoRef = useRef(emparejamiento);
  const yendoRef          = useRef(false);
  const claseIdRef        = useRef(claseId);

  // Actualizar refs síncronamente en cada render
  emparejamientoRef.current = emparejamiento;
  yendoRef.current          = yendo;
  claseIdRef.current        = claseId;

  const irAPartida = useCallback(() => {
    // Leer siempre los valores más recientes desde refs
    if (!emparejamientoRef.current || yendoRef.current) return;
    yendoRef.current = true; // bloquear re-entradas síncronamente
    setYendo(true);
    router.push(`/clases/${claseIdRef.current}/partidas/${emparejamientoRef.current.partidaId}`);
    setEmparejamiento(null);
  }, [router]);

  const handleEvento = useCallback((evento: any) => {
    if (evento.tipo !== 'EMPAREJAMIENTO') return;
    if (!usuario) return;

    const soyBlancas = evento.jugador_blancas_id === usuario.id;
    const soyNegras  = evento.jugador_negras_id  === usuario.id;
    if (!soyBlancas && !soyNegras) return;

    // Resetear estado para la nueva partida
    yendoRef.current = false;
    setYendo(false);
    setSegundos(10);
    setEmparejamiento({
      torneoId:         torneoId!,
      partidaId:        evento.partida_id,
      jugadorBlancasId: evento.jugador_blancas_id,
      jugadorNegrasId:  evento.jugador_negras_id,
      colorPropio:      soyBlancas ? 'blancas' : 'negras',
    });
  }, [usuario, torneoId]);

  useTorneoRealtime({ torneoId, onEvento: handleEvento });

  // Cuenta atrás con redirección automática al llegar a 0
  useEffect(() => {
    if (!emparejamiento) return;

    const interval = setInterval(() => {
      setSegundos(s => {
        const next = s - 1;
        if (next <= 0) {
          clearInterval(interval);
          // setTimeout para salir del ciclo de renderizado de React
          setTimeout(() => irAPartida(), 0);
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [emparejamiento, irAPartida]);

  if (!emparejamiento) return null;

  const colorLabel = emparejamiento.colorPropio === 'blancas' ? '♔ Blancas' : '♚ Negras';
  const progreso   = ((10 - segundos) / 10) * 100;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-white border border-blue-200 rounded-2xl shadow-2xl p-5 w-80 shadow-blue-100">

        {/* Cabecera */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="font-bold text-slate-900 text-sm">¡Has sido emparejado!</p>
            <p className="text-xs text-slate-500">Torneo arena · redirección automática</p>
          </div>
        </div>

        {/* Info */}
        <div className="bg-blue-50 rounded-xl p-3 mb-4">
          <div className="flex items-center gap-2 mb-1">
            <Swords className="w-4 h-4 text-blue-600 shrink-0" />
            <p className="text-sm font-semibold text-blue-800">Nueva partida lista</p>
          </div>
          <p className="text-xs text-blue-600">
            Juegas con <span className="font-bold">{colorLabel}</span>
          </p>
        </div>

        {/* Barra de progreso + cuenta atrás */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-slate-500">Redirigiendo en...</span>
            <span className="text-sm font-bold text-blue-600 tabular-nums">{segundos}s</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-1000"
              style={{ width: `${progreso}%` }}
            />
          </div>
        </div>

        {/* Botón */}
        <button
          onClick={irAPartida}
          disabled={yendo}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
        >
          {yendo
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <><Swords className="w-4 h-4" /> Ir a la partida ahora</>
          }
        </button>
      </div>
    </div>
  );
}