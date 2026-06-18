'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { TablonObjetivos } from '@/types/objetivos';

interface Props {
  tablon: TablonObjetivos;
  onGuardar: (titulo: string, descripcion: string, fechaLimite: string) => void;
  onCerrar: () => void;
}

export default function ModalEditarTablon({ tablon, onGuardar, onCerrar }: Props) {
  const [titulo, setTitulo] = useState(tablon.titulo);
  const [descripcion, setDescripcion] = useState(tablon.descripcion ?? '');
  const [fechaLimite, setFechaLimite] = useState(tablon.fecha_limite ?? '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mx-4">

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-800">Editar tablón</h2>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Título *</label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg border text-black border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Descripción</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              className="w-full text-sm text-black px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Fecha límite</label>
            <input
              type="date"
              value={fechaLimite}
              onChange={(e) => setFechaLimite(e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300 text-slate-600 cursor-pointer"
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <button
            onClick={onCerrar}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={() => onGuardar(titulo, descripcion, fechaLimite)}
            disabled={!titulo.trim()}
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}