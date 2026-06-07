'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import Planilla from './Planilla';
import ChatContainer from '@/components/chat/ChatContainer';
import { ArrowLeft } from 'lucide-react';

// ─── Constantes ───────────────────────────────────────────────────────────────
const FEN_INICIAL = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// ─── Estilos ──────────────────────────────────────────────────────────────────
const STYLE_SELECTED:    React.CSSProperties = { backgroundColor: "rgba(250,204,21,0.5)" };
const STYLE_MOVE_DOT:    React.CSSProperties = { background: "radial-gradient(circle, rgba(34,197,94,0.75) 28%, transparent 32%)", cursor: "pointer" };
const STYLE_MOVE_CAPTURE:React.CSSProperties = { background: "radial-gradient(circle at 50% 50%, transparent 60%, rgba(239,68,68,0.75) 62%)", cursor: "pointer" };
const STYLE_LAST_MOVE:   React.CSSProperties = { backgroundColor: "rgba(59,130,246,0.35)" };
const STYLE_CHECK:       React.CSSProperties = { background: "radial-gradient(circle, rgba(239,68,68,0.9) 40%, transparent 44%)" };

// ─── Tipos ────────────────────────────────────────────────────────────────────
type PromotionPiece = 'q' | 'r' | 'b' | 'n';
interface PendingPromotion { from: string; to: string; color: 'w' | 'b' }

const PROMOTION_PIECES: { piece: PromotionPiece; label: string; white: string; black: string }[] = [
  { piece: 'q', label: 'Reina',   white: '♕', black: '♛' },
  { piece: 'r', label: 'Torre',   white: '♖', black: '♜' },
  { piece: 'b', label: 'Alfil',   white: '♗', black: '♝' },
  { piece: 'n', label: 'Caballo', white: '♘', black: '♞' },
];

// ─── Helpers puros (fuera del componente, sin estado) ────────────────────────

function buildGameAtIndex(pgn: string, index: number): Chess {
  const base = new Chess();
  if (pgn) {
    try { base.loadPgn(pgn); } catch (e) {} // Try/catch por seguridad
  }
  const fullHistory = base.history();

  const g = new Chess();
  fullHistory.slice(0, index).forEach(san => {
    try { g.move(san); } catch(e) {}
  });
  return g;
}

function getFenAtIndex(pgn: string, index: number, totalMoves: number): string {
  if (index === 0) return FEN_INICIAL;
  if (index === totalMoves) {
    const g = new Chess();
    if (pgn) {
      try { g.loadPgn(pgn); } catch(e) {}
    }
    return g.fen();
  }
  return buildGameAtIndex(pgn, index).fen();
}

function calcularEstilosBase(
  pgn: string,
  indiceVista: number,
  totalMoves: number,
): Record<string, React.CSSProperties> {
  const styles: Record<string, React.CSSProperties> = {};

  if (indiceVista > 0) {
    const g = buildGameAtIndex(pgn, indiceVista);
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

// ─── Modal de Promoción ───────────────────────────────────────────────────────
function PromotionModal({ pending, onSelect, onCancel }: {
  pending: PendingPromotion;
  onSelect: (p: PromotionPiece) => void;
  onCancel: () => void;
}) {
  const isWhite = pending.color === 'w';
  return (
    <div className="promotion-overlay" onClick={onCancel} role="dialog" aria-modal="true">
      <div className="promotion-modal" onClick={e => e.stopPropagation()}>
        <h3 className="promotion-title">Promoción de peón</h3>
        <p className="promotion-subtitle">Elige a qué pieza promocionas ({isWhite ? 'Blancas' : 'Negras'})</p>
        <div className="promotion-grid">
          {PROMOTION_PIECES.map(({ piece, label, white, black }) => (
            <button key={piece} className="promotion-piece-btn" onClick={() => onSelect(piece)} title={label}>
              <span className="promotion-piece-symbol">{isWhite ? white : black}</span>
              <span className="promotion-piece-label">{label}</span>
            </button>
          ))}
        </div>
        <button className="promotion-cancel" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export interface JuegoAjedrezProps {
  pgnInicial?: string;
  onClose?: () => void;
}

export default function JuegoAjedrez({ 
  pgnInicial = '', 
  onClose 
}: JuegoAjedrezProps) {
  const [isMounted, setIsMounted] = useState(false);

  // Estados principales
  const [pgn, setPgn]             = useState<string>(pgnInicial);
  const [totalMoves, setTotalMoves] = useState<number>(0);

  const [indiceVista, setIndiceVista]   = useState<number>(0);
  const [orientacion, setOrientacion]   = useState<'white' | 'black'>('white');
  const [casillasBase, setCasillasBase] = useState<Record<string, React.CSSProperties>>({});
  const [casillasInt, setCasillasInt]   = useState<Record<string, React.CSSProperties>>({});
  const [error, setError]               = useState<string>('');
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null);

  const gameRef = useRef<Chess>(new Chess());

  useEffect(() => { setIsMounted(true); }, []);

  // 🌟 EL NUEVO CARGADOR A PRUEBA DE BALAS
  useEffect(() => {
    if (pgnInicial) {
      const temp = new Chess();
      let cargado = false;

      // 1. Limpiamos espacios extra y comillas por si vienen del backend
      let pgnLimpio = pgnInicial.trim();
      if (pgnLimpio.startsWith('"') && pgnLimpio.endsWith('"')) {
        pgnLimpio = pgnLimpio.slice(1, -1).replace(/\\n/g, '\n');
      }

      // 2. Intentos de carga progresivos
      const intentos = [
        pgnLimpio, // Intento 1: Tal cual viene
        pgnLimpio + '\n\n', // Intento 2: Forzando salto de línea final (arregla el error del asterisco *)
        pgnLimpio.replace(/\[.*?\]\r?\n?/g, '').trim() + '\n\n' // Intento 3: Quitamos TODAS las etiquetas raras y dejamos solo los movimientos
      ];

      for (const intento of intentos) {
        if (cargado) break;
        try {
          // En chess.js >= 1.0.0, si falla lanza un error directo al catch
          temp.loadPgn(intento);
          // Si sobrevive a la línea anterior sin explotar, es que cargó perfectamente
          cargado = true; 
        } catch (e) {
          // Si falla, salta directamente aquí, lo ignoramos y probamos el siguiente intento
        }
      }

      if (cargado) {
        const historyLength = temp.history().length;
        // 🌟 CLAVE: Guardamos el PGN re-generado por chess.js (temp.pgn()), 
        // así nos aseguramos de que el estado pgn siempre tiene un formato 100% perfecto.
        setPgn(temp.pgn());
        setTotalMoves(historyLength);
        setIndiceVista(historyLength);
      } else {
        console.error("chess.js no pudo interpretar este PGN tras múltiples intentos. PGN Original:", pgnInicial);
        setPgn(pgnLimpio); // Mostramos lo que llegó para poder diagnosticarlo
      }
    }
  }, [pgnInicial]);

  // Sincronizar el ref de forma segura
  useEffect(() => {
    const g = new Chess();
    if (pgn) {
      try { g.loadPgn(pgn); } catch(e) {}
    }
    gameRef.current = g;
  }, [pgn]);

  useEffect(() => {
    setCasillasBase(calcularEstilosBase(pgn, indiceVista, totalMoves));
    setCasillasInt({});
  }, [pgn, indiceVista, totalMoves]);

  const reproducirSonido = (tipo: 'move' | 'capture') => {
    try { new Audio(`/sounds/${tipo}.mp3`).play().catch(() => {}); } catch {}
  };

  const gameActual           = gameRef.current;
  const historialMovimientos = gameActual.history({ verbose: true });
  const estamosEnElPresente  = indiceVista === totalMoves;
  const fenVisible           = getFenAtIndex(pgn, indiceVista, totalMoves);

  const irAlInicio = () => { if (indiceVista > 0) reproducirSonido('move'); setIndiceVista(0); };
  const irAtras    = () => { setIndiceVista(p => { if (p > 0) { reproducirSonido('move'); return p - 1; } return p; }); };
  const irAdelante = () => {
    setIndiceVista(p => {
      if (p < totalMoves) {
        const m = historialMovimientos[p];
        reproducirSonido(m?.captured ? 'capture' : 'move');
        return p + 1;
      }
      return p;
    });
  };
  const irAlFinal = () => {
    if (indiceVista < totalMoves) { reproducirSonido('move'); setIndiceVista(totalMoves); }
  };

  const aplicarMovimiento = useCallback((from: string, to: string, promotion: PromotionPiece): boolean => {
    try {
      const gameEnPunto = estamosEnElPresente
        ? (() => { const g = new Chess(); g.loadPgn(gameRef.current.pgn()); return g; })()
        : buildGameAtIndex(pgn, indiceVista);
      const move = gameEnPunto.move({ from, to, promotion });
      if (!move) return false;

      reproducirSonido(move.captured ? 'capture' : 'move');

      const nuevoTotal = indiceVista + 1;
      const nuevoPgn   = gameEnPunto.pgn();

      setPgn(nuevoPgn);
      setTotalMoves(nuevoTotal);
      setIndiceVista(nuevoTotal);
      return true;
    } catch { return false; }
  }, [pgn, indiceVista, estamosEnElPresente]);

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

  const onPieceDrop = useCallback(({ sourceSquare, targetSquare }: {
    piece: { isSparePiece: boolean; pieceType: string; position: string };
    sourceSquare: string;
    targetSquare: string | null;
  }): boolean => {
    if (!targetSquare) return false;
    setCasillasInt({});

    const gameEnPunto = estamosEnElPresente ? gameRef.current : buildGameAtIndex(pgn, indiceVista);

    const movimientosLegales = gameEnPunto.moves({ verbose: true }) as any[];
    const esLegal = movimientosLegales.some(
      m => m.from === sourceSquare && m.to === targetSquare
    );
    if (!esLegal) return false;

    const pieza = gameEnPunto.get(sourceSquare as any);
    const esPromocion = pieza?.type === 'p' &&
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
      const gameEnPunto = estamosEnElPresente ? gameRef.current : buildGameAtIndex(pgn, indiceVista);
      const movimientos = gameEnPunto.moves({ verbose: true, square: square as any }) as any[];
      if (movimientos.length === 0) return;

      const estilos: Record<string, React.CSSProperties> = {};
      estilos[square] = { ...STYLE_SELECTED };
      movimientos.forEach(mov => {
        const isCapture = !!mov.captured || !!gameEnPunto.get(mov.to as any);
        estilos[mov.to] = isCapture ? { ...STYLE_MOVE_CAPTURE } : { ...STYLE_MOVE_DOT };
      });
      setCasillasInt(estilos);
    } catch {}
  }, [pgn, indiceVista, estamosEnElPresente]);

  const onSquareClick = useCallback(() => { setCasillasInt({}); }, []);

  const reiniciarPartida = () => {
    setPgn('');
    setTotalMoves(0);
    setIndiceVista(0);
    setError('');
    setPendingPromotion(null);
  };

  if (!isMounted) {
    return (
      <div className="flex justify-center items-center w-full max-w-7xl mx-auto p-4 min-h-[600px]">
        <div className="w-full max-w-[550px] h-[550px] bg-slate-200 animate-pulse rounded-sm" />
      </div>
    );
  }

  const estilosCombinados = { ...casillasBase, ...casillasInt };

  return (
    <div className="flex flex-col items-center w-full max-w-7xl mx-auto p-4 bg-white rounded-2xl shadow-sm border border-slate-200 relative">

      {error && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-11/12 max-w-md z-50 bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-md">
          <p className="text-sm text-red-700 font-medium">⚠️ {error}</p>
        </div>
      )}

      {pendingPromotion && (
        <PromotionModal pending={pendingPromotion} onSelect={handlePromotionSelect} onCancel={handlePromotionCancel} />
      )}

      {/* Cabecera */}
      <div className="w-full flex justify-between items-center mb-6 mt-4 px-4">
        <div className="flex items-center gap-4">
          {onClose && (
            <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors" title="Volver al explorador">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h2 className="text-2xl font-bold text-slate-800">Partida Activa</h2>
        </div>
        
        <span className={`px-4 py-1.5 rounded-full text-sm font-semibold shadow-sm ${
          gameActual.isGameOver() ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'
        }`}>
          {gameActual.isGameOver() ? 'Partida Terminada' : (gameActual.turn() === 'w' ? 'Juegan Blancas' : 'Juegan Negras')}
        </span>
      </div>

      <div className="w-full flex flex-col lg:flex-row gap-6 px-4 items-center lg:items-center justify-center">

        <div className="w-full lg:w-72 xl:w-80 shrink-0 h-[550px] flex flex-col">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex-1 flex flex-col">
            <div className="bg-slate-50/80 border-b border-slate-100 p-4 flex items-center gap-2 shrink-0">
              <span className="text-xl">💬</span>
              <h2 className="font-bold text-slate-800">Chat de la clase</h2>
            </div>
            <div className="flex-1 overflow-hidden relative">
              <div className="absolute inset-0">
                <ChatContainer salaId="75e576a4-b261-4dfa-8416-a09cd15e2125" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 max-w-[550px] w-full shadow-xl rounded-sm overflow-hidden border-4 border-[#302e2c]">
          <Chessboard
            options={{
              position:         fenVisible,
              onPieceDrop,
              onPieceDrag,
              onSquareClick,
              boardOrientation: orientacion,
              squareStyles:     estilosCombinados,
              allowDragging:    true,
              boardStyle:       { borderRadius: '2px' },
              darkSquareStyle:  { backgroundColor: '#779556' },
              lightSquareStyle: { backgroundColor: '#ebecd0' },
            }}
          />
        </div>

        <div className="w-full lg:w-72 xl:w-80 shrink-0 h-[550px]">
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
      </div>

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
          <div className="mt-1 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-700 h-32 overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words select-all leading-relaxed">
            {pgn || "La partida aún no ha comenzado..."}
          </div>
        </div>
      </div>

      <div className="w-full mt-6 px-4 flex justify-end gap-4">
        <button
          onClick={() => setOrientacion(o => o === 'white' ? 'black' : 'white')}
          className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-colors shadow-sm flex items-center gap-2"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"></polyline>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
          </svg>
          Girar Tablero
        </button>
        <button onClick={reiniciarPartida} className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors shadow-sm">
          Reiniciar Partida
        </button>
      </div>

      <style>{`
        .promotion-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.25); display:flex; align-items:center; justify-content:center; z-index:9999; backdrop-filter:blur(2px); }
        .promotion-modal { background:#fff; border:1px solid #e2e8f0; border-radius:16px; padding:2rem; display:flex; flex-direction:column; align-items:center; gap:1.25rem; min-width:300px; box-shadow:0 20px 40px rgba(0,0,0,0.1); animation:modalIn .18s ease; }
        @keyframes modalIn { from{opacity:0;transform:scale(.92)} to{opacity:1;transform:scale(1)} }
        .promotion-title { font-size:1.2rem; font-weight:700; color:#1e293b; margin:0; }
        .promotion-subtitle { font-size:.85rem; color:#64748b; margin:0; }
        .promotion-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:.75rem; width:100%; }
        .promotion-piece-btn { display:flex; flex-direction:column; align-items:center; gap:.4rem; background:#f8fafc; border:2px solid #e2e8f0; border-radius:10px; padding:.85rem .5rem; cursor:pointer; transition:all .15s ease; color:#0f172a; }
        .promotion-piece-btn:hover { background:#eff6ff; border-color:#3b82f6; transform:translateY(-2px); box-shadow:0 4px 12px rgba(59,130,246,.15); }
        .promotion-piece-symbol { font-size:2.5rem; line-height:1; }
        .promotion-piece-label { font-size:.7rem; color:#64748b; font-family:'Courier New',monospace; text-transform:uppercase; letter-spacing:.05em; }
        .promotion-piece-btn:hover .promotion-piece-label { color:#2563eb; }
        .promotion-cancel { background:transparent; border:1px solid #cbd5e1; color:#64748b; padding:.5rem 1.5rem; border-radius:8px; cursor:pointer; font-size:.85rem; transition:all .15s ease; }
        .promotion-cancel:hover { border-color:#ef4444; color:#ef4444; background:#fef2f2; }
      `}</style>
    </div>
  );
}