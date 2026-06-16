'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, X, Check } from 'lucide-react';
import { Notificacion } from '@/types/rutinas';

interface Props {
  usuarioId: string;
  token: string;
}

const colorTipo = {
  clase:   'bg-blue-100 text-blue-700',
  torneo:  'bg-purple-100 text-purple-700',
  deberes: 'bg-amber-100 text-amber-700',
  rutina:  'bg-green-100 text-green-700',
};

export default function CampanaNotificaciones({ usuarioId, token }: Props) {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const noLeidas = notificaciones.filter(n => !n.leida).length;

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  const cargar = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/rutinas/notificaciones/${usuarioId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setNotificaciones(data);
      }
    } catch {}
  };

  // Polling cada 30 segundos
  useEffect(() => {
    cargar();
    const interval = setInterval(cargar, 30000);
    return () => clearInterval(interval);
  }, [usuarioId]);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const marcarLeida = async (id: string) => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/rutinas/notificaciones/${id}/leer`, { method: 'PATCH', headers });
    setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
  };

  const marcarTodasLeidas = async () => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/rutinas/notificaciones/${usuarioId}/leer-todas`, { method: 'PATCH', headers });
    setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setAbierto(!abierto)}
        className="relative p-2 rounded-xl hover:bg-slate-100 transition-colors"
      >
        <Bell className="w-5 h-5 text-slate-600" />
        {noLeidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 top-10 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm">Notificaciones</h3>
            {noLeidas > 0 && (
              <button onClick={marcarTodasLeidas}
                className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1">
                <Check className="w-3 h-3" /> Marcar todas
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notificaciones.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">Sin notificaciones</p>
            ) : (
              notificaciones.map(n => (
                <div key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors
                    ${!n.leida ? 'bg-blue-50/30' : ''}
                  `}
                >
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize flex-shrink-0 mt-0.5
                    ${colorTipo[n.tipo]}
                  `}>
                    {n.tipo}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800">{n.titulo}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{n.mensaje}</p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {new Date(n.creado_en).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {!n.leida && (
                    <button onClick={() => marcarLeida(n.id)}
                      className="text-slate-300 hover:text-slate-500 flex-shrink-0">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}