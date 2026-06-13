'use client';

import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

export interface PresenciaUsuario {
  usuario_id: string;
  nombre: string;
  apellidos: string;
  rol: 'profesor' | 'alumno';
  en_voz: boolean;
}

interface PresenciaContextType {
  presentes: PresenciaUsuario[];
  aulaId: string | null;
  iniciarPresencia: (aulaId: string) => void;
  actualizarEnVoz: (enVoz: boolean) => Promise<void>;
  limpiar: () => void;
}

const PresenciaContext = createContext<PresenciaContextType | null>(null);

export function usePresencia() {
  const ctx = useContext(PresenciaContext);
  if (!ctx) throw new Error('usePresencia debe usarse dentro de PresenciaProvider');
  return ctx;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function PresenciaProvider({ children }: { children: React.ReactNode }) {
  const [presentes, setPresentes] = useState<PresenciaUsuario[]>([]);
  const [aulaId, setAulaId] = useState<string | null>(null);
  const canalRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const usuarioRef = useRef<PresenciaUsuario | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  const limpiar = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
    if (canalRef.current && usuarioRef.current) {
      canalRef.current.send({
        type: 'broadcast',
        event: 'DESCONECTADO',
        payload: { usuario_id: usuarioRef.current.usuario_id }
      });
      supabase.removeChannel(canalRef.current);
      canalRef.current = null;
    }
    usuarioRef.current = null;
    setPresentes([]);
    setAulaId(null);
  }, []);

  const iniciarPresencia = useCallback((nuevoAulaId: string) => {
    // Solo salir si hay canal activo, usuario activo Y es el mismo aula
    if (canalRef.current && aulaId === nuevoAulaId && usuarioRef.current) return;

    // Limpiar canal anterior si existe
    if (canalRef.current) limpiar();

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

    const canal = supabase.channel(`presencia-broadcast:${nuevoAulaId}`, {
      config: { broadcast: { self: false } }
    });

    canal.on('broadcast', { event: 'CONECTADO' }, ({ payload }) => {
      setPresentes(prev => {
        if (prev.find(p => p.usuario_id === payload.usuario_id)) return prev;
        return [...prev, payload as PresenciaUsuario];
      });
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

    canal.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setPresentes([yo]);
        await canal.send({
          type: 'broadcast',
          event: 'CONECTADO',
          payload: yo
        });
        heartbeatRef.current = setInterval(async () => {
          if (usuarioRef.current) {
            await canal.send({
              type: 'broadcast',
              event: 'PRESENCIA',
              payload: usuarioRef.current
            });
          }
        }, 30000);
      }
    });

    canalRef.current = canal;
    setAulaId(nuevoAulaId);

    const handleBeforeUnload = () => {
      if (usuarioRef.current) {
        canal.send({
          type: 'broadcast',
          event: 'DESCONECTADO',
          payload: { usuario_id: usuarioRef.current.usuario_id }
        });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [aulaId, limpiar]);

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

  useEffect(() => {
    return () => { limpiar(); };
  }, [limpiar]);

  return (
    <PresenciaContext.Provider value={{ presentes, aulaId, iniciarPresencia, actualizarEnVoz, limpiar }}>
      {children}
    </PresenciaContext.Provider>
  );
}