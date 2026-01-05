
export type Shape = number[][];

export interface Tetromino {
  shape: Shape;
  color: string;
  name: string;
}

export interface Position {
  x: number;
  y: number;
}

export interface GameState {
  board: string[][];
  activePiece: ActivePiece | null;
  nextPiece: Tetromino;
  score: number;
  level: number;
  lines: number;
  isGameOver: boolean;
  isPaused: boolean;
}

export interface ActivePiece {
  pos: Position;
  tetromino: Tetromino;
  collided: boolean;
}

export interface AiCommentary {
  message: string;
  sentiment: 'positive' | 'neutral' | 'negative' | 'advice';
}
