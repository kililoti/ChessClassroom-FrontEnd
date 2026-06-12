'use client';

import { Chessboard } from 'react-chessboard';
import { MoveResult } from '@/hooks/useChessGame';

interface Props {
  fen: string;
  squareStyles?: Record<string, React.CSSProperties>;
  orientation?: 'white' | 'black';
  allowDragging?: boolean;
  onPieceDrop?: (args: { piece: { isSparePiece: boolean; pieceType: string; position: string }; sourceSquare: string; targetSquare: string | null }) => MoveResult | boolean;
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
  // react-chessboard espera boolean, así que normaliza el resultado
  const handlePieceDrop = onPieceDrop
    ? (args: Parameters<typeof onPieceDrop>[0]): boolean => {
        const resultado = onPieceDrop(args);
        if (typeof resultado === 'boolean') return resultado;
        return resultado.exito;
      }
    : undefined;

  return (
    <Chessboard
      options={{
        position:         fen,
        squareStyles,
        boardOrientation: orientation,
        allowDragging,
        onPieceDrop:      handlePieceDrop,
        onPieceDrag,
        onSquareClick,
        boardStyle:       { borderRadius: '2px' },
        darkSquareStyle:  { backgroundColor: '#779556' },
        lightSquareStyle: { backgroundColor: '#ebecd0' },
      }}
    />
  );
}