import { Chessboard } from 'react-chessboard';

export interface Flecha {
  desde: string;
  hasta: string;
  color?: string;
}

interface Props {
  fen: string;
  squareStyles?: Record<string, React.CSSProperties>;
  orientation?: 'white' | 'black';
  allowDragging?: boolean;
  flechas?: Flecha[];                   // ← nuevo: flechas de Stockfish
  onPieceDrop?: (args: { piece: { isSparePiece: boolean; pieceType: string; position: string }; sourceSquare: string; targetSquare: string | null }) => boolean;
  onPieceDrag?: (args: { isSparePiece: boolean; piece: { pieceType: string }; square: string | null }) => void;
  onSquareClick?: (args: { piece: { pieceType: string } | null; square: string }) => void;
}

export default function ChessboardCore({
  fen,
  squareStyles = {},
  orientation = 'white',
  allowDragging = true,
  flechas = [],
  onPieceDrop,
  onPieceDrag,
  onSquareClick,
}: Props) {
  // react-chessboard v5 espera arrows como array de objetos { startSquare, endSquare, color }
  const arrows = flechas.map(f => ({
    startSquare: f.desde,
    endSquare: f.hasta,
    color: f.color ?? 'rgba(0,128,255,0.8)',
  }));

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
        arrows,
        boardStyle:       { borderRadius: '2px' },
        darkSquareStyle:  { backgroundColor: '#779556' },
        lightSquareStyle: { backgroundColor: '#ebecd0' },
      }}
    />
  );
}