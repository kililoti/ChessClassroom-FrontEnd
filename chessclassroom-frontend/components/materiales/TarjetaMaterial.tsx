'use client';

import { useState, useEffect } from 'react';
import { Eye, EyeOff, Trash2, Pencil, Play, Image as ImageIcon, Check, X } from 'lucide-react';
import { Material, ICONOS_TIPO, ETIQUETAS_TIPO, formatFechaMaterial, formatTamanio } from '@/types/materiales';

const API = `${process.env.NEXT_PUBLIC_API_URL}/materiales`;
const IMAGEN_DEFECTO = '/imagenes/material-default-ajedrez.jpg'; // imagen de respaldo relacionada con ajedrez

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';
}

interface Props {
  material: Material;
  esProfesor: boolean;
  onClick: () => void;
  onToggleVisibilidad: () => void;
  onEliminar: () => void;
  onRenombrar: (nuevoNombre: string) => void;
}

export default function TarjetaMaterial({ material, esProfesor, onClick, onToggleVisibilidad, onEliminar, onRenombrar }: Props) {
  const [miniaturaUrl, setMiniaturaUrl] = useState<string | null>(null);
  const [cargandoMiniatura, setCargandoMiniatura] = useState(true);
  const [editando, setEditando] = useState(false);
  const [nombreEditado, setNombreEditado] = useState(material.nombre);

  useEffect(() => {
    fetch(`${API}/${material.id}/miniatura`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then(d => setMiniaturaUrl(d.success ? d.url : null))
      .catch(() => setMiniaturaUrl(null))
      .finally(() => setCargandoMiniatura(false));
  }, [material.id]);

  const guardarNombre = () => {
    if (!nombreEditado.trim()) return;
    onRenombrar(nombreEditado.trim());
    setEditando(false);
  };

  const imagenMostrada = miniaturaUrl ?? IMAGEN_DEFECTO;

  return (
    <div className="group bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-300">

      {/* Miniatura */}
      <button onClick={onClick} className="relative block w-full aspect-video bg-slate-100 overflow-hidden">
        {cargandoMiniatura ? (
          <div className="w-full h-full flex items-center justify-center bg-slate-100 animate-pulse">
            <ImageIcon className="w-8 h-8 text-slate-300" />
          </div>
        ) : (
          <img
            src={imagenMostrada}
            alt={material.nombre}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => { (e.target as HTMLImageElement).src = IMAGEN_DEFECTO; }}
          />
        )}

        {/* Overlay de play para vídeos / youtube */}
        {(material.tipo === 'video' || material.tipo === 'youtube') && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
            <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <Play className="w-5 h-5 text-slate-800 fill-slate-800 ml-0.5" />
            </div>
          </div>
        )}

        {/* Badge tipo */}
        <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-lg text-white text-xs font-semibold">
          {material.tipo === 'youtube'
            ? <Play className="w-3.5 h-3.5 text-red-400 fill-red-400" />
            : <span>{ICONOS_TIPO[material.tipo]}</span>}
          {ETIQUETAS_TIPO[material.tipo]}
        </div>

        {/* Badge oculto */}
        {!material.visible && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-amber-500/90 backdrop-blur-sm rounded-lg text-white text-xs font-semibold flex items-center gap-1">
            <EyeOff className="w-3 h-3" /> Oculto
          </div>
        )}
      </button>

      {/* Info */}
      <div className="p-4">
        {editando ? (
          <div className="flex items-center gap-1.5 mb-1">
            <input
              type="text"
              value={nombreEditado}
              onChange={e => setNombreEditado(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') guardarNombre(); if (e.key === 'Escape') { setEditando(false); setNombreEditado(material.nombre); } }}
              className="flex-1 text-sm font-bold px-2 py-1 rounded-lg border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-300"
              autoFocus
            />
            <button onClick={guardarNombre} className="p-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600"><Check className="w-3.5 h-3.5" /></button>
            <button onClick={() => { setEditando(false); setNombreEditado(material.nombre); }} className="p-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200"><X className="w-3.5 h-3.5" /></button>
          </div>
        ) : (
          <h3 className="font-bold text-slate-900 truncate mb-1" title={material.nombre}>
            {material.nombre}
          </h3>
        )}

        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>{formatFechaMaterial(material.created_at)}</span>
          {material.tamanio && <span>{formatTamanio(material.tamanio)}</span>}
        </div>

        {/* Acciones profesor */}
        {esProfesor && !editando && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-end gap-1">
            <button
              onClick={() => setEditando(true)}
              className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
              title="Renombrar"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onToggleVisibilidad}
              className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
              title={material.visible ? 'Ocultar' : 'Mostrar'}
            >
              {material.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onEliminar}
              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Eliminar"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}