'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useChessGame, MoveResult } from '@/hooks/useChessGame';
import { useAulaRealtime, EventoAula } from '@/hooks/useAulaRealtime';
import type { LineaAnalisis, FletchaStockfish } from '@/hooks/useStockfish';
import ChessboardCore from '@/components/ajedrez/core/ChessboardCore';
import PromotionModal from '@/components/ajedrez/ui/PromotionModal';
import Planilla from '@/components/ajedrez/Planilla';
import EvalBarVertical from '@/components/ajedrez/EvalBarVertical';

export interface VistaAulaProps {
  aulaId: string;
  pgnInicial?: string;
  esProfesor?: boolean;
  usuarioId?: string;
  permisosIniciales?: { puede_mover_blancas: boolean; puede_mover_negras: boolean };
  onCargarPartida?: () => void;
  onGuardar?: () => void;
  onPgnChange?: (pgn: string) => void;
  onFenChange?: (fen: string) => void;
  onEmitirRef?: (emitir: (evento: EventoAula) => void) => void;
  onStockfishRecibido?: (lineas: LineaAnalisis[], flechas: FletchaStockfish[]) => void;
  onSolicitarStockfish?: () => void;
  flechasStockfish?: FletchaStockfish[];
  mostrarEvalBar?: boolean;
  evalLinea?: LineaAnalisis | null;
}

function reproducirSonido(tipo: 'move' | 'capture') {
  try { new Audio(`/sounds/${tipo}.mp3`).play().catch(() => {}); } catch {}
}

export default function VistaAula({
  aulaId,
  pgnInicial = '',
  esProfesor = false,
  usuarioId,
  permisosIniciales,
  onCargarPartida,
  onGuardar,
  onPgnChange,
  onFenChange,
  onEmitirRef,
  onStockfishRecibido,
  onSolicitarStockfish,
  flechasStockfish = [],
  mostrarEvalBar = false,
  evalLinea = null,
}: VistaAulaProps) {
  const [orientacion, setOrientacion] = useState<'white' | 'black'>('white');
  const [puedeBlancas, setPuedeBlancas] = useState(permisosIniciales?.puede_mover_blancas ?? false);
  const [puedeNegras, setPuedeNegras]   = useState(permisosIniciales?.puede_mover_negras  ?? false);

  // Eval bar para alumnos (recibida via evento STOCKFISH)
  const [evalLineaAlumno, setEvalLineaAlumno]     = useState<LineaAnalisis | null>(null);
  const [mostrarEvalAlumno, setMostrarEvalAlumno] = useState(false);

  // Ref estable para emitir (evita dependencias cíclicas en callbacks)
  const emitirRef = useRef<((evento: EventoAula) => void) | null>(null);

  const {
    pgn, fenVisible, estilosCombinados,
    estamosEnElPresente, gameActual,
    pendingPromotion, orientacionInicial,
    nodos, nodoActualId, irANodo,
    irAlInicio, irAtras, irAdelante, irAlFinal,
    onPieceDrop, onPieceDrag, onSquareClick,
    handlePromotionSelect, handlePromotionCancel,
    cargarPgn, reiniciar,
  } = useChessGame({ pgnInicial });

  const flechasTablero = flechasStockfish;
  const turnoBlancas   = fenVisible.split(' ')[1] === 'w';

  useEffect(() => { setOrientacion(orientacionInicial); }, [orientacionInicial]);
  useEffect(() => { onPgnChange?.(pgn); }, [pgn, onPgnChange]);
  useEffect(() => { onFenChange?.(fenVisible); }, [fenVisible, onFenChange]);
  useEffect(() => {
    setPuedeBlancas(permisosIniciales?.puede_mover_blancas ?? false);
    setPuedeNegras(permisosIniciales?.puede_mover_negras  ?? false);
  }, [permisosIniciales]);

  const handleEvento = useCallback((evento: EventoAula) => {
    switch (evento.tipo) {
      case 'MOVIMIENTO':
        if (evento.emisor_id === usuarioId) break;
        cargarPgn(evento.pgn, evento.fen);
        reproducirSonido(evento.sonido);
        break;
      case 'CARGA':
      case 'REINICIO':
        if (!esProfesor) cargarPgn(evento.pgn);
        break;
      case 'NAVEGAR':
        if (!esProfesor) {
          cargarPgn(evento.pgn, evento.fen);
          reproducirSonido(evento.sonido);
        }
        break;
      case 'ORIENTACION':
        if (!esProfesor) setOrientacion(evento.orientacion);
        break;
      case 'PERMISOS':
        if (!esProfesor && evento.alumno_id === usuarioId) {
          setPuedeBlancas(evento.puede_mover_blancas);
          setPuedeNegras(evento.puede_mover_negras);
        }
        break;
      case 'STOCKFISH':
        if (!esProfesor) {
          const lineas  = evento.activo ? evento.lineas  : [];
          const flechas = evento.activo ? evento.flechas : [];
          onStockfishRecibido?.(lineas, flechas);
          setEvalLineaAlumno(lineas[0] ?? null);
          setMostrarEvalAlumno(evento.activo && lineas.length > 0);
        }
        break;
      case 'SOLICITAR_STOCKFISH':
        if (esProfesor) onSolicitarStockfish?.();
        break;
    }
  }, [esProfesor, usuarioId, cargarPgn, onStockfishRecibido, onSolicitarStockfish]);

  const { emitir } = useAulaRealtime({ aulaId, esProfesor, onEvento: handleEvento });

  useEffect(() => { emitirRef.current = emitir; }, [emitir]);
  useEffect(() => { onEmitirRef?.(emitir); }, [emitir, onEmitirRef]);

  useEffect(() => {
    if (esProfesor) return;
    const t = setTimeout(() => { emitir({ tipo: 'SOLICITAR_STOCKFISH' }); }, 1500);
    return () => clearTimeout(t);
  }, [esProfesor, emitir]);

  const persistirTablero = useCallback(async (pgn: string, fen: string) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/aula/${aulaId}/tablero`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ fen, pgn })
      });
    } catch (err) { console.error('Error persistiendo tablero:', err); }
  }, [aulaId]);

  useEffect(() => {
    if (!esProfesor || !pgnInicial) return;
    emitir({ tipo: 'CARGA', pgn: pgnInicial, fen: '' });
    persistirTablero(pgnInicial, '');
  }, [pgnInicial, esProfesor, emitir, persistirTablero]);

  const puedeArrastrar = esProfesor || (
    estamosEnElPresente &&
    ((puedeBlancas && gameActual.turn() === 'w') || (puedeNegras && gameActual.turn() === 'b'))
  );

  const handlePieceDrop = useCallback((args: Parameters<typeof onPieceDrop>[0]): MoveResult => {
    const resultado = onPieceDrop(args);
    if (resultado.exito) {
      emitir({
        tipo: 'MOVIMIENTO',
        pgn: resultado.pgn,
        fen: resultado.fen,
        sonido: resultado.captura ? 'capture' : 'move',
        emisor_id: usuarioId,
      });
      persistirTablero(resultado.pgn, resultado.fen);
    }
    return resultado;
  }, [onPieceDrop, emitir, usuarioId, persistirTablero]);

  const handlePromotionSelectAula = useCallback((piece: Parameters<typeof handlePromotionSelect>[0]) => {
    const resultado = handlePromotionSelect(piece);
    if (resultado.exito) {
      emitir({
        tipo: 'MOVIMIENTO',
        pgn: resultado.pgn,
        fen: resultado.fen,
        sonido: resultado.captura ? 'capture' : 'move',
        emisor_id: usuarioId,
      });
      persistirTablero(resultado.pgn, resultado.fen);
    }
  }, [handlePromotionSelect, emitir, usuarioId, persistirTablero]);

  const handlePieceDrag = useCallback((args: Parameters<typeof onPieceDrag>[0]) => {
    return onPieceDrag(args);
  }, [onPieceDrag]);

  // ── Handlers de navegación (emiten NAVEGAR si es el profesor) ──────────────

  const handleIrANodo = useCallback((nodoId: string) => {
    irANodo(nodoId);
    if (esProfesor) {
      const n = nodos[nodoId];
      if (n) emitirRef.current?.({
        tipo: 'NAVEGAR',
        pgn,
        fen: n.fen,
        sonido: n.captura ? 'capture' : 'move',
      });
    }
  }, [irANodo, nodos, esProfesor, pgn]);

  const handleIrAtras = useCallback(() => {
    const padreId = nodos[nodoActualId]?.padre;
    irAtras();
    if (esProfesor && padreId) {
      emitirRef.current?.({
        tipo: 'NAVEGAR',
        pgn,
        fen: nodos[padreId].fen,
        sonido: 'move',
      });
    }
  }, [irAtras, nodos, nodoActualId, esProfesor, pgn]);

  const handleIrAdelante = useCallback(() => {
    const hijoId = nodos[nodoActualId]?.hijos[0];
    irAdelante();
    if (esProfesor && hijoId) {
      const n = nodos[hijoId];
      emitirRef.current?.({
        tipo: 'NAVEGAR',
        pgn,
        fen: n.fen,
        sonido: n.captura ? 'capture' : 'move',
      });
    }
  }, [irAdelante, nodos, nodoActualId, esProfesor, pgn]);

  const handleIrAlInicio = useCallback(() => {
    irAlInicio();
    if (esProfesor) {
      emitirRef.current?.({
        tipo: 'NAVEGAR',
        pgn,
        fen: nodos['root'].fen,
        sonido: 'move',
      });
    }
  }, [irAlInicio, nodos, esProfesor, pgn]);

  const handleIrAlFinal = useCallback(() => {
    let id = nodoActualId;
    while (nodos[id]?.hijos.length > 0) id = nodos[id].hijos[0];
    irAlFinal();
    if (esProfesor && id !== nodoActualId) {
      emitirRef.current?.({
        tipo: 'NAVEGAR',
        pgn,
        fen: nodos[id].fen,
        sonido: 'move',
      });
    }
  }, [irAlFinal, nodos, nodoActualId, esProfesor, pgn]);

  // ── Valores efectivos de eval bar ──────────────────────────────────────────
  const evalLineaEfectiva   = esProfesor ? evalLinea     : evalLineaAlumno;
  const mostrarEvalEfectivo = esProfesor ? mostrarEvalBar : mostrarEvalAlumno;

  const handleGirar = () => {
    const nueva = orientacion === 'white' ? 'black' : 'white';
    setOrientacion(nueva);
    if (esProfesor) emitir({ tipo: 'ORIENTACION', orientacion: nueva });
  };

  const handleReiniciar = () => {
    reiniciar();
    const fenInicial = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    emitir({ tipo: 'REINICIO', pgn: '', fen: fenInicial });
    persistirTablero('', fenInicial);
  };

  return (
    <div className="flex flex-col items-center w-full max-w-7xl mx-auto p-4 bg-white rounded-2xl shadow-sm border border-slate-200 relative">

      {pendingPromotion && (
        <PromotionModal
          color={pendingPromotion.color}
          onSelect={handlePromotionSelectAula}
          onCancel={handlePromotionCancel}
        />
      )}

      {/* Cabecera */}
      <div className="w-full flex justify-between items-center mb-6 mt-4 px-4">
        <h2 className="text-2xl font-bold text-slate-800">Partida Activa</h2>
        <div className="flex items-center gap-3">
          {esProfesor && (
            <>
              <button onClick={onCargarPartida} className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-colors cursor-pointer">
                Cargar partida
              </button>
              <button onClick={onGuardar} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer">
                Guardar
              </button>
            </>
          )}
          {!esProfesor && (puedeBlancas || puedeNegras) && (
            <span className="px-3 py-1.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
              Puedes mover {puedeBlancas && puedeNegras ? 'ambos colores' : puedeBlancas ? 'blancas' : 'negras'}
            </span>
          )}
          <span className={`px-4 py-1.5 rounded-full text-sm font-semibold shadow-sm ${
            gameActual.isGameOver() ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'
          }`}>
            {gameActual.isGameOver() ? 'Partida Terminada' : gameActual.turn() === 'w' ? 'Juegan Blancas' : 'Juegan Negras'}
          </span>
        </div>
      </div>

      {/* Tablero + Planilla */}
      <div className="w-full flex flex-col lg:flex-row gap-6 px-4 items-stretch justify-center">

        {/* Tablero */}
        <div className="flex-1 max-w-[550px] w-full shadow-xl rounded-sm overflow-hidden border-4 border-[#302e2c] flex">
          {mostrarEvalEfectivo && evalLineaEfectiva && (
            <div className="w-5 shrink-0 border-r-4 border-[#302e2c]">
              <EvalBarVertical
                evaluacion={evalLineaEfectiva.evaluacion}
                mate={evalLineaEfectiva.mate ?? null}
                turnoBlancas={turnoBlancas}
                orientation={orientacion}
                activo={true}
              />
            </div>
          )}
          <div className="flex-1">
            <ChessboardCore
              key={`${puedeBlancas}-${puedeNegras}`}
              fen={fenVisible}
              squareStyles={estilosCombinados}
              orientation={orientacion}
              allowDragging={puedeArrastrar}
              onPieceDrop={puedeArrastrar ? handlePieceDrop : undefined}
              onPieceDrag={puedeArrastrar ? handlePieceDrag : undefined}
              onSquareClick={onSquareClick}
              flechas={flechasTablero}
            />
          </div>
        </div>

        {/* Planilla */}
        <div className="w-full lg:w-72 xl:w-80 shrink-0 relative h-[350px] lg:h-auto">
          <div className="absolute inset-0 flex flex-col">
            <div className="flex-1 overflow-y-auto pr-2">
              <Planilla
                nodos={nodos}
                nodoActualId={nodoActualId}
                irANodo={handleIrANodo}
                estamosEnElPresente={estamosEnElPresente}
                irAlInicio={handleIrAlInicio}
                irAtras={handleIrAtras}
                irAdelante={handleIrAdelante}
                irAlFinal={handleIrAlFinal}
              />
            </div>
          </div>
        </div>
      </div>

      {/* FEN + PGN */}
      <div className="w-full mt-8 px-4 flex flex-col md:flex-row gap-6">
        <div className="flex-1 min-w-0">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Posición FEN {estamosEnElPresente ? '(Presente)' : '(Pasado)'}
          </label>
          <div className="mt-1 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-700 break-all select-all">
            {fenVisible}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Historial PGN</label>
          <div className="mt-1 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-700 h-32 overflow-y-auto whitespace-pre-wrap break-words select-all leading-relaxed">
            {pgn
              ? pgn.split('\n').filter(l => !l.startsWith('[')).join('\n').trim() || 'La partida aún no ha comenzado...'
              : 'La partida aún no ha comenzado...'}
          </div>
        </div>
      </div>

      {/* Controles */}
      <div className="w-full mt-6 px-4 flex justify-end gap-4">
        <button onClick={handleGirar} className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-colors shadow-sm flex items-center gap-2 cursor-pointer">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          Girar Tablero
        </button>
        {esProfesor && (
          <button onClick={handleReiniciar} className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors shadow-sm cursor-pointer">
            Reiniciar Tablero
          </button>
        )}
      </div>
    </div>
  );
}