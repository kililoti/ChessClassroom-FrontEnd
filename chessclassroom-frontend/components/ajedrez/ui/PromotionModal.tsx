'use client';

import { PromotionPiece } from '@/hooks/useChessGame';

const PROMOTION_PIECES: { piece: PromotionPiece; label: string; white: string; black: string }[] = [
  { piece: 'q', label: 'Reina',   white: '♕', black: '♛' },
  { piece: 'r', label: 'Torre',   white: '♖', black: '♜' },
  { piece: 'b', label: 'Alfil',   white: '♗', black: '♝' },
  { piece: 'n', label: 'Caballo', white: '♘', black: '♞' },
];

interface Props {
  color: 'w' | 'b';
  onSelect: (piece: PromotionPiece) => void;
  onCancel: () => void;
}

export default function PromotionModal({ color, onSelect, onCancel }: Props) {
  const isWhite = color === 'w';

  return (
    <div
      className="fixed inset-0 bg-black/25 backdrop-blur-sm flex items-center justify-center z-[9999]"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label="Selecciona la pieza de promoción"
    >
      <div
        className="bg-white border border-slate-200 rounded-2xl p-8 flex flex-col items-center gap-5 min-w-[300px] shadow-2xl animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center">
          <h3 className="text-lg font-bold text-slate-900">Promoción de peón</h3>
          <p className="text-sm text-slate-500 mt-1">
            Elige a qué pieza promocionas ({isWhite ? 'Blancas' : 'Negras'})
          </p>
        </div>

        <div className="grid grid-cols-4 gap-3 w-full">
          {PROMOTION_PIECES.map(({ piece, label, white, black }) => (
            <button
              key={piece}
              onClick={() => onSelect(piece)}
              title={label}
              className="flex flex-col items-center gap-1.5 bg-slate-50 border-2 border-slate-200 rounded-xl p-3 hover:bg-blue-50 hover:border-blue-400 hover:-translate-y-0.5 hover:shadow-md transition-all"
            >
              <span className="text-4xl leading-none">{isWhite ? white : black}</span>
              <span className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold font-mono">
                {label}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={onCancel}
          className="text-sm text-slate-400 hover:text-red-500 border border-slate-200 hover:border-red-300 hover:bg-red-50 px-4 py-1.5 rounded-lg transition-all"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}