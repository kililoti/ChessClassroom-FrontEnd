// Tablero puro reutilizable. Solo recibe props y delega en react-chessboard.
// No contiene estado propio ni lógica de negocio.
'use client';

import { Chessboard } from 'react-chessboard';

interface Props {
  fen: string;
  squareStyles?: Record<string, React.CSSProperties>;
  orientation?: 'white' | 'black';
  allowDragging?: boolean;
  onPieceDrop?: (args: { piece: { isSparePiece: boolean; pieceType: string; position: string }; sourceSquare: string; targetSquare: string | null }) => boolean;
  onPieceDrag?: (args: { isSparePiece: boolean; piece: { pieceType: string }; square: string | null }) => void;
  onSquareClick?: (args: { piece: { pieceType: string } | null; square: string }) => void;
}

export default function ChessboardCore({
  fen,
  squareStyles = {},
  orientation = 'white',
  allowDragging = true,
  onPieceDrop,
  onPieceDrag,
  onSquareClick,
}: Props) {
  return (
    <Chessboard
      options={{
        position:         fen,
        squareStyles,
        boardOrientation: orientation,
        allowDragging,
        onPieceDrop,
        onPieceDrag,
        onSquareClick,
        boardStyle:       { borderRadius: '2px' },
        darkSquareStyle:  { backgroundColor: '#779556' },
        lightSquareStyle: { backgroundColor: '#ebecd0' },
      }}
    />
  );
}