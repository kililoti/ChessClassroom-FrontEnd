'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Trophy, Swords, History, Trash2, Loader2, Users, Clock, Filter, PlayCircle } from 'lucide-react'; // 👈 Añadido PlayCircle
import TablaPuntuaciones from '@/components/torneos/TablaPuntuaciones';
import TarjetaPartida from '@/components/partidas/TarjetaPartida';
import ChatContainer from '@/components/chat/ChatContainer';
import type { Partida } from '@/types/partidas';
import { useTorneoActivo } from '@/contexts/TorneoActivoContext';
import { useTorneoRealtime } from '@/hooks/useTorneoRealtime';

const API = `${process.env.NEXT_PUBLIC_API_URL}`;

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';
}
function getUsuario() {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem('usuario') ?? 'null'); } catch { return null; }
}

function formatTiempo(ms: number): string {
  const min = Math.floor(ms / 60000);
  const seg = Math.floor((ms % 60000) / 1000);
  if (seg === 0) return `${min}min`;
  return `${min}:${String(seg).padStart(2, '0')}`;
}

// Formatea la fecha en formato legible "DD de MMM de YYYY, HH:MM"
function formatFecha(fecha: string | null): string {
  if (!fecha) return '—';
  return new Date(fecha).toLocaleDateString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

interface Participante {
  usuario_id: string;
  puntos: number;
  partidas_jugadas: number;
  libre: boolean;
  ultimo_ping_at: string | null;
  usuarios: { id: string; nombre: string; apellidos: string };
}

interface Torneo {
  id: string;
  nombre: string;
  estado: 'configurando' | 'esperando' | 'activo' | 'finalizado';
  fecha_inicio: string | null;
  fecha_fin: string | null;
  tiempo_ms: number;
  incremento_ms: number;
  fen_inicial: string;
  creador_id: string;
  creador: { id: string; nombre: string; apellidos: string };
  clase_id: string;
  torneo_participantes: Participante[];
}

export default function TorneoPage() {
  const params    = useParams();
  const router    = useRouter();
  const claseId   = params.id as string;
  const torneoId  = params.torneoId as string;

  const usuario    = getUsuario();
  const esProfesor = usuario?.rol === 'profesor';
  const { setTorneoActivoId, setPingActivo } = useTorneoActivo();

  // Registrar torneo activo y activar pings
  useEffect(() => {
    setTorneoActivoId(torneoId);
    setPingActivo(true);
    return () => { setTorneoActivoId(null); setPingActivo(false); };
  }, [torneoId, setTorneoActivoId, setPingActivo]);

  const [torneo, setTorneo]         = useState<Torneo | null>(null);
  const [partidas, setPartidas]     = useState<Partida[]>([]);
  const [salaChat, setSalaChat]     = useState<string | null>(null);
  const [tab, setTab]               = useState<'activas' | 'historial'>('activas');
  const [loading, setLoading]       = useState(true);
  const [eliminando, setEliminando] = useState(false);
  const [error, setError]           = useState('');
  
  // Estado para controlar el filtro de participantes del historial
  const [filtroParticipanteId, setFiltroParticipanteId] = useState<string>('todos');

  // Limpiar torneo activo del localStorage cuando el torneo finaliza
  useEffect(() => {
    if (torneo?.estado === 'finalizado') {
      setTorneoActivoId(null);
      setPingActivo(false);
    }
  }, [torneo?.estado, setTorneoActivoId, setPingActivo]);

  const fetchTorneo = useCallback(async () => {
    try {
      const res = await fetch(`${API}/torneos/${torneoId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'No se pudo cargar el torneo');
      setTorneo(d.torneo);
    } catch (e: any) { setError(e.message); }
  }, [torneoId]);

  const fetchPartidas = useCallback(async () => {
    try {
      const historial = tab === 'historial';
      const res = await fetch(`${API}/torneos/${torneoId}/partidas?historial=${historial}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const d = await res.json();
      if (res.ok) setPartidas(d.partidas ?? []);
    } catch {}
  }, [torneoId, tab]);

  const fetchSalaChat = useCallback(async () => {
    try {
      const res = await fetch(`${API}/torneos/${torneoId}/chat`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const d = await res.json();
      if (res.ok && d.sala_id) setSalaChat(d.sala_id);
    } catch {}
  }, [torneoId]);

  useEffect(() => {
    Promise.all([fetchTorneo(), fetchSalaChat()]).finally(() => setLoading(false));
  }, [fetchTorneo, fetchSalaChat]);

  useEffect(() => { fetchPartidas(); }, [fetchPartidas]);

  // Actualización en tiempo real: nuevos emparejamientos, fin de partidas, puntuaciones
  useTorneoRealtime({
    torneoId,
    onPartidaCambiada: fetchPartidas,
    onParticipantesCambiados: fetchTorneo, 
    onEvento: useCallback((evento) => {
      switch (evento.tipo) {
        case 'EMPAREJAMIENTO':
          fetchPartidas();
          break;
        case 'PARTIDA_FIN':
          fetchPartidas();
          fetchTorneo();
          break;
        case 'PUNTUACIONES':
          fetchTorneo();
          break;
        case 'INICIO_TORNEO':
        case 'FIN_TORNEO':
          fetchTorneo();
          break;
      }
    }, [fetchPartidas, fetchTorneo]),
  });

  const eliminar = async () => {
    if (!confirm('¿Eliminar este torneo? Esta acción no se puede deshacer.')) return;
    setEliminando(true);
    try {
      await fetch(`${API}/torneos/${torneoId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      router.push(`/clases/${claseId}/torneos`);
    } catch {}
    finally { setEliminando(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-500 font-medium animate-pulse">Cargando torneo...</div>
      </div>
    );
  }

  if (error || !torneo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-red-500 font-medium">{error || 'No se pudo cargar el torneo.'}</div>
      </div>
    );
  }

  const misPartidas = partidas.filter(p =>
    p.jugador_blancas_id === usuario?.id || p.jugador_negras_id === usuario?.id
  );
  const otrasPartidas = partidas.filter(p =>
    p.jugador_blancas_id !== usuario?.id && p.jugador_negras_id !== usuario?.id
  );

  const partidasHistorialFiltradas = partidas.filter(p => {
    if (filtroParticipanteId === 'todos') return true;
    return p.jugador_blancas_id === filtroParticipanteId || p.jugador_negras_id === filtroParticipanteId;
  });

  const tiempoLabel = `${formatTiempo(torneo.tiempo_ms)}${torneo.incremento_ms > 0 ? ` +${torneo.incremento_ms / 1000}s` : ''}`;
  const numParticipantes = torneo.torneo_participantes?.length ?? 0;
  const torneoActivo = torneo.estado === 'activo';

  const estadoBadge = {
    configurando: { label: 'Configurando', color: 'bg-slate-100 text-slate-600' },
    esperando:    { label: 'En espera',    color: 'bg-blue-100 text-blue-700' },
    activo:       { label: <span className="flex items-center gap-1"><PlayCircle className="w-3.5 h-3.5" /> Activo</span>, color: 'bg-blue-50 text-blue-700 border border-blue-200' },
    finalizado:   { label: 'Finalizado',   color: 'bg-slate-100 text-slate-500' },
  }[torneo.estado as 'configurando' | 'esperando' | 'activo' | 'finalizado'];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">

      {/* Cabecera */}
      <div className="bg-white border-b border-slate-200 shadow-sm px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/clases/${claseId}/torneos`)}
              className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm text-slate-600 cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6"/>
              </svg>
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                <Trophy className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-slate-900">{torneo.nombre}</h1>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5 flex-wrap">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {numParticipantes} participantes</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {tiempoLabel}</span>
                  {torneo.fecha_inicio && <span>Inicio: {formatFecha(torneo.fecha_inicio)}</span>}
                  {/* Se añade dinámicamente la fecha de fin si existe */}
                  {torneo.fecha_fin && <span>Fin: {formatFecha(torneo.fecha_fin)}</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-3 py-1.5 text-xs font-bold rounded-full ${estadoBadge.color}`}>
              {estadoBadge.label}
            </span>

            {esProfesor && torneo.estado !== 'activo' && (
              <button
                onClick={eliminar}
                disabled={eliminando}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                title="Eliminar torneo"
              >
                {eliminando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-xl">{error}</div>
        </div>
      )}

      {/* Layout de 3 Columnas (Chat Izquierda - Partidas Centro - Puntuaciones Derecha) */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* 1. COLUMNA IZQUIERDA: Chat del torneo */}
          <div className="lg:col-span-3 sticky top-6">
            {salaChat ? (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col">
                <div className="bg-slate-50/80 border-b border-slate-100 p-4 flex items-center gap-2 rounded-t-2xl shrink-0">
                  <span className="text-xl">💬</span>
                  <h2 className="font-bold text-slate-800">Chat del torneo</h2>
                </div>
                <ChatContainer salaId={salaChat} />
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 text-slate-400 text-sm text-center">
                Cargando chat del torneo...
              </div>
            )}
          </div>

          {/* 2. COLUMNA CENTRAL: Partidas e Historial filtrable */}
          <div className="lg:col-span-6">

            {/* Pestañas de Navegación y Filtros */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit shadow-sm">
                <button
                  onClick={() => { setTab('activas'); setFiltroParticipanteId('todos'); }}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                    tab === 'activas' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <span className="flex items-center gap-2"><Swords className="w-4 h-4" /> Activas</span>
                </button>
                <button
                  onClick={() => setTab('historial')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                    tab === 'historial' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <span className="flex items-center gap-2"><History className="w-4 h-4" /> Historial</span>
                </button>
              </div>

              {/* Filtro Dropdown selectivo por Participante (Visible solo en Historial) */}
              {tab === 'historial' && torneo.torneo_participantes && torneo.torneo_participantes.length > 0 && (
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm w-full sm:w-auto animate-in fade-in duration-200">
                  <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                  <select
                    className="bg-transparent text-sm font-medium text-slate-700 outline-none w-full cursor-pointer pr-4"
                    value={filtroParticipanteId}
                    onChange={(e) => setFiltroParticipanteId(e.target.value)}
                  >
                    <option value="todos">Todos los participantes</option>
                    {torneo.torneo_participantes.map(p => (
                      <option key={p.usuario_id} value={p.usuario_id}>
                        {p.usuarios?.nombre} {p.usuarios?.apellidos}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {tab === 'activas' ? (
              <div className="space-y-8">
                {/* Mis partidas activas */}
                {misPartidas.length > 0 && (
                  <section>
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Swords className="w-4 h-4 text-blue-600" /> Mi partida
                    </h2>
                    <div className="space-y-3">
                      {misPartidas.map(p => (
                        <TarjetaPartida
                          key={p.id}
                          partida={p}
                          usuarioId={usuario?.id}
                          esProfesor={esProfesor}
                          onEntrar={() => router.push(`/clases/${claseId}/partidas/${p.id}${salaChat ? `?chatTorneo=${salaChat}` : ''}`)}
                          onEliminada={fetchPartidas}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Otras partidas activas */}
                {otrasPartidas.length > 0 && (
                  <section>
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Swords className="w-4 h-4 text-blue-500" /> Activas — puedes espectar
                    </h2>
                    <div className="space-y-3">
                      {otrasPartidas.map(p => (
                        <TarjetaPartida
                          key={p.id}
                          partida={p}
                          usuarioId={usuario?.id}
                          esProfesor={esProfesor}
                          onEntrar={() => router.push(`/clases/${claseId}/partidas/${p.id}${salaChat ? `?chatTorneo=${salaChat}` : ''}`)}
                          onEliminada={fetchPartidas}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {partidas.length === 0 && (
                  <div className="text-center py-16 text-slate-400">
                    <Swords className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">
                      {torneoActivo ? 'Esperando emparejamientos...' : 'El torneo aún no ha comenzado'}
                    </p>
                    {torneoActivo && (
                      <p className="text-sm mt-1">El sistema emparejará jugadores automáticamente</p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              // Historial de Partidas Finalizadas Filtradas
              <div className="space-y-3">
                {partidasHistorialFiltradas.length === 0 ? (
                  <div className="text-center py-16 text-slate-400">
                    <History className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">
                      {filtroParticipanteId === 'todos' 
                        ? 'No hay partidas finalizadas' 
                        : 'Este participante no tiene partidas finalizadas registradas'}
                    </p>
                  </div>
                ) : (
                  partidasHistorialFiltradas.map(p => (
                    <TarjetaPartida
                      key={p.id}
                      partida={p}
                      usuarioId={usuario?.id}
                      esProfesor={esProfesor}
                      onEntrar={() => router.push(`/clases/${claseId}/partidas/${p.id}${salaChat ? `?chatTorneo=${salaChat}` : ''}`)}
                      onEliminada={fetchPartidas}
                    />
                  ))
                )}
              </div>
            )}
          </div>

          {/* 3. COLUMNA DERECHA: Tablero de Clasificación */}
          <div className="lg:col-span-3 sticky top-6">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="bg-slate-50/80 border-b border-slate-100 p-4 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-blue-600" />
                <h2 className="font-bold text-slate-800">Clasificación</h2>
              </div>
              <div className="p-3">
                <TablaPuntuaciones
                  participantes={torneo.torneo_participantes ?? []}
                  usuarioId={usuario?.id}
                  torneoActivo={torneoActivo}
                />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}