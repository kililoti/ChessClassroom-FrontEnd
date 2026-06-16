import { useEffect, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

export type EventoPartida =
  | { tipo: 'MOVIMIENTO';       pgn: string; fen: string; sonido: 'move' | 'capture'; emisor_id?: string;
      tiempo_restante_blancas_ms: number; tiempo_restante_negras_ms: number; turno: 'w' | 'b' }
  | { tipo: 'NAVEGAR';          pgn: string; indice: number; sonido: 'move' | 'capture' }
  | { tipo: 'ORIENTACION';      orientacion: 'white' | 'black' }
  | { tipo: 'TABLAS_OFRECIDAS'; de_usuario_id: string }
  | { tipo: 'TABLAS_RECHAZADAS' }
  | { tipo: 'FIN';              resultado: string; motivo: string }
  | { tipo: 'INICIO';           timestamp: string }
  | { tipo: 'PRESENTE';         usuario_id: string }
  | { tipo: 'ABORT' };

interface UsePartidaRealtimeOptions {
  partidaId: string;
  onEvento: (evento: EventoPartida) => void;
}

export function usePartidaRealtime({ partidaId, onEvento }: UsePartidaRealtimeOptions) {
  const canalRef    = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);
  const onEventoRef = useRef(onEvento);

  useEffect(() => { onEventoRef.current = onEvento; }, [onEvento]);

  useEffect(() => {
    if (!partidaId) return;

    const token = localStorage.getItem('token');

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const canal = supabase.channel(`partida:${partidaId}`, {
      config: { broadcast: { self: false } }
    });

    const eventos: EventoPartida['tipo'][] = [
      'MOVIMIENTO', 'NAVEGAR', 'ORIENTACION',
      'TABLAS_OFRECIDAS', 'TABLAS_RECHAZADAS',
      'FIN', 'INICIO', 'ABORT', 'PRESENTE',
    ];

    eventos.forEach(event => {
      canal.on('broadcast', { event }, ({ payload }) => {
        onEventoRef.current(payload);
      });
    });

    canal.subscribe((status) => {
      console.log('🔌 Estado canal partida:', status);
    });

    canalRef.current = canal;

    return () => { supabase.removeChannel(canal); };
  }, [partidaId]);

  const emitir = useCallback((evento: EventoPartida) => {
    if (!canalRef.current) return;
    canalRef.current.send({
      type: 'broadcast',
      event: evento.tipo,
      payload: evento,
    });
  }, []);

  return { emitir };
}

// Lista de partidas en tiempo real
// Escucha cambios en la tabla `partidas` (INSERT, UPDATE, DELETE) para la clase
// y llama a onCambio con debounce para recargar la lista automáticamente.

interface UsePartidasRealtimeOptions {
  claseId: string;
  onCambio: () => void;
  debounceMs?: number;
}

export function usePartidasRealtime({ claseId, onCambio, debounceMs = 400 }: UsePartidasRealtimeOptions) {
  const onCambioRef = useRef(onCambio);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { onCambioRef.current = onCambio; }, [onCambio]);

  useEffect(() => {
    if (!claseId) return;

    const token = localStorage.getItem('token');

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const disparar = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onCambioRef.current();
      }, debounceMs);
    };

    const canal = supabase
      .channel(`partidas-lista-${claseId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'partidas', filter: `clase_id=eq.${claseId}` },
        disparar,
      )
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(canal);
    };
  }, [claseId, debounceMs]); // eslint-disable-line react-hooks/exhaustive-deps
}