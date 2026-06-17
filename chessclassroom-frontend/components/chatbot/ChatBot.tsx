'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader2 } from 'lucide-react';

interface Mensaje {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatIA() {
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState<Mensaje[]>([
    { role: 'assistant', content: '¡Hola! Soy tu asistente de ChessClassroom ♟️ ¿En qué puedo ayudarte?' }
  ]);
  const [input, setInput] = useState('');
  const [cargando, setCargando] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes, cargando]);

  const enviar = async () => {
    if (!input.trim() || cargando) return;

    const nuevoMensaje: Mensaje = { role: 'user', content: input.trim() };
    const historialActualizado = [...mensajes, nuevoMensaje];

    setMensajes(historialActualizado);
    setInput('');
    setCargando(true);

    try {
      // Enviamos el historial sin el mensaje de bienvenida inicial
      const mensajesParaAPI = historialActualizado.slice(1);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat-ia`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ mensajes: mensajesParaAPI }),
      });

      const data = await res.json();

      if (data.success) {
        setMensajes(prev => [...prev, { role: 'assistant', content: data.respuesta }]);
      } else {
        setMensajes(prev => [...prev, {
          role: 'assistant',
          content: 'Lo siento, ha ocurrido un error. Inténtalo de nuevo.'
        }]);
      }
    } catch {
      setMensajes(prev => [...prev, {
        role: 'assistant',
        content: 'No puedo conectar con el servidor ahora mismo.'
      }]);
    } finally {
      setCargando(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  };

  return (
    <>
      {/* Ventana del chat */}
      {abierto && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ height: '480px' }}>

          {/* Cabecera */}
          <div className="flex items-center justify-between px-4 py-3 bg-blue-500 text-white flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-sm">Asistente ChessClassroom</p>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-300 rounded-full" />
                  <p className="text-xs text-blue-100">En línea</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setAbierto(false)}
              className="hover:bg-blue-600 rounded-lg p-1 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-slate-50">
            {mensajes.map((msg, i) => (
              <div key={i} className={`flex items-start gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs
                  ${msg.role === 'assistant' ? 'bg-blue-100 text-blue-600' : 'bg-slate-700 text-white'}
                `}>
                  {msg.role === 'assistant' ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                </div>
                <div className={`max-w-[78%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
                  ${msg.role === 'assistant'
                    ? 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm shadow-sm'
                    : 'bg-blue-500 text-white rounded-tr-sm'
                  }
                `}>
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Indicador escribiendo */}
            {cargando && (
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="bg-white border border-slate-200 px-3 py-2 rounded-2xl rounded-tl-sm flex items-center gap-2 shadow-sm">
                  <div className="flex gap-0.5">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-slate-100 bg-white flex-shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribe tu pregunta..."
                rows={1}
                disabled={cargando}
                className="flex-1 resize-none text-black text-sm px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300 max-h-24 overflow-y-auto disabled:opacity-50"
                style={{ minHeight: '38px' }}
              />
              <button
                onClick={enviar}
                disabled={!input.trim() || cargando}
                className="p-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5 text-center">
              Enter para enviar · Shift+Enter para nueva línea
            </p>
          </div>
        </div>
      )}

      {/* Botón flotante */}
      <button
        onClick={() => setAbierto(!abierto)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 cursor-pointer
          ${abierto ? 'bg-slate-700 hover:bg-slate-800' : 'bg-blue-500 hover:bg-blue-600'}
        `}
      >
        {abierto
          ? <X className="w-6 h-6 text-white" />
          : <MessageCircle className="w-6 h-6 text-white" />
        }
      </button>
    </>
  );
}