'use client';

import { useState } from 'react';
import { Plus, Check, X, Trash2, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { RutinaChecklist } from '@/types/rutinas';

interface Props {
  rutinas: RutinaChecklist[];
  esProfesor: boolean;
  semanaActual: string;
  onToggle: (semanaId: string) => void;
  onEliminar: (rutinaId: string) => void;
  onCrear: (titulo: string) => void;
  onSemanaAnterior: () => void;
  onSemanaSiguiente: () => void;
  onVolverHoy: () => void;
}

export default function ChecklistRutinas({
  rutinas, esProfesor, semanaActual, onToggle, onEliminar, onCrear,
  onSemanaAnterior, onSemanaSiguiente, onVolverHoy
}: Props) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nuevoTitulo, setNuevoTitulo] = useState('');

  const handleCrear = () => {
    if (!nuevoTitulo.trim()) return;
    onCrear(nuevoTitulo.trim());
    setNuevoTitulo('');
    setMostrarForm(false);
  };

  const getEstado = (rutina: RutinaChecklist): 'completado' | 'expirado' | 'pendiente' => {
    if (rutina.semana?.completado) return 'completado';

    // Solo expira si ya pasó el domingo de esa semana completo
    const lunes = new Date(semanaActual + 'T00:00:00');
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);
    domingo.setHours(23, 59, 59, 999);

    if (new Date() > domingo) return 'expirado';
    return 'pendiente';
  };

  // Calcular si estamos en la semana actual para mostrar el botón "Hoy"
  const getLunesHoy = (): string => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const dia = d.getDay();
    const diff = dia === 0 ? -6 : 1 - dia;
    d.setDate(d.getDate() + diff);
    return d.toISOString().split('T')[0];
  };

  const esSemanaActualHoy = semanaActual === getLunesHoy();

  // Calcular domingo de la semana para mostrar rango
  const lunes = new Date(semanaActual + 'T00:00:00');
  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);

  const formatFecha = (d: Date) => d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col h-full">

      {/* Cabecera con título */}
      <div className="px-4 py-3 border-b border-slate-100">
        <h2 className="font-bold text-slate-800 text-sm mb-2">Checklist semanal</h2>

        {/* Navegación de semanas */}
        <div className="flex items-center justify-between">
          <button
            onClick={onSemanaAnterior}
            className="p-1 rounded-lg hover:bg-slate-100 transition-colors text-slate-500"
            title="Semana anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex flex-col items-center gap-0.5">
            <span className="text-xs font-medium text-slate-700">
              {formatFecha(lunes)} — {formatFecha(domingo)}
            </span>
            {!esSemanaActualHoy && (
              <button
                onClick={onVolverHoy}
                className="flex items-center gap-0.5 text-[10px] text-blue-500 hover:text-blue-700 transition-colors"
                title="Volver a la semana actual"
              >
                <RotateCcw className="w-2.5 h-2.5" /> Hoy
              </button>
            )}
          </div>

          <button
            onClick={onSemanaSiguiente}
            className="p-1 rounded-lg hover:bg-slate-100 transition-colors text-slate-500"
            title="Semana siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Lista de rutinas */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {rutinas.length === 0 && !mostrarForm && (
          <p className="text-xs text-slate-400 text-center py-4">No hay rutinas esta semana.</p>
        )}

        {rutinas.map(rutina => {
          const estado = getEstado(rutina);
          return (
            <div key={rutina.id}
              className={`flex items-center gap-2 p-2 rounded-xl border transition-all
                ${estado === 'completado' ? 'border-green-200 bg-green-50' : ''}
                ${estado === 'expirado' ? 'border-red-200 bg-red-50' : ''}
                ${estado === 'pendiente' ? 'border-slate-200 bg-white' : ''}
              `}>

              {/* Checkbox — solo profesor puede marcar */}
              <button
                onClick={() => esProfesor && rutina.semana && onToggle(rutina.semana.id)}
                disabled={!esProfesor || !rutina.semana}
                title={!esProfesor ? 'Solo el profesor puede marcar rutinas' : ''}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all
                  ${estado === 'completado' ? 'border-green-400 bg-green-100' : ''}
                  ${estado === 'expirado' ? 'border-red-400 bg-red-100' : ''}
                  ${estado === 'pendiente' ? 'border-slate-300 bg-white' : ''}
                  ${esProfesor && rutina.semana ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}
                `}
              >
                {estado === 'completado' && <Check className="w-3 h-3 text-green-600" />}
                {estado === 'expirado' && <X className="w-3 h-3 text-red-500" />}
              </button>

              <span className={`flex-1 text-xs font-medium
                ${estado === 'completado' ? 'text-green-700 line-through' : ''}
                ${estado === 'expirado' ? 'text-red-500' : ''}
                ${estado === 'pendiente' ? 'text-slate-700' : ''}
              `}>
                {rutina.titulo}
              </span>

              {esProfesor && (
                <button
                  onClick={() => onEliminar(rutina.id)}
                  className="text-slate-300 hover:text-red-400 transition-colors"
                  title="Eliminar rutina"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}

        {/* Form inline para nueva rutina */}
        {mostrarForm && (
          <div className="flex flex-col gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
            <input
              type="text"
              placeholder="Nueva rutina..."
              value={nuevoTitulo}
              onChange={e => setNuevoTitulo(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCrear()}
              className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
              autoFocus
            />
            <div className="flex gap-1 justify-end">
              <button
                onClick={() => { setMostrarForm(false); setNuevoTitulo(''); }}
                className="text-xs px-2 py-1 text-slate-500 hover:text-slate-700 rounded hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleCrear}
                disabled={!nuevoTitulo.trim()}
                className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                Añadir
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Botón añadir rutina — solo profesor */}
      {esProfesor && !mostrarForm && (
        <div className="px-4 py-3 border-t border-slate-100">
          <button
            onClick={() => setMostrarForm(true)}
            className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 transition-colors"
          >
            <Plus className="w-3 h-3" /> Añadir rutina
          </button>
        </div>
      )}
    </div>
  );
}