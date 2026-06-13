'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

export interface PresenciaUsuario {
  usuario_id: string;
  nombre: string;
  apellidos: string;
  rol: 'profesor' | 'alumno';
  en_voz: boolean;
  ensordecido?: boolean;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function useAulaPresencia(aulaId: string | null) {
  const [presentes, setPresentes] = useState<PresenciaUsuario[]>([]);
  const canalRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const usuarioRef = useRef<PresenciaUsuario | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!aulaId) return;

    const usuarioStr = localStorage.getItem('usuario');
    if (!usuarioStr) return;

    const usuarioRaw = JSON.parse(usuarioStr);
    const yo: PresenciaUsuario = {
      usuario_id: usuarioRaw.id,
      nombre: usuarioRaw.nombre,
      apellidos: usuarioRaw.apellidos,
      rol: usuarioRaw.rol,
      en_voz: false,
      ensordecido: false
    };
    usuarioRef.current = yo;

    const canal = supabase.channel(`presencia-broadcast:${aulaId}`, {
      config: { broadcast: { self: false } }
    });

    canal.on('broadcast', { event: 'CONECTADO' }, ({ payload }) => {
      setPresentes(prev => {
        if (prev.find(p => p.usuario_id === payload.usuario_id)) return prev;
        return [...prev, payload as PresenciaUsuario];
      });
      // Responder con nuestra presencia
      canal.send({
        type: 'broadcast',
        event: 'PRESENCIA',
        payload: usuarioRef.current
      });
    });

    canal.on('broadcast', { event: 'PRESENCIA' }, ({ payload }) => {
      setPresentes(prev => {
        if (prev.find(p => p.usuario_id === payload.usuario_id)) return prev;
        return [...prev, payload as PresenciaUsuario];
      });
    });

    canal.on('broadcast', { event: 'ACTUALIZAR' }, ({ payload }) => {
      setPresentes(prev =>
        prev.map(p => p.usuario_id === payload.usuario_id
          ? { ...p, ...payload }
          : p
        )
      );
    });

    canal.on('broadcast', { event: 'DESCONECTADO' }, ({ payload }) => {
      setPresentes(prev => prev.filter(p => p.usuario_id !== payload.usuario_id));
    });

    // Nuevo — escuchar estados de voz
    canal.on('broadcast', { event: 'ESTADO_VOZ' }, ({ payload }) => {
      setPresentes(prev =>
        prev.map(p => p.usuario_id === payload.usuario_id
          ? { ...p, ensordecido: payload.ensordecido, en_voz: payload.en_voz ?? p.en_voz }
          : p
        )
      );
    });

    canal.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setPresentes([yo]);
        await canal.send({
          type: 'broadcast',
          event: 'CONECTADO',
          payload: yo
        });
        heartbeatRef.current = setInterval(async () => {
          await canal.send({
            type: 'broadcast',
            event: 'PRESENCIA',
            payload: usuarioRef.current
          });
        }, 30000);
      }
    });

    canalRef.current = canal;

    const handleBeforeUnload = () => {
      canal.send({
        type: 'broadcast',
        event: 'DESCONECTADO',
        payload: { usuario_id: yo.usuario_id }
      });
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      canal.send({
        type: 'broadcast',
        event: 'DESCONECTADO',
        payload: { usuario_id: yo.usuario_id }
      });
      supabase.removeChannel(canal);
    };
  }, [aulaId]);

  const actualizarEnVoz = useCallback(async (enVoz: boolean) => {
    const canal = canalRef.current;
    if (!canal || !usuarioRef.current) return;
    usuarioRef.current = { ...usuarioRef.current, en_voz: enVoz };
    setPresentes(prev =>
      prev.map(p => p.usuario_id === usuarioRef.current!.usuario_id
        ? { ...p, en_voz: enVoz }
        : p
      )
    );
    await canal.send({
      type: 'broadcast',
      event: 'ACTUALIZAR',
      payload: usuarioRef.current
    });
  }, []);

  // Nuevo — emitir estado de ensordecido
  const actualizarEnsordecido = useCallback(async (ensordecido: boolean) => {
    const canal = canalRef.current;
    if (!canal || !usuarioRef.current) return;
    usuarioRef.current = { ...usuarioRef.current, ensordecido };
    setPresentes(prev =>
      prev.map(p => p.usuario_id === usuarioRef.current!.usuario_id
        ? { ...p, ensordecido }
        : p
      )
    );
    await canal.send({
      type: 'broadcast',
      event: 'ESTADO_VOZ',
      payload: {
        usuario_id: usuarioRef.current.usuario_id,
        ensordecido,
        en_voz: usuarioRef.current.en_voz
      }
    });
  }, []);

  return { presentes, actualizarEnVoz, actualizarEnsordecido };
}