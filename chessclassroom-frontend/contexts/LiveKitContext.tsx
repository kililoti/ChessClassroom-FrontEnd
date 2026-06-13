'use client';

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';

interface ParticipanteVoz {
  identity: string;
  nombre: string;
  isSpeaking: boolean;
  isMuted: boolean;
  isLocal: boolean;
}

interface LiveKitContextType {
  conectado: boolean;
  conectando: boolean;
  micActivo: boolean;
  muteadoPorProfesor: boolean;
  ensordecido: boolean;
  participantesVoz: ParticipanteVoz[];
  aulaId: string | null;
  unirse: (aulaId: string) => Promise<void>;
  salir: () => void;
  toggleMic: () => Promise<void>;
  toggleEnsordecido: () => void;
  mutearParticipante: (identity: string, muted: boolean) => Promise<void>;
  expulsarParticipante: (identity: string) => Promise<void>;
  error: string;
}

const LiveKitContext = createContext<LiveKitContextType | null>(null);

export function useLiveKit() {
  const ctx = useContext(LiveKitContext);
  if (!ctx) throw new Error('useLiveKit debe usarse dentro de LiveKitProvider');
  return ctx;
}

export function LiveKitProvider({ children }: { children: React.ReactNode }) {
  const roomRef = useRef<Room | null>(null);
  // Ref para saber si el mute lo hizo el propio usuario
  const muteandoYoMismoRef = useRef(false);

  const [conectado, setConectado] = useState(false);
  const [conectando, setConectando] = useState(false);
  const [micActivo, setMicActivo] = useState(true);
  const [muteadoPorProfesor, setMuteadoPorProfesor] = useState(false);
  const [ensordecido, setEnsordecido] = useState(false);
  const [participantesVoz, setParticipantesVoz] = useState<ParticipanteVoz[]>([]);
  const [aulaId, setAulaId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const actualizarParticipantes = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;

    const lista: ParticipanteVoz[] = [];

    const local = room.localParticipant;
    lista.push({
      identity: local.identity,
      nombre: local.name ?? local.identity,
      isSpeaking: local.isSpeaking,
      isMuted: !local.isMicrophoneEnabled,
      isLocal: true,
    });

    room.remoteParticipants.forEach(p => {
      lista.push({
        identity: p.identity,
        nombre: p.name ?? p.identity,
        isSpeaking: p.isSpeaking,
        isMuted: p.audioTrackPublications.size > 0 &&
          [...p.audioTrackPublications.values()].every(t => t.isMuted),
        isLocal: false,
      });
    });

    setParticipantesVoz(lista);
  }, []);

  const unirse = useCallback(async (aulaIdNuevo: string) => {
    if (conectado || conectando) return;
    setConectando(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3001/api/livekit/token/${aulaIdNuevo}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al obtener token');

      const room = new Room();
      roomRef.current = room;

      room.on(RoomEvent.ParticipantConnected, () => {
        setTimeout(actualizarParticipantes, 200);
      });

      room.on(RoomEvent.ParticipantDisconnected, actualizarParticipantes);
      room.on(RoomEvent.ActiveSpeakersChanged, actualizarParticipantes);
      room.on(RoomEvent.LocalTrackPublished, actualizarParticipantes);
      room.on(RoomEvent.LocalTrackUnpublished, actualizarParticipantes);

      room.on(RoomEvent.TrackMuted, (pub, participant) => {
        if (participant.identity === room.localParticipant.identity) {
          if (pub.kind === Track.Kind.Audio) {
            setMicActivo(false);
            // Si el mute NO lo hizo el propio usuario, fue el servidor (profesor)
            if (!muteandoYoMismoRef.current) {
              setMuteadoPorProfesor(true);
            }
          }
        }
        actualizarParticipantes();
      });

      room.on(RoomEvent.TrackUnmuted, (pub, participant) => {
        if (participant.identity === room.localParticipant.identity) {
          if (pub.kind === Track.Kind.Audio) {
            setMicActivo(true);
            setMuteadoPorProfesor(false);
          }
        }
        actualizarParticipantes();
      });

      // Audio
      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === Track.Kind.Audio) {
          const el = track.attach() as HTMLAudioElement;
          el.setAttribute('data-livekit-audio', 'true');
          if (ensordecido) el.volume = 0;
          document.body.appendChild(el);
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        if (track.kind === Track.Kind.Audio) {
          track.detach().forEach(el => el.remove());
        }
      });

      // Mensajes del profesor
      room.on(RoomEvent.DataReceived, (data: Uint8Array) => {
        try {
          const msg = JSON.parse(new TextDecoder().decode(data));

          if (msg.tipo === 'DESMUTEAR' && msg.target === room.localParticipant.identity) {
            room.localParticipant.setMicrophoneEnabled(true).then(() => {
              setMicActivo(true);
              setMuteadoPorProfesor(false);
            });
          }

          if (msg.tipo === 'EXPULSAR' && msg.target === room.localParticipant.identity) {
            room.disconnect();
          }
        } catch {}
      });

      room.on(RoomEvent.Disconnected, () => {
        document.querySelectorAll('[data-livekit-audio]').forEach(el => el.remove());
        setConectado(false);
        setAulaId(null);
        setParticipantesVoz([]);
        setMicActivo(true);
        setMuteadoPorProfesor(false);
        setEnsordecido(false);
        roomRef.current = null;
      });

      await room.connect(data.serverUrl, data.token);

      try {
        await room.localParticipant.setMicrophoneEnabled(true);
      } catch (e: any) {
        console.warn('No se pudo activar el micrófono:', e.message);
      }

      setAulaId(aulaIdNuevo);
      setConectado(true);
      setMicActivo(true);
      setMuteadoPorProfesor(false);
      setEnsordecido(false);
      actualizarParticipantes();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setConectando(false);
    }
  }, [conectado, conectando, actualizarParticipantes, ensordecido]);

  const salir = useCallback(() => {
    document.querySelectorAll('[data-livekit-audio]').forEach(el => el.remove());
    roomRef.current?.disconnect();
    roomRef.current = null;
    setConectado(false);
    setAulaId(null);
    setParticipantesVoz([]);
    setMicActivo(true);
    setMuteadoPorProfesor(false);
    setEnsordecido(false);
  }, []);

  const toggleMic = useCallback(async () => {
    const room = roomRef.current;
    if (!room || muteadoPorProfesor) return;
    const nuevoEstado = !micActivo;
    muteandoYoMismoRef.current = true;
    await room.localParticipant.setMicrophoneEnabled(nuevoEstado);
    muteandoYoMismoRef.current = false;
    setMicActivo(nuevoEstado);
    actualizarParticipantes();
  }, [micActivo, muteadoPorProfesor, actualizarParticipantes]);

  const toggleEnsordecido = useCallback(() => {
    const nuevo = !ensordecido;
    document.querySelectorAll('[data-livekit-audio]').forEach(el => {
      (el as HTMLAudioElement).volume = nuevo ? 0 : 1;
    });
    setEnsordecido(nuevo);
  }, [ensordecido]);

  const mutearParticipante = useCallback(async (identity: string, muted: boolean) => {
    try {
      if (muted) {
        const token = localStorage.getItem('token');
        const res = await fetch(`http://localhost:3001/api/livekit/${aulaId}/mutear/${identity}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ muted: true })
        });
        if (!res.ok) throw new Error('Error al mutear');
      } else {
        const room = roomRef.current;
        if (!room) return;
        await room.localParticipant.publishData(
          new TextEncoder().encode(JSON.stringify({
            tipo: 'DESMUTEAR',
            target: identity
          })),
          { reliable: true }
        );
      }
    } catch (e: any) {
      console.error('Error muteando:', e.message);
    }
  }, [aulaId]);

  const expulsarParticipante = useCallback(async (identity: string) => {
    const room = roomRef.current;
    if (!room) return;
    try {
      await room.localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify({
          tipo: 'EXPULSAR',
          target: identity
        })),
        { reliable: true }
      );
    } catch (e: any) {
      console.error('Error expulsando:', e.message);
    }
  }, []);

  useEffect(() => {
    return () => {
      document.querySelectorAll('[data-livekit-audio]').forEach(el => el.remove());
      roomRef.current?.disconnect();
    };
  }, []);

  return (
    <LiveKitContext.Provider value={{
      conectado, conectando, micActivo, muteadoPorProfesor,
      ensordecido, participantesVoz, aulaId,
      unirse, salir, toggleMic, toggleEnsordecido,
      mutearParticipante, expulsarParticipante, error
    }}>
      {children}
    </LiveKitContext.Provider>
  );
}