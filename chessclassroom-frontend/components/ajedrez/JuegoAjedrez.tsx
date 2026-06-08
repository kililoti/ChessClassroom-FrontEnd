// Viewer completo de ajedrez: tablero + planilla + chat.
// Delega toda la lógica en useChessGame y el tablero en ChessboardCore.
'use client';

import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useChessGame } from '@/hooks/useChessGame';
import ChessboardCore from '@/components/ajedrez/core/ChessboardCore';
import PromotionModal from '@/components/ajedrez/ui/PromotionModal';
import Planilla from '@/components/ajedrez/Planilla';

export interface JuegoAjedrezProps {
  pgnInicial?: string;
  onClose?: () => void;
}

export default function JuegoAjedrez({
  pgnInicial = '',
  onClose,
}: JuegoAjedrezProps) {
  const [orientacion, setOrientacion] = useState<'white' | 'black'>('white');

  const {
    pgn, fenVisible, estilosCombinados,
    indiceVista, setIndiceVista,
    totalMoves, estamosEnElPresente,
    historialMovimientos, gameActual,
    pendingPromotion,
    irAlInicio, irAtras, irAdelante, irAlFinal,
    onPieceDrop, onPieceDrag, onSquareClick,
    handlePromotionSelect, handlePromotionCancel,
    reiniciar,
  } = useChessGame({ pgnInicial });

  return (
    <div className="flex flex-col items-center w-full max-w-7xl mx-auto p-4 bg-white rounded-2xl shadow-sm border border-slate-200 relative">

      {pendingPromotion && (
        <PromotionModal
          color={pendingPromotion.color}
          onSelect={handlePromotionSelect}
          onCancel={handlePromotionCancel}
        />
      )}

      {/* Cabecera */}
      <div className="w-full flex justify-between items-center mb-6 mt-4 px-4">
        <div className="flex items-center gap-4">
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
              title="Volver al explorador"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h2 className="text-2xl font-bold text-slate-800">Partida Activa</h2>
        </div>

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

      {/* 2 columnas: Tablero | Planilla */}
      <div className="w-full flex flex-col lg:flex-row gap-6 px-4 items-center justify-center">

        {/* Tablero */}
        <div className="flex-1 max-w-[550px] w-full shadow-xl rounded-sm overflow-hidden border-4 border-[#302e2c]">
          <ChessboardCore
            fen={fenVisible}
            squareStyles={estilosCombinados}
            orientation={orientacion}
            onPieceDrop={onPieceDrop}
            onPieceDrag={onPieceDrag}
            onSquareClick={onSquareClick}
          />
        </div>

        {/* Planilla */}
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
          onClick={() => setOrientacion(o => o === 'white' ? 'black' : 'white')}
          className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-colors shadow-sm flex items-center gap-2"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          Girar Tablero
        </button>
        <button
          onClick={reiniciar}
          className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors shadow-sm"
        >
          Reiniciar Partida
        </button>
      </div>
    </div>
  );
}