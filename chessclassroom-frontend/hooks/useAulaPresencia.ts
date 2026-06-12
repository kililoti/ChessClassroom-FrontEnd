'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

export interface PresenciaUsuario {
  usuario_id: string;
  nombre: string;
  apellidos: string;
  rol: 'profesor' | 'alumno';
  en_voz: boolean;
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
      en_voz: false
    };
    usuarioRef.current = yo;

    const canal = supabase.channel(`presencia-broadcast:${aulaId}`, {
      config: { broadcast: { self: false } }
    });

    // Escuchar cuando alguien se conecta
    canal.on('broadcast', { event: 'CONECTADO' }, ({ payload }) => {
      console.log('🟢 CONECTADO:', payload);
      setPresentes(prev => {
        if (prev.find(p => p.usuario_id === payload.usuario_id)) return prev;
        return [...prev, payload as PresenciaUsuario];
      });
      // Responder con nuestra presencia para que el recién llegado nos vea
      canal.send({
        type: 'broadcast',
        event: 'PRESENCIA',
        payload: usuarioRef.current
      });
    });

    // Escuchar respuestas de presencia
    canal.on('broadcast', { event: 'PRESENCIA' }, ({ payload }) => {
      console.log('🔵 PRESENCIA:', payload);
      setPresentes(prev => {
        if (prev.find(p => p.usuario_id === payload.usuario_id)) return prev;
        return [...prev, payload as PresenciaUsuario];
      });
    });

    // Escuchar actualizaciones (en_voz, etc.)
    canal.on('broadcast', { event: 'ACTUALIZAR' }, ({ payload }) => {
      setPresentes(prev =>
        prev.map(p => p.usuario_id === payload.usuario_id
          ? { ...p, ...payload }
          : p
        )
      );
    });

    // Escuchar desconexiones
    canal.on('broadcast', { event: 'DESCONECTADO' }, ({ payload }) => {
      console.log('🔴 DESCONECTADO:', payload);
      setPresentes(prev => prev.filter(p => p.usuario_id !== payload.usuario_id));
    });

    canal.subscribe(async (status) => {
      console.log('📡 Estado canal presencia:', status);
      if (status === 'SUBSCRIBED') {
        // Añadirse a sí mismo
        setPresentes([yo]);

        // Anunciar llegada
        await canal.send({
          type: 'broadcast',
          event: 'CONECTADO',
          payload: yo
        });

        // Heartbeat cada 30s para detectar desconexiones inesperadas
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

    // Al cerrar la pestaña
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

  return { presentes, actualizarEnVoz };
}