'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Flag, Handshake, RotateCcw, Trophy, X } from 'lucide-react';
import { useChessGame, MoveResult } from '@/hooks/useChessGame';
import { usePartidaRealtime, EventoPartida } from '@/hooks/usePartidaRealtime';
import { usePartidaTimer, formatTiempoReloj } from '@/hooks/usePartidaTimer';
import { useStockfish } from '@/hooks/useStockfish';
import ChessboardCore from '@/components/ajedrez/core/ChessboardCore';
import PromotionModal from '@/components/ajedrez/ui/PromotionModal';
import Planilla from '@/components/ajedrez/Planilla';
import PanelStockfish from '@/components/ajedrez/PanelStockfish';
import EvalBarVertical from '@/components/ajedrez/EvalBarVertical';

const API = 'http://localhost:3001/api';

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';
}

function reproducirSonido(tipo: 'move' | 'capture') {
  try { new Audio(`/sounds/${tipo}.mp3`).play().catch(() => {}); } catch {}
}

interface Jugador {
  id: string;
  nombre: string;
  apellidos: string;
}

export interface VistaPartidaProps {
  partidaId: string;
  usuarioId: string;
  jugadorBlancas: Jugador | null;
  jugadorNegras: Jugador | null;
  pgnInicial?: string;
  fenInicial?: string;
  tiempoBlancasMs: number;
  tiempoNegrasMs: number;
  incrementoMs: number;
  tiempoRestanteBlancasMs?: number;
  tiempoRestanteNegrasMs?: number;
  timestampUltimoMovimiento?: string | null;
  turnoInicial?: 'w' | 'b';
  estadoInicial: 'esperando' | 'iniciada' | 'finalizada' | 'abortada';
  resultadoInicial?: string | null;
  primerMovimientoBlancas?: boolean;
  primerMovimientoNegras?: boolean;
  onPartidaFinalizada?: (resultado: string, motivo: string) => void;
  onEstadoCambiado?: (estado: 'esperando' | 'iniciada' | 'finalizada' | 'abortada') => void;
  onJugadorUnido?: () => void;
  emitirPresenteRef?: React.MutableRefObject<(() => void) | null>;
  onVolver?: () => void;
  mostrarStockfish?: boolean;
  onTablasChange?: (info: {
    ofrecioTablas: string | null;
    tablasRechazadas: boolean;
    aceptarTablas: () => void;
    rechazarTablas: () => void;
  } | null) => void;
}

export default function VistaPartida({
  partidaId,
  usuarioId,
  jugadorBlancas,
  jugadorNegras,
  pgnInicial = '',
  fenInicial,
  tiempoBlancasMs,
  tiempoNegrasMs,
  incrementoMs,
  tiempoRestanteBlancasMs,
  tiempoRestanteNegrasMs,
  timestampUltimoMovimiento,
  turnoInicial = 'w',
  estadoInicial,
  resultadoInicial,
  primerMovimientoBlancas = false,
  primerMovimientoNegras  = false,
  onPartidaFinalizada,
  onEstadoCambiado,
  onJugadorUnido,
  emitirPresenteRef,
  onVolver,
  mostrarStockfish = false,
  onTablasChange,
}: VistaPartidaProps) {
  const [orientacion, setOrientacion]           = useState<'white' | 'black'>('white');
  const [estado, setEstado]                     = useState(estadoInicial);
  const [resultado, setResultado]               = useState<string | null>(resultadoInicial ?? null);
  const [motivo, setMotivo]                     = useState<string | null>(null);
  const [ofrecioTablas, setOfrecioTablas]       = useState<string | null>(null);
  const [tablasRechazadas, setTablasRechazadas] = useState(false);
  const [bannerFin, setBannerFin]               = useState(false);
  const [enviandoMovimiento, setEnviandoMovimiento] = useState(false);
  const [presentes, setPresentes]               = useState<Set<string>>(new Set());
  const [cuentaAtrasAborto, setCuentaAtrasAborto] = useState<number | null>(null);
  const [esperandoInicio, setEsperandoInicio]   = useState(false);
  const [segundosParaInicio, setSegundosParaInicio] = useState(0);
  const cuentaAtrasRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const cuentaAtrasDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const soyBlancas  = jugadorBlancas?.id === usuarioId;
  const soyNegras   = jugadorNegras?.id  === usuarioId;
  const soyJugador  = soyBlancas || soyNegras;
  const partidaActiva = estado === 'iniciada';

  const soyBlancasRef = useRef(soyBlancas);
  const soyNegrasRef  = useRef(soyNegras);
  useEffect(() => { soyBlancasRef.current = soyBlancas; }, [soyBlancas]);
  useEffect(() => { soyNegrasRef.current  = soyNegras;  }, [soyNegras]);

  useEffect(() => {
    if (soyNegras) setOrientacion('black');
    else setOrientacion('white');
  }, [soyNegras]);

  const {
    pgn, fenVisible, estilosCombinados,
    estamosEnElPresente,
    historialMovimientos,         // usado en useEffect para arrancar el timer
    gameActual,
    pendingPromotion,
    planillaTokens, nodos, nodoActualId, irANodo,
    irAlInicio, irAtras, irAdelante, irAlFinal,
    onPieceDrop, onPieceDrag, onSquareClick,
    handlePromotionSelect, handlePromotionCancel,
    cargarPgn,
  } = useChessGame({ pgnInicial });

  // Refs para timer — se rellenan después de crear el timer
  const stockfish    = useStockfish();
  const turnoBlancas = fenVisible.split(' ')[1] === 'w';
  const numeroJugada = parseInt(fenVisible.split(' ')[5], 10) || 1;
  const flechasTablero = mostrarStockfish && stockfish.activo ? stockfish.flechas : [];

  // Analizar FEN cada vez que cambia la posición (solo cuando está activo)
  useEffect(() => {
    if (mostrarStockfish && stockfish.activo) {
      stockfish.analizarFen(fenVisible);
    }
  }, [fenVisible, stockfish.activo, mostrarStockfish]); // eslint-disable-line react-hooks/exhaustive-deps

  // Limpiar Stockfish al desmontar
  useEffect(() => {
    return () => { stockfish.desactivar(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const timerDetenerRef    = useRef<() => void>(() => {});
  const timerSincronizarRef = useRef<(b: number, n: number, t: 'w'|'b') => void>(() => {});
  const timerSetTurnoRef    = useRef<(t: 'w'|'b') => void>(() => {});
  const timerSetTiemposRef  = useRef<(b: number, n: number) => void>(() => {});

  // Cerrojo para evitar procesar el fin de partida múltiples veces
  const partidaFinalizadaRef = useRef(estadoInicial === 'finalizada' || estadoInicial === 'abortada');

  const procesarFinDePartida = useCallback((nuevoResultado: string, nuevoMotivo: string) => {
    if (partidaFinalizadaRef.current) return;
    partidaFinalizadaRef.current = true;
    setEstado('finalizada');
    setResultado(nuevoResultado);
    setMotivo(nuevoMotivo);
    setBannerFin(true);
    timerDetenerRef.current();
    onEstadoCambiado?.('finalizada');
    onPartidaFinalizada?.(nuevoResultado, nuevoMotivo);
  }, [onEstadoCambiado, onPartidaFinalizada]);

  // Muestra el banner de aborto inmediatamente cuando expira la cuenta atrás,
  // sin esperar al broadcast del backend (que puede tardar hasta 5s por el job).
  // El backend confirmará el resultado y procesarFinDePartida lo ignorará (cerrojo).
  const procesarAbortoInmediato = useCallback(() => {
    if (partidaFinalizadaRef.current) return;
    partidaFinalizadaRef.current = true;
    // Determinar quién provocó el aborto: el que no ha hecho su primer movimiento
    const resultado = !blancoMovioRef.current ? '0-1' : '1-0';
    setEstado('abortada');
    setResultado(resultado);
    setMotivo('abort');
    setBannerFin(true);
    timerDetenerRef.current();
    onEstadoCambiado?.('abortada');
  }, [onEstadoCambiado]);

  const timer = usePartidaTimer({
    tiempoInicialBlancasMs: tiempoRestanteBlancasMs ?? tiempoBlancasMs,
    tiempoInicialNegrasMs:  tiempoRestanteNegrasMs  ?? tiempoNegrasMs,
    turnoInicial,
    activo: partidaActiva,
    onTiempoAgotado: useCallback((colorSinTiempo: 'w' | 'b') => {
      const resultado = colorSinTiempo === 'w' ? '0-1' : '1-0';
      procesarFinDePartida(resultado, 'tiempo');
    }, [procesarFinDePartida]),
  });

  useEffect(() => {
    timerSincronizarRef.current = timer.sincronizar;
    timerSetTurnoRef.current    = timer.setTurno;
    timerDetenerRef.current     = timer.detener;
    timerSetTiemposRef.current  = timer.setTiempos;
  }, [timer.sincronizar, timer.setTurno, timer.detener, timer.setTiempos]);

  const emitirRef      = useRef<((evento: EventoPartida) => void) | null>(null);
  const iniciandoRef   = useRef(false);
  const numMovimientosRef = useRef(0);

  // Rastrear qué colores han hecho su primer movimiento en la partida
  const blancoMovioRef = useRef(false);
  const negroMovioRef  = useRef(false);
  const ambosMovieron  = () => blancoMovioRef.current && negroMovioRef.current;

  const iniciarCuentaAtras = (desdeTimestamp?: string, onExpira?: () => void) => {
    if (cuentaAtrasRef.current)      clearInterval(cuentaAtrasRef.current);
    if (cuentaAtrasDelayRef.current) clearTimeout(cuentaAtrasDelayRef.current);

    const arrancar = () => {
      const transcurrido = desdeTimestamp
        ? Math.max(0, Math.floor((Date.now() - new Date(desdeTimestamp).getTime()) / 1000))
        : 0;
      const inicial = Math.max(1, 30 - transcurrido);
      setCuentaAtrasAborto(inicial);
      cuentaAtrasRef.current = setInterval(() => {
        setCuentaAtrasAborto(prev => {
          if (prev === null || prev <= 1) {
            if (cuentaAtrasRef.current) clearInterval(cuentaAtrasRef.current);
            // setTimeout para salir del ciclo de render antes de actualizar otros componentes
            if (prev !== null) setTimeout(() => onExpira?.(), 0);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    };

    // Si el timestamp es futuro, esperar hasta que llegue antes de arrancar
    const msRestantes = desdeTimestamp
      ? new Date(desdeTimestamp).getTime() - Date.now()
      : 0;

    if (msRestantes > 0) {
      cuentaAtrasDelayRef.current = setTimeout(arrancar, msRestantes);
    } else {
      arrancar();
    }
  };

  const detenerCuentaAtras = () => {
    if (cuentaAtrasRef.current) clearInterval(cuentaAtrasRef.current);
    setCuentaAtrasAborto(null);
  };

  // Limpiar cuenta atrás al desmontar
  useEffect(() => {
    return () => {
      if (cuentaAtrasRef.current) clearInterval(cuentaAtrasRef.current);
      if (cuentaAtrasDelayRef.current) clearTimeout(cuentaAtrasDelayRef.current);
    };
  }, []);

  // Añadirse a sí mismo al set de presentes al montar
  useEffect(() => {
    if (soyJugador) {
      setPresentes(prev => new Set(prev).add(usuarioId));
    }
  }, [soyJugador, usuarioId]);

  // Arrancar timer cuando el historial ya está disponible (puede llegar tarde por el PGN)
  const timerArracadoRef = useRef(false);

  // CASO 1: Partida ya iniciada al cargar (reload o espectador)
  useEffect(() => {
    if (estadoInicial !== 'iniciada') return;

    // Usar el estado real de la BD, no asumir que ambos movieron
    blancoMovioRef.current = primerMovimientoBlancas;
    negroMovioRef.current  = primerMovimientoNegras;

    if (blancoMovioRef.current && negroMovioRef.current) {
      // Ambos movieron → timer normal
      let tiempoB = tiempoRestanteBlancasMs ?? tiempoBlancasMs;
      let tiempoN = tiempoRestanteNegrasMs  ?? tiempoNegrasMs;

      if (timestampUltimoMovimiento) {
        const transcurrido = Date.now() - new Date(timestampUltimoMovimiento).getTime();
        if (turnoInicial === 'w') tiempoB = Math.max(0, tiempoB - transcurrido);
        else                      tiempoN = Math.max(0, tiempoN - transcurrido);
      }

      timerArracadoRef.current = true;
      const t = setTimeout(() => {
        timerSincronizarRef.current(tiempoB, tiempoN, turnoInicial);
      }, 50);
      return () => clearTimeout(t);
    } else {
      // Fase de aborto — si el timestamp es futuro, bloquear el tablero hasta que llegue
      if (timestampUltimoMovimiento) {
        const msHastaInicio = new Date(timestampUltimoMovimiento).getTime() - Date.now();
        if (msHastaInicio > 0) {
          const segs = Math.ceil(msHastaInicio / 1000);
          setEsperandoInicio(true);
          setSegundosParaInicio(segs);

          // Cuenta atrás de la pantalla de espera
          const intervalo = setInterval(() => {
            setSegundosParaInicio(prev => {
              if (prev <= 1) { clearInterval(intervalo); return 0; }
              return prev - 1;
            });
          }, 1000);

          const timeout = setTimeout(() => {
            clearInterval(intervalo);
            setEsperandoInicio(false);
            iniciarCuentaAtras(timestampUltimoMovimiento ?? undefined, procesarAbortoInmediato);
          }, msHastaInicio);

          return () => { clearInterval(intervalo); clearTimeout(timeout); };
        }
      }
      // Si ya pasó el timestamp, arrancar la cuenta atrás directamente
      iniciarCuentaAtras(timestampUltimoMovimiento ?? undefined, procesarAbortoInmediato);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // CASO 2: Flujo en vivo — arrancar timer cuando ambos hacen su primer movimiento
  useEffect(() => {
    // No arrancar si el timer ya está corriendo (CASO 1 con ambos movidos ya lo inició)
    if (timerArracadoRef.current) return;
    if (!blancoMovioRef.current || !negroMovioRef.current) return;
    timerArracadoRef.current = true;

    let tiempoB = tiempoRestanteBlancasMs ?? tiempoBlancasMs;
    let tiempoN = tiempoRestanteNegrasMs  ?? tiempoNegrasMs;

    if (timestampUltimoMovimiento) {
      const transcurrido = Date.now() - new Date(timestampUltimoMovimiento).getTime();
      if (turnoInicial === 'w') {
        tiempoB = Math.max(0, tiempoB - transcurrido);
      } else {
        tiempoN = Math.max(0, tiempoN - transcurrido);
      }
    }

    timerSincronizarRef.current(tiempoB, tiempoN, turnoInicial);
  }, [historialMovimientos.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleEvento = useCallback((evento: EventoPartida) => {
    switch (evento.tipo) {
      case 'PRESENTE':
        setPresentes(prev => new Set(prev).add(evento.usuario_id));
        if (soyJugador && estado === 'esperando') {
          emitirRef.current?.({ tipo: 'PRESENTE', usuario_id: usuarioId });
        }
        if (
          evento.usuario_id !== usuarioId &&
          evento.usuario_id !== jugadorBlancas?.id &&
          evento.usuario_id !== jugadorNegras?.id
        ) {
          onJugadorUnido?.();
        }
        break;

      case 'INICIO':
        setEstado('iniciada');
        onEstadoCambiado?.('iniciada');
        iniciarCuentaAtras(evento.timestamp, procesarAbortoInmediato);
        break;

      case 'MOVIMIENTO':
        if (evento.emisor_id !== usuarioId) {
          cargarPgn(evento.pgn);
          reproducirSonido(evento.sonido);
        }
        numMovimientosRef.current += 1;
        {
          const colorQueMovio = evento.turno === 'w' ? 'b' : 'w';
          if (colorQueMovio === 'w') blancoMovioRef.current = true;
          else                       negroMovioRef.current  = true;

          if (ambosMovieron()) {
            timerArracadoRef.current = true; // evitar que el useEffect sobreescriba
            timerSincronizarRef.current(
              evento.tiempo_restante_blancas_ms,
              evento.tiempo_restante_negras_ms,
              evento.turno,
            );
            detenerCuentaAtras();
          } else {
            timerSetTurnoRef.current(evento.turno);
            // El primero movió — resetear cuenta atrás para el segundo jugador
            iniciarCuentaAtras(undefined, procesarAbortoInmediato);
          }
        }
        break;

      case 'NAVEGAR':
        cargarPgn(evento.pgn);  // navega al final del PGN
        reproducirSonido(evento.sonido);
        break;

      case 'ORIENTACION':
        setOrientacion(evento.orientacion);
        break;

      case 'TABLAS_OFRECIDAS':
        setOfrecioTablas(evento.de_usuario_id);
        break;

      case 'TABLAS_RECHAZADAS':
        setOfrecioTablas(null);
        setTablasRechazadas(true);
        setTimeout(() => setTablasRechazadas(false), 4000);
        break;

      case 'FIN':
        // Ajuste visual del reloj si fue por tiempo
        if (evento.motivo === 'tiempo') {
          if (evento.resultado === '1-0') timerSetTiemposRef.current(timer.tiempoBlancasMs, 0);
          else if (evento.resultado === '0-1') timerSetTiemposRef.current(0, timer.tiempoNegrasMs);
        }
        procesarFinDePartida(evento.resultado, evento.motivo);
        break;

      case 'ABORT':
        if (partidaFinalizadaRef.current) return;
        partidaFinalizadaRef.current = true;
        setEstado('abortada');
        timerDetenerRef.current();
        setBannerFin(true);
        onEstadoCambiado?.('abortada');
        break;
    }
  }, [usuarioId, soyJugador, estado, jugadorBlancas, jugadorNegras, cargarPgn, onJugadorUnido, procesarFinDePartida, timer.tiempoBlancasMs, timer.tiempoNegrasMs]);

  const { emitir } = usePartidaRealtime({ partidaId, onEvento: handleEvento });

  useEffect(() => { emitirRef.current = emitir; }, [emitir]);

  useEffect(() => {
    if (emitirPresenteRef) {
      emitirPresenteRef.current = () => {
        emitir({ tipo: 'PRESENTE', usuario_id: usuarioId });
        setPresentes(prev => new Set(prev).add(usuarioId));
      };
    }
  }, [emitir, usuarioId, emitirPresenteRef]);

  useEffect(() => {
    if (!soyJugador || estado !== 'esperando') return;
    const emit = () => emitir({ tipo: 'PRESENTE', usuario_id: usuarioId });
    const timeout  = setTimeout(emit, 500);
    const interval = setInterval(emit, 3000);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [soyJugador, estado, usuarioId, emitir]);

  // Fallback para el jugador que NO llama /iniciar (negras):
  // si ambos están presentes pero el INICIO no llegó, verificar el servidor
  useEffect(() => {
    if (!soyJugador || estado !== 'esperando') return;
    if (soyBlancas) return; // blancas llama /iniciar directamente
    if (!jugadorBlancas || !jugadorNegras) return;
    if (!presentes.has(jugadorBlancas.id) || !presentes.has(jugadorNegras.id)) return;

    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/partidas/${partidaId}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (res.ok) {
          const d = await res.json();
          if (d.partida.estado === 'iniciada') {
            setEstado('iniciada');
            onEstadoCambiado?.('iniciada');
            iniciarCuentaAtras(undefined, procesarAbortoInmediato);
          }
        }
      } catch {}
    }, 2000);

    return () => clearTimeout(timeout);
  }, [presentes, estado, soyJugador, soyBlancas, jugadorBlancas, jugadorNegras, partidaId, onEstadoCambiado]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (estado !== 'esperando') return;
    if (!soyBlancas) return;
    if (!jugadorBlancas || !jugadorNegras) return;
    if (!presentes.has(jugadorBlancas.id) || !presentes.has(jugadorNegras.id)) return;
    if (iniciandoRef.current) return;

    iniciandoRef.current = true;

    const iniciar = async () => {
      try {
        const res = await fetch(`${API}/partidas/${partidaId}/iniciar`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (res.ok) {
          const d = await res.json();
          const timestamp = d.timestamp ?? new Date().toISOString();
          setEstado('iniciada');
          onEstadoCambiado?.('iniciada');
          iniciarCuentaAtras(timestamp, procesarAbortoInmediato);
          // El backend ya emitió INICIO via Broadcast — no hace falta emitirlo aquí
        } else {
          const d = await res.json();
          if (res.status === 400) {
            setEstado('iniciada');
            onEstadoCambiado?.('iniciada');
            try {
              const resPartida = await fetch(`${API}/partidas/${partidaId}`, {
                headers: { Authorization: `Bearer ${getToken()}` },
              });
              if (resPartida.ok) {
                const dp = await resPartida.json();
                const p  = dp.partida;
                if (p.pgn_final) {
                  timerSincronizarRef.current(
                    p.tiempo_restante_blancas_ms,
                    p.tiempo_restante_negras_ms,
                    p.turno,
                  );
                }
              }
            } catch {}
          } else {
            iniciandoRef.current = false;
          }
        }
      } catch {
        iniciandoRef.current = false;
      }
    };

    iniciar();
  }, [presentes, estado, soyBlancas, jugadorBlancas, jugadorNegras, partidaId, emitir, onEstadoCambiado]);

  // ── Realizar movimiento ────────────────────────────────────────────────────

  const enviarMovimiento = useCallback(async (
    from: string,
    to: string,
    promotion: string | undefined,
    resultado: MoveResult,
  ) => {
    if (enviandoMovimiento) return;
    setEnviandoMovimiento(true);
    try {
      const movimiento = promotion ? { from, to, promotion } : { from, to };
      const res = await fetch(`${API}/partidas/${partidaId}/movimiento`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ movimiento }),
      });
      const d = await res.json();
      if (!res.ok) {
        cargarPgn(pgn);
        return;
      }

      numMovimientosRef.current += 1;
      if (soyBlancasRef.current) blancoMovioRef.current = true;
      else                       negroMovioRef.current  = true;

      const nuevoTurno = d.turno ?? (gameActual.turn() === 'w' ? 'b' : 'w');
      if (ambosMovieron()) {
        timerArracadoRef.current = true; // evitar que el useEffect sobreescriba
        timerSincronizarRef.current(
          d.tiempo_restante_blancas_ms,
          d.tiempo_restante_negras_ms,
          nuevoTurno,
        );
        detenerCuentaAtras();
      } else {
        timerSetTurnoRef.current(nuevoTurno);
        // El primero movió — resetear cuenta atrás para el segundo jugador
        iniciarCuentaAtras(undefined, procesarAbortoInmediato);
      }

      emitir({
        tipo: 'MOVIMIENTO',
        pgn: resultado.pgn,
        fen: resultado.fen,
        sonido: resultado.captura ? 'capture' : 'move',
        emisor_id: usuarioId,
        tiempo_restante_blancas_ms: d.tiempo_restante_blancas_ms,
        tiempo_restante_negras_ms:  d.tiempo_restante_negras_ms,
        turno: d.turno,
      });

      if (d.fin) {
        procesarFinDePartida(d.fin.resultado, d.fin.motivo);
        emitir({ tipo: 'FIN', resultado: d.fin.resultado, motivo: d.fin.motivo });
      }
    } catch {}
    finally { setEnviandoMovimiento(false); }
  }, [partidaId, pgn, gameActual, emitir, usuarioId, cargarPgn, procesarFinDePartida, enviandoMovimiento]);

  const puedeArrastrar = soyJugador && partidaActiva && estamosEnElPresente &&
    ((soyBlancas && gameActual.turn() === 'w') || (soyNegras && gameActual.turn() === 'b'));

  const puedeVerHighlights = soyJugador && estamosEnElPresente &&
    ((soyBlancas && gameActual.turn() === 'w') || (soyNegras && gameActual.turn() === 'b'));

  const handlePieceDragWrapper = useCallback((args: Parameters<typeof onPieceDrag>[0]) => {
    const turnoActual = gameActual.turn();
    const esmiTurno = (soyBlancasRef.current && turnoActual === 'w') ||
                      (soyNegrasRef.current  && turnoActual === 'b');
    if (!esmiTurno) return;
    onPieceDrag(args);
  }, [onPieceDrag, gameActual]);

  const handlePieceDrop = useCallback((args: Parameters<typeof onPieceDrop>[0]): MoveResult => {
    const resultado = onPieceDrop(args);
    if (resultado.exito) {
      enviarMovimiento(args.sourceSquare, args.targetSquare ?? '', undefined, resultado);
    }
    return resultado;
  }, [onPieceDrop, enviarMovimiento]);

  const handlePromotionSelectPartida = useCallback((piece: Parameters<typeof handlePromotionSelect>[0]) => {
    const resultado = handlePromotionSelect(piece);
    if (resultado.exito && pendingPromotion) {
      enviarMovimiento(pendingPromotion.from, pendingPromotion.to, piece, resultado);
    }
  }, [handlePromotionSelect, pendingPromotion, enviarMovimiento]);

  // ── Acciones de partida ────────────────────────────────────────────────────

  const abandonar = async () => {
    if (!confirm('¿Seguro que quieres abandonar? Perderás la partida.')) return;
    const res = await fetch(`${API}/partidas/${partidaId}/abandonar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (res.ok) {
      const d = await res.json();
      const res_resultado = d.resultado ?? (soyBlancas ? '0-1' : '1-0');
      procesarFinDePartida(res_resultado, 'abandono');
      emitir({ tipo: 'FIN', resultado: res_resultado, motivo: 'abandono' });
    }
  };

  const ofrecerTablas = useCallback(async () => {
    setOfrecioTablas(usuarioId);
    emitir({ tipo: 'TABLAS_OFRECIDAS', de_usuario_id: usuarioId });
    await fetch(`${API}/partidas/${partidaId}/tablas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ accion: 'ofrecer' }),
    });
  }, [emitir, partidaId, usuarioId]);

  const aceptarTablas = useCallback(async () => {
    const res = await fetch(`${API}/partidas/${partidaId}/tablas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ accion: 'aceptar' }),
    });
    setOfrecioTablas(null);
    if (res.ok) {
      procesarFinDePartida('1/2-1/2', 'tablas');
      emitir({ tipo: 'FIN', resultado: '1/2-1/2', motivo: 'tablas' });
    }
  }, [emitir, partidaId, procesarFinDePartida]);

  const rechazarTablas = useCallback(async () => {
    emitir({ tipo: 'TABLAS_RECHAZADAS' });
    await fetch(`${API}/partidas/${partidaId}/tablas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ accion: 'rechazar' }),
    });
    setOfrecioTablas(null);
  }, [emitir, partidaId]);

  // Exportar estado de tablas al padre para que renderice los widgets
  const onTablasChangeRef = useRef(onTablasChange);
  useEffect(() => { onTablasChangeRef.current = onTablasChange; }, [onTablasChange]);
  useEffect(() => {
    onTablasChangeRef.current?.({ ofrecioTablas, tablasRechazadas, aceptarTablas, rechazarTablas });
  }, [ofrecioTablas, tablasRechazadas, aceptarTablas, rechazarTablas]);

  const handleGirar = () => {
    setOrientacion(o => o === 'white' ? 'black' : 'white');
  };

  // ── Helpers UI ─────────────────────────────────────────────────────────────

  const nombreBlancas = jugadorBlancas ? `${jugadorBlancas.nombre} ${jugadorBlancas.apellidos}` : 'Libre';
  const nombreNegras  = jugadorNegras  ? `${jugadorNegras.nombre}  ${jugadorNegras.apellidos}`  : 'Libre';

  const rivalOfrecioTablas = ofrecioTablas !== null && ofrecioTablas !== usuarioId;
  const yoOfreciTablas     = ofrecioTablas === usuarioId;

  const tiempoBlancasColor = timer.tiempoBlancasMs < 30000 ? 'text-red-500' : 'text-slate-800';
  const tiempoNegrasColor  = timer.tiempoNegrasMs  < 30000 ? 'text-red-500' : 'text-slate-800';

  const labelResultado = () => {
    if (!resultado) return null;
    if (resultado === '1-0') return `Ganan blancas · ${nombreBlancas}`;
    if (resultado === '0-1') return `Ganan negras · ${nombreNegras}`;
    return 'Tablas';
  };

  const infoBannerFin = () => {
    if (estado === 'abortada') return {
      icono: '🚫',
      titulo: 'Partida abortada',
      subtitulo: 'Ningún jugador realizó el primer movimiento en 30 segundos.',
      color: 'bg-slate-100',
    };
    const motivoLabel: Record<string, string> = {
      mate:           'Victoria por jaque mate',
      tiempo:         'Victoria por tiempo agotado',
      abandono:       'Victoria por abandono',
      tablas:         'Tablas acordadas',
      insuf_material: 'Tablas por material insuficiente',
      abort:          'Partida sin efecto',
    };
    const esGanador  = (resultado === '1-0' && soyBlancas) || (resultado === '0-1' && soyNegras);
    const esEmpate   = resultado === '1/2-1/2';
    const esPerdedor = !esGanador && !esEmpate && soyJugador;

    if (esEmpate)   return { icono: '🤝', titulo: 'Tablas',       subtitulo: motivoLabel[motivo ?? ''] ?? motivo ?? '', color: 'bg-blue-50' };
    if (esGanador)  return { icono: '🏆', titulo: '¡Has ganado!', subtitulo: motivoLabel[motivo ?? ''] ?? motivo ?? '', color: 'bg-yellow-50' };
    if (esPerdedor) return { icono: '😔', titulo: 'Has perdido',  subtitulo: motivoLabel[motivo ?? ''] ?? motivo ?? '', color: 'bg-red-50' };
    return { icono: '🏁', titulo: labelResultado() ?? 'Partida finalizada', subtitulo: motivoLabel[motivo ?? ''] ?? motivo ?? '', color: 'bg-slate-50' };
  };

  // ── Panel de jugador ───────────────────────────────────────────────────────

  const PanelJugador = ({
    jugador, color, tiempoMs, esTurno,
  }: {
    jugador: Jugador | null;
    color: 'w' | 'b';
    tiempoMs: number;
    esTurno: boolean;
  }) => {
    const nombre = jugador ? `${jugador.nombre} ${jugador.apellidos}` : 'Libre';
    const soyYo  = jugador?.id === usuarioId;
    const tiempo = color === 'w' ? tiempoBlancasColor : tiempoNegrasColor;

    // Mostrar cuenta atrás de aborto si es el turno de este color y aún no movió
    const primeroMovio = color === 'w' ? blancoMovioRef.current : negroMovioRef.current;
    const mostrarAborto = cuentaAtrasAborto !== null && esTurno && !primeroMovio && partidaActiva;

    return (
      <div className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
        esTurno && partidaActiva ? 'bg-blue-50 border-2 border-blue-300 shadow-sm' : 'bg-white border border-slate-200'
      }`}>
        <div className="flex items-center gap-3">
          <span className={`w-6 h-6 rounded-full border-2 shadow-sm shrink-0 ${
            color === 'w' ? 'bg-white border-slate-300' : 'bg-slate-800 border-slate-600'
          }`} />
          <div>
            <p className={`font-bold text-sm ${esTurno && partidaActiva ? 'text-blue-700' : 'text-slate-800'}`}>
              {nombre} {soyYo && <span className="text-xs font-normal text-slate-400">(tú)</span>}
            </p>
            {esTurno && partidaActiva && !mostrarAborto && (
              <p className="text-xs text-blue-500 font-semibold">En turno</p>
            )}
            {mostrarAborto && (
              <p className={`text-xs font-bold ${cuentaAtrasAborto! <= 10 ? 'text-red-500' : 'text-orange-500'}`}>
                ⚠️ Primer movimiento: {cuentaAtrasAborto}s
              </p>
            )}
          </div>
        </div>
        <span className={`font-mono text-2xl font-bold tabular-nums ${tiempo}`}>
          {formatTiempoReloj(tiempoMs)}
        </span>
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const jugadorArriba = orientacion === 'white'
    ? { jugador: jugadorNegras,  color: 'b' as const, tiempoMs: timer.tiempoNegrasMs }
    : { jugador: jugadorBlancas, color: 'w' as const, tiempoMs: timer.tiempoBlancasMs };
  const jugadorAbajo = orientacion === 'white'
    ? { jugador: jugadorBlancas, color: 'w' as const, tiempoMs: timer.tiempoBlancasMs }
    : { jugador: jugadorNegras,  color: 'b' as const, tiempoMs: timer.tiempoNegrasMs };

  return (
    <div className="flex flex-col items-center w-full max-w-7xl mx-auto p-4 bg-white rounded-2xl shadow-sm border border-slate-200 relative">

      {/* Banner de fin de partida */}
      {bannerFin && (() => {
        const info = infoBannerFin();
        return (
          <div className="absolute inset-0 rounded-2xl z-50 flex items-center justify-center p-6 bg-slate-900/30">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center flex flex-col items-center gap-5">
              <div className={`w-20 h-20 rounded-full ${info.color} flex items-center justify-center`}>
                <span className="text-4xl">{info.icono}</span>
              </div>
              <div>
                <h3 className="text-2xl font-extrabold text-slate-900">{info.titulo}</h3>
                {info.subtitulo && <p className="text-slate-500 text-sm mt-1">{info.subtitulo}</p>}
                {resultado && resultado !== '1/2-1/2' && estado !== 'abortada' && (
                  <p className="text-slate-400 text-xs mt-2 font-semibold">
                    {resultado === '1-0' ? nombreBlancas : nombreNegras} gana
                  </p>
                )}
              </div>
              <button
                onClick={() => setBannerFin(false)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" /> Revisar la partida
              </button>
              {onVolver && (
                <button
                  onClick={onVolver}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Trophy className="w-4 h-4" /> Volver al torneo
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {pendingPromotion && (
        <PromotionModal
          color={pendingPromotion.color}
          onSelect={handlePromotionSelectPartida}
          onCancel={handlePromotionCancel}
        />
      )}



      {/* Oferta de tablas */}
      {rivalOfrecioTablas && soyJugador && (
        <div className="w-full mb-4 px-2">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-blue-800 flex items-center gap-2">
              <Handshake className="w-4 h-4" /> Tu rival ofrece tablas
            </p>
            <div className="flex gap-2">
              <button onClick={rechazarTablas} className="px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Rechazar</button>
              <button onClick={aceptarTablas}  className="px-3 py-1.5 text-sm font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Aceptar</button>
            </div>
          </div>
        </div>
      )}

      {yoOfreciTablas && (
        <div className="w-full mb-4 px-2">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <p className="text-sm text-slate-500 flex items-center gap-2">
              <Handshake className="w-4 h-4" /> Oferta de tablas enviada, esperando respuesta...
            </p>
          </div>
        </div>
      )}

      {tablasRechazadas && !yoOfreciTablas && (
        <div className="w-full mb-4 px-2">
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-sm text-red-600 font-semibold flex items-center gap-2">
              <Handshake className="w-4 h-4" /> Tu oferta de tablas ha sido rechazada
            </p>
          </div>
        </div>
      )}

      {/* Tablero + Planilla */}
      <div className="w-full flex flex-col lg:flex-row gap-4 px-2 items-stretch justify-center">
        {esperandoInicio ? (
          /* Pantalla de espera: oculta tablero y planilla hasta que comience la fase de aborto */
          <div className="flex-1 flex flex-col gap-3 items-center justify-center min-h-[400px]">
            <div className="h-14 w-full max-w-[560px] rounded-xl bg-slate-100 animate-pulse" />
            <div className="w-full max-w-[560px] aspect-square rounded-sm bg-slate-200 flex flex-col items-center justify-center gap-4">
              <Trophy className="w-10 h-10 text-blue-400 opacity-60" />
              <div className="text-center">
                <p className="font-bold text-slate-600 text-lg">La partida comienza en</p>
                <p className="text-5xl font-black text-blue-600 tabular-nums mt-1">{segundosParaInicio}s</p>
              </div>
            </div>
            <div className="h-14 w-full max-w-[560px] rounded-xl bg-slate-100 animate-pulse" />
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3 flex-1 max-w-[560px]">
              <PanelJugador
                jugador={jugadorArriba.jugador}
                color={jugadorArriba.color}
                tiempoMs={jugadorArriba.tiempoMs}
                esTurno={gameActual.turn() === jugadorArriba.color && partidaActiva}
              />

              <div className="shadow-xl rounded-sm overflow-hidden border-4 border-[#302e2c] flex">
                {mostrarStockfish && (
                  <div className="w-5 shrink-0 border-r-4 border-[#302e2c]">
                    <EvalBarVertical
                      evaluacion={stockfish.lineas[0]?.evaluacion ?? 0}
                      mate={stockfish.lineas[0]?.mate ?? null}
                      turnoBlancas={turnoBlancas}
                      orientation={orientacion}
                      activo={stockfish.activo && stockfish.lineas.length > 0}
                    />
                  </div>
                )}
                <div className="flex-1">
                  <ChessboardCore
                    fen={fenVisible}
                    squareStyles={estilosCombinados}
                    orientation={orientacion}
                    allowDragging={puedeArrastrar || puedeVerHighlights}
                    onPieceDrop={puedeArrastrar ? handlePieceDrop : undefined}
                    onPieceDrag={handlePieceDragWrapper}
                    onSquareClick={onSquareClick}
                    flechas={flechasTablero}
                  />
                </div>
              </div>

              <PanelJugador
                jugador={jugadorAbajo.jugador}
                color={jugadorAbajo.color}
                tiempoMs={jugadorAbajo.tiempoMs}
                esTurno={gameActual.turn() === jugadorAbajo.color && partidaActiva}
              />

              <div className="flex gap-2 justify-end">
                {soyJugador && partidaActiva && (
                  <>
                    <button
                      onClick={ofrecerTablas}
                      disabled={yoOfreciTablas}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-40 cursor-pointer"
                    >
                      <Handshake className="w-4 h-4" /> Ofrecer tablas
                    </button>
                    <button
                      onClick={abandonar}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors cursor-pointer"
                    >
                      <Flag className="w-4 h-4" /> Abandonar
                    </button>
                  </>
                )}
                <button
                  onClick={handleGirar}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" /> Girar tablero
                </button>
              </div>
            </div>

            <div className="w-full lg:w-72 xl:w-80 shrink-0 relative h-[350px] lg:h-auto">
              <div className="absolute inset-0 flex flex-col">
                <div className="flex-1 overflow-y-auto pr-2">
                  <Planilla
                    nodos={nodos}
                    nodoActualId={nodoActualId}
                    irANodo={irANodo}
                    estamosEnElPresente={estamosEnElPresente}
                    irAlInicio={irAlInicio}
                    irAtras={irAtras}
                    irAdelante={irAdelante}
                    irAlFinal={irAlFinal}
                  />
                </div>
              </div>
            </div>

            {mostrarStockfish && (
              <PanelStockfish
                activo={stockfish.activo}
                cargando={stockfish.cargando}
                profundidad={stockfish.profundidad}
                lineas={stockfish.lineas}
                turnoBlancas={turnoBlancas}
                numeroJugada={numeroJugada}
                onActivar={stockfish.activar}
                onDesactivar={stockfish.desactivar}
                onCambiarProfundidad={stockfish.setProfundidad}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}