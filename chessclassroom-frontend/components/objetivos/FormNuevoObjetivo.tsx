'use client';

import { useState } from 'react';
import { Check, X } from 'lucide-react';

interface Props {
  onGuardar: (titulo: string, fechaLimite: string) => void;
  onCancelar: () => void;
}

export default function FormNuevoObjetivo({ onGuardar, onCancelar }: Props) {
  const [titulo, setTitulo] = useState('');
  const [fechaLimite, setFechaLimite] = useState('');

  const handleGuardar = () => {
    if (!titulo.trim()) return;
    onGuardar(titulo.trim(), fechaLimite);
  };

  return (
    <div className="flex flex-col gap-2 mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
      <input
        type="text"
        placeholder="Nombre del objetivo..."
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        className="w-full text-sm text-black px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
        autoFocus
      />
      <input
        type="date"
        value={fechaLimite}
        onChange={(e) => setFechaLimite(e.target.value)}
        className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white text-black"
      />
      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancelar}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" /> Cancelar
        </button>
        <button
          onClick={handleGuardar}
          disabled={!titulo.trim()}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-500 text-black rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <Check className="w-4 h-4" /> Guardar
        </button>
      </div>
    </div>
  );
}