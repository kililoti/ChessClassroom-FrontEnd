'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Swords, BookMarked, Handshake, PlayCircle } from 'lucide-react';
import VistaPartida from '@/components/partidas/VistaPartida';
import ChatContainer from '@/components/chat/ChatContainer';
import ModalGuardarPartidaEstudio from '@/components/partidas/ModalGuardarPartidaEstudio';
import { useTorneoActivo } from '@/contexts/TorneoActivoContext';

const API = `${process.env.NEXT_PUBLIC_API_URL}`;

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';
}
function getUsuario() {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem('usuario') ?? 'null'); } catch { return null; }
}

interface Jugador {
  id: string;
  nombre: string;
  apellidos: string;
}

interface Partida {
  id: string;
  clase_id: string;
  creador_id: string;
  estado: 'esperando' | 'iniciada' | 'finalizada' | 'abortada';
  resultado: string | null;
  motivo_fin: string | null;
  fen_inicial: string;
  pgn_inicial: string | null;
  pgn_final: string | null;
  tiempo_blancas_ms: number;
  tiempo_negras_ms: number;
  incremento_ms: number;
  tiempo_restante_blancas_ms: number;
  tiempo_restante_negras_ms: number;
  timestamp_ultimo_movimiento: string | null;
  turno: 'w' | 'b';
  primer_movimiento_blancas: boolean;
  primer_movimiento_negras: boolean;
  jugador_blancas_id: string | null;
  jugador_negras_id: string | null;
  blancas: Jugador | null;
  negras: Jugador | null;
  creador: Jugador;
  torneo_id: string | null;
}

interface InfoTablas {
  ofrecioTablas: string | null;
  tablasRechazadas: boolean;
  aceptarTablas: () => void;
  rechazarTablas: () => void;
}

export default function PartidaPage() {
  const params    = useParams();
  const router    = useRouter();
  const searchParams = useSearchParams();
  const claseId   = params.id as string;
  const partidaId = params.partidaId as string;

  const usuario    = getUsuario();
  const esProfesor = usuario?.rol === 'profesor';

  const [partida, setPartida]           = useState<Partida | null>(null);
  const [salaChat, setSalaChat]             = useState<string | null>(null);
  const salaChatTorneoFromParams            = searchParams.get('chatTorneo');
  const [salaChatTorneoFetched, setSalaChatTorneoFetched] = useState<string | null>(null);
  const salaChatTorneo                      = salaChatTorneoFromParams ?? salaChatTorneoFetched;
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [modalGuardar, setModalGuardar] = useState(false);
  const [finalizada, setFinalizada]     = useState(false);
  const emitirPresenteRef  = useRef<(() => void) | null>(null);

  const [infoTablas, setInfoTablas] = useState<InfoTablas | null>(null);
  const [opacidadRechazo, setOpacidadRechazo] = useState('opacity-100');

  useEffect(() => {
    if (infoTablas?.tablasRechazadas) {
      setOpacidadRechazo('opacity-100');
      const fadeTimer = setTimeout(() => {
        setOpacidadRechazo('opacity-0');
      }, 3500);
      return () => clearTimeout(fadeTimer);
    }
  }, [infoTablas?.tablasRechazadas]);

  const cargarPartida = useCallback(async () => {
    try {
      const res = await fetch(`${API}/partidas/${partidaId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'No se pudo cargar la partida');
      const p = d.partida;
      setPartida(p);
      if (['finalizada', 'abortada'].includes(p.estado)) setFinalizada(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [partidaId]);

  const cargarSalaChat = useCallback(async () => {
    try {
      const res = await fetch(`${API}/partidas/${partidaId}/chat`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const d = await res.json();
      if (res.ok && d.sala_id) setSalaChat(d.sala_id);
    } catch {}
  }, [partidaId]);

  useEffect(() => {
    cargarPartida();
    cargarSalaChat();
  }, [cargarPartida, cargarSalaChat]);

  // Cargar el chat del torneo si no vino como query param
  useEffect(() => {
    if (salaChatTorneoFromParams || !partida?.torneo_id) return;
    fetch(`${API}/torneos/${partida.torneo_id}/chat`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(r => r.json())
      .then(d => { if (d.sala_id) setSalaChatTorneoFetched(d.sala_id); })
      .catch(() => {});
  }, [partida?.torneo_id, salaChatTorneoFromParams]);

  // Mantener torneoActivoId para que el widget reciba eventos de emparejamiento
  const { setTorneoActivoId, setPingActivo } = useTorneoActivo();
  useEffect(() => {
    if (!partida?.torneo_id) return;
    setTorneoActivoId(partida.torneo_id);
    setPingActivo(true);
    return () => { setTorneoActivoId(null); setPingActivo(false); };
  }, [partida?.torneo_id, setTorneoActivoId, setPingActivo]);

  // Al terminar la partida, detener pings pero mantener la suscripción del widget
  useEffect(() => {
    if (finalizada && partida?.torneo_id) {
      setPingActivo(false);
    }
  }, [finalizada, partida?.torneo_id, setPingActivo]);

  const handlePartidaFinalizada = useCallback((resultado: string, motivo: string) => {
    setFinalizada(true);
    setPartida(prev => prev ? { ...prev, estado: 'finalizada', resultado, motivo_fin: motivo } : prev);
  }, []);

  const handleEstadoCambiado = useCallback((nuevoEstado: 'esperando' | 'iniciada' | 'finalizada' | 'abortada') => {
    setPartida(prev => prev ? { ...prev, estado: nuevoEstado } : prev);
    if (nuevoEstado === 'finalizada' || nuevoEstado === 'abortada') {
      setFinalizada(true);
      if (nuevoEstado === 'finalizada') {
        cargarPartida();
      }
    }
  }, [cargarPartida]);

  const rutaVolver = partida?.torneo_id
    ? `/clases/${claseId}/torneos/${partida.torneo_id}`
    : `/clases/${claseId}/partidas`;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-500 font-medium animate-pulse">Cargando partida...</div>
      </div>
    );
  }

  if (error || !partida) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-red-500 font-medium">{error || 'No se pudo cargar la partida.'}</div>
      </div>
    );
  }

  const soyJugador = partida.jugador_blancas_id === usuario?.id || partida.jugador_negras_id === usuario?.id;
  const esTorneo   = !!partida.torneo_id;

  const FEN_ESTANDAR = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const fenInicial   = partida.fen_inicial ?? FEN_ESTANDAR;
  const tienesFenPersonalizado = fenInicial !== FEN_ESTANDAR;

  let pgnParaTablero = partida.pgn_final ?? partida.pgn_inicial ?? '';

  if (tienesFenPersonalizado) {
    if (pgnParaTablero) {
      if (!pgnParaTablero.includes('[FEN')) {
        pgnParaTablero = `[FEN "${fenInicial}"]\n\n${pgnParaTablero}`;
      }
    } else {
      pgnParaTablero = fenInicial;
    }
  } else if (!partida.pgn_final && partida.pgn_inicial) {
    pgnParaTablero = partida.pgn_inicial;
  }

  // Widget unificado de notificaciones de tablas
  const widgetTablas = infoTablas && soyJugador ? (
    <div className="flex flex-col gap-3">
      {infoTablas.ofrecioTablas !== null && infoTablas.ofrecioTablas !== usuario?.id && !finalizada && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <Handshake className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-sm font-bold text-blue-900 leading-tight">
              Tu rival ha propuesto acordar tablas
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={infoTablas.rechazarTablas} className="flex-1 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition-colors shadow-sm">
              Rechazar
            </button>
            <button onClick={infoTablas.aceptarTablas} className="flex-1 py-2 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors shadow-sm">
              Aceptar
            </button>
          </div>
        </div>
      )}

      {infoTablas.ofrecioTablas === usuario?.id && !infoTablas.tablasRechazadas && !finalizada && (
        <div className="bg-slate-800 rounded-2xl p-4 shadow-md animate-in fade-in slide-in-from-top-4 duration-300 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
            <Handshake className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-sm font-semibold text-slate-200">
            Propuesta enviada.<br/>Esperando respuesta...
          </p>
        </div>
      )}

      {infoTablas.tablasRechazadas && (
        <div className={`bg-red-50 border border-red-200 rounded-2xl p-4 shadow-sm animate-in fade-in slide-in-from-top-4 transition-opacity duration-500 ${opacidadRechazo} flex items-center gap-3`}>
          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <Handshake className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-sm font-bold text-red-900 leading-tight">
            Tu oferta de tablas ha sido rechazada
          </p>
        </div>
      )}
    </div>
  ) : null;

  const vistaPartida = (
    <VistaPartida
      key={`${partida.jugador_blancas_id ?? 'libre'}-${partida.jugador_negras_id ?? 'libre'}`}
      partidaId={partidaId}
      usuarioId={usuario?.id}
      jugadorBlancas={partida.blancas}
      jugadorNegras={partida.negras}
      pgnInicial={pgnParaTablero}
      fenInicial={partida.fen_inicial}
      tiempoBlancasMs={partida.tiempo_blancas_ms}
      tiempoNegrasMs={partida.tiempo_negras_ms}
      incrementoMs={partida.incremento_ms}
      tiempoRestanteBlancasMs={partida.tiempo_restante_blancas_ms}
      tiempoRestanteNegrasMs={partida.tiempo_restante_negras_ms}
      timestampUltimoMovimiento={partida.timestamp_ultimo_movimiento}
      turnoInicial={partida.turno}
      estadoInicial={partida.estado}
      resultadoInicial={partida.resultado}
      primerMovimientoBlancas={partida.primer_movimiento_blancas}
      primerMovimientoNegras={partida.primer_movimiento_negras}
      onPartidaFinalizada={handlePartidaFinalizada}
      onEstadoCambiado={handleEstadoCambiado}
      onJugadorUnido={cargarPartida}
      emitirPresenteRef={emitirPresenteRef}
      onVolver={esTorneo ? () => router.push(rutaVolver) : undefined}
      onTablasChange={setInfoTablas}
    />
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {modalGuardar && (
        <ModalGuardarPartidaEstudio
          partidaId={partidaId}
          claseId={claseId}
          onClose={() => setModalGuardar(false)}
          onGuardado={() => setModalGuardar(false)}
        />
      )}

      {/* Cabecera */}
      <div className="bg-white border-b border-slate-200 shadow-sm px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(rutaVolver)}
              className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm text-slate-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6"/>
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <Swords className="w-5 h-5 text-blue-600" />
                {partida.blancas
                  ? `${partida.blancas.nombre} ${partida.blancas.apellidos} vs ${
                      partida.negras ? `${partida.negras.nombre} ${partida.negras.apellidos}` : 'Libre'}`
                  : 'Partida'}
                {partida.torneo_id && (
                  <span className="text-sm font-normal text-slate-400 ml-1">· Torneo</span>
                )}
              </h1>
              <p className="text-sm text-slate-500 font-medium">
                {partida.jugador_blancas_id === usuario?.id ? 'Juegas con blancas' :
                 partida.jugador_negras_id  === usuario?.id ? 'Juegas con negras'  :
                 esProfesor ? 'Modo profesor · espectador' : 'Espectador'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {esProfesor && finalizada && partida.pgn_final && partida.estado !== 'abortada' && (
              <button
                onClick={() => setModalGuardar(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm cursor-pointer"
              >
                <BookMarked className="w-4 h-4" /> Guardar en estudio
              </button>
            )}

            {partida.estado === 'esperando' &&
             (!partida.jugador_blancas_id || !partida.jugador_negras_id) &&
             partida.jugador_blancas_id !== usuario?.id &&
             partida.jugador_negras_id  !== usuario?.id && (
              <button
                onClick={async () => {
                  const res = await fetch(`${API}/partidas/${partidaId}/unirse`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${getToken()}` },
                  });
                  if (res.ok) {
                    const d = await res.json();
                    setPartida(d.partida);
                    setTimeout(() => emitirPresenteRef.current?.(), 1000);
                    setTimeout(() => emitirPresenteRef.current?.(), 2500);
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm cursor-pointer"
              >
                <Swords className="w-4 h-4" /> Unirse a la partida
              </button>
            )}

            {partida.estado === 'iniciada' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-full shadow-sm bg-blue-50 text-blue-700 border border-blue-200">
                <PlayCircle className="w-4 h-4" /> Activa
              </span>
            ) : (
              <span className={`px-3 py-1.5 text-sm font-semibold rounded-full shadow-sm ${
                partida.estado === 'esperando'  ? 'bg-blue-100 text-blue-700' :
                partida.estado === 'finalizada' ? 'bg-slate-100 text-slate-600' :
                'bg-red-100 text-red-600'
              }`}>
                {partida.estado === 'esperando'  ? '⏳ En espera' :
                 partida.estado === 'finalizada' ? '🏁 Finalizada' :
                 '🚫 Abortada'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Layout Principal */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {esTorneo ? (
          /* Partida de torneo */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* Columna Izquierda: Chat del torneo + Notificaciones de tablas (CORREGIDO) */}
            <div className="lg:col-span-3 sticky top-6 flex flex-col gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col">
                <div className="bg-slate-50/80 border-b border-slate-100 p-4 flex items-center gap-2 rounded-t-2xl shrink-0">
                  <span className="text-xl">💬</span>
                  <h2 className="font-bold text-slate-800">Chat del torneo</h2>
                </div>
                {salaChatTorneo ? (
                  <ChatContainer salaId={salaChatTorneo} />
                ) : (
                  <div className="p-4 text-slate-400 text-sm text-center">Cargando chat...</div>
                )}
              </div>
              {widgetTablas}
            </div>

            {/* Columna Derecha: Tablero */}
            <div className="lg:col-span-9">
              {vistaPartida}
            </div>

          </div>
        ) : (
          /* Partida normal: chat a la izquierda, tablero y notificaciones a la derecha */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* Columna Izquierda: Chat + Notificaciones de tablas */}
            <div className="lg:col-span-3 sticky top-6 flex flex-col gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col mb-4">
                <div className="bg-slate-50/80 border-b border-slate-100 p-4 flex items-center gap-2 shrink-0">
                  <span className="text-xl">💬</span>
                  <h2 className="font-bold text-slate-800">Chat de la partida</h2>
                </div>
                {salaChat ? (
                  <ChatContainer salaId={salaChat} />
                ) : (
                  <div className="p-4 text-slate-400 text-sm text-center">Cargando chat...</div>
                )}
              </div>
              {widgetTablas}
            </div>

            {/* Columna Derecha: Tablero */}
            <div className="lg:col-span-9">
              {vistaPartida}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}