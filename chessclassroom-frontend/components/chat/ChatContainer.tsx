'use client';

import { useState, useEffect, useRef, FormEvent, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

interface Mensaje {
  id: string;
  contenido: string;
  creado_en: string;
  remitente_id: string;
  usuarios: {
    nombre: string;
    apellidos: string;
  };
}

interface ChatContainerProps {
  salaId: string;
}

// Inicializar el cliente público de Supabase para los WebSockets
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function ChatContainer({ salaId }: ChatContainerProps) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const mensajesFinRef = useRef<HTMLDivElement>(null);

  // Extraer la función de cargar mensajes para poder reutilizarla
  const fetchMensajes = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No hay sesión activa');

      const res = await fetch(`http://localhost:3001/api/chats/${salaId}/mensajes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al cargar los mensajes');

      setMensajes(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [salaId]);

  // Cargar el historial la primera vez que se abre el chat
  useEffect(() => {
    fetchMensajes();
  }, [fetchMensajes]);

  // Supabase Realtime (WebSockets)
  useEffect(() => {
    // Suscribirse a los INSERT que ocurran en la tabla 'mensajes' para esta sala de chat
    const channel = supabase
      .channel(`sala_${salaId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensajes',
          filter: `sala_id=eq.${salaId}` // Solo escuchamos esta sala
        },
        (payload) => {
          // Cuando llega un mensaje nuevo, comprobar si lo enviamos nosotros u otra persona
          const userStr = localStorage.getItem('usuario');
          if (userStr) {
            const miUsuario = JSON.parse(userStr);
            // Si el remitente es distinto a mí (es decir, otra persona)
            // Ejecutar fetchMensajes de forma silenciosa para actualizar la pantalla
            if (payload.new.remitente_id !== miUsuario.id) {
              fetchMensajes();
            }
          }
        }
      )
      .subscribe();

    // Cuando el usuario sale de la clase, cerrar el túnel WebSocket
    return () => {
      supabase.removeChannel(channel);
    };
  }, [salaId, fetchMensajes]);

  // Auto-scroll al recibir o enviar mensajes
  useEffect(() => {
    mensajesFinRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  // Enviar mensaje
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!nuevoMensaje.trim()) return;

    const token = localStorage.getItem('token');
    const contenidoEnviado = nuevoMensaje;
    
    setNuevoMensaje('');

    try {
      const res = await fetch(`http://localhost:3001/api/chats/${salaId}/mensajes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ contenido: contenidoEnviado })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al enviar');

      // Añadir el mensaje a nuestra propia pantalla inmediatamente
      if (data.data) {
         setMensajes((prev) => [...prev, data.data]);
      }

    } catch (err: any) {
      alert(`No se pudo enviar: ${err.message}`);
      setNuevoMensaje(contenidoEnviado);
    }
  };

  const formatearHora = (fechaIso: string) => {
    const fecha = new Date(fechaIso);
    return fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  if (loading) return <div className="p-4 text-gray-500 flex justify-center items-center h-full">Cargando chat...</div>;
  if (error) return <div className="p-4 text-red-500 bg-red-50 border border-red-200 rounded-lg">{error}</div>;

  return (
    <div className="flex flex-col h-[500px] bg-white overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {mensajes.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-center text-slate-400 text-sm bg-white py-2 px-4 rounded-full border border-slate-200 shadow-sm">
              No hay mensajes. ¡Rompe el hielo! 👋
            </p>
          </div>
        ) : (
          mensajes.map((msg) => {
            const miUsuarioId = JSON.parse(localStorage.getItem('usuario') || '{}').id;
            const esMio = msg.remitente_id === miUsuarioId;

            return (
              <div key={msg.id} className={`flex flex-col ${esMio ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                <div className={`max-w-[85%] flex flex-col ${esMio ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-baseline space-x-2 mb-1 px-1">
                    <span className="font-bold text-slate-700 text-xs">
                      {esMio ? 'Tú' : `${msg.usuarios?.nombre} ${msg.usuarios?.apellidos}`}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {formatearHora(msg.creado_en)}
                    </span>
                  </div>
                  
                  <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm break-all ${
                    esMio 
                        ? 'bg-blue-600 text-white rounded-tr-sm' 
                        : 'bg-white text-slate-700 border border-slate-200 rounded-tl-sm'
                    }`}>
                    {msg.contenido}
                    </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={mensajesFinRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-3 bg-white border-t border-slate-100">
        <div className="flex gap-2">
          <input
            type="text"
            value={nuevoMensaje}
            onChange={(e) => setNuevoMensaje(e.target.value)}
            placeholder="Escribe un mensaje..."
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={!nuevoMensaje.trim()}
            className="px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            Enviar
          </button>
        </div>
      </form>
    </div>
  );
}