import { useEffect, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

export type EventoTorneo =
  | { tipo: 'EMPAREJAMIENTO'; partida_id: string; jugador_blancas_id: string; jugador_negras_id: string }
  | { tipo: 'PARTIDA_FIN';    partida_id: string; resultado: string; motivo: string }
  | { tipo: 'PUNTUACIONES' }
  | { tipo: 'INICIO_TORNEO' }
  | { tipo: 'FIN_TORNEO' };

interface UseTorneoRealtimeOptions {
  torneoId: string | null;
  onEvento: (evento: EventoTorneo) => void;
  onPartidaCambiada?: () => void;
  onParticipantesCambiados?: () => void; // para actualizar puntuaciones y estado online
}

export function useTorneoRealtime({ torneoId, onEvento, onPartidaCambiada, onParticipantesCambiados }: UseTorneoRealtimeOptions) {
  const canalRef                = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);
  const canalPartidasRef        = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);
  const canalParticipantesRef   = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);
  const onEventoRef             = useRef(onEvento);
  const onPartidaRef            = useRef(onPartidaCambiada);
  const onParticipantesRef      = useRef(onParticipantesCambiados);

  useEffect(() => { onEventoRef.current = onEvento; }, [onEvento]);
  useEffect(() => { onPartidaRef.current = onPartidaCambiada; }, [onPartidaCambiada]);
  useEffect(() => { onParticipantesRef.current = onParticipantesCambiados; }, [onParticipantesCambiados]);

  useEffect(() => {
    if (!torneoId) return;

    const token = localStorage.getItem('token');

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    // Canal de broadcasts del torneo
    const canal = supabase.channel(`torneo:${torneoId}`, {
      config: { broadcast: { self: true } },
    });

    (['EMPAREJAMIENTO', 'PARTIDA_FIN', 'PUNTUACIONES', 'INICIO_TORNEO', 'FIN_TORNEO'] as const).forEach(event => {
      canal.on('broadcast', { event }, ({ payload }) => {
        onEventoRef.current({ tipo: event, ...payload });
      });
    });

    canal.subscribe((status) => {
      console.log('🔌 Estado canal torneo:', status);
    });

    canalRef.current = canal;

    // postgres_changes: cambios de estado en partidas (esperando→iniciada)
    const canalPartidas = supabase
      .channel(`torneo-partidas-${torneoId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'partidas', filter: `torneo_id=eq.${torneoId}` },
        () => { onPartidaRef.current?.(); },
      )
      .subscribe();

    canalPartidasRef.current = canalPartidas;

    // postgres_changes: cambios en participantes (puntos, libre, ultimo_ping_at)
    const canalParticipantes = supabase
      .channel(`torneo-participantes-${torneoId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'torneo_participantes', filter: `torneo_id=eq.${torneoId}` },
        () => { onParticipantesRef.current?.(); },
      )
      .subscribe();

    canalParticipantesRef.current = canalParticipantes;

    return () => {
      supabase.removeChannel(canal);
      supabase.removeChannel(canalPartidas);
      supabase.removeChannel(canalParticipantes);
    };
  }, [torneoId]);

  const emitir = useCallback((evento: EventoTorneo) => {
    if (!canalRef.current) return;
    canalRef.current.send({
      type: 'broadcast',
      event: evento.tipo,
      payload: evento,
    });
  }, []);

  return { emitir };
}

// Lista de torneos en tiempo real
// Escucha cambios en la tabla `torneos` para la clase y recarga la lista.

interface UseTorneosRealtimeOptions {
  claseId: string;
  onCambio: () => void;
  debounceMs?: number;
}

export function useTorneosRealtime({ claseId, onCambio, debounceMs = 400 }: UseTorneosRealtimeOptions) {
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
      debounceRef.current = setTimeout(() => onCambioRef.current(), debounceMs);
    };

    const canal = supabase
      .channel(`torneos-lista-${claseId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'torneos', filter: `clase_id=eq.${claseId}` },
        disparar,
      )
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(canal);
    };
  }, [claseId, debounceMs]); // eslint-disable-line react-hooks/exhaustive-deps
}