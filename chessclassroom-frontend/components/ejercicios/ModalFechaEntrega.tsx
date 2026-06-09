'use client';

import { useState } from 'react';
import { X, Calendar, Loader2 } from 'lucide-react';

const API_EJ = 'http://localhost:3001/api/ejercicios';

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';
}

interface Props {
  archivoId: string;
  nombreEjercicio: string;
  fechaActual?: string | null;
  onClose: () => void;
  onGuardada: () => void;
}

export default function ModalFechaEntrega({
  archivoId, nombreEjercicio, fechaActual, onClose, onGuardada,
}: Props) {
  
  const fechaInicial = fechaActual
    ? new Date(fechaActual).toISOString().slice(0, 10)
    : '';

  const [fecha, setFecha]     = useState(fechaInicial);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const guardar = async () => {
    setLoading(true); setError('');
    try {
      const fechaConHoraLimite = fecha ? new Date(`${fecha}T23:59:59`).toISOString() : null;

      const res = await fetch(`${API_EJ}/${archivoId}/fecha-entrega`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ fecha_entrega: fechaConHoraLimite }),
      });
      
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? 'Error al guardar la fecha');
      onGuardada();
      onClose();
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" /> Fecha de entrega
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-slate-500 mb-5 truncate">{nombreEjercicio}</p>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg mb-3">{error}</p>
        )}

        <input
          type="date"
          lang="es-ES"
          className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm mb-5"
          value={fecha}
          onChange={e => setFecha(e.target.value)}
        />

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFecha('')}
            disabled={!fecha}
            className="px-3 py-2 text-slate-500 hover:bg-slate-100 rounded-xl text-sm font-medium transition-colors disabled:opacity-40"
          >
            Sin fecha
          </button>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold text-sm disabled:opacity-40 flex items-center gap-2 transition-colors"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}