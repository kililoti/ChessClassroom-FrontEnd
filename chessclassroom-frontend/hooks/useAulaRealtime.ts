import { useEffect, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

export type EventoAula =
  | { tipo: 'MOVIMIENTO';  pgn: string; fen: string }
  | { tipo: 'NAVEGAR';     pgn: string; indice: number }
  | { tipo: 'ORIENTACION'; orientacion: 'white' | 'black' }
  | { tipo: 'REINICIO';    pgn: string; fen: string }
  | { tipo: 'CARGA';       pgn: string; fen: string };

interface UseAulaRealtimeOptions {
  aulaId: string;
  esProfesor: boolean;
  onEvento: (evento: EventoAula) => void;
}

export function useAulaRealtime({ aulaId, esProfesor, onEvento }: UseAulaRealtimeOptions) {
  const canalRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);
  const onEventoRef = useRef(onEvento);

  useEffect(() => {
    onEventoRef.current = onEvento;
  }, [onEvento]);

  useEffect(() => {
    if (!aulaId) return;

    const token = localStorage.getItem('token');

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    const canal = supabase.channel(`aula:${aulaId}`, {
      config: { broadcast: { self: false } }
    });

    canal
      .on('broadcast', { event: 'MOVIMIENTO' }, ({ payload }) => {
        console.log('📨 Evento recibido MOVIMIENTO:', payload);
        onEventoRef.current(payload);
      })
      .on('broadcast', { event: 'NAVEGAR' }, ({ payload }) => {
        console.log('📨 Evento recibido NAVEGAR:', payload);
        onEventoRef.current(payload);
      })
      .on('broadcast', { event: 'ORIENTACION' }, ({ payload }) => {
        console.log('📨 Evento recibido ORIENTACION:', payload);
        onEventoRef.current(payload);
      })
      .on('broadcast', { event: 'REINICIO' }, ({ payload }) => {
        console.log('📨 Evento recibido REINICIO:', payload);
        onEventoRef.current(payload);
      })
      .on('broadcast', { event: 'CARGA' }, ({ payload }) => {
        console.log('📨 Evento recibido CARGA:', payload);
        onEventoRef.current(payload);
      })
      .subscribe((status) => {
        console.log('🔌 Estado canal aula:', status);
      });

    canalRef.current = canal;

    return () => {
      supabase.removeChannel(canal);
    };
  }, [aulaId]);

  const emitir = useCallback((evento: EventoAula) => {
    if (!canalRef.current || !esProfesor) return;
    console.log('📤 Emitiendo evento:', evento);
    canalRef.current.send({
      type: 'broadcast',
      event: evento.tipo,
      payload: evento
    });
  }, [esProfesor]);

  return { emitir };
}