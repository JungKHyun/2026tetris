
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
    color: '#00FFFF', // Cyan
    name: 'I',
  },
  J: {
    shape: [
      [0, 1, 0],
      [0, 1, 0],
      [1, 1, 0],
    ],
    color: '#0000FF', // Blue
    name: 'J',
  },
  L: {
    shape: [
      [0, 1, 0],
      [0, 1, 0],
      [0, 1, 1],
    ],
    color: '#FF7F00', // Orange
    name: 'L',
  },
  O: {
    shape: [
      [1, 1],
      [1, 1],
    ],
    color: '#FFFF00', // Yellow
    name: 'O',
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
    color: '#00FF00', // Green
    name: 'S',
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: '#FF00FF', // Magenta
    name: 'T',
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
    color: '#FF0000', // Red
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
