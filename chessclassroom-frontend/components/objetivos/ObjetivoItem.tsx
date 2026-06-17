'use client';

import { Check, X, Trash2 } from 'lucide-react';
import { Objetivo } from '@/types/objetivos';

interface Props {
  objetivo: Objetivo;
  esProfesor: boolean;
  onToggle: (id: string) => void;
  onEliminar: (id: string) => void;
}

const getEstado = (objetivo: Objetivo): 'completado' | 'expirado' | 'pendiente' => {
  if (objetivo.completado) return 'completado';
  if (objetivo.fecha_limite && new Date(objetivo.fecha_limite) < new Date()) return 'expirado';
  return 'pendiente';
};

export default function ObjetivoItem({ objetivo, esProfesor, onToggle, onEliminar }: Props) {
  const estado = getEstado(objetivo);

  const estilosContenedor = {
    completado: 'border-green-200 bg-green-50',
    expirado:   'border-red-200 bg-red-50',
    pendiente:  'border-slate-200 bg-white',
  };

  const estilosCheckbox = {
    completado: 'border-green-400 bg-green-100',
    expirado:   'border-red-400 bg-red-100',
    pendiente:  'border-slate-300 bg-white hover:border-slate-400',
  };

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${estilosContenedor[estado]}`}>
      {/* Checkbox */}
      <button
        onClick={() => esProfesor && onToggle(objetivo.id)}
        disabled={!esProfesor}
        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all
          ${estilosCheckbox[estado]}
          ${esProfesor ? 'cursor-pointer' : 'cursor-default'}
        `}
      >
        {estado === 'completado' && <Check className="w-3 h-3 text-green-600" />}
        {estado === 'expirado'   && <X    className="w-3 h-3 text-red-500" />}
      </button>

      {/* Título */}
      <span className={`flex-1 text-sm font-medium
        ${estado === 'completado' ? 'text-green-700 line-through' : ''}
        ${estado === 'expirado'   ? 'text-red-500' : ''}
        ${estado === 'pendiente'  ? 'text-slate-700' : ''}
      `}>
        {objetivo.titulo}
      </span>

      {/* Fecha límite */}
      {objetivo.fecha_limite && (
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium
          ${estado === 'completado' ? 'bg-green-100 text-green-600' : ''}
          ${estado === 'expirado'   ? 'bg-red-100 text-red-500' : ''}
          ${estado === 'pendiente'  ? 'bg-slate-100 text-slate-500' : ''}
        `}>
          {new Date(objetivo.fecha_limite).toLocaleDateString('es-ES')}
        </span>
      )}

      {/* Eliminar — solo profesor */}
      {esProfesor && (
        <button
          onClick={() => onEliminar(objetivo.id)}
          className="text-slate-300 hover:text-red-400 transition-colors cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}