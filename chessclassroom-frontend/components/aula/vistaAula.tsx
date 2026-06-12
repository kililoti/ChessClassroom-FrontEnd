'use client';

import { useState, useEffect, useCallback } from 'react';
import { useChessGame, MoveResult, getFenAtIndex } from '@/hooks/useChessGame';
import { useAulaRealtime, EventoAula } from '@/hooks/useAulaRealtime';
import ChessboardCore from '@/components/ajedrez/core/ChessboardCore';
import PromotionModal from '@/components/ajedrez/ui/PromotionModal';
import Planilla from '@/components/ajedrez/Planilla';

export interface VistaAulaProps {
  aulaId: string;
  pgnInicial?: string;
  esProfesor?: boolean;
  onCargarPartida?: () => void;
  onGuardar?: () => void;
}

export default function VistaAula({
  aulaId,
  pgnInicial = '',
  esProfesor = false,
  onCargarPartida,
  onGuardar,
}: VistaAulaProps) {
  const [orientacion, setOrientacion] = useState<'white' | 'black'>('white');

  const {
    pgn, fenVisible, estilosCombinados,
    indiceVista, setIndiceVista,
    totalMoves, estamosEnElPresente,
    historialMovimientos, gameActual,
    pendingPromotion,
    orientacionInicial,
    irAlInicio, irAtras, irAdelante, irAlFinal,
    onPieceDrop, onPieceDrag, onSquareClick,
    handlePromotionSelect, handlePromotionCancel,
    cargarPgn, reiniciar,
  } = useChessGame({ pgnInicial });

  useEffect(() => {
    setOrientacion(orientacionInicial);
  }, [orientacionInicial]);

  // Cuando el profesor carga una nueva partida desde el modal,
  // pgnInicial cambia y useChessGame lo recarga automáticamente.
  // Pero se necesita emitir a los alumnos y persistirlo.
  useEffect(() => {
    if (!esProfesor || !pgnInicial) return;
    emitir({ tipo: 'CARGA', pgn: pgnInicial, fen: '' });
    persistirTablero(pgnInicial, '');
  // Solo cuando cambia pgnInicial
  }, [pgnInicial]);

  // Manejar eventos recibidos del canal (solo alumnos los aplican)
  const handleEvento = useCallback((evento: EventoAula) => {
    if (esProfesor) return;

    switch (evento.tipo) {
      case 'MOVIMIENTO':
      case 'CARGA':
      case 'REINICIO':
        cargarPgn(evento.pgn);
        break;
      case 'NAVEGAR':
        cargarPgn(evento.pgn);
        setTimeout(() => setIndiceVista(evento.indice), 0);
        break;
      case 'ORIENTACION':
        setOrientacion(evento.orientacion);
        break;
    }
  }, [esProfesor, cargarPgn, setIndiceVista]);

  const { emitir } = useAulaRealtime({
    aulaId,
    esProfesor,
    onEvento: handleEvento
  });

  // Persistir tablero en BD
  const persistirTablero = useCallback(async (pgn: string, fen: string) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:3001/api/aula/${aulaId}/tablero`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ fen, pgn })
      });
    } catch (err) {
      console.error('Error persistiendo tablero:', err);
    }
  }, [aulaId]);

  // Interceptar onPieceDrop para emitir y persistir tras movimiento
  const handlePieceDrop = useCallback((args: Parameters<typeof onPieceDrop>[0]): MoveResult => {
    const resultado = onPieceDrop(args);
    if (resultado.exito && esProfesor) {
      emitir({ tipo: 'MOVIMIENTO', pgn: resultado.pgn, fen: resultado.fen });
      persistirTablero(resultado.pgn, resultado.fen);
    }
    return resultado;
  }, [onPieceDrop, esProfesor, emitir, persistirTablero]);

  // Interceptar promoción para emitir y persistir tras selección
  const handlePromotionSelectAula = useCallback((piece: Parameters<typeof handlePromotionSelect>[0]) => {
    const resultado = handlePromotionSelect(piece);
    if (resultado.exito && esProfesor) {
      emitir({ tipo: 'MOVIMIENTO', pgn: resultado.pgn, fen: resultado.fen });
      persistirTablero(resultado.pgn, resultado.fen);
    }
  }, [handlePromotionSelect, esProfesor, emitir, persistirTablero]);

  // Girar tablero
  const handleGirar = () => {
    const nueva = orientacion === 'white' ? 'black' : 'white';
    setOrientacion(nueva);
    if (esProfesor) emitir({ tipo: 'ORIENTACION', orientacion: nueva });
  };

  // Reiniciar
  const handleReiniciar = () => {
    reiniciar();
    const fenInicial = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    emitir({ tipo: 'REINICIO', pgn: '', fen: fenInicial });
    persistirTablero('', fenInicial);
  };

  // Navegación planilla con emit
  const handleSetIndiceVista = useCallback((indice: number) => {
    setIndiceVista(indice);
    if (esProfesor) emitir({ tipo: 'NAVEGAR', pgn, indice });
  }, [setIndiceVista, esProfesor, pgn, emitir]);

  const handleIrAlInicio = useCallback(() => {
    irAlInicio();
    if (esProfesor) emitir({ tipo: 'NAVEGAR', pgn, indice: 0 });
  }, [irAlInicio, esProfesor, pgn, emitir]);

  const handleIrAtras = useCallback(() => {
    irAtras();
    if (esProfesor) emitir({ tipo: 'NAVEGAR', pgn, indice: Math.max(0, indiceVista - 1) });
  }, [irAtras, esProfesor, pgn, indiceVista, emitir]);

  const handleIrAdelante = useCallback(() => {
    irAdelante();
    if (esProfesor) emitir({ tipo: 'NAVEGAR', pgn, indice: Math.min(totalMoves, indiceVista + 1) });
  }, [irAdelante, esProfesor, pgn, indiceVista, totalMoves, emitir]);

  const handleIrAlFinal = useCallback(() => {
    irAlFinal();
    if (esProfesor) emitir({ tipo: 'NAVEGAR', pgn, indice: totalMoves });
  }, [irAlFinal, esProfesor, pgn, totalMoves, emitir]);

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
              <button
                onClick={onCargarPartida}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-colors"
              >
                Cargar partida
              </button>
              <button
                onClick={onGuardar}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Guardar
              </button>
            </>
          )}
          <span className={`px-4 py-1.5 rounded-full text-sm font-semibold shadow-sm ${
            gameActual.isGameOver()
              ? 'bg-red-100 text-red-600'
              : 'bg-green-100 text-green-700'
          }`}>
            {gameActual.isGameOver()
              ? 'Partida Terminada'
              : gameActual.turn() === 'w' ? 'Juegan Blancas' : 'Juegan Negras'}
          </span>
        </div>
      </div>

      {/* Tablero + Planilla */}
      <div className="w-full flex flex-col lg:flex-row gap-6 px-4 items-stretch justify-center">
        <div className="flex-1 max-w-[550px] w-full shadow-xl rounded-sm overflow-hidden border-4 border-[#302e2c]">
          <ChessboardCore
            fen={fenVisible}
            squareStyles={estilosCombinados}
            orientation={orientacion}
            onPieceDrop={esProfesor ? handlePieceDrop : undefined}
            onPieceDrag={esProfesor ? onPieceDrag : undefined}
            onSquareClick={onSquareClick}
          />
        </div>

        <div className="w-full lg:w-72 xl:w-80 shrink-0 relative h-[350px] lg:h-auto">
          <div className="absolute inset-0 flex flex-col">
            <div className="flex-1 overflow-y-auto pr-2">
              <Planilla
                historialMovimientos={historialMovimientos}
                indiceVista={indiceVista}
                setIndiceVista={handleSetIndiceVista}
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
            {pgn || 'La partida aún no ha comenzado...'}
          </div>
        </div>
      </div>

      {/* Controles */}
      <div className="w-full mt-6 px-4 flex justify-end gap-4">
        <button
          onClick={handleGirar}
          className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-colors shadow-sm flex items-center gap-2"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          Girar Tablero
        </button>
        {esProfesor && (
          <button
            onClick={handleReiniciar}
            className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors shadow-sm"
          >
            Reiniciar Partida
          </button>
        )}
      </div>
    </div>
  );
}