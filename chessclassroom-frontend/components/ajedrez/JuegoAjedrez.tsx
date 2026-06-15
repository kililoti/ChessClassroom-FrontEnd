// Visor de partidas para estudios. Limpio, sin lógica de ejercicios
'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useChessGame } from '@/hooks/useChessGame';
import { useStockfish } from '@/hooks/useStockfish';
import ChessboardCore from '@/components/ajedrez/core/ChessboardCore';
import PromotionModal from '@/components/ajedrez/ui/PromotionModal';
import Planilla from '@/components/ajedrez/Planilla';
import PanelStockfish from '@/components/ajedrez/PanelStockfish';
import EvalBarVertical from '@/components/ajedrez/EvalBarVertical';

export interface JuegoAjedrezProps {
  pgnInicial?: string;
  onClose?: () => void;
  mostrarStockfish?: boolean;   // muestra el panel
  stockfishBloqueado?: boolean; // true = panel visible pero desactivado hasta que se cumpla condición
}

export default function JuegoAjedrez({
  pgnInicial = '',
  onClose,
  mostrarStockfish = false,
  stockfishBloqueado = false,
}: JuegoAjedrezProps) {
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
    cargarPgn,
  } = useChessGame({ pgnInicial });

  const stockfish = useStockfish();

  // Cada vez que cambia el FEN visible, re-analizar si Stockfish está activo
  useEffect(() => {
    if (mostrarStockfish && stockfish.activo) {
      stockfish.analizarFen(fenVisible);
    }
  }, [fenVisible, stockfish.activo, mostrarStockfish]);

  // Al desmontar, desactivar Stockfish
  useEffect(() => {
    return () => { stockfish.desactivar(); };
  }, []);

  // Flechas: solo mostrar si Stockfish está activo y visible
  const flechasTablero = mostrarStockfish && stockfish.activo ? stockfish.flechas : [];

  // El turno en la posición actual
  const turnoBlancas = fenVisible.split(' ')[1] === 'w';
  const numeroJugada = parseInt(fenVisible.split(' ')[5], 10) || 1;
  useEffect(() => {
    setOrientacion(orientacionInicial);
  }, [orientacionInicial]);

  const handleReiniciar = () => {
    cargarPgn(pgnInicial);
  };

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
            <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors" title="Volver">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h2 className="text-2xl font-bold text-slate-800">Partida Activa</h2>
        </div>

        <span className={`px-4 py-1.5 rounded-full text-sm font-semibold shadow-sm ${
          gameActual.isGameOver() ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'
        }`}>
          {gameActual.isGameOver()
            ? 'Partida Terminada'
            : gameActual.turn() === 'w' ? 'Juegan Blancas' : 'Juegan Negras'}
        </span>
      </div>

      {/* Layout principal: Tablero | Planilla | (Panel Stockfish si activo) */}
      <div className="w-full flex flex-col lg:flex-row gap-6 px-4 items-start justify-center">

        {/* Tablero + barra de evaluación */}
        <div className="flex-1 max-w-[550px] w-full shadow-xl rounded-sm overflow-hidden border-4 border-[#302e2c] flex">
          {mostrarStockfish && (
            <div className="w-5 shrink-0 border-r-4 border-[#302e2c]">
              <EvalBarVertical
                evaluacion={stockfish.lineas[0]?.evaluacion ?? 0}
                mate={stockfish.lineas[0]?.mate ?? null}
                turnoBlancas={turnoBlancas}
                orientation={orientacion}
                activo={stockfish.activo && stockfish.lineas.length > 0}
              />
            </div>
          )}
          <div className="flex-1">
            <ChessboardCore
              fen={fenVisible}
              squareStyles={estilosCombinados}
              orientation={orientacion}
              onPieceDrop={onPieceDrop}
              onPieceDrag={onPieceDrag}
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
        </div>

        {/* Panel Stockfish — solo en módulos que lo permiten */}
        {mostrarStockfish && (
          <PanelStockfish
            activo={stockfish.activo}
            cargando={stockfish.cargando}
            profundidad={stockfish.profundidad}
            lineas={stockfish.lineas}
            turnoBlancas={turnoBlancas}
            numeroJugada={numeroJugada}
            bloqueado={stockfishBloqueado}
            onActivar={stockfishBloqueado ? () => {} : stockfish.activar}
            onDesactivar={stockfish.desactivar}
            onCambiarProfundidad={stockfish.setProfundidad}
          />
        )}
     
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

        {/* Reiniciar */}
        <button
          onClick={handleReiniciar}
          className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors shadow-sm"
        >
          Reiniciar Partida
        </button>
      </div>
    </div>
  );
}