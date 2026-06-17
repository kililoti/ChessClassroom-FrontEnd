// Modal para subir material adicional: foto/vídeo o vídeo de YouTube.
// Va en: components/materiales/ModalSubirMaterial.tsx
'use client';

import { useState, useRef } from 'react';
import { X, Upload, Play, Image as ImageIcon, Video, AlertCircle, Loader2, Info } from 'lucide-react';

const API = `${process.env.NEXT_PUBLIC_API_URL}/materiales`;
const MAX_TAMANIO_MB = 50;

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';
}

interface Props {
  carpetaId: string;
  onClose: () => void;
  onSubido: () => void;
}

type Modo = 'archivo' | 'youtube';

export default function ModalSubirMaterial({ carpetaId, onClose, onSubido }: Props) {
  const [modo, setModo] = useState<Modo>('archivo');
  const [nombre, setNombre] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [tipoArchivo, setTipoArchivo] = useState<'foto' | 'video' | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [miniatura, setMiniatura] = useState<File | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');

  const inputArchivoRef = useRef<HTMLInputElement>(null);
  const inputMiniaturaRef = useRef<HTMLInputElement>(null);

  const handleArchivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_TAMANIO_MB * 1024 * 1024) {
      setError(`El archivo supera el tamaño máximo de ${MAX_TAMANIO_MB}MB.`);
      return;
    }

    const esVideo = file.type.startsWith('video/');
    const esFoto = file.type.startsWith('image/');

    if (!esVideo && !esFoto) {
      setError('Solo se permiten imágenes o vídeos.');
      return;
    }

    setError('');
    setArchivo(file);
    setTipoArchivo(esVideo ? 'video' : 'foto');

    // Si el nombre está vacío, sugerir el nombre del archivo sin extensión
    if (!nombre.trim()) {
      const sinExtension = file.name.replace(/\.[^/.]+$/, '');
      setNombre(sinExtension);
    }
  };

  const handleMiniaturaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('La miniatura debe ser una imagen.');
      return;
    }
    setError('');
    setMiniatura(file);
  };

  const validar = (): string | null => {
    if (!nombre.trim()) return 'El nombre es obligatorio.';
    if (modo === 'archivo' && !archivo) return 'Debes seleccionar una foto o vídeo.';
    if (modo === 'youtube' && !youtubeUrl.trim()) return 'Debes introducir una URL de YouTube.';
    if (modo === 'youtube') {
      const valido = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)[a-zA-Z0-9_-]{11}/.test(youtubeUrl);
      if (!valido) return 'La URL de YouTube no parece válida.';
    }
    return null;
  };

  const handleSubir = async () => {
    const errorValidacion = validar();
    if (errorValidacion) { setError(errorValidacion); return; }

    setSubiendo(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('nombre', nombre.trim());
      formData.append('carpeta_id', carpetaId);

      if (modo === 'archivo' && archivo && tipoArchivo) {
        formData.append('tipo', tipoArchivo);
        formData.append('archivo', archivo);
        if (miniatura) formData.append('miniatura', miniatura);

        const res = await fetch(`${API}/subir`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${getToken()}` },
          body: formData,
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Error al subir el archivo.');
      } else {
        formData.append('youtube_url', youtubeUrl.trim());
        if (miniatura) formData.append('miniatura', miniatura);

        const res = await fetch(`${API}/youtube`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${getToken()}` },
          body: formData,
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Error al añadir el vídeo.');
      }

      onSubido();
      onClose();
    } catch (e: any) {
      setError(e.message || 'Error al subir el material.');
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-800">Añadir material</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        {/* Tabs modo */}
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => { setModo('archivo'); setError(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl border transition-colors cursor-pointer
              ${modo === 'archivo' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
          >
            <Upload className="w-4 h-4" /> Subir foto/vídeo
          </button>
          <button
            onClick={() => { setModo('youtube'); setError(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl border transition-colors cursor-pointer
              ${modo === 'youtube' ? 'bg-red-500 text-white border-red-500' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
          >
            <Play className="w-4 h-4" /> Vídeo de YouTube
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-600">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        <div className="flex flex-col gap-4">

          {/* Nombre */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Ej: Sesión 4 - Finales de torre"
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
              autoFocus
            />
          </div>

          {/* Modo archivo */}
          {modo === 'archivo' && (
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                Archivo <span className="text-red-500">*</span>
              </label>
              <input
                ref={inputArchivoRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleArchivoChange}
                className="hidden"
              />
              <button
                onClick={() => inputArchivoRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-8 border-2 border-dashed border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/30 transition-colors cursor-pointer"
              >
                {archivo ? (
                  <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    {tipoArchivo === 'video' ? <Video className="w-5 h-5 text-blue-500" /> : <ImageIcon className="w-5 h-5 text-blue-500" />}
                    {archivo.name} ({(archivo.size / (1024 * 1024)).toFixed(1)} MB)
                  </span>
                ) : (
                  <span className="flex items-center gap-2 text-sm text-slate-400">
                    <Upload className="w-5 h-5" /> Haz click para seleccionar foto o vídeo (máx. {MAX_TAMANIO_MB}MB)
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Modo youtube */}
          {modo === 'youtube' && (
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">
                URL de YouTube <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={youtubeUrl}
                onChange={e => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-300"
              />
              <div className="mt-2 flex items-start gap-2 text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg">
                <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-blue-500" />
                <span>
                  Si el vídeo no debe ser público, súbelo a YouTube como <strong>"No listado"</strong> (no como "Privado").
                  Los vídeos no listados se pueden reproducir aquí dentro pero no aparecen en búsquedas.
                </span>
              </div>
            </div>
          )}

          {/* Miniatura opcional */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">
              Miniatura <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <input
              ref={inputMiniaturaRef}
              type="file"
              accept="image/*"
              onChange={handleMiniaturaChange}
              className="hidden"
            />
            <button
              onClick={() => inputMiniaturaRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/30 transition-colors cursor-pointer"
            >
              {miniatura ? (
                <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <ImageIcon className="w-4 h-4 text-blue-500" /> {miniatura.name}
                </span>
              ) : (
                <span className="flex items-center gap-2 text-xs text-slate-400">
                  <ImageIcon className="w-4 h-4" />
                  {modo === 'youtube'
                    ? 'Si no subes una, se usará la miniatura del vídeo de YouTube'
                    : tipoArchivo === 'foto'
                      ? 'Si no subes una, se usará la propia foto reducida'
                      : 'Si no subes una, se usará el primer fotograma del vídeo'}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
            Cancelar
          </button>
          <button
            onClick={handleSubir}
            disabled={subiendo}
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {subiendo && <Loader2 className="w-4 h-4 animate-spin" />}
            {subiendo ? 'Subiendo...' : 'Añadir material'}
          </button>
        </div>
      </div>
    </div>
  );
}