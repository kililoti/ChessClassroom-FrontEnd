import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Chess } from 'chess.js';
import React from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

export type PromotionPiece = 'q' | 'r' | 'b' | 'n';

export interface PendingPromotion {
  from: string;
  to: string;
  color: 'w' | 'b';
}

export interface NodoMovimiento {
  id: string;
  san: string;
  fen: string;       // FEN after this move
  from: string;      // origin square
  to: string;        // destination square
  padre: string | null;
  hijos: string[];   // hijos[0] = main line, hijos[1+] = variants
  numJugada: number; // move number (from parent FEN)
  color: 'w' | 'b'; // who made this move
  captura: boolean;
}

export interface PlanillaToken {
  tipo: 'numero' | 'move' | 'open' | 'close';
  texto?: string;
  nodoId?: string;
  profundidad?: number;
}

export interface MoveResult {
  exito: boolean;
  pgn: string;       // árbol completo (para guardar en DB)
  pgnLineal: string; // camino lineal hasta la nueva posición (para broadcast)
  fen: string;
  captura: boolean;
}

export interface UseChessGameOptions {
  pgnInicial?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const FEN_INICIAL = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export const STYLE_SELECTED:     React.CSSProperties = { backgroundColor: 'rgba(250,204,21,0.5)' };
export const STYLE_MOVE_DOT:     React.CSSProperties = { background: 'radial-gradient(circle, rgba(34,197,94,0.75) 28%, transparent 32%)', cursor: 'pointer' };
export const STYLE_MOVE_CAPTURE: React.CSSProperties = { background: 'radial-gradient(circle at 50% 50%, transparent 60%, rgba(239,68,68,0.75) 62%)', cursor: 'pointer' };
export const STYLE_LAST_MOVE:    React.CSSProperties = { backgroundColor: 'rgba(59,130,246,0.35)' };
export const STYLE_CHECK:        React.CSSProperties = { background: 'radial-gradient(circle, rgba(239,68,68,0.9) 40%, transparent 44%)' };

// ── Helpers ───────────────────────────────────────────────────────────────────

function extraerFenHeader(pgn: string): string | null {
  return pgn?.match(/\[FEN "([^"]+)"\]/)?.[1] ?? null;
}

function generarId(): string {
  return `n${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
}

function crearRaiz(fen: string): Record<string, NodoMovimiento> {
  return {
    root: { id: 'root', san: '', fen, from: '', to: '', padre: null, hijos: [], numJugada: 0, color: 'w', captura: false },
  };
}

// ── Build tree from PGN (supports variants via parentheses) ──────────────────

function construirArbol(pgn: string): Record<string, NodoMovimiento> {
  const pgnLimpio = pgn.trim();
  if (!pgnLimpio) return crearRaiz(FEN_INICIAL);

  // If it's a FEN string, start from that position with no moves
  try { new Chess(pgnLimpio); return crearRaiz(pgnLimpio); } catch {}

  const fenBase = extraerFenHeader(pgnLimpio) ?? FEN_INICIAL;

  // Strip headers, comments and NAGs; keep moves and parentheses
  const texto = pgnLimpio
    .replace(/\[[^\]]*\]/g, '')    // [tag "value"]
    .replace(/\{[^}]*\}/g, '')      // { comment }
    .replace(/\$\d+/g, '')          // $1 $2 (NAG)
    .trim();

  // Tokenize: ( and ) as individual tokens, rest split by whitespace
  const tokens = texto.match(/[()]|\d+\.{1,3}|[^\s(){}!?$]+/g) ?? [];

  const nodos = crearRaiz(fenBase);

  // Stack for nested variants: each entry saves the state before entering ( )
  const stack: Array<{ game: Chess; padreId: string }> = [];

  let currentGame = new Chess(fenBase);
  let currentPadreId = 'root';

  for (const tok of tokens) {
    if (tok === '(') {
      // Start variant — step back to parent of current node and branch from there
      const parentId = nodos[currentPadreId]?.padre;
      if (parentId === null || parentId === undefined) continue;
      stack.push({ game: currentGame, padreId: currentPadreId });
      currentGame  = new Chess(nodos[parentId].fen);
      currentPadreId = parentId;
      continue;
    }

    if (tok === ')') {
      // End variant — restore saved state
      const saved = stack.pop();
      if (saved) { currentGame = saved.game; currentPadreId = saved.padreId; }
      continue;
    }

    // Skip move numbers (1. 2. 1... etc.) and game results
    if (/^\d+\./.test(tok) || /^(1-0|0-1|1\/2-1\/2|\*)$/.test(tok) || /^[!?]+$/.test(tok)) continue;

    // Apply move
    try {
      const clone = new Chess(currentGame.fen());
      const move  = clone.move(tok);
      if (!move) continue;

      const fenNuevo = clone.fen();

      // Navigate to existing child if already in tree
      const hijoExistente = nodos[currentPadreId].hijos.find(hId => nodos[hId].fen === fenNuevo);
      if (hijoExistente) {
        currentGame    = clone;
        currentPadreId = hijoExistente;
        continue;
      }

      // Create new node
      const id        = generarId();
      const numJugada = parseInt(currentGame.fen().split(' ')[5]);

      nodos[id] = {
        id, san: move.san, fen: fenNuevo,
        from: move.from, to: move.to,
        padre: currentPadreId, hijos: [],
        numJugada, color: move.color as 'w' | 'b', captura: !!move.captured,
      };
      nodos[currentPadreId] = {
        ...nodos[currentPadreId],
        hijos: [...nodos[currentPadreId].hijos, id],
      };

      currentGame    = clone;
      currentPadreId = id;
    } catch { /* movimiento inválido — saltar */ }
  }

  return nodos;
}

// ── Serializar árbol → PGN con variantes ──────────────────────────────────────

function serDesdePadre(
  nodos: Record<string, NodoMovimiento>,
  padreId: string,
  padreHadVariants: boolean
): string {
  const padre = nodos[padreId];
  if (!padre || padre.hijos.length === 0) return '';

  const mainId = padre.hijos[0];
  const main = nodos[mainId];
  const hasVariants = padre.hijos.length > 1;

  let t = main.color === 'w'
    ? `${main.numJugada}. ${main.san}`
    : padreHadVariants
      ? `${main.numJugada}... ${main.san}`
      : main.san;

  for (let i = 1; i < padre.hijos.length; i++) {
    const vn = nodos[padre.hijos[i]];
    t += ` (${serDesdeNodo(nodos, padre.hijos[i], vn.color === 'b')})`;
  }

  const cont = serDesdePadre(nodos, mainId, hasVariants);
  if (cont) t += ' ' + cont;
  return t;
}

function serDesdeNodo(
  nodos: Record<string, NodoMovimiento>,
  nodoId: string,
  forzarNumNegras: boolean
): string {
  const n = nodos[nodoId];
  let t = n.color === 'w' ? `${n.numJugada}. ${n.san}` : forzarNumNegras ? `${n.numJugada}... ${n.san}` : n.san;
  const cont = serDesdePadre(nodos, nodoId, false);
  if (cont) t += ' ' + cont;
  return t;
}

export function serializarArbol(nodos: Record<string, NodoMovimiento>): string {
  const raiz = nodos['root'];
  if (!raiz) return '';
  const fenBase = raiz.fen;
  const header = fenBase !== FEN_INICIAL ? `[FEN "${fenBase}"]\n\n` : '';
  return header + serDesdePadre(nodos, 'root', false);
}

// Extracts linear path (root → nodoId) as PGN, for broadcasting without variants
export function extraerCaminoLineal(nodos: Record<string, NodoMovimiento>, nodoId: string): string {
  const camino: NodoMovimiento[] = [];
  let id: string | null = nodoId;
  while (id && id !== 'root') {
    camino.unshift(nodos[id]);
    id = nodos[id].padre;
  }
  if (camino.length === 0) return '';
  const fenBase = nodos['root'].fen;
  const header = fenBase !== FEN_INICIAL ? `[FEN "${fenBase}"]\n\n` : '';
  let texto = '';
  let forzarNum = false;
  for (const nodo of camino) {
    if (nodo.color === 'w') texto += `${nodo.numJugada}. `;
    else if (forzarNum)     texto += `${nodo.numJugada}... `;
    texto += nodo.san + ' ';
    forzarNum = false;
  }
  return (header + texto.trim());
}

// ── Generar tokens para Planilla ─────────────────────────────────────────────

function subTokens(
  nodos: Record<string, NodoMovimiento>,
  padreId: string,
  padreHadVariants: boolean,
  prof: number
): PlanillaToken[] {
  const padre = nodos[padreId];
  if (!padre || padre.hijos.length === 0) return [];

  const tokens: PlanillaToken[] = [];
  const mainId = padre.hijos[0];
  const main = nodos[mainId];
  const hasVariants = padre.hijos.length > 1;

  if (main.color === 'w') {
    tokens.push({ tipo: 'numero', texto: `${main.numJugada}.` });
  } else if (padreHadVariants) {
    tokens.push({ tipo: 'numero', texto: `${main.numJugada}...` });
  }
  tokens.push({ tipo: 'move', nodoId: mainId, profundidad: prof });

  for (let i = 1; i < padre.hijos.length; i++) {
    const vn = nodos[padre.hijos[i]];
    tokens.push({ tipo: 'open' });
    tokens.push(...tokensNodo(nodos, padre.hijos[i], vn.color === 'b', prof + 1));
    tokens.push({ tipo: 'close' });
  }

  tokens.push(...subTokens(nodos, mainId, hasVariants, prof));
  return tokens;
}

function tokensNodo(
  nodos: Record<string, NodoMovimiento>,
  nodoId: string,
  forzarNumNegras: boolean,
  prof: number
): PlanillaToken[] {
  const n = nodos[nodoId];
  const tokens: PlanillaToken[] = [];
  if (n.color === 'w') tokens.push({ tipo: 'numero', texto: `${n.numJugada}.` });
  else if (forzarNumNegras) tokens.push({ tipo: 'numero', texto: `${n.numJugada}...` });
  tokens.push({ tipo: 'move', nodoId, profundidad: prof });
  tokens.push(...subTokens(nodos, nodoId, false, prof));
  return tokens;
}

export function generarTokensArbol(nodos: Record<string, NodoMovimiento>): PlanillaToken[] {
  return subTokens(nodos, 'root', false, 0);
}

// ── Estilos de tablero ────────────────────────────────────────────────────────

function calcularEstilosBase(
  fen: string,
  from?: string,
  to?: string
): Record<string, React.CSSProperties> {
  const styles: Record<string, React.CSSProperties> = {};
  if (from) styles[from] = { ...STYLE_LAST_MOVE };
  if (to)   styles[to]   = { ...STYLE_LAST_MOVE };

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
  return styles;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useChessGame({ pgnInicial = '' }: UseChessGameOptions = {}) {
  const [nodos, setNodos]             = useState<Record<string, NodoMovimiento>>(() => crearRaiz(FEN_INICIAL));
  const [nodoActualId, setNodoActualId] = useState<string>('root');
  const [casillasInt, setCasillasInt]   = useState<Record<string, React.CSSProperties>>({});
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null);
  const [orientacionInicial, setOrientacionInicial] = useState<'white' | 'black'>('white');

  // Load initial PGN
  useEffect(() => {
    if (!pgnInicial) return;
    const nuevosNodos = construirArbol(pgnInicial);
    let ultimoId = 'root';
    while (nuevosNodos[ultimoId].hijos.length > 0) ultimoId = nuevosNodos[ultimoId].hijos[0];
    const turno = nuevosNodos[ultimoId].fen.split(' ')[1];
    setNodos(nuevosNodos);
    setNodoActualId(ultimoId);
    setOrientacionInicial(turno === 'b' ? 'white' : 'black');
    setCasillasInt({});
    setPendingPromotion(null);
  }, [pgnInicial]);

  // Derived values
  const nodoActual = nodos[nodoActualId] ?? nodos['root'];
  const fenVisible         = nodoActual.fen;
  const estamosEnElPresente = nodoActual.hijos.length === 0;

  const gameActual = useMemo(() => new Chess(fenVisible), [fenVisible]);

  const casillasBase = useMemo(() =>
    calcularEstilosBase(fenVisible, nodoActual.from || undefined, nodoActual.to || undefined),
    [fenVisible, nodoActual]
  );

  const estilosCombinados = useMemo(() =>
    ({ ...casillasBase, ...casillasInt }),
    [casillasBase, casillasInt]
  );

  const pgn = useMemo(() => serializarArbol(nodos), [nodos]);

  const planillaTokens = useMemo(() => generarTokensArbol(nodos), [nodos]);

  // Sounds
  const sonido = (tipo: 'move' | 'capture') => {
    try { new Audio(`/sounds/${tipo}.mp3`).play().catch(() => {}); } catch {}
  };

  // ── Navigation ──────────────────────────────────────────────────────────────

  const irANodo = useCallback((id: string) => {
    const n = nodos[id];
    if (!n) return;
    sonido(n.captura ? 'capture' : 'move');
    setNodoActualId(id);
    setCasillasInt({});
  }, [nodos]);

  const irAlInicio = useCallback(() => {
    if (nodoActualId === 'root') return;
    sonido('move');
    setNodoActualId('root');
    setCasillasInt({});
  }, [nodoActualId]);

  const irAtras = useCallback(() => {
    const padre = nodos[nodoActualId]?.padre;
    if (!padre) return;
    sonido('move');
    setNodoActualId(padre);
    setCasillasInt({});
  }, [nodos, nodoActualId]);

  const irAdelante = useCallback(() => {
    const hijo = nodos[nodoActualId]?.hijos[0];
    if (!hijo) return;
    const n = nodos[hijo];
    sonido(n.captura ? 'capture' : 'move');
    setNodoActualId(hijo);
    setCasillasInt({});
  }, [nodos, nodoActualId]);

  const irAlFinal = useCallback(() => {
    let id = nodoActualId;
    while (nodos[id]?.hijos.length > 0) id = nodos[id].hijos[0];
    if (id === nodoActualId) return;
    sonido('move');
    setNodoActualId(id);
    setCasillasInt({});
  }, [nodos, nodoActualId]);

  const irANodoPorFen = useCallback((fen: string) => {
    const nodo = Object.values(nodos).find(n => n.fen === fen);
    if (nodo) {
      setNodoActualId(nodo.id);
      setCasillasInt({});
    }
  }, [nodos]);

  // ── Apply move → create or navigate to tree node ───────────────────────────

  const aplicarMovimiento = useCallback((
    from: string, to: string, promotion: PromotionPiece
  ): MoveResult => {
    try {
      const game = new Chess(fenVisible);
      const move = game.move({ from, to, promotion });
      if (!move) return { exito: false, pgn: '', pgnLineal: '', fen: '', captura: false };

      const fenNuevo = game.fen();
      const captura = !!move.captured;

      // Navigate to existing child if same move played before
      const hijoExistente = nodoActual.hijos.find(hId => nodos[hId]?.fen === fenNuevo);
      if (hijoExistente) {
        sonido(captura ? 'capture' : 'move');
        setNodoActualId(hijoExistente);
        setCasillasInt({});
        return { exito: true, pgn: serializarArbol(nodos), pgnLineal: extraerCaminoLineal(nodos, hijoExistente), fen: fenNuevo, captura };
      }

      // Create new node (main line or variant)
      const nuevoId = generarId();
      const numJugada = parseInt(fenVisible.split(' ')[5]);

      const nuevoNodo: NodoMovimiento = {
        id: nuevoId,
        san: move.san,
        fen: fenNuevo,
        from: move.from,
        to: move.to,
        padre: nodoActualId,
        hijos: [],
        numJugada,
        color: move.color as 'w' | 'b',
        captura,
      };

      const nuevosNodos = {
        ...nodos,
        [nuevoId]: nuevoNodo,
        [nodoActualId]: { ...nodoActual, hijos: [...nodoActual.hijos, nuevoId] },
      };

      sonido(captura ? 'capture' : 'move');
      setNodos(nuevosNodos);
      setNodoActualId(nuevoId);
      setCasillasInt({});

      return { exito: true, pgn: serializarArbol(nuevosNodos), pgnLineal: extraerCaminoLineal(nuevosNodos, nuevoId), fen: fenNuevo, captura };
    } catch {
      return { exito: false, pgn: '', pgnLineal: '', fen: '', captura: false };
    }
  }, [fenVisible, nodoActual, nodoActualId, nodos]);

  const onPieceDrop = useCallback((args: {
    piece: { isSparePiece: boolean; pieceType: string; position: string };
    sourceSquare: string;
    targetSquare: string | null;
  }): MoveResult => {
    const { sourceSquare, targetSquare } = args;
    if (!targetSquare) return { exito: false, pgn: '', pgnLineal: '', fen: '', captura: false };
    setCasillasInt({});

    const movLegales = gameActual.moves({ verbose: true }) as any[];
    if (!movLegales.some(m => m.from === sourceSquare && m.to === targetSquare))
      return { exito: false, pgn: '', pgnLineal: '', fen: '', captura: false };

    const pieza = gameActual.get(sourceSquare as any);
    const esPromocion = pieza?.type === 'p' &&
      ((pieza.color === 'w' && targetSquare[1] === '8') ||
       (pieza.color === 'b' && targetSquare[1] === '1'));

    if (esPromocion) {
      setPendingPromotion({ from: sourceSquare, to: targetSquare, color: pieza!.color as 'w' | 'b' });
      return { exito: false, pgn: '', pgnLineal: '', fen: '', captura: false };
    }
    return aplicarMovimiento(sourceSquare, targetSquare, 'q');
  }, [gameActual, aplicarMovimiento]);

  const onPieceDrag = useCallback(({ square }: {
    isSparePiece: boolean; piece: { pieceType: string }; square: string | null;
  }) => {
    if (!square) return;
    try {
      const movimientos = gameActual.moves({ verbose: true, square: square as any }) as any[];
      if (!movimientos.length) return;
      const estilos: Record<string, React.CSSProperties> = { [square]: { ...STYLE_SELECTED } };
      movimientos.forEach(mov => {
        const isCapture = !!mov.captured || !!gameActual.get(mov.to as any);
        estilos[mov.to] = isCapture ? { ...STYLE_MOVE_CAPTURE } : { ...STYLE_MOVE_DOT };
      });
      setCasillasInt(estilos);
    } catch {}
  }, [gameActual]);

  const onSquareClick = useCallback(() => setCasillasInt({}), []);

  const handlePromotionSelect = useCallback((piece: PromotionPiece): MoveResult => {
    if (!pendingPromotion) return { exito: false, pgn: '', pgnLineal: '', fen: '', captura: false };
    const res = aplicarMovimiento(pendingPromotion.from, pendingPromotion.to, piece);
    setPendingPromotion(null);
    setCasillasInt({});
    return res;
  }, [pendingPromotion, aplicarMovimiento]);

  const handlePromotionCancel = useCallback(() => {
    setPendingPromotion(null);
    setCasillasInt({});
  }, []);

  const reiniciar = useCallback(() => {
    const fenBase = nodos['root']?.fen ?? FEN_INICIAL;
    setNodos(crearRaiz(fenBase));
    setNodoActualId('root');
    setPendingPromotion(null);
    setCasillasInt({});
  }, [nodos]);

  const cargarPgn = useCallback((nuevoPgn: string, targetFen?: string) => {
    const nuevosNodos = construirArbol(nuevoPgn);

    let ultimoId = 'root';
    if (targetFen) {
      const nodoConFen = Object.values(nuevosNodos).find(n => n.fen === targetFen);
      if (nodoConFen) ultimoId = nodoConFen.id;
      else while (nuevosNodos[ultimoId].hijos.length > 0) ultimoId = nuevosNodos[ultimoId].hijos[0];
    } else {
      while (nuevosNodos[ultimoId].hijos.length > 0) ultimoId = nuevosNodos[ultimoId].hijos[0];
    }

    setNodos(nuevosNodos);
    setNodoActualId(ultimoId);
    setPendingPromotion(null);
    setCasillasInt({});
  }, []);

  // ── Legacy compat (for VistaPartida) ───────────────────────────────────────

  const historialMovimientos = useMemo(() => {
    const hist: NodoMovimiento[] = [];
    let id = nodos['root']?.hijos[0] ?? null;
    while (id) { hist.push(nodos[id]); id = nodos[id].hijos[0] ?? null; }
    return hist;
  }, [nodos]);

  const indiceVista = useMemo(() => {
    const mainLine: string[] = ['root'];
    let id = nodos['root']?.hijos[0] ?? null;
    while (id) { mainLine.push(id); id = nodos[id].hijos[0] ?? null; }
    const idx = mainLine.indexOf(nodoActualId);
    return idx >= 0 ? idx : 0;
  }, [nodos, nodoActualId]);

  const totalMoves = historialMovimientos.length;

  return {
    // Tree
    nodos,
    nodoActualId,
    planillaTokens,
    // Derived
    pgn,
    fenVisible,
    estamosEnElPresente,
    estilosCombinados,
    gameActual,
    // Legacy
    historialMovimientos,
    indiceVista,
    totalMoves,
    setIndiceVista: irANodo,
    orientacionInicial,
    // Navigation
    irAlInicio, irAtras, irAdelante, irAlFinal,
    irANodo, irANodoPorFen,
    // Actions
    onPieceDrop, onPieceDrag, onSquareClick,
    handlePromotionSelect, handlePromotionCancel,
    pendingPromotion,
    reiniciar, cargarPgn,
  };
}