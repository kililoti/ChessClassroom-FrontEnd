'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface Props {
  claseId: string;
  alumnoId: string | null; // null = tablón de grupo
  onCrear: (titulo: string, descripcion: string, fechaLimite: string) => void;
  onCerrar: () => void;
}

export default function ModalNuevoTablon({ onCrear, onCerrar }: Props) {
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaLimite, setFechaLimite] = useState('');

  const handleCrear = () => {
    if (!titulo.trim()) return;
    onCrear(titulo.trim(), descripcion.trim(), fechaLimite);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mx-4">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-800">Nuevo tablón de objetivos</h2>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Título *</label>
            <input
              type="text"
              placeholder="Ej: Objetivos de ELO, Teoría de aperturas..."
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full text-sm text-black px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-300"
              autoFocus
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Descripción</label>
            <textarea
              placeholder="Descripción opcional del tablón..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              className="w-full text-sm px-3 py-2 text-black rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Fecha límite general</label>
            <input
              type="date"
              value={fechaLimite}
              onChange={(e) => setFechaLimite(e.target.value)}
              className="w-full text-sm px-3 py-2 text-black rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-300 text-slate-600"
            />
          </div>
        </div>

        {/* Botones */}
        <div className="flex gap-3 justify-end mt-6">
          <button
            onClick={onCerrar}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleCrear}
            disabled={!titulo.trim()}
            className="px-4 py-2 text-sm bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-colors font-medium disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            Crear tablón
          </button>
        </div>
      </div>
    </div>
  );
}