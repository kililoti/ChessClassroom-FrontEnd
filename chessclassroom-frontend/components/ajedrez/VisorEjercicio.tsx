'use client';

import { useState, useEffect, useCallback, useRef, CSSProperties } from 'react';
import { ArrowLeft, Video, Save, X, Loader2, Eye, EyeOff, RotateCcw, CheckCircle, Clock, Users, RefreshCw } from 'lucide-react';
import { useChessGame } from '@/hooks/useChessGame';
import type { PromotionPiece } from '@/hooks/useChessGame';
import ChessboardCore from '@/components/ajedrez/core/ChessboardCore';
import PromotionModal from '@/components/ajedrez/ui/PromotionModal';
import Planilla from '@/components/ajedrez/Planilla';
import { Chess } from 'chess.js';

const API = 'http://localhost:3001/api/ejercicios';

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';
}

// Tipos

export interface ProgresoAlumno {
  id: string;
  estado: 'NO_INICIADO' | 'EN_PROGRESO' | 'COMPLETADO';
  pgn_avanzado_correcto: string | null;
  intentos_fallidos: number;
  fecha_primer_acceso: string | null;
  fecha_completado: string | null;
  comentario_alumno: string | null;
  puntuacion: number | null;
  comentario_revision: string | null;
  tiempo_acumulado: number | null; // segundos totales con la página abierta
}

export interface RespuestaAlumno {
  id: string;
  alumno: { nombre: string; apellidos: string };
  estado: 'NO_INICIADO' | 'EN_PROGRESO' | 'COMPLETADO';
  intentos_fallidos: number;
  fecha_primer_acceso: string | null;
  fecha_completado: string | null;
  pgn_avanzado_correcto: string | null;
  pgn_ultimo_movimiento: string | null;
  comentario_alumno: string | null;
  puntuacion: number | null;
  comentario_revision: string | null;
  tiempo_acumulado: number | null;
}

export interface VisorEjercicioProps {
  ejercicioId: string;
  esProfesor: boolean;
  pgnInicial?: string;
  pgnBase?: string;
  solucionPgn?: string;
  comentarioSolucion?: string;
  fechaEntrega?: string | null;
  progreso?: ProgresoAlumno;
  onClose?: () => void;
}

// Componente

export default function VisorEjercicio({
  ejercicioId,
  esProfesor,
  pgnInicial = '',
  pgnBase = '',
  solucionPgn: solucionPgnProp = '',
  comentarioSolucion: comentarioSolucionProp = '',
  fechaEntrega = null,
  progreso: progresoProp,
  onClose,
}: VisorEjercicioProps) {

  // Estado común
  const [orientacion, setOrientacion]   = useState<'white' | 'black'>('white');
  const [grabando, setGrabando]         = useState(false);
  const [tab, setTab]                   = useState<'tablero' | 'respuestas'>('tablero');
  const [respuestas, setRespuestas]     = useState<RespuestaAlumno[]>([]);
  const [cargandoResp, setCargandoResp] = useState(false);
  const [comentarioVistaAlumno, setComentarioVistaAlumno] = useState<{
    respuestaId: string;
    nombre: string;
    comentario: string | null;
    revisionInicial: string | null;
    puntuacionInicial: number | null;
    estadoAlumno: 'NO_INICIADO' | 'EN_PROGRESO' | 'COMPLETADO';
  } | null>(null);
  const [revisionProfesor, setRevisionProfesor]     = useState('');
  const [puntuacionProfesor, setPuntuacionProfesor] = useState<number | null>(null);
  const [guardandoEval, setGuardandoEval]           = useState(false);
  const [evalGuardadaOk, setEvalGuardadaOk]         = useState(false);
  const [guardandoSol, setGuardandoSol] = useState(false);

  const [tieneSolucion, setTieneSolucion]           = useState(!!solucionPgnProp);
  const [solucionPgn, setSolucionPgn]               = useState(solucionPgnProp);
  const [comentarioSolucion, setComentarioSolucion] = useState(comentarioSolucionProp);
  const [comentarioGuardado, setComentarioGuardado] = useState(comentarioSolucionProp);
  const [mostrandoSolucion, setMostrandoSolucion]   = useState(false);

  const [completado, setCompletado]             = useState(progresoProp?.estado === 'COMPLETADO');
  const [intentosFallidos, setIntentosFallidos] = useState(progresoProp?.intentos_fallidos ?? 0);
  const [bannerCompletado, setBannerCompletado] = useState(false);
  const [comentarioAlumno, setComentarioAlumno]         = useState(progresoProp?.comentario_alumno ?? '');
  const [enviandoComentario, setEnviandoComentario]     = useState(false);
  const [comentarioGuardadoOk, setComentarioGuardadoOk] = useState(false);
  const [flashStyles, setFlashStyles] = useState<Record<string, CSSProperties>>({});
  const [pendingPromStudent, setPendingPromStudent] = useState<{
    from: string; to: string; color: 'w' | 'b';
  } | null>(null);

  // Refs
  const solucionMovs  = useRef<string[]>([]);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Permisos
  const evaluado = !esProfesor &&
    progresoProp?.puntuacion !== null &&
    progresoProp?.puntuacion !== undefined;

  const puedeVerSolucion = esProfesor ||
    (fechaEntrega ? new Date() > new Date(fechaEntrega) : false);

  // Hook de ajedrez
  const {
    pgn, fenVisible, estilosCombinados,
    indiceVista, setIndiceVista,
    totalMoves, estamosEnElPresente,
    historialMovimientos, gameActual,
    pendingPromotion,
    irAlInicio, irAtras, irAdelante, irAlFinal,
    onPieceDrop, onPieceDrag, onSquareClick,
    handlePromotionSelect, handlePromotionCancel,
    cargarPgn,
  } = useChessGame({ pgnInicial });

  // Orientación desde pgnBase
  useEffect(() => {
    if (!pgnBase) return;
    const g = new Chess();
    try { g.loadPgn(pgnBase); } catch {
      try { g.load(pgnBase); } catch { return; }
    }
    setOrientacion(g.turn() === 'w' ? 'white' : 'black');
  }, [pgnBase]);

  // Parsear solución
  useEffect(() => {
    if (!solucionPgn) { solucionMovs.current = []; return; }
    const g = new Chess();
    try { g.loadPgn(solucionPgn); solucionMovs.current = g.history(); } catch {}
  }, [solucionPgn]);

  // Fetch respuestas
  const fetchRespuestas = () => {
    if (!esProfesor) return;
    setCargandoResp(true);
    fetch(`${API}/${ejercicioId}/respuestas`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(r => r.json())
      .then(d => { if (d.success) setRespuestas(d.respuestas); })
      .finally(() => setCargandoResp(false));
  };

  useEffect(() => { fetchRespuestas(); }, [ejercicioId, esProfesor]);
  useEffect(() => { if (tab === 'respuestas') fetchRespuestas(); }, [tab]);

  // ── Timer del alumno ──────────────────────────────────────────────────────
  // Cuenta solo mientras la página está abierta.
  // Arranca desde tiempo_acumulado (ya guardado en BD).
  // Cada FLUSH_INTERVAL segundos envía los nuevos segundos al backend.
  // Al desmontar guarda los segundos pendientes sin esperar el intervalo.

  const FLUSH_INTERVAL = 10; // segundos entre guardados automáticos

  const timerDetenido = completado ||
    (fechaEntrega ? new Date() > new Date(fechaEntrega) : false);

  const [timerSegundos, setTimerSegundos] = useState<number>(
    progresoProp?.tiempo_acumulado ?? 0
  );

  const segundosPendientesRef = useRef<number>(0);

  const flushTiempo = useCallback(async (segundos: number) => {
    if (segundos <= 0 || !ejercicioId) return;
    try {
      await fetch(`${API}/${ejercicioId}/tiempo`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ segundos }),
      });
    } catch {}
  }, [ejercicioId]);

  useEffect(() => {
    if (esProfesor || timerDetenido) return;
    if (!progresoProp?.fecha_primer_acceso) return;

    segundosPendientesRef.current = 0;

    const tick = setInterval(() => {
      setTimerSegundos(s => s + 1);
      segundosPendientesRef.current += 1;

      if (segundosPendientesRef.current >= FLUSH_INTERVAL) {
        flushTiempo(segundosPendientesRef.current);
        segundosPendientesRef.current = 0;
      }
    }, 1000);

    return () => {
      clearInterval(tick);
      if (segundosPendientesRef.current > 0) {
        flushTiempo(segundosPendientesRef.current);
        segundosPendientesRef.current = 0;
      }
    };
  }, [esProfesor, timerDetenido, progresoProp?.fecha_primer_acceso, flushTiempo]);

  const timerStr = (() => {
    const h = String(Math.floor(timerSegundos / 3600)).padStart(2, '0');
    const m = String(Math.floor((timerSegundos % 3600) / 60)).padStart(2, '0');
    const s = String(timerSegundos % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  })();

  // Sonido
  const reproducirSonido = (tipo: 'move' | 'capture') => {
    try { new Audio(`/sounds/${tipo}.mp3`).play().catch(() => {}); } catch {}
  };

  // Lógica del alumno
  const ejecutarMovAlumno = (from: string, to: string, promotion: PromotionPiece = 'q'): boolean => {
    const tempGame = new Chess();
    try {
      if (pgn.trim()) tempGame.loadPgn(pgn);
    } catch { return false; }

    const move = tempGame.move({ from, to, promotion });
    if (!move) return false;

    const indice     = gameActual.history().length;
    const esperado   = solucionMovs.current[indice];
    const esCorrecto = move.san === esperado;
    const esFinal    = esCorrecto && indice + 1 === solucionMovs.current.length;

    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    const color = esCorrecto ? 'rgba(34,197,94,0.45)' : 'rgba(239,68,68,0.45)';
    setFlashStyles({ [from]: { backgroundColor: color }, [to]: { backgroundColor: color } });
    flashTimerRef.current = setTimeout(() => setFlashStyles({}), 700);

    if (esCorrecto) {
      cargarPgn(tempGame.pgn());
      reproducirSonido(move.captured ? 'capture' : 'move');

      if (esFinal) {
        setCompletado(true);
        setBannerCompletado(true);
      } else {
        const indiceRival = indice + 1;
        const sanRival    = solucionMovs.current[indiceRival];
        if (sanRival) {
          setTimeout(() => {
            const rivalGame = new Chess();
            try { rivalGame.loadPgn(tempGame.pgn()); } catch { return; }
            const rivalMove = rivalGame.move(sanRival);
            if (!rivalMove) return;

            const rivalEsFinal = indiceRival + 1 === solucionMovs.current.length;
            cargarPgn(rivalGame.pgn());
            reproducirSonido(rivalMove.captured ? 'capture' : 'move');

            if (rivalEsFinal) {
              setCompletado(true);
              setBannerCompletado(true);
            }

            fetch(`${API}/${ejercicioId}/movimiento`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
              body: JSON.stringify({
                es_correcto: true, pgn_actualizado: rivalGame.pgn(), es_final: rivalEsFinal,
              }),
            }).catch(() => {});
          }, 400);
        }
      }
    } else {
      setIntentosFallidos(prev => prev + 1);
    }

    fetch(`${API}/${ejercicioId}/movimiento`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({
        es_correcto: esCorrecto, pgn_actualizado: tempGame.pgn(), es_final: esFinal,
      }),
    }).catch(() => {});

    return esCorrecto;
  };

  const onPieceDropAlumno = useCallback(({ sourceSquare, targetSquare }: {
    piece: any; sourceSquare: string; targetSquare: string | null;
  }): boolean => {
    if (!targetSquare || completado || !estamosEnElPresente) return false;

    const movLegales = gameActual.moves({ verbose: true }) as any[];
    const esLegal = movLegales.some((m: any) => m.from === sourceSquare && m.to === targetSquare);
    if (!esLegal) return false;

    const pieza = gameActual.get(sourceSquare as any);
    const esPromocion = pieza?.type === 'p' &&
      ((pieza.color === 'w' && targetSquare[1] === '8') ||
       (pieza.color === 'b' && targetSquare[1] === '1'));

    if (esPromocion) {
      setPendingPromStudent({ from: sourceSquare, to: targetSquare, color: pieza!.color as 'w' | 'b' });
      return false;
    }

    return ejecutarMovAlumno(sourceSquare, targetSquare);
  }, [completado, estamosEnElPresente, gameActual, pgn]);

  const handlePromotionSelectAlumno = (piece: PromotionPiece) => {
    if (!pendingPromStudent) return;
    ejecutarMovAlumno(pendingPromStudent.from, pendingPromStudent.to, piece);
    setPendingPromStudent(null);
  };

  // Lógica del profesor

  const iniciarGrabacion = () => {
    cargarPgn(pgnInicial);
    setGrabando(true);
    setMostrandoSolucion(false);
    setTab('tablero');
    setComentarioVistaAlumno(null);
  };

  const cancelarGrabacion = () => {
    cargarPgn(pgnInicial);
    setGrabando(false);
    setComentarioVistaAlumno(null);
  };

  const reiniciarGrabacion = () => cargarPgn(pgnInicial);

  const guardarSolucion = async () => {
    if (!pgn.trim()) return;
    setGuardandoSol(true);
    try {
      const gameOriginal  = new Chess();
      const gamePropuesto = new Chess();
      let originalCargado  = false;
      let propuestoCargado = false;

      try { gameOriginal.loadPgn(pgnInicial.trim()); originalCargado = true; } catch {
        try { gameOriginal.load(pgnInicial.trim()); originalCargado = true; } catch {}
      }
      try { gamePropuesto.loadPgn(pgn.trim()); propuestoCargado = true; } catch {}

      if (originalCargado && propuestoCargado) {
        const fenOrig = gameOriginal.header()['FEN'] || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        const fenProp = gamePropuesto.header()['FEN'] || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

        if (fenOrig.trim() !== fenProp.trim()) {
          alert('❌ Error de Integridad: La solución no arranca desde la posición inicial del ejercicio.');
          return;
        }

        const histOrig = gameOriginal.history();
        const histProp = gamePropuesto.history();

        if (histProp.length < histOrig.length) {
          alert('❌ Error: La solución contiene menos movimientos que los pasos iniciales obligatorios.');
          return;
        }
        for (let i = 0; i < histOrig.length; i++) {
          if (histProp[i] !== histOrig[i]) {
            alert(`❌ Error: El movimiento inicial número ${i + 1} ha sido alterado.`);
            return;
          }
        }
        if (histProp.length === histOrig.length) {
          alert('⚠ No has añadido ninguna jugada nueva. Mueve piezas para registrar la solución.');
          return;
        }
        if (tieneSolucion) {
          const gameYaGuardado = new Chess();
          try { gameYaGuardado.loadPgn(solucionPgn); } catch {}
          const mismoComentario = comentarioSolucion.trim() === comentarioGuardado.trim();
          if (gameYaGuardado.history().join(' ') === gamePropuesto.history().join(' ') && mismoComentario) {
            alert('ℹ No hay cambios respecto a la solución ya guardada.');
            return;
          }
        }
      }

      const res = await fetch(`${API}/${ejercicioId}/solucion`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          solucion_pgn: pgn.trim(),
          comentarios_solucion: comentarioSolucion.trim() || null,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? 'Error al guardar');

      setSolucionPgn(pgn.trim());
      setComentarioGuardado(comentarioSolucion.trim());
      setTieneSolucion(true);
      setGrabando(false);
      cargarPgn(pgnInicial);

      if (d.regrabado) {
        alert('🔄 Solución modificada. El progreso anterior de los alumnos ha sido borrado.');
      } else if (fechaEntrega && d.asignado) {
        alert('✅ Solución guardada. El ejercicio ha sido asignado automáticamente a los alumnos.');
      } else {
        alert('✅ Solución guardada. Establece una fecha de inicio y de entrega para asignarla automáticamente a los alumnos.');
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setGuardandoSol(false);
    }
  };

  const guardarComentarioAlumno = async () => {
    if (!comentarioAlumno.trim()) return;
    setEnviandoComentario(true);
    setComentarioGuardadoOk(false);
    try {
      const res = await fetch(`${API}/${ejercicioId}/comentario-alumno`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ comentario: comentarioAlumno.trim() }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? 'Error al guardar');
      setComentarioGuardadoOk(true);
      setTimeout(() => setComentarioGuardadoOk(false), 3000);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setEnviandoComentario(false);
    }
  };

  const toggleSolucion = () => {
    if (mostrandoSolucion) {
      cargarPgn(pgnInicial);
      setMostrandoSolucion(false);
    } else {
      cargarPgn(solucionPgn);
      setMostrandoSolucion(true);
    }
  };

  // Derivados
  const estilosMerged = { ...estilosCombinados, ...flashStyles };
  const puedeArrastrar =
    grabando ||
    (!esProfesor && !completado && !mostrandoSolucion && estamosEnElPresente);

  // Guardar evaluación del profesor
  const guardarEvaluacion = async () => {
    if (!comentarioVistaAlumno) return;
    setGuardandoEval(true);
    setEvalGuardadaOk(false);
    try {
      const res = await fetch(`${API}/respuestas/${comentarioVistaAlumno.respuestaId}/evaluar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          puntuacion: puntuacionProfesor,
          comentario: revisionProfesor.trim() || null,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? 'Error al guardar');
      setEvalGuardadaOk(true);
      setTimeout(() => setEvalGuardadaOk(false), 3000);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setGuardandoEval(false);
    }
  };

  const formatTiempo = (
    inicio: string | null,
    fin: string | null,
    tiempoAcumulado?: number | null,
  ) => {
    if (!inicio) return '—';

    let totalSegundos: number;

    if (fin) {
      // Completado: usar diferencia de fechas (precisa)
      totalSegundos = Math.floor(
        (new Date(fin).getTime() - new Date(inicio).getTime()) / 1000
      );
    } else if (tiempoAcumulado !== null && tiempoAcumulado !== undefined) {
      // No completado: usar tiempo acumulado real (solo cuenta cuando la página estaba abierta)
      totalSegundos = tiempoAcumulado;
    } else {
      // Fallback si no hay tiempo_acumulado aún
      totalSegundos = Math.floor(
        (new Date().getTime() - new Date(inicio).getTime()) / 1000
      );
    }

    const h = Math.floor(totalSegundos / 3600);
    const m = Math.floor((totalSegundos % 3600) / 60);
    const s = totalSegundos % 60;
    if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  };

  const ESTADO_CFG = {
    COMPLETADO:  { label: 'Completado',  color: 'bg-green-100 text-green-700' },
    EN_PROGRESO: { label: 'En progreso', color: 'bg-amber-100 text-amber-700' },
    NO_INICIADO: { label: 'Sin iniciar', color: 'bg-slate-100 text-slate-500' },
  } as const;

  // Render
  return (
    <div className="flex flex-col items-center w-full max-w-7xl mx-auto p-4 bg-white rounded-2xl shadow-sm border border-slate-200 relative">

      {pendingPromotion && (
        <PromotionModal
          color={pendingPromotion.color}
          onSelect={handlePromotionSelect}
          onCancel={handlePromotionCancel}
        />
      )}
      {pendingPromStudent && (
        <PromotionModal
          color={pendingPromStudent.color}
          onSelect={handlePromotionSelectAlumno}
          onCancel={() => setPendingPromStudent(null)}
        />
      )}

      {/* Banner de ejercicio completado */}
      {bannerCompletado && (
        <div className="absolute inset-0 rounded-2xl z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center flex flex-col items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <div>
              <h3 className="text-2xl font-extrabold text-slate-900">¡Ejercicio completado!</h3>
              <p className="text-slate-500 text-sm mt-1">Has encontrado la solución correcta.</p>
            </div>
            <div className="w-full flex gap-3">
              <div className="flex-1 bg-slate-50 rounded-xl py-3 px-4 text-center">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Tiempo</p>
                <p className="text-lg font-black text-slate-800 font-mono">{timerStr}</p>
              </div>
              <div className="flex-1 bg-slate-50 rounded-xl py-3 px-4 text-center">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Errores</p>
                <p className="text-lg font-black text-slate-800">{intentosFallidos}</p>
              </div>
            </div>
            <div className="w-full flex flex-col gap-2">
              {puedeVerSolucion && tieneSolucion && (
                <button
                  onClick={() => { setBannerCompletado(false); toggleSolucion(); }}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors"
                >
                  Ver solución del profesor
                </button>
              )}
              <button
                onClick={() => setBannerCompletado(false)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-colors"
              >
                Revisar mis movimientos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cabecera */}
      <div className="w-full flex justify-between items-center mb-6 mt-4 px-4 flex-wrap gap-3">
        <div className="flex items-center gap-4">
          {onClose && (
            <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors" title="Volver">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <div className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              Ejercicio
              {grabando && (
                <span className="text-sm font-semibold text-red-600 animate-pulse">
                  ● Grabando solución
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {!comentarioVistaAlumno && (
            <>
              {esProfesor && grabando && (
                <>
                  <button onClick={reiniciarGrabacion}
                    className="flex items-center gap-2 px-4 py-1.5 bg-amber-100 text-amber-700 rounded-full text-sm font-semibold hover:bg-amber-200 transition-colors"
                    title="Volver a la posición inicial del problema">
                    <RotateCcw className="w-4 h-4" /> Reiniciar
                  </button>
                  <button onClick={guardarSolucion} disabled={!pgn.trim() || guardandoSol}
                    className="flex items-center gap-2 px-4 py-1.5 bg-green-600 text-white rounded-full text-sm font-semibold hover:bg-green-700 disabled:opacity-40 transition-colors">
                    {guardandoSol ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {guardandoSol ? 'Guardando...' : 'Guardar solución'}
                  </button>
                  <button onClick={cancelarGrabacion}
                    className="flex items-center gap-2 px-4 py-1.5 bg-slate-200 text-slate-700 rounded-full text-sm font-semibold hover:bg-slate-300 transition-colors">
                    <X className="w-4 h-4" /> Cancelar
                  </button>
                </>
              )}
              {esProfesor && !grabando && tab !== 'respuestas' && (
                <>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    tieneSolucion ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {tieneSolucion ? '✓ Solución grabada' : '⚠ Sin solución'}
                  </span>
                  <button onClick={iniciarGrabacion}
                    className="flex items-center gap-2 px-4 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-full text-sm font-semibold transition-colors">
                    <Video className="w-4 h-4" />
                    {tieneSolucion ? 'Regrabar solución' : 'Grabar solución'}
                  </button>
                </>
              )}
              {puedeVerSolucion && tieneSolucion && !grabando && tab !== 'respuestas' && (
                <button onClick={toggleSolucion}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                    mostrandoSolucion
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                  }`}>
                  {mostrandoSolucion ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {mostrandoSolucion ? 'Ocultar solución' : 'Ver solución'}
                </button>
              )}
            </>
          )}
          {comentarioVistaAlumno && tab === 'tablero' && (
            <button
              onClick={() => { cargarPgn(pgnInicial); setComentarioVistaAlumno(null); }}
              className="flex items-center gap-2 px-4 py-1.5 bg-slate-800 text-white rounded-full text-sm font-semibold hover:bg-slate-900 transition-colors"
            >
              <X className="w-4 h-4" /> Salir de revisión
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      {esProfesor && !grabando && (
        <div className="w-full px-4 mb-2 flex gap-1 border-b border-slate-200">
          {(['tablero', 'respuestas'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 -mb-px flex items-center gap-2 ${
                tab === t
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}>
              {t === 'tablero' ? 'Tablero' : (
                <>
                  <Users className="w-3.5 h-3.5" />
                  Respuestas{respuestas.length > 0 ? ` (${respuestas.length})` : ''}
                </>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Panel de respuestas */}
      {esProfesor && tab === 'respuestas' && !grabando && (
        <div className="w-full px-4 pb-6 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              {cargandoResp ? 'Cargando...' : `${respuestas.length} alumno${respuestas.length !== 1 ? 's' : ''}`}
            </p>
            <button onClick={fetchRespuestas}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors">
              <RefreshCw className="w-3 h-3" /> Actualizar
            </button>
          </div>

          {cargandoResp ? (
            <div className="flex items-center justify-center py-12 gap-3 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Cargando respuestas...</span>
            </div>
          ) : respuestas.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Ningún alumno ha iniciado el ejercicio aún.
            </div>
          ) : (
            respuestas.map(r => {
              const fechaVencida = fechaEntrega ? new Date() > new Date(fechaEntrega) : false;
              const noCompletado = fechaVencida && r.estado !== 'COMPLETADO';
              const cfg = noCompletado
                ? { label: 'No completado', color: 'bg-red-100 text-red-700' }
                : ESTADO_CFG[r.estado as keyof typeof ESTADO_CFG] ?? ESTADO_CFG.NO_INICIADO;
              const tiempo = formatTiempo(r.fecha_primer_acceso, r.fecha_completado, r.tiempo_acumulado);
              const pgnCargar = r.pgn_ultimo_movimiento ?? r.pgn_avanzado_correcto;

              return (
                <div
                  key={r.id}
                  onClick={() => {
                    // Si no hay progreso del alumno, cargar el PGN base del ejercicio
                    const pgnACargar = pgnCargar || pgnInicial;
                    cargarPgn(pgnACargar);
                    setTab('tablero');
                    setMostrandoSolucion(false);
                    setComentarioVistaAlumno({
                      respuestaId:       r.id,
                      nombre:            `${r.alumno.nombre} ${r.alumno.apellidos}`,
                      comentario:        r.comentario_alumno,
                      revisionInicial:   r.comentario_revision,
                      puntuacionInicial: r.puntuacion,
                      estadoAlumno:      r.estado,
                    });
                    setRevisionProfesor(r.comentario_revision ?? '');
                    setPuntuacionProfesor(r.puntuacion ?? null);
                    setEvalGuardadaOk(false);
                  }}
                  className="group bg-white border border-slate-200 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all cursor-pointer hover:border-blue-400 hover:shadow-md" 
                >
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-base transition-colors ${pgnCargar ? 'text-slate-900 group-hover:text-blue-700' : 'text-slate-600'}`}>
                      {r.alumno.nombre} {r.alumno.apellidos}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 mt-2">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${cfg.color}`}>
                        {cfg.label}
                      </span>
                      {r.estado !== 'NO_INICIADO' && (
                        <>
                          {r.fecha_primer_acceso && (
                            <span className="text-sm font-semibold text-slate-600 flex items-center gap-1.5">
                              <Clock className="w-4 h-4 text-slate-400" /> {tiempo}
                            </span>
                          )}
                          <span className="text-sm font-semibold text-slate-600">
                            ❌ {r.intentos_fallidos} errores
                          </span>
                        </>
                      )}
                    </div>
                    {r.comentario_alumno && (
                      <p className="text-sm text-slate-600 mt-3 italic border-l-4 border-slate-200 pl-3 break-words whitespace-pre-wrap">
                        "{r.comentario_alumno}"
                      </p>
                    )}
                    {(r.comentario_revision || r.puntuacion !== null) && (
                      <div className="mt-4 bg-blue-50/50 border border-blue-100 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="text-[12px] font-bold text-blue-500 uppercase tracking-wide">
                            Tu revisión
                          </p>
                          {r.puntuacion !== null && (
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-100 border border-blue-200 rounded-lg">
                              <span className="text-[15px] font-black text-blue-700 leading-none">⭐ {r.puntuacion}</span>
                              <span className="text-[15px] font-black text-blue-700 leading-none">/ 5</span>
                            </div>
                          )}
                        </div>
                        {r.comentario_revision && (
                          <p className="text-sm text-slate-700 italic font-medium break-words whitespace-pre-wrap">
                            "{r.comentario_revision}"
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tablero + Planilla */}
      {(tab === 'tablero' || grabando) && (
        <div className="w-full flex flex-col lg:flex-row gap-6 px-4 items-stretch justify-center">

          {/* Panel izquierdo: comentario al grabar */}
          {esProfesor && grabando && (
            <div className="w-full lg:w-64 xl:w-72 shrink-0 flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                Comentario de la solución
              </label>
              <textarea
                className="flex-1 w-full p-3 border border-slate-300 rounded-xl text-sm resize-none outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 min-h-[200px]"
                value={comentarioSolucion}
                onChange={e => setComentarioSolucion(e.target.value)}
                placeholder="Explica la idea principal de la solución, conceptos clave, errores comunes a evitar..."
              />
            </div>
          )}

          {/* Panel izquierdo: comentario solución (solo lectura) */}
          {mostrandoSolucion && comentarioSolucion && (
            <div className="w-full lg:w-64 xl:w-72 shrink-0 flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                Comentario de la solución
              </label>
              <div className="flex-1 p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {comentarioSolucion}
              </div>
            </div>
          )}

          {/* Panel izquierdo: evaluación profesor al ver posición alumno */}
          {esProfesor && !grabando && comentarioVistaAlumno && (() => {
            // Se puede evaluar si el alumno completó el ejercicio O si ha pasado la fecha de entrega
            const puedeEvaluar =
              comentarioVistaAlumno.estadoAlumno === 'COMPLETADO' ||
              (fechaEntrega ? new Date() > new Date(fechaEntrega) : false);

            return (
            <div className="w-full lg:w-64 xl:w-72 shrink-0 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Revisión</label>
              </div>
              <div className="px-3 py-2 bg-slate-100 rounded-xl">
                <p className="text-sm font-semibold text-slate-700">{comentarioVistaAlumno.nombre}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Comentario del alumno</p>
                {comentarioVistaAlumno.comentario ? (
                  <textarea readOnly rows={5}
                    className="w-full p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-slate-700 leading-relaxed resize-none outline-none overflow-y-auto"
                    value={comentarioVistaAlumno.comentario}
                  />
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-400 italic">Sin comentario.</div>
                )}
              </div>

              {puedeEvaluar ? (
                <>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Puntuación</p>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map(n => (
                        <button key={n}
                          onClick={() => setPuntuacionProfesor(puntuacionProfesor === n ? null : n)}
                          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors border-2 ${
                            puntuacionProfesor === n
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-slate-500 border-slate-200 hover:border-blue-400 hover:text-blue-600'
                          }`}
                        >{n}</button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Tu comentario de revisión</p>
                    <textarea rows={5} maxLength={350}
                      className="flex-1 w-full p-3 border border-slate-300 rounded-xl text-sm resize-none outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                      value={revisionProfesor}
                      onChange={e => setRevisionProfesor(e.target.value)}
                      placeholder="Indica al alumno qué hizo bien, qué falló y cómo mejorar..."
                    />
                    <span className={`text-xs text-right ${revisionProfesor.length >= 350 ? 'text-red-500' : 'text-slate-500'}`}>
                      {revisionProfesor.length}/350
                    </span>
                  </div>
                  <button onClick={guardarEvaluacion} disabled={guardandoEval}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl text-sm disabled:opacity-40 flex items-center justify-center gap-2 transition-colors">
                    {guardandoEval
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                      : evalGuardadaOk ? '✓ Evaluación guardada' : 'Guardar evaluación'}
                  </button>
                </>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 font-medium">
                  Solo puedes evaluar cuando el alumno haya completado el ejercicio o haya pasado la fecha de entrega.
                </div>
              )}
            </div>
            );
          })()}

          {/* Panel izquierdo: timer y fallos del alumno */}
          {!esProfesor && !grabando && !mostrandoSolucion && (
            <div className="w-full lg:w-64 xl:w-72 shrink-0 flex flex-col gap-3">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col items-center gap-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tiempo</p>
                <p className="text-4xl font-black text-slate-800 font-mono tracking-tight">{timerStr}</p>
                {evaluado ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 mt-1">
                    ★ Evaluado
                  </span>
                ) : completado && !timerDetenido ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 mt-1">
                    <CheckCircle className="w-3 h-3" /> Completado
                  </span>
                ) : null}
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col items-center gap-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Errores</p>
                <p className={`text-4xl font-black font-mono tracking-tight ${
                  intentosFallidos === 0 ? 'text-green-600' : intentosFallidos < 5 ? 'text-amber-500' : 'text-red-500'
                }`}>{intentosFallidos}</p>
              </div>
              {fechaEntrega && (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col items-center gap-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Entrega</p>
                  <p className="text-sm font-bold text-slate-700 text-center">
                    {new Date(fechaEntrega).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              )}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-3 flex-1">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Tu comentario para el profesor</p>
                <textarea rows={5} maxLength={350}
                  className="flex-1 w-full p-3 border border-slate-300 rounded-xl text-sm resize-none outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  value={comentarioAlumno}
                  onChange={e => setComentarioAlumno(e.target.value)}
                  placeholder="Describe tu razonamiento, dudas o preguntas..."
                />
                <span className={`text-xs text-right ${comentarioAlumno.length >= 350 ? 'text-red-500' : 'text-slate-500'}`}>
                  {comentarioAlumno.length}/350
                </span>
                <button onClick={guardarComentarioAlumno}
                  disabled={!comentarioAlumno.trim() || enviandoComentario || (fechaEntrega ? new Date() > new Date(fechaEntrega) : false)}
                  className={`w-full py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl text-sm disabled:opacity-40 flex items-center justify-center gap-2 transition-colors ${
                    fechaEntrega && new Date() > new Date(fechaEntrega) ? 'disabled:cursor-not-allowed' : 'disabled:cursor-default'
                  }`}>
                  {enviandoComentario
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                    : comentarioGuardadoOk ? '✓ Guardado' : 'Guardar comentario'}
                </button>

              </div>
            </div>
          )}

          {/* Tablero */}
          <div className="flex-1 max-w-[550px] w-full shadow-xl rounded-sm overflow-hidden border-4 border-[#302e2c] self-start">
            <ChessboardCore
              fen={fenVisible}
              squareStyles={estilosMerged}
              orientation={orientacion}
              allowDragging={puedeArrastrar}
              onPieceDrop={esProfesor ? onPieceDrop : onPieceDropAlumno}
              onPieceDrag={onPieceDrag}
              onSquareClick={onSquareClick}
            />
          </div>

          {/* Planilla + botón girar tablero */}
          <div className="w-full lg:w-72 xl:w-80 shrink-0 flex flex-col gap-2">
            <div className="lg:h-[548px]">
              <Planilla
                historialMovimientos={historialMovimientos}
                indiceVista={indiceVista}
                setIndiceVista={setIndiceVista}
                estamosEnElPresente={estamosEnElPresente}
                irAlInicio={irAlInicio}
                irAtras={irAtras}
                irAdelante={irAdelante}
                irAlFinal={irAlFinal}
              />
            </div>
            <div className="flex justify-end mt-2">
              <button
                onClick={() => setOrientacion(o => o === 'white' ? 'black' : 'white')}
                className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-colors shadow-sm flex items-center gap-2"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                Girar Tablero
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revisión del profesor — sección ancha debajo del tablero */}
      {!esProfesor && (progresoProp?.puntuacion !== null && progresoProp?.puntuacion !== undefined || progresoProp?.comentario_revision) && (
        <div className="w-full mt-4 px-4 max-w-7xl">
          <p className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-3">
            Revisión del profesor
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 flex gap-6 min-h-[200px]">

            {/* Izquierda: label arriba, cajas y X/5 centradas verticalmente */}
            {progresoProp?.puntuacion !== null && progresoProp?.puntuacion !== undefined && (
              <div className="shrink-0 flex flex-col items-start">
                <p className="text-xs font-bold text-blue-500 uppercase tracking-wide">Puntuación</p>
                <div className="flex-1 flex flex-col items-start justify-center gap-2 mt-3">
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(n => (
                      <div key={n} className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                        n <= (progresoProp.puntuacion ?? 0) ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-300'
                      }`}>{n}</div>
                    ))}
                  </div>
                  <span className="text-sm font-bold text-blue-700">{progresoProp.puntuacion}/5</span>
                </div>
              </div>
            )}

            {/* Separador vertical */}
            {progresoProp?.puntuacion !== null && progresoProp?.puntuacion !== undefined && progresoProp?.comentario_revision && (
              <div className="w-px bg-blue-200 self-stretch" />
            )}

            {/* Derecha: comentario */}
            <div className="flex-1 flex flex-col gap-3">
              <p className="text-xs font-bold text-blue-500 uppercase tracking-wide">Comentario</p>
              {progresoProp?.comentario_revision ? (
                <textarea
                  readOnly
                  className="flex-1 w-full p-3 bg-white border border-blue-200 rounded-xl text-sm text-slate-700 leading-relaxed resize-none outline-none overflow-y-auto min-h-[140px]"
                  value={progresoProp.comentario_revision}
                />
              ) : (
                <p className="text-sm text-blue-300 italic">Sin comentario.</p>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}