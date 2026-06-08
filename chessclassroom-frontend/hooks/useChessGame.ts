// Hook central de lógica de ajedrez. Reutilizable en JuegoAjedrez, TableroTarea,
// TableroTorneo, etc. No contiene nada de UI.

import { useState, useEffect, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';
import React from 'react';

// Tipos exportados
export type PromotionPiece = 'q' | 'r' | 'b' | 'n';

export interface PendingPromotion {
  from: string;
  to: string;
  color: 'w' | 'b';
}

// Constantes
export const FEN_INICIAL = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export const STYLE_SELECTED: React.CSSProperties    = { backgroundColor: 'rgba(250,204,21,0.5)' };
export const STYLE_MOVE_DOT: React.CSSProperties    = { background: 'radial-gradient(circle, rgba(34,197,94,0.75) 28%, transparent 32%)', cursor: 'pointer' };
export const STYLE_MOVE_CAPTURE: React.CSSProperties = { background: 'radial-gradient(circle at 50% 50%, transparent 60%, rgba(239,68,68,0.75) 62%)', cursor: 'pointer' };
export const STYLE_LAST_MOVE: React.CSSProperties   = { backgroundColor: 'rgba(59,130,246,0.35)' };
export const STYLE_CHECK: React.CSSProperties       = { background: 'radial-gradient(circle, rgba(239,68,68,0.9) 40%, transparent 44%)' };

// Helpers
export function buildGameAtIndex(pgn: string, index: number): Chess {
  const base = new Chess();
  if (pgn) { try { base.loadPgn(pgn); } catch { } }
  const g = new Chess();
  base.history().slice(0, index).forEach(san => { try { g.move(san); } catch { } });
  return g;
}

export function getFenAtIndex(pgn: string, index: number, totalMoves: number): string {
  if (index === 0) return FEN_INICIAL;
  if (index === totalMoves) {
    const g = new Chess();
    if (pgn) { try { g.loadPgn(pgn); } catch { } }
    return g.fen();
  }
  return buildGameAtIndex(pgn, index).fen();
}

export function calcularEstilosBase(
  pgn: string,
  indiceVista: number,
  totalMoves: number,
): Record<string, React.CSSProperties> {
  const styles: Record<string, React.CSSProperties> = {};

  if (indiceVista > 0) {
    const g    = buildGameAtIndex(pgn, indiceVista);
    const hist = g.history({ verbose: true });
    const last = hist[hist.length - 1];
    if (last) {
      styles[last.from] = { ...STYLE_LAST_MOVE };
      styles[last.to]   = { ...STYLE_LAST_MOVE };
    }
  }

  const fen = getFenAtIndex(pgn, indiceVista, totalMoves);
  if (fen !== FEN_INICIAL) {
    const temp = new Chess(fen);
    if (temp.inCheck()) {
      const turn = temp.turn();
      for (const row of temp.board()) {
        for (const cell of row) {
          if (cell?.type === 'k' && cell.color === turn) {
            styles[cell.square] = { ...STYLE_CHECK };
          }
        }
      }
    }
  }

  return styles;
}

// Hook
export interface UseChessGameOptions {
  pgnInicial?: string;
}

export function useChessGame({ pgnInicial = '' }: UseChessGameOptions = {}) {
  const [pgn, setPgn]               = useState<string>('');
  const [totalMoves, setTotalMoves] = useState<number>(0);
  const [indiceVista, setIndiceVista] = useState<number>(0);
  const [casillasBase, setCasillasBase] = useState<Record<string, React.CSSProperties>>({});
  const [casillasInt, setCasillasInt]   = useState<Record<string, React.CSSProperties>>({});
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null);

  const gameRef = useRef<Chess>(new Chess());

  // Carga inicial del PGN
  useEffect(() => {
    if (!pgnInicial) return;

    const temp    = new Chess();
    let cargado   = false;
    let pgnLimpio = pgnInicial.trim();
    if (pgnLimpio.startsWith('"') && pgnLimpio.endsWith('"')) {
      pgnLimpio = pgnLimpio.slice(1, -1).replace(/\\n/g, '\n');
    }

    for (const intento of [pgnLimpio, pgnLimpio + '\n\n']) {
      if (cargado) break;
      try { temp.loadPgn(intento); cargado = true; } catch { }
    }

    if (cargado) {
      const len = temp.history().length;
      setPgn(temp.pgn());
      setTotalMoves(len);
      setIndiceVista(len);
    }
  }, [pgnInicial]);

  // Sincronizar ref con PGN
  useEffect(() => {
    const g = new Chess();
    if (pgn) { try { g.loadPgn(pgn); } catch { } }
    gameRef.current = g;
  }, [pgn]);

  // Estilos base
  useEffect(() => {
    setCasillasBase(calcularEstilosBase(pgn, indiceVista, totalMoves));
    setCasillasInt({});
  }, [pgn, indiceVista, totalMoves]);

  // Derivados
  const gameActual           = gameRef.current;
  const historialMovimientos = gameActual.history({ verbose: true });
  const estamosEnElPresente  = indiceVista === totalMoves;
  const fenVisible           = getFenAtIndex(pgn, indiceVista, totalMoves);
  const estilosCombinados    = { ...casillasBase, ...casillasInt };

  // Sonidos
  const reproducirSonido = (tipo: 'move' | 'capture') => {
    try { new Audio(`/sounds/${tipo}.mp3`).play().catch(() => {}); } catch { }
  };

  // Navegación
  const irAlInicio = () => { if (indiceVista > 0) reproducirSonido('move'); setIndiceVista(0); };
  const irAtras    = () => setIndiceVista(p => { if (p > 0) { reproducirSonido('move'); return p - 1; } return p; });
  const irAdelante = () => setIndiceVista(p => {
    if (p < totalMoves) {
      const m = historialMovimientos[p];
      reproducirSonido(m?.captured ? 'capture' : 'move');
      return p + 1;
    }
    return p;
  });
  const irAlFinal = () => { if (indiceVista < totalMoves) { reproducirSonido('move'); setIndiceVista(totalMoves); } };

  // Aplicar movimiento
  const aplicarMovimiento = useCallback((from: string, to: string, promotion: PromotionPiece): boolean => {
    try {
      const gameEnPunto = estamosEnElPresente
        ? (() => { const g = new Chess(); try { g.loadPgn(gameRef.current.pgn()); } catch { } return g; })()
        : buildGameAtIndex(pgn, indiceVista);

      const move = gameEnPunto.move({ from, to, promotion });
      if (!move) return false;

      reproducirSonido(move.captured ? 'capture' : 'move');
      setPgn(gameEnPunto.pgn());
      setTotalMoves(indiceVista + 1);
      setIndiceVista(indiceVista + 1);
      return true;
    } catch { return false; }
  }, [pgn, indiceVista, estamosEnElPresente]);

  // Handlers para react-chessboard v5
  const onPieceDrop = useCallback(({ sourceSquare, targetSquare }: {
    piece: { isSparePiece: boolean; pieceType: string; position: string };
    sourceSquare: string;
    targetSquare: string | null;
  }): boolean => {
    if (!targetSquare) return false;
    setCasillasInt({});

    const gameEnPunto  = estamosEnElPresente ? gameRef.current : buildGameAtIndex(pgn, indiceVista);
    const movLegales   = gameEnPunto.moves({ verbose: true }) as any[];
    const esLegal      = movLegales.some(m => m.from === sourceSquare && m.to === targetSquare);
    if (!esLegal) return false;

    const pieza        = gameEnPunto.get(sourceSquare as any);
    const esPromocion  = pieza?.type === 'p' &&
      ((pieza.color === 'w' && targetSquare[1] === '8') ||
       (pieza.color === 'b' && targetSquare[1] === '1'));

    if (esPromocion) {
      setPendingPromotion({ from: sourceSquare, to: targetSquare, color: pieza!.color as 'w' | 'b' });
      return false;
    }

    return aplicarMovimiento(sourceSquare, targetSquare, 'q');
  }, [pgn, indiceVista, estamosEnElPresente, aplicarMovimiento]);

  const onPieceDrag = useCallback(({ square }: {
    isSparePiece: boolean;
    piece: { pieceType: string };
    square: string | null;
  }) => {
    if (!square) return;
    try {
      const gameEnPunto  = estamosEnElPresente ? gameRef.current : buildGameAtIndex(pgn, indiceVista);
      const movimientos  = gameEnPunto.moves({ verbose: true, square: square as any }) as any[];
      if (movimientos.length === 0) return;

      const estilos: Record<string, React.CSSProperties> = { [square]: { ...STYLE_SELECTED } };
      movimientos.forEach(mov => {
        const isCapture = !!mov.captured || !!gameEnPunto.get(mov.to as any);
        estilos[mov.to] = isCapture ? { ...STYLE_MOVE_CAPTURE } : { ...STYLE_MOVE_DOT };
      });
      setCasillasInt(estilos);
    } catch { }
  }, [pgn, indiceVista, estamosEnElPresente]);

  const onSquareClick = useCallback((_args: { piece: { pieceType: string } | null; square: string }) => {
    setCasillasInt({});
  }, []);

  // Promoción
  const handlePromotionSelect = useCallback((piece: PromotionPiece) => {
    if (!pendingPromotion) return;
    aplicarMovimiento(pendingPromotion.from, pendingPromotion.to, piece);
    setPendingPromotion(null);
    setCasillasInt({});
  }, [pendingPromotion, aplicarMovimiento]);

  const handlePromotionCancel = useCallback(() => {
    setPendingPromotion(null);
    setCasillasInt({});
  }, []);

  // Reiniciar
  const reiniciar = () => {
    setPgn('');
    setTotalMoves(0);
    setIndiceVista(0);
    setPendingPromotion(null);
    setCasillasBase({});
    setCasillasInt({});
  };

  return {
    // Estado
    pgn, fenVisible, estilosCombinados,
    indiceVista, setIndiceVista,
    totalMoves, estamosEnElPresente,
    historialMovimientos,
    gameActual,
    pendingPromotion,
    // Navegación
    irAlInicio, irAtras, irAdelante, irAlFinal,
    // Handlers tablero
    onPieceDrop, onPieceDrag, onSquareClick,
    // Promoción
    handlePromotionSelect, handlePromotionCancel,
    // Acciones
    reiniciar,
  };
}