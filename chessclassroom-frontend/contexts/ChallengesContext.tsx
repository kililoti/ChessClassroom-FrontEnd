'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';
}
function getUsuario() {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem('usuario') ?? 'null'); } catch { return null; }
}

export interface Challenge {
  invitacionId: string;
  partidaId: string;
  claseId: string;
  deUsuarioId: string;
  deNombre: string;
  tiempoMs: number;
  incrementoMs: number;
}

export interface ChallengeEmitir extends Challenge {
  paraUsuarioId: string;
}

interface ChallengesContextValue {
  challenge: Challenge | null;
  emitirChallenge: (challenge: ChallengeEmitir) => void;
  limpiarChallenge: () => void;
}

const ChallengesContext = createContext<ChallengesContextValue>({
  challenge: null,
  emitirChallenge: () => {},
  limpiarChallenge: () => {},
});

export function useChallenges() {
  return useContext(ChallengesContext);
}

interface Props {
  claseId: string;
  children: React.ReactNode;
}

export function ChallengesProvider({ claseId, children }: Props) {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const canalRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);

  useEffect(() => {
    if (!claseId) return;

    const usuario = getUsuario();
    if (!usuario) return;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${getToken()}` } } }
    );

    const canal = supabase.channel(`clase:${claseId}`, {
      config: { broadcast: { self: false } }
    });

    canal
      .on('broadcast', { event: 'CHALLENGE' }, ({ payload }) => {
        if (payload.para_usuario_id === usuario.id) {
          setChallenge({
            invitacionId: payload.invitacion_id,
            partidaId:    payload.partida_id,
            claseId:      payload.clase_id,
            deUsuarioId:  payload.de_usuario_id,
            deNombre:     payload.de_nombre,
            tiempoMs:     payload.tiempo_ms,
            incrementoMs: payload.incremento_ms,
          });
        }
      })
      .on('broadcast', { event: 'CHALLENGE_CANCELADO' }, ({ payload }) => {
        setChallenge(prev =>
          prev?.invitacionId === payload.invitacion_id ? null : prev
        );
      })
      .subscribe();

    canalRef.current = canal;

    return () => { supabase.removeChannel(canal); };
  }, [claseId]);

  const emitirChallenge = useCallback((ch: ChallengeEmitir) => {
    if (!canalRef.current) return;
    canalRef.current.send({
      type: 'broadcast',
      event: 'CHALLENGE',
      payload: {
        invitacion_id:   ch.invitacionId,
        partida_id:      ch.partidaId,
        clase_id:        ch.claseId,
        de_usuario_id:   ch.deUsuarioId,
        de_nombre:       ch.deNombre,
        para_usuario_id: ch.paraUsuarioId,
        tiempo_ms:       ch.tiempoMs,
        incremento_ms:   ch.incrementoMs,
      },
    });
  }, []);

  const limpiarChallenge = useCallback(() => setChallenge(null), []);

  return (
    <ChallengesContext.Provider value={{ challenge, emitirChallenge, limpiarChallenge }}>
      {children}
    </ChallengesContext.Provider>
  );
}