import { useEffect, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { LineaAnalisis, FletchaStockfish } from '@/hooks/useStockfish';

export type EventoAula =
  | { tipo: 'MOVIMIENTO';         pgn: string; fen: string; sonido: 'move' | 'capture'; emisor_id?: string }
  | { tipo: 'NAVEGAR';            pgn: string; indice: number; sonido: 'move' | 'capture' }
  | { tipo: 'ORIENTACION';        orientacion: 'white' | 'black' }
  | { tipo: 'REINICIO';           pgn: string; fen: string }
  | { tipo: 'CARGA';              pgn: string; fen: string }
  | { tipo: 'PERMISOS';           alumno_id: string; puede_mover_blancas: boolean; puede_mover_negras: boolean }
  | { tipo: 'STOCKFISH';          activo: boolean; lineas: LineaAnalisis[]; flechas: FletchaStockfish[] }
  | { tipo: 'SOLICITAR_STOCKFISH' };

interface UseAulaRealtimeOptions {
  aulaId: string;
  esProfesor: boolean;
  onEvento: (evento: EventoAula) => void;
}

export function useAulaRealtime({ aulaId, esProfesor, onEvento }: UseAulaRealtimeOptions) {
  const canalRef    = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);
  const onEventoRef = useRef(onEvento);

  useEffect(() => { onEventoRef.current = onEvento; }, [onEvento]);

  useEffect(() => {
    if (!aulaId) return;

    const token = localStorage.getItem('token');

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const canal = supabase.channel(`aula:${aulaId}`, {
      config: { broadcast: { self: false } }
    });

    canal
      .on('broadcast', { event: 'MOVIMIENTO'          }, ({ payload }) => { onEventoRef.current(payload); })
      .on('broadcast', { event: 'NAVEGAR'             }, ({ payload }) => { onEventoRef.current(payload); })
      .on('broadcast', { event: 'ORIENTACION'         }, ({ payload }) => { onEventoRef.current(payload); })
      .on('broadcast', { event: 'REINICIO'            }, ({ payload }) => { onEventoRef.current(payload); })
      .on('broadcast', { event: 'CARGA'               }, ({ payload }) => { onEventoRef.current(payload); })
      .on('broadcast', { event: 'PERMISOS'            }, ({ payload }) => { onEventoRef.current(payload); })
      .on('broadcast', { event: 'STOCKFISH'           }, ({ payload }) => { onEventoRef.current(payload); })
      .on('broadcast', { event: 'SOLICITAR_STOCKFISH' }, ({ payload }) => { onEventoRef.current(payload); })
      .subscribe((status) => {
        console.log('🔌 Estado canal aula:', status);
      });

    canalRef.current = canal;

    return () => { supabase.removeChannel(canal); };
  }, [aulaId]);

  const emitir = useCallback((evento: EventoAula) => {
    if (!canalRef.current) return;
    canalRef.current.send({ type: 'broadcast', event: evento.tipo, payload: evento });
  }, []);

  return { emitir };
}