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
  ensordecido: boolean;
  ensordecidoPorProfesor: boolean;
  participantesVoz: ParticipanteVoz[];
  aulaId: string | null;
  roomRef: React.MutableRefObject<Room | null>;
  unirse: (aulaId: string) => Promise<void>;
  salir: () => void;
  toggleMic: () => Promise<void>;
  toggleEnsordecido: () => void;
  mutearParticipante: (identity: string) => Promise<void>;
  ensordecer: (identity: string, valor: boolean) => Promise<void>;
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
  const [conectado, setConectado] = useState(false);
  const [conectando, setConectando] = useState(false);
  const [micActivo, setMicActivo] = useState(true);
  const [ensordecido, setEnsordecido] = useState(false);
  const [ensordecidoPorProfesor, setEnsordecidoPorProfesor] = useState(false);
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
        isMuted: p.audioTrackPublications.size === 0 ||
          [...p.audioTrackPublications.values()].every(t => t.isMuted),
        isLocal: false,
      });
    });

    setParticipantesVoz(lista);
  }, []);

  const unirse = useCallback(async (aulaIdNuevo: string) => {
    if (conectado || conectando) return;
    setConectando(true); setError('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3001/api/livekit/token/${aulaIdNuevo}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al obtener token');

      const room = new Room();
      roomRef.current = room;

      // Participantes
      room.on(RoomEvent.ParticipantConnected, actualizarParticipantes);
      room.on(RoomEvent.ParticipantDisconnected, actualizarParticipantes);
      room.on(RoomEvent.TrackMuted, actualizarParticipantes);
      room.on(RoomEvent.TrackUnmuted, actualizarParticipantes);
      room.on(RoomEvent.ActiveSpeakersChanged, actualizarParticipantes);
      room.on(RoomEvent.LocalTrackPublished, actualizarParticipantes);
      room.on(RoomEvent.LocalTrackUnpublished, actualizarParticipantes);

      // Audio — adjuntar directamente al body
      room.on(RoomEvent.TrackSubscribed, (track) => {
        console.log('🎵 Track subscribed:', track.kind);
        if (track.kind === Track.Kind.Audio) {
          const el = track.attach();
          el.setAttribute('data-livekit-audio', 'true');
          document.body.appendChild(el);
          console.log('🔊 Audio adjuntado al body');
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        if (track.kind === Track.Kind.Audio) {
          track.detach().forEach((el) => el.remove());
        }
      });

      // Mensajes de datos (ensordecer remoto)
      room.on(RoomEvent.DataReceived, (data: Uint8Array) => {
        try {
          const msg = JSON.parse(new TextDecoder().decode(data));
          if (msg.tipo === 'ENSORDECER') {
            if (msg.target === room.localParticipant.identity) {
              setEnsordecidoPorProfesor(msg.valor);
              room.remoteParticipants.forEach(p => {
                p.audioTrackPublications.forEach(pub => {
                  if (pub.audioTrack) {
                    pub.audioTrack.mediaStreamTrack.enabled = !msg.valor;
                  }
                });
              });
            }
          }
        } catch {}
      });

      room.on(RoomEvent.Disconnected, () => {
        document.querySelectorAll('[data-livekit-audio]').forEach(el => el.remove());
        setConectado(false);
        setAulaId(null);
        setParticipantesVoz([]);
        roomRef.current = null;
      });

      await room.connect(data.serverUrl, data.token);
      try {
        await room.localParticipant.setMicrophoneEnabled(true);
      } catch (micError: any) {
        console.warn('No se pudo activar el micrófono:', micError.message);
      }

      setAulaId(aulaIdNuevo);
      setConectado(true);
      setMicActivo(true);
      actualizarParticipantes();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setConectando(false);
    }
  }, [conectado, conectando, actualizarParticipantes]);

  const salir = useCallback(() => {
    document.querySelectorAll('[data-livekit-audio]').forEach(el => el.remove());
    roomRef.current?.disconnect();
    roomRef.current = null;
    setConectado(false);
    setAulaId(null);
    setParticipantesVoz([]);
    setMicActivo(true);
    setEnsordecido(false);
    setEnsordecidoPorProfesor(false);
  }, []);

  const toggleMic = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const nuevoEstado = !micActivo;
    await room.localParticipant.setMicrophoneEnabled(nuevoEstado);
    setMicActivo(nuevoEstado);
    actualizarParticipantes();
  }, [micActivo, actualizarParticipantes]);

  const toggleEnsordecido = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;
    const nuevo = !ensordecido;
    room.remoteParticipants.forEach(p => {
      p.audioTrackPublications.forEach(pub => {
        if (pub.audioTrack) {
          pub.audioTrack.mediaStreamTrack.enabled = !nuevo;
        }
      });
    });
    setEnsordecido(nuevo);
  }, [ensordecido]);

  const mutearParticipante = useCallback(async (identity: string) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:3001/api/livekit/${aulaId}/mutear/${identity}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (e: any) { console.error('Error muteando:', e.message); }
  }, [aulaId]);

  const ensordecer = useCallback(async (identity: string, valor: boolean) => {
    const room = roomRef.current;
    if (!room) return;
    await room.localParticipant.publishData(
      new TextEncoder().encode(JSON.stringify({
        tipo: 'ENSORDECER',
        target: identity,
        valor
      })),
      { reliable: true }
    );
  }, []);

  useEffect(() => {
    return () => {
      document.querySelectorAll('[data-livekit-audio]').forEach(el => el.remove());
      roomRef.current?.disconnect();
    };
  }, []);

  return (
    <LiveKitContext.Provider value={{
      conectado, conectando, micActivo, ensordecido, ensordecidoPorProfesor,
      participantesVoz, aulaId, roomRef,
      unirse, salir, toggleMic, toggleEnsordecido,
      mutearParticipante, ensordecer, error
    }}>
      {children}
    </LiveKitContext.Provider>
  );
}