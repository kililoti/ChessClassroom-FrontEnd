import { useState, useEffect, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';
import React from 'react';

export type PromotionPiece = 'q' | 'r' | 'b' | 'n';

export interface PendingPromotion {
  from: string;
  to: string;
  color: 'w' | 'b';
}

export const FEN_INICIAL = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export const STYLE_SELECTED: React.CSSProperties     = { backgroundColor: 'rgba(250,204,21,0.5)' };
export const STYLE_MOVE_DOT: React.CSSProperties     = { background: 'radial-gradient(circle, rgba(34,197,94,0.75) 28%, transparent 32%)', cursor: 'pointer' };
export const STYLE_MOVE_CAPTURE: React.CSSProperties = { background: 'radial-gradient(circle at 50% 50%, transparent 60%, rgba(239,68,68,0.75) 62%)', cursor: 'pointer' };
export const STYLE_LAST_MOVE: React.CSSProperties    = { backgroundColor: 'rgba(59,130,246,0.35)' };
export const STYLE_CHECK: React.CSSProperties        = { background: 'radial-gradient(circle, rgba(239,68,68,0.9) 40%, transparent 44%)' };

function extraerFenHeader(pgn: string): string | null {
  return pgn?.match(/\[FEN "([^"]+)"\]/)?.[1] ?? null;
}

export function buildGameAtIndex(pgn: string, index: number): Chess {
  const base = new Chess();
  if (pgn) { try { base.loadPgn(pgn); } catch {} }

  const fenInicio = extraerFenHeader(pgn) ?? FEN_INICIAL;
  const g = new Chess(fenInicio);
  base.history().slice(0, index).forEach(san => { try { g.move(san); } catch {} });
  return g;
}

export function getFenAtIndex(pgn: string, index: number, totalMoves: number): string {
  if (index === 0) return extraerFenHeader(pgn) ?? FEN_INICIAL;
  if (index === totalMoves) {
    const g = new Chess();
    if (pgn) { try { g.loadPgn(pgn); } catch {} }
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

export interface MoveResult {
  exito: boolean;
  pgn: string;
  fen: string;
  captura: boolean;
}

export interface UseChessGameOptions {
  pgnInicial?: string;
}

export function useChessGame({ pgnInicial = '' }: UseChessGameOptions = {}) {
  const [pgn, setPgn]                   = useState<string>('');
  const [totalMoves, setTotalMoves]     = useState<number>(0);
  const [indiceVista, setIndiceVista]   = useState<number>(0);
  const [casillasBase, setCasillasBase] = useState<Record<string, React.CSSProperties>>({});
  const [casillasInt, setCasillasInt]   = useState<Record<string, React.CSSProperties>>({});
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null);
  const [orientacionInicial, setOrientacionInicial] = useState<'white' | 'black'>('white');

  const gameRef = useRef<Chess>(new Chess());

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
      try { temp.loadPgn(intento); cargado = true; } catch {}
    }
    if (!cargado) {
      try { temp.load(pgnLimpio); cargado = true; } catch {}
    }

    if (cargado) {
      const len = temp.history().length;
      setPgn(temp.pgn());
      setTotalMoves(len);
      setIndiceVista(len);
      setOrientacionInicial(len > 0 ? (temp.turn() === 'w' ? 'white' : 'black') : 'white');
    }
  }, [pgnInicial]);

  useEffect(() => {
    const g = new Chess();
    if (pgn) { try { g.loadPgn(pgn); } catch {} }
    gameRef.current = g;
  }, [pgn]);

  useEffect(() => {
    setCasillasBase(calcularEstilosBase(pgn, indiceVista, totalMoves));
    setCasillasInt({});
  }, [pgn, indiceVista, totalMoves]);

  const gameActual           = gameRef.current;
  const historialMovimientos = gameActual.history({ verbose: true });
  const estamosEnElPresente  = indiceVista === totalMoves;
  const fenVisible           = getFenAtIndex(pgn, indiceVista, totalMoves);
  const estilosCombinados    = { ...casillasBase, ...casillasInt };

  const reproducirSonido = (tipo: 'move' | 'capture') => {
    try { new Audio(`/sounds/${tipo}.mp3`).play().catch(() => {}); } catch {}
  };

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

  const aplicarMovimiento = useCallback((from: string, to: string, promotion: PromotionPiece): MoveResult => {
    try {
      const gameEnPunto = estamosEnElPresente
        ? (() => { const g = new Chess(); try { g.loadPgn(gameRef.current.pgn()); } catch {} return g; })()
        : buildGameAtIndex(pgn, indiceVista);

      const move = gameEnPunto.move({ from, to, promotion });
      if (!move) return { exito: false, pgn: '', fen: '', captura: false };

      reproducirSonido(move.captured ? 'capture' : 'move');
      const nuevoPgn = gameEnPunto.pgn();
      const nuevoFen = gameEnPunto.fen();
      setPgn(nuevoPgn);
      setTotalMoves(indiceVista + 1);
      setIndiceVista(indiceVista + 1);
      return { exito: true, pgn: nuevoPgn, fen: nuevoFen, captura: !!move.captured };
    } catch { return { exito: false, pgn: '', fen: '', captura: false }; }
  }, [pgn, indiceVista, estamosEnElPresente]);

  const onPieceDrop = useCallback((args: {
    piece: { isSparePiece: boolean; pieceType: string; position: string };
    sourceSquare: string;
    targetSquare: string | null;
  }): MoveResult => {
    const { sourceSquare, targetSquare } = args;
    if (!targetSquare) return { exito: false, pgn: '', fen: '', captura: false };
    setCasillasInt({});

    const gameEnPunto = estamosEnElPresente ? gameRef.current : buildGameAtIndex(pgn, indiceVista);
    const movLegales  = gameEnPunto.moves({ verbose: true }) as any[];
    const esLegal     = movLegales.some(m => m.from === sourceSquare && m.to === targetSquare);
    if (!esLegal) return { exito: false, pgn: '', fen: '', captura: false };

    const pieza       = gameEnPunto.get(sourceSquare as any);
    const esPromocion = pieza?.type === 'p' &&
      ((pieza.color === 'w' && targetSquare[1] === '8') ||
       (pieza.color === 'b' && targetSquare[1] === '1'));

    if (esPromocion) {
      setPendingPromotion({ from: sourceSquare, to: targetSquare, color: pieza!.color as 'w' | 'b' });
      return { exito: false, pgn: '', fen: '', captura: false };
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
      const gameEnPunto = estamosEnElPresente ? gameRef.current : buildGameAtIndex(pgn, indiceVista);
      const movimientos = gameEnPunto.moves({ verbose: true, square: square as any }) as any[];
      if (movimientos.length === 0) return;

      const estilos: Record<string, React.CSSProperties> = { [square]: { ...STYLE_SELECTED } };
      movimientos.forEach(mov => {
        const isCapture = !!mov.captured || !!gameEnPunto.get(mov.to as any);
        estilos[mov.to] = isCapture ? { ...STYLE_MOVE_CAPTURE } : { ...STYLE_MOVE_DOT };
      });
      setCasillasInt(estilos);
    } catch {}
  }, [pgn, indiceVista, estamosEnElPresente]);

  const onSquareClick = useCallback(() => setCasillasInt({}), []);

  const handlePromotionSelect = useCallback((piece: PromotionPiece): MoveResult => {
    if (!pendingPromotion) return { exito: false, pgn: '', fen: '', captura: false };
    const resultado = aplicarMovimiento(pendingPromotion.from, pendingPromotion.to, piece);
    setPendingPromotion(null);
    setCasillasInt({});
    return resultado;
  }, [pendingPromotion, aplicarMovimiento]);

  const handlePromotionCancel = useCallback(() => {
    setPendingPromotion(null);
    setCasillasInt({});
  }, []);

  const reiniciar = () => {
    setPgn('');
    setTotalMoves(0);
    setIndiceVista(0);
    setPendingPromotion(null);
    setCasillasBase({});
    setCasillasInt({});
  };

  const cargarPgn = useCallback((nuevoPgn: string) => {
    const temp = new Chess();
    let cargado = false;
    const pgnLimpio = nuevoPgn.trim();

    if (pgnLimpio) {
      for (const intento of [pgnLimpio, pgnLimpio + '\n\n']) {
        if (cargado) break;
        try { temp.loadPgn(intento); cargado = true; } catch {}
      }
      if (!cargado) {
        try { temp.load(pgnLimpio); cargado = true; } catch {}
      }
    }

    const len = cargado ? temp.history().length : 0;
    setPgn(cargado ? temp.pgn() : '');
    setTotalMoves(len);
    setIndiceVista(len);
    setPendingPromotion(null);
    setCasillasBase({});
    setCasillasInt({});
  }, []);

  return {
    pgn, fenVisible, estilosCombinados,
    indiceVista, setIndiceVista,
    totalMoves, estamosEnElPresente,
    historialMovimientos,
    gameActual,
    pendingPromotion,
    orientacionInicial,
    irAlInicio, irAtras, irAdelante, irAlFinal,
    onPieceDrop, onPieceDrag, onSquareClick,
    handlePromotionSelect, handlePromotionCancel,
    reiniciar,
    cargarPgn,
  };
}