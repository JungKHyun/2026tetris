
import { Tetromino } from './types';

export const COLS = 10;
export const ROWS = 20;
export const BLOCK_SIZE = 30;

export const TETROMINOS: { [key: string]: Tetromino } = {
  I: {
    shape: [
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0],
    ],
    color: '#22d3ee', // Cyan 400
    name: 'I',
  },
  J: {
    shape: [
      [0, 1, 0],
      [0, 1, 0],
      [1, 1, 0],
    ],
    color: '#818cf8', // Indigo 400
    name: 'J',
  },
  L: {
    shape: [
      [0, 1, 0],
      [0, 1, 0],
      [0, 1, 1],
    ],
    color: '#fb923c', // Orange 400
    name: 'L',
  },
  O: {
    shape: [
      [1, 1],
      [1, 1],
    ],
    color: '#facc15', // Yellow 400
    name: 'O',
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
    color: '#4ade80', // Emerald 400
    name: 'S',
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: '#c084fc', // Purple 400
    name: 'T',
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
    color: '#fb7185', // Rose 400
    name: 'Z',
  },
};

export const randomTetromino = (): Tetromino => {
  const keys = Object.keys(TETROMINOS);
  const randKey = keys[Math.floor(Math.random() * keys.length)];
  return TETROMINOS[randKey];
};

export const createEmptyBoard = (): string[][] =>
  Array.from({ length: ROWS }, () => Array(COLS).fill('empty'));
