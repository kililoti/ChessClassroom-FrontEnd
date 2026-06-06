'use client';

import React, { useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';

export default function TableroAjedrez() {
  const [game, setGame] = useState(new Chess());
  const [casillasResaltadas, setCasillasResaltadas] = useState({});
  
  // NUEVO: Estado para capturar y mostrar errores en la interfaz
  const [error, setError] = useState<string>('');

  // Función auxiliar para mostrar el error y ocultarlo tras 4 segundos
  const mostrarError = (mensaje: string) => {
    setError(mensaje);
    setTimeout(() => {
      setError('');
    }, 4000);
  };

  const reproducirSonido = (tipo: 'move' | 'capture') => {
    try {
      const audio = new Audio(`/sounds/${tipo}.mp3`);
      audio.play().catch(e => {
        console.warn("Audio bloqueado:", e);
        // Si el navegador se pone estricto con el Autoplay, avisamos al usuario
        mostrarError("El navegador bloqueó el sonido. Asegúrate de tener el volumen activado.");
      });
    } catch (err) {
      mostrarError("Error interno al intentar cargar el archivo de audio.");
    }
  };

  const onPieceDrag = ({ square }: any) => {
    try {
      const movimientos = game.moves({ square, verbose: true }) as any[];
      if (movimientos.length === 0) return;

      const nuevosEstilos: any = {};
      nuevosEstilos[square] = { backgroundColor: 'rgba(255, 255, 0, 0.4)' };

      movimientos.forEach((mov) => {
        nuevosEstilos[mov.to] = {
          background: 'radial-gradient(circle, rgba(0,0,0,.15) 25%, transparent 25%)',
          borderRadius: '50%',
        };
      });

      setCasillasResaltadas(nuevosEstilos);
    } catch (err) {
      mostrarError("Error al calcular los movimientos posibles.");
    }
  };

  const onPieceDrop = ({ sourceSquare, targetSquare }: any) => {
    try {
      setCasillasResaltadas({});

      const gameCopy = new Chess(game.fen());
      gameCopy.loadPgn(game.pgn());

      const move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });

      // Si el movimiento es inválido pacíficamente
      if (!move) return false;

      if (move.captured) {
        reproducirSonido('capture');
      } else {
        reproducirSonido('move');
      }

      setGame(gameCopy);
      return true;

    } catch (err: any) {
      // Capturamos cualquier excepción inesperada que lance la librería
      mostrarError(`Movimiento no permitido: ${err.message || 'Regla de ajedrez violada'}`);
      return false;
    }
  };

  const reiniciarPartida = () => {
    setGame(new Chess());
    setCasillasResaltadas({});
    setError(''); // Limpiamos errores al reiniciar
  };

  return (
    <div className="flex flex-col items-center max-w-2xl mx-auto p-4 bg-white rounded-2xl shadow-sm border border-slate-200 relative">

      {/* NUEVO: Alerta de Error visible para el usuario */}
      {error && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-11/12 max-w-md z-50 bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-md animate-in fade-in slide-in-from-top-2">
          <div className="flex justify-between items-start">
            <div className="flex">
              <span className="text-red-500 mr-2">⚠️</span>
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
            <button 
              onClick={() => setError('')}
              className="text-red-400 hover:text-red-600 transition-colors"
            >
              ✖
            </button>
          </div>
        </div>
      )}

      {/* Cabecera */}
      <div className="w-full flex justify-between items-center mb-6 mt-4">
        <h2 className="text-xl font-bold text-slate-800">Partida de Práctica</h2>
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
          game.isGameOver() ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
        }`}>
          {game.isGameOver() ? 'Partida Terminada' : (game.turn() === 'w' ? 'Turno: Blancas' : 'Turno: Negras')}
        </span>
      </div>

      {/* Tablero */}
      <div className="w-full max-w-[500px] shadow-lg rounded-sm overflow-hidden border-4 border-slate-800 relative z-10">
        <Chessboard
          options={{
            position: game.fen(),
            onPieceDrop,
            onPieceDrag,
            squareStyles: casillasResaltadas,
            allowDragging: true,
            boardStyle: { borderRadius: '2px' },
            darkSquareStyle: { backgroundColor: '#779556' },
            lightSquareStyle: { backgroundColor: '#ebecd0' },
          }}
        />
      </div>

      {/* Controles de estado */}
      <div className="w-full mt-6 flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
        <div className="text-sm font-medium text-slate-600">
          {game.isCheckmate() && <span className="text-red-600 font-bold">¡Jaque Mate!</span>}
          {game.isDraw() && <span className="text-amber-600 font-bold">¡Tablas!</span>}
          {game.isCheck() && !game.isCheckmate() && <span className="text-amber-600 font-bold">¡Jaque!</span>}
        </div>

        <button
          onClick={reiniciarPartida}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-lg transition-colors shadow-sm"
        >
          Reiniciar Partida
        </button>
      </div>

      {/* Datos Técnicos (FEN y PGN) */}
      <div className="w-full mt-6 space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Posición FEN</label>
          <div className="mt-1 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-700 break-all select-all">
            {game.fen()}
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Historial PGN</label>
          <div className="mt-1 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-700 h-60 overflow-y-auto whitespace-pre-wrap select-all leading-relaxed">
            {game.pgn() || "La partida aún no ha comenzado..."}
          </div>
        </div>
      </div>

    </div>
  );
}