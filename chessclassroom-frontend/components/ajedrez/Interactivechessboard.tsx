"use client";

import { useState, useCallback } from "react";
import { Chess, Square } from "chess.js";
import { Chessboard } from "react-chessboard";

// ─── Tipos ───────────────────────────────────────────────────────────────────

type SquareStyles = Record<string, React.CSSProperties>;

type GameStatus = "playing" | "check" | "checkmate" | "draw" | "stalemate";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getGameStatus(game: Chess): GameStatus {
  if (game.isCheckmate()) return "checkmate";
  if (game.isDraw())      return "draw";
  if (game.isStalemate()) return "stalemate";
  if (game.inCheck())     return "check";
  return "playing";
}

const STATUS_CONFIG: Record<GameStatus, { label: string; color: string; icon: string }> = {
  playing:   { label: "Partida en curso", color: "var(--accent)", icon: "♟" },
  check:     { label: "¡Jaque!",          color: "#f59e0b",       icon: "⚠" },
  checkmate: { label: "¡Jaque mate!",     color: "#ef4444",       icon: "♛" },
  draw:      { label: "Tablas",           color: "#6b7280",       icon: "🤝" },
  stalemate: { label: "Ahogado",          color: "#8b5cf6",       icon: "🔒" },
};

// ─── Estilos de resaltado ────────────────────────────────────────────────────

const STYLE_SELECTED: React.CSSProperties = {
  backgroundColor: "rgba(250, 204, 21, 0.5)",
};
const STYLE_MOVE_DOT: React.CSSProperties = {
  background: "radial-gradient(circle, rgba(34,197,94,0.75) 28%, transparent 32%)",
  cursor: "pointer",
};
const STYLE_MOVE_CAPTURE: React.CSSProperties = {
  background: "radial-gradient(circle at 50% 50%, transparent 60%, rgba(239,68,68,0.75) 62%)",
  cursor: "pointer",
};
const STYLE_LAST_MOVE: React.CSSProperties = {
  backgroundColor: "rgba(59, 130, 246, 0.35)",
};
const STYLE_CHECK: React.CSSProperties = {
  background: "radial-gradient(circle, rgba(239,68,68,0.9) 40%, transparent 44%)",
};

// ─── Componente principal ────────────────────────────────────────────────────

export default function InteractiveChessBoard() {
  const [game, setGame]                         = useState<Chess>(() => new Chess());
  const [selectedSquare, setSelectedSquare]     = useState<Square | null>(null);
  const [squareStyles, setSquareStyles]         = useState<SquareStyles>({});
  const [lastMove, setLastMove]                 = useState<{ from: Square; to: Square } | null>(null);
  const [moveHistory, setMoveHistory]           = useState<string[]>([]);
  const [boardOrientation, setBoardOrientation] = useState<"white" | "black">("white");

  const status       = getGameStatus(game);
  const statusConfig = STATUS_CONFIG[status];
  const turnLabel    = game.turn() === "w" ? "Blancas" : "Negras";
  const isGameOver   = status === "checkmate" || status === "draw" || status === "stalemate";

  // ── Calcula estilos ──────────────────────────────────────────────────────

  const computeStyles = useCallback((
    selected: Square | null,
    from: Square | null,
    to: Square | null,
    currentGame: Chess,
  ): SquareStyles => {
    const styles: SquareStyles = {};

    // Último movimiento
    if (from) styles[from] = { ...STYLE_LAST_MOVE };
    if (to)   styles[to]   = { ...STYLE_LAST_MOVE };

    // Rey en jaque
    if (currentGame.inCheck()) {
      const turn = currentGame.turn();
      for (const row of currentGame.board()) {
        for (const cell of row) {
          if (cell?.type === "k" && cell.color === turn) {
            styles[cell.square] = { ...STYLE_CHECK };
          }
        }
      }
    }

    // Pieza seleccionada y sus movimientos
    if (selected) {
      styles[selected] = { ...STYLE_SELECTED };
      const moves = currentGame.moves({ square: selected, verbose: true });
      for (const move of moves) {
        const isCapture = !!move.captured || !!currentGame.get(move.to as Square);
        styles[move.to as Square] = isCapture ? { ...STYLE_MOVE_CAPTURE } : { ...STYLE_MOVE_DOT };
      }
    }

    return styles;
  }, []);

  // ── Aplicar movimiento ───────────────────────────────────────────────────

  const applyMove = useCallback((from: Square, to: Square, currentGame: Chess) => {
    const newGame    = new Chess(currentGame.fen());
    const moveResult = newGame.move({ from, to, promotion: "q" });
    if (!moveResult) return null;
    return { newGame, moveResult };
  }, []);

  // ── Click en casilla ─────────────────────────────────────────────────────
  // v5: onSquareClick recibe (square: string, piece: string | undefined)

  const handleSquareClick = useCallback((square: string) => {
    if (isGameOver) return;

    const sq        = square as Square;
    const piece     = game.get(sq);
    const isOwnPiece = piece && piece.color === game.turn();

    if (selectedSquare) {
      // Intentar mover
      const result = applyMove(selectedSquare, sq, game);
      if (result) {
        const { newGame, moveResult } = result;
        setGame(newGame);
        setLastMove({ from: selectedSquare, to: sq });
        setMoveHistory((prev) => [...prev, moveResult.san]);
        setSelectedSquare(null);
        setSquareStyles(computeStyles(null, selectedSquare, sq, newGame));
        return;
      }

      // Cambiar selección a otra pieza propia
      if (isOwnPiece && sq !== selectedSquare) {
        setSelectedSquare(sq);
        setSquareStyles(computeStyles(sq, lastMove?.from ?? null, lastMove?.to ?? null, game));
        return;
      }

      // Deseleccionar
      setSelectedSquare(null);
      setSquareStyles(computeStyles(null, lastMove?.from ?? null, lastMove?.to ?? null, game));
      return;
    }

    // Seleccionar pieza propia
    if (isOwnPiece) {
      setSelectedSquare(sq);
      setSquareStyles(computeStyles(sq, lastMove?.from ?? null, lastMove?.to ?? null, game));
    }
  }, [game, selectedSquare, lastMove, isGameOver, applyMove, computeStyles]);

  // ── Drag inicio ──────────────────────────────────────────────────────────
  // v5: onPieceDragBegin → onPieceDrag, recibe ({ piece, square }: { piece: string; square: string })

  const handlePieceDrag = useCallback(({ square }: { piece: string; square: string }) => {
    if (isGameOver) return;
    const sq = square as Square;
    setSelectedSquare(sq);
    setSquareStyles(computeStyles(sq, lastMove?.from ?? null, lastMove?.to ?? null, game));
  }, [game, lastMove, isGameOver, computeStyles]);

  // ── Drop ─────────────────────────────────────────────────────────────────
  // v5: onPieceDrop recibe ({ piece, sourceSquare, targetSquare })
  // donde sourceSquare y targetSquare son string, no Square

  const handlePieceDrop = useCallback(({
    sourceSquare,
    targetSquare,
  }: {
    piece: string;
    sourceSquare: string;
    targetSquare: string;
  }): boolean => {
    if (isGameOver) return false;

    const from = sourceSquare as Square;
    const to   = targetSquare as Square;
    const result = applyMove(from, to, game);
    if (!result) return false;

    const { newGame, moveResult } = result;
    setGame(newGame);
    setLastMove({ from, to });
    setMoveHistory((prev) => [...prev, moveResult.san]);
    setSelectedSquare(null);
    setSquareStyles(computeStyles(null, from, to, newGame));
    return true;
  }, [game, isGameOver, applyMove, computeStyles]);

  // ── Reset / Undo ─────────────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    setGame(new Chess());
    setSelectedSquare(null);
    setSquareStyles({});
    setLastMove(null);
    setMoveHistory([]);
  }, []);

  const handleUndo = useCallback(() => {
    const newGame = new Chess(game.fen());
    newGame.undo();
    setGame(newGame);
    setSelectedSquare(null);
    setSquareStyles({});
    setLastMove(null);
    setMoveHistory((prev) => prev.slice(0, -1));
  }, [game]);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="chess-wrapper">

      {/* ── Estado ── */}
      <div className="status-bar">
        <span className="status-icon">{statusConfig.icon}</span>
        <span className="status-label" style={{ color: statusConfig.color }}>
          {statusConfig.label}
        </span>
        {status === "playing" && (
          <span className="turn-label">Turno:&nbsp;<strong>{turnLabel}</strong></span>
        )}
      </div>

      {/* ── Tablero + panel ── */}
      <div className="board-layout">

        <div className="board-container">
          <Chessboard
            options={{
              // v5: position acepta FEN string o "start"
              position: game.fen(),

              // v5: squareStyles (antes customSquareStyles)
              squareStyles: squareStyles,

              // v5: boardOrientation sin cambios
              boardOrientation: boardOrientation,

              // v5: allowDragging (antes arePiecesDraggable)
              allowDragging: !isGameOver,

              // v5: onSquareClick — (square: string, piece?: string) => void
              onSquareClick: handleSquareClick,

              // v5: onPieceDrag (antes onPieceDragBegin) — ({ piece, square }) => void
              onPieceDrag: handlePieceDrag,

              // v5: onPieceDrop — ({ piece, sourceSquare, targetSquare }) => boolean
              onPieceDrop: handlePieceDrop,

              // v5: boardStyle (antes customBoardStyle)
              boardStyle: {
                borderRadius: "8px",
                boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 0 2px var(--border)",
              },

              // v5: darkSquareStyle / lightSquareStyle (antes customDarkSquareStyle / customLightSquareStyle)
              darkSquareStyle:  { backgroundColor: "#4a7c59" },
              lightSquareStyle: { backgroundColor: "#f0d9b5" },

              // v5: animationDurationInMs (antes animationDuration)
              animationDurationInMs: 180,
            }}
          />
        </div>

        {/* Panel lateral */}
        <aside className="side-panel">

          <div className="legend-card">
            <h3 className="panel-title">Leyenda</h3>
            <div className="legend-item"><span className="legend-dot dot-selected" />Pieza seleccionada</div>
            <div className="legend-item"><span className="legend-dot dot-move" />Movimiento posible</div>
            <div className="legend-item"><span className="legend-dot dot-capture" />Captura disponible</div>
            <div className="legend-item"><span className="legend-dot dot-last" />Último movimiento</div>
            <div className="legend-item"><span className="legend-dot dot-check" />Rey en jaque</div>
          </div>

          <div className="history-card">
            <h3 className="panel-title">Movimientos</h3>
            {moveHistory.length === 0 ? (
              <p className="empty-history">Sin movimientos aún</p>
            ) : (
              <div className="move-list">
                {Array.from({ length: Math.ceil(moveHistory.length / 2) }, (_, i) => (
                  <div key={i} className="move-row">
                    <span className="move-number">{i + 1}.</span>
                    <span className="move-san white-move">{moveHistory[i * 2]}</span>
                    {moveHistory[i * 2 + 1] && (
                      <span className="move-san black-move">{moveHistory[i * 2 + 1]}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="controls">
            <button className="btn btn-secondary" onClick={handleUndo} disabled={moveHistory.length === 0}>
              ↩ Deshacer
            </button>
            <button className="btn btn-secondary" onClick={() => setBoardOrientation((o) => o === "white" ? "black" : "white")}>
              ⇅ Girar
            </button>
            <button className="btn btn-primary" onClick={handleReset}>
              ↺ Nueva partida
            </button>
          </div>

        </aside>
      </div>

      <style>{`
        :root {
          --bg:         #1a1f2e;
          --surface:    #222840;
          --surface2:   #2a3050;
          --border:     #3a4060;
          --text:       #e8eaf0;
          --text-muted: #8890b0;
          --accent:     #5b8dee;
        }
        .chess-wrapper {
          font-family: 'Georgia', serif;
          background: var(--bg);
          min-height: 100vh;
          padding: 2rem 1.5rem;
          color: var(--text);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.25rem;
        }
        .status-bar {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 50px;
          padding: 0.5rem 1.5rem;
          font-size: 0.95rem;
        }
        .status-icon  { font-size: 1.2rem; }
        .status-label { font-weight: 700; }
        .turn-label   { color: var(--text-muted); margin-left: 0.5rem; }
        .board-layout {
          display: flex;
          gap: 1.5rem;
          align-items: flex-start;
          flex-wrap: wrap;
          justify-content: center;
        }
        .board-container { width: min(560px, 92vw); flex-shrink: 0; }
        .side-panel {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          width: 200px;
          min-width: 180px;
        }
        .legend-card, .history-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 1rem;
        }
        .panel-title {
          font-size: 0.75rem;
          font-family: 'Courier New', monospace;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: var(--text-muted);
          margin: 0 0 0.75rem 0;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-size: 0.82rem;
          color: var(--text-muted);
          margin-bottom: 0.45rem;
        }
        .legend-dot { width: 16px; height: 16px; border-radius: 50%; flex-shrink: 0; }
        .dot-selected { background: rgba(250,204,21,0.85); }
        .dot-move     { background: rgba(34,197,94,0.75); }
        .dot-capture  { background: rgba(239,68,68,0.75); }
        .dot-last     { background: rgba(59,130,246,0.5); }
        .dot-check    { background: rgba(239,68,68,0.9); }
        .empty-history {
          font-size: 0.8rem;
          color: var(--text-muted);
          text-align: center;
          padding: 0.5rem 0;
          margin: 0;
        }
        .move-list {
          max-height: 220px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .move-list::-webkit-scrollbar { width: 4px; }
        .move-list::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
        .move-row {
          display: grid;
          grid-template-columns: 1.5rem 1fr 1fr;
          gap: 0.25rem;
          align-items: center;
          padding: 2px 4px;
          border-radius: 4px;
          font-size: 0.82rem;
        }
        .move-row:hover { background: var(--surface2); }
        .move-number { color: var(--text-muted); font-size: 0.72rem; }
        .move-san { font-family: 'Courier New', monospace; padding: 1px 4px; border-radius: 3px; font-size: 0.82rem; }
        .white-move { color: #f0d9b5; }
        .black-move { color: #9ab8a0; }
        .controls { display: flex; flex-direction: column; gap: 0.5rem; }
        .btn {
          padding: 0.55rem 1rem;
          border-radius: 8px;
          border: 1px solid var(--border);
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.15s ease;
          font-family: inherit;
        }
        .btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .btn-secondary { background: var(--surface); color: var(--text-muted); }
        .btn-secondary:hover:not(:disabled) { background: var(--surface2); color: var(--text); border-color: var(--accent); }
        .btn-primary { background: var(--accent); color: #fff; border-color: var(--accent); font-weight: 600; }
        .btn-primary:hover:not(:disabled) { background: #4a7ce0; box-shadow: 0 0 12px rgba(91,141,238,0.4); }
        @media (max-width: 820px) {
          .side-panel { width: min(560px, 92vw); flex-direction: row; flex-wrap: wrap; }
          .legend-card, .history-card { flex: 1; min-width: 180px; }
          .controls { flex-direction: row; width: 100%; }
          .btn { flex: 1; }
        }
      `}</style>
    </div>
  );
}