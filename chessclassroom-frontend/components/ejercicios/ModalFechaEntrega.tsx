'use client';

import { useState } from 'react';
import { X, Calendar, Loader2, CalendarClock } from 'lucide-react';

const API_EJ = 'http://localhost:3001/api/ejercicios';

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';
}

export interface FechasGrupoPayload {
  fecha_inicio:  string | null;
  fecha_entrega: string | null;
}

interface Props {
  archivoId: string;
  nombreEjercicio: string;
  fechaInicioActual?: string | null;
  fechaEntregaActual?: string | null;
  onClose: () => void;
  onGuardada: () => void;
  // Props opcionales para modo grupo
  onGuardarGrupo?: (payload: FechasGrupoPayload) => Promise<void>;
  progresoGrupo?: { actual: number; total: number };
}

export default function ModalFechaEntrega({
  archivoId, nombreEjercicio,
  fechaInicioActual, fechaEntregaActual,
  onClose, onGuardada,
  onGuardarGrupo, progresoGrupo,
}: Props) {

  const fInicioInicial = fechaInicioActual
    ? new Date(fechaInicioActual).toISOString().slice(0, 10)
    : '';
  const fEntregaInicial = fechaEntregaActual
    ? new Date(fechaEntregaActual).toISOString().slice(0, 10)
    : '';

  const [fechaInicio, setFechaInicio]   = useState(fInicioInicial);
  const [fechaEntrega, setFechaEntrega] = useState(fEntregaInicial);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');

  const guardar = async () => {
    if (fechaInicio && fechaEntrega && new Date(fechaInicio) > new Date(fechaEntrega)) {
      setError('La fecha de inicio no puede ser posterior a la fecha límite.');
      return;
    }
    setLoading(true); setError('');
    try {
      // 00:00:00 para inicio, 23:59:59 para entrega
      const payload: FechasGrupoPayload = {
        fecha_inicio:  fechaInicio  ? new Date(`${fechaInicio}T00:00:00`).toISOString()  : null,
        fecha_entrega: fechaEntrega ? new Date(`${fechaEntrega}T23:59:59`).toISOString() : null,
      };

      if (onGuardarGrupo) {
        // Modo grupo: delega la llamada al padre (ModalFechasGrupo)
        await onGuardarGrupo(payload);
      } else {
        // Modo individual: llama directamente al endpoint
        const res = await fetch(`${API_EJ}/${archivoId}/fechas`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify(payload),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error ?? 'Error al guardar las fechas');
        onGuardada();
        onClose();
      }
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const esModoGrupo = !!onGuardarGrupo;

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
            <CalendarClock className="w-5 h-5 text-blue-600" />
            {esModoGrupo ? 'Asignar fechas' : 'Configurar fechas'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-slate-500 mb-5 truncate">{nombreEjercicio}</p>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg mb-3">{error}</p>
        )}

        <div className="space-y-4 mb-6">
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1 mb-1">
              <Calendar className="w-3.5 h-3.5 text-blue-500" /> Fecha inicio:
            </label>
            <input
              type="date"
              lang="es-ES"
              className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm"
              value={fechaInicio}
              onChange={e => setFechaInicio(e.target.value)}
            />
            {fechaInicio && (
              <p className="text-[11px] text-slate-400 mt-1 ml-1">Disponible desde las 00:00</p>
            )}
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1 mb-1">
              <Calendar className="w-3.5 h-3.5 text-red-500" /> Fecha límite:
            </label>
            <input
              type="date"
              lang="es-ES"
              className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm"
              value={fechaEntrega}
              onChange={e => setFechaEntrega(e.target.value)}
            />
            {fechaEntrega && (
              <p className="text-[11px] text-slate-400 mt-1 ml-1">Vence a las 23:59</p>
            )}
          </div>
        </div>

        {/* Barra de progreso en modo grupo */}
        {esModoGrupo && progresoGrupo && loading && (
          <div className="mb-4">
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${(progresoGrupo.actual / progresoGrupo.total) * 100}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1 text-center">
              {progresoGrupo.actual} / {progresoGrupo.total}
            </p>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={() => { setFechaInicio(''); setFechaEntrega(''); }}
            disabled={!fechaInicio && !fechaEntrega}
            className="px-3 py-2 text-slate-500 hover:bg-slate-100 rounded-xl text-sm font-medium transition-colors disabled:opacity-40"
          >
            Limpiar
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