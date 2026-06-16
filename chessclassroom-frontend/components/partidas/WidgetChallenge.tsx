'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Swords, X, Check, Loader2 } from 'lucide-react';
import { useChallenges } from '@/contexts/ChallengesContext';

const API = 'http://localhost:3001/api';

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';
}

function formatTiempo(ms: number): string {
  const min = Math.floor(ms / 60000);
  const seg = Math.floor((ms % 60000) / 1000);
  if (seg === 0) return `${min}min`;
  return `${min}:${String(seg).padStart(2, '0')}`;
}

export default function WidgetChallenge() {
  const { challenge, limpiarChallenge } = useChallenges();
  const router = useRouter();

  const [aceptando, setAceptando]   = useState(false);
  const [rechazando, setRechazando] = useState(false);

  if (!challenge) return null;

  const tiempoLabel = `${formatTiempo(challenge.tiempoMs)}${
    challenge.incrementoMs > 0 ? ` +${challenge.incrementoMs / 1000}s` : ''
  }`;

const aceptar = async () => {
  setAceptando(true);
  try {
    const res = await fetch(`${API}/invitaciones/${challenge.invitacionId}/responder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ accion: 'aceptar' }),
    });
    const d = await res.json();
    console.log('respuesta aceptar:', d);
    if (res.ok && d.partida) {
        limpiarChallenge();
        router.push(`/clases/${challenge.claseId}/partidas/${d.partida.id}`);
      }
    } catch {}
    finally { setAceptando(false); }
  };

  const rechazar = async () => {
    setRechazando(true);
    try {
      await fetch(`${API}/invitaciones/${challenge.invitacionId}/responder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ accion: 'rechazar' }),
      });
    } catch {}
    finally {
      setRechazando(false);
      limpiarChallenge();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-4 w-72">

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Swords className="w-4 h-4 text-blue-600" />
            </div>
            <span className="font-bold text-slate-900 text-sm">¡Te retan a una partida!</span>
          </div>
          <button
            onClick={rechazar}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-slate-50 rounded-xl p-3 mb-3">
          <p className="text-sm font-semibold text-slate-800">{challenge.deNombre}</p>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
            <Swords className="w-3 h-3" /> {tiempoLabel} · Partida rápida
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={rechazar}
            disabled={rechazando || aceptando}
            className="flex-1 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-40"
          >
            {rechazando ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Rechazar'}
          </button>
          <button
            onClick={aceptar}
            disabled={aceptando || rechazando}
            className="flex-1 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
          >
            {aceptando
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <><Check className="w-4 h-4" /> Aceptar</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}