'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Play, Pause, Volume2, VolumeX, Maximize, Minimize, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Material } from '@/types/materiales';

const API = `${process.env.NEXT_PUBLIC_API_URL}/materiales`;

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';
}

interface Props {
  material: Material;
  onClose: () => void;
}

const VELOCIDADES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export default function ReproductorMaterial({ material, onClose }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const contenedorVideoRef = useRef<HTMLDivElement>(null);
  const [reproduciendo, setReproduciendo] = useState(false);
  const [tiempoActual, setTiempoActual] = useState(0);
  const [duracion, setDuracion] = useState(0);
  const [volumen, setVolumen] = useState(1);
  const [muteado, setMuteado] = useState(false);
  const [velocidad, setVelocidad] = useState(1);
  const [enPantallaCompleta, setEnPantallaCompleta] = useState(false);

  const [zoom, setZoom] = useState(1);
  const [posicion, setPosicion] = useState({ x: 0, y: 0 });
  const arrastrando = useRef(false);
  const ultimaPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (material.tipo === 'youtube') {
      setCargando(false);
      return;
    }
    fetch(`${API}/${material.id}/url`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then(d => {
        if (d.success) setUrl(d.url);
        else setError(d.message || 'No se pudo cargar el recurso.');
      })
      .catch(() => setError('No se pudo cargar el recurso.'))
      .finally(() => setCargando(false));
  }, [material.id, material.tipo]);

  // Escuchar cambios de pantalla completa para actualizar el icono
  useEffect(() => {
    const handleFullscreenChange = () => {
      setEnPantallaCompleta(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setReproduciendo(true); }
    else { v.pause(); setReproduciendo(false); }
  };

  const cambiarVolumen = (val: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = val;
    v.muted = val === 0;
    setVolumen(val);
    setMuteado(val === 0);
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    const nuevoMuteado = !v.muted;
    v.muted = nuevoMuteado;
    setMuteado(nuevoMuteado);
    // Si desmutea y el volumen era 0, subir a 0.5
    if (!nuevoMuteado && volumen === 0) {
      v.volume = 0.5;
      setVolumen(0.5);
    }
  };

  const cambiarVelocidad = (vel: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = vel;
    setVelocidad(vel);
  };

  const seek = (segundos: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = segundos;
    setTiempoActual(segundos);
  };

  const formatTiempo = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  const toggleFullscreen = () => {
    const v = videoRef.current;
    const el = contenedorVideoRef.current;
    if (!v || !el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      // Intentar primero el contenedor, luego el vídeo directamente
      (el.requestFullscreen?.() ?? v.requestFullscreen?.())
        ?.catch(err => console.error('Fullscreen error:', err));
    }
  };

  const acercar  = () => setZoom(z => Math.min(z + 0.25, 4));
  const alejar   = () => setZoom(z => {
    const nuevo = Math.max(z - 0.25, 1);
    if (nuevo === 1) setPosicion({ x: 0, y: 0 });
    return nuevo;
  });
  const resetZoom = () => { setZoom(1); setPosicion({ x: 0, y: 0 }); };

  const onMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    arrastrando.current = true;
    ultimaPos.current = { x: e.clientX, y: e.clientY };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!arrastrando.current) return;
    const dx = e.clientX - ultimaPos.current.x;
    const dy = e.clientY - ultimaPos.current.y;
    setPosicion(p => ({ x: p.x + dx, y: p.y + dy }));
    ultimaPos.current = { x: e.clientX, y: e.clientY };
  };
  const onMouseUp = () => { arrastrando.current = false; };
  const onWheel   = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) acercar(); else alejar();
  };

  const youtubeId = material.youtube_id
    ?? material.youtube_url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/)?.[1]
    ?? null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col">

      {/* Cabecera */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-white font-bold truncate max-w-[60vw]">{material.nombre}</h2>
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 flex items-center justify-center overflow-hidden relative">

        {cargando && (
          <div className="text-slate-400 animate-pulse">Cargando...</div>
        )}

        {error && (
          <div className="text-red-400 text-center px-4">{error}</div>
        )}

        {/* YouTube embebido */}
        {!cargando && !error && material.tipo === 'youtube' && youtubeId && (
          <div className="w-full h-full max-w-6xl mx-auto flex items-center justify-center p-4">
            <div className="w-full aspect-video">
              <iframe
                className="w-full h-full rounded-xl"
                src={`https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&modestbranding=1&enablejsapi=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`}
                title={material.nombre}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          </div>
        )}

        {/* YouTube sin ID válido */}
        {!cargando && !error && material.tipo === 'youtube' && !youtubeId && (
          <div className="text-red-400 text-center px-4">
            No se pudo obtener el ID del vídeo de YouTube. Comprueba la URL guardada.
          </div>
        )}

        {/* Vídeo subido */}
        {!cargando && !error && material.tipo === 'video' && url && (
          <div ref={contenedorVideoRef} className="w-full h-full flex flex-col items-center justify-center bg-black">
            <video
              ref={videoRef}
              src={url}
              className="max-w-full max-h-[calc(100vh-180px)] cursor-pointer"
              onTimeUpdate={e => setTiempoActual(e.currentTarget.currentTime)}
              onLoadedMetadata={e => {
                setDuracion(e.currentTarget.duration);
                const v = e.currentTarget;
                v.volume = 1;
                v.muted = false;
                setVolumen(1);
                setMuteado(false);
              }}
              onPlay={() => setReproduciendo(true)}
              onPause={() => setReproduciendo(false)}
              onClick={togglePlay}
            />
            {/* Barra de controles — DENTRO del contenedor */}
            <div className="w-full max-w-4xl mt-3 px-4 flex flex-col gap-2">
              <input
                type="range" min={0} max={duracion || 0} value={tiempoActual}
                onChange={e => seek(Number(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer h-1.5"
              />
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <button onClick={togglePlay} className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors">
                    {reproduciendo ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <span className="text-xs text-slate-400 font-mono">
                    {formatTiempo(tiempoActual)} / {formatTiempo(duracion)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={toggleMute} className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors">
                    {muteado || volumen === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <input
                    type="range" min={0} max={1} step={0.02}
                    value={muteado ? 0 : volumen}
                    onChange={e => cambiarVolumen(Number(e.target.value))}
                    className="w-24 accent-blue-500 cursor-pointer"
                  />
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  {VELOCIDADES.map(v => (
                    <button
                      key={v} onClick={() => cambiarVelocidad(v)}
                      className={`px-2 py-1 text-xs font-bold rounded-lg transition-colors
                        ${velocidad === v ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                    >
                      {v}x
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => {
                    console.log('CLICK FULLSCREEN');
                    toggleFullscreen();
                  }}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
                >
                  {enPantallaCompleta ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Foto con zoom */}
        {!cargando && !error && material.tipo === 'foto' && url && (
          <div
            className="w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
            onMouseDown={onMouseDown} onMouseMove={onMouseMove}
            onMouseUp={onMouseUp} onMouseLeave={onMouseUp} onWheel={onWheel}
          >
            <img
              src={url} alt={material.nombre}
              className="max-w-full max-h-full select-none transition-transform duration-100"
              style={{ transform: `translate(${posicion.x}px, ${posicion.y}px) scale(${zoom})` }}
              draggable={false}
            />
            <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-slate-900/80 backdrop-blur-sm rounded-xl p-2">
              <button onClick={alejar} className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors" title="Alejar">
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs text-slate-300 font-mono w-12 text-center">{Math.round(zoom * 100)}%</span>
              <button onClick={acercar} className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors" title="Acercar">
                <ZoomIn className="w-4 h-4" />
              </button>
              <button onClick={resetZoom} className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors" title="Restablecer">
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}