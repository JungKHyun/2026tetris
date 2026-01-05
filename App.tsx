
import React, { useState, useCallback, useEffect } from 'react';
import { 
  COLS, ROWS, createEmptyBoard, randomTetromino 
} from './constants';
import { GameState, Position } from './types';
import { useInterval } from './hooks/useInterval';
import Block from './components/Block';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    board: createEmptyBoard(),
    activePiece: null,
    nextPiece: randomTetromino(),
    score: 0,
    level: 1,
    lines: 0,
    isGameOver: false,
    isPaused: false,
  });

  const [flash, setFlash] = useState(false);

  // --- Game Logic Functions ---

  const checkCollision = useCallback((pos: Position, shape: number[][], board: string[][]) => {
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x] !== 0) {
          const newX = pos.x + x;
          const newY = pos.y + y;
          if (newX < 0 || newX >= COLS || newY >= ROWS || (newY >= 0 && board[newY][newX] !== 'empty')) {
            return true;
          }
        }
      }
    }
    return false;
  }, []);

  const spawnPiece = useCallback(() => {
    setGameState(prev => {
      const piece = prev.nextPiece;
      const startPos = { x: Math.floor(COLS / 2) - 1, y: 0 };
      if (checkCollision(startPos, piece.shape, prev.board)) return { ...prev, isGameOver: true };
      return {
        ...prev,
        activePiece: { pos: startPos, tetromino: piece, collided: false },
        nextPiece: randomTetromino()
      };
    });
  }, [checkCollision]);

  const rotate = (shape: number[][]): number[][] => {
    return shape[0].map((_, index) => shape.map(col => col[index]).reverse());
  };

  const moveActivePiece = useCallback((dir: { x: number, y: number }) => {
    setGameState(prev => {
      if (!prev.activePiece || prev.isPaused || prev.isGameOver) return prev;
      const newPos = { x: prev.activePiece.pos.x + dir.x, y: prev.activePiece.pos.y + dir.y };
      
      if (!checkCollision(newPos, prev.activePiece.tetromino.shape, prev.board)) {
        return { ...prev, activePiece: { ...prev.activePiece, pos: newPos } };
      }

      if (dir.y > 0) {
        const newBoard = [...prev.board.map(row => [...row])];
        const { shape, color } = prev.activePiece.tetromino;
        const { x, y } = prev.activePiece.pos;
        shape.forEach((row, rowIdx) => {
          row.forEach((value, colIdx) => {
            if (value !== 0) {
              const boardY = y + rowIdx;
              const boardX = x + colIdx;
              if (boardY >= 0) newBoard[boardY][boardX] = color;
            }
          });
        });

        let linesCleared = 0;
        const filteredBoard = newBoard.filter(row => {
          const isFull = row.every(cell => cell !== 'empty');
          if (isFull) linesCleared++;
          return !isFull;
        });
        
        if (linesCleared > 0) {
          setFlash(true);
          setTimeout(() => setFlash(false), 100);
        }

        while (filteredBoard.length < ROWS) filteredBoard.unshift(Array(COLS).fill('empty'));

        const newScore = prev.score + (linesCleared === 4 ? 1200 : linesCleared * 100);
        const newLines = prev.lines + linesCleared;
        return {
          ...prev,
          board: filteredBoard,
          activePiece: null,
          score: newScore,
          lines: newLines,
          level: Math.floor(newLines / 10) + 1
        };
      }
      return prev;
    });
  }, [checkCollision]);

  const rotatePiece = useCallback(() => {
    setGameState(prev => {
      if (!prev.activePiece || prev.isPaused || prev.isGameOver) return prev;
      const rotatedShape = rotate(prev.activePiece.tetromino.shape);
      if (!checkCollision(prev.activePiece.pos, rotatedShape, prev.board)) {
        return { ...prev, activePiece: { ...prev.activePiece, tetromino: { ...prev.activePiece.tetromino, shape: rotatedShape } } };
      }
      return prev;
    });
  }, [checkCollision]);

  const hardDrop = useCallback(() => {
    setGameState(prev => {
      if (!prev.activePiece || prev.isPaused || prev.isGameOver) return prev;
      let finalY = prev.activePiece.pos.y;
      while (!checkCollision({ x: prev.activePiece.pos.x, y: finalY + 1 }, prev.activePiece.tetromino.shape, prev.board)) finalY++;
      const newBoard = [...prev.board.map(row => [...row])];
      const { shape, color } = prev.activePiece.tetromino;
      shape.forEach((row, rowIdx) => {
        row.forEach((value, colIdx) => {
          if (value !== 0) {
            const boardY = finalY + rowIdx;
            const boardX = prev.activePiece!.pos.x + colIdx;
            if (boardY >= 0) newBoard[boardY][boardX] = color;
          }
        });
      });
      let linesCleared = 0;
      const filteredBoard = newBoard.filter(row => {
        const isFull = row.every(cell => cell !== 'empty');
        if (isFull) linesCleared++;
        return !isFull;
      });
      
      if (linesCleared > 0) {
        setFlash(true);
        setTimeout(() => setFlash(false), 100);
      }

      while (filteredBoard.length < ROWS) filteredBoard.unshift(Array(COLS).fill('empty'));
      
      return {
        ...prev,
        board: filteredBoard,
        activePiece: null,
        score: prev.score + (linesCleared === 4 ? 1500 : linesCleared * 150) + (finalY - prev.activePiece.pos.y),
        lines: prev.lines + linesCleared,
        level: Math.floor((prev.lines + linesCleared) / 10) + 1
      };
    });
  }, [checkCollision]);

  useInterval(() => {
    if (!gameState.activePiece && !gameState.isGameOver && !gameState.isPaused) spawnPiece();
    else if (gameState.activePiece) moveActivePiece({ x: 0, y: 1 });
  }, gameState.isPaused || gameState.isGameOver ? null : Math.max(80, 800 - (gameState.level - 1) * 80));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState.isGameOver) return;
      switch (e.key) {
        case 'ArrowLeft': moveActivePiece({ x: -1, y: 0 }); break;
        case 'ArrowRight': moveActivePiece({ x: 1, y: 0 }); break;
        case 'ArrowDown': moveActivePiece({ x: 0, y: 1 }); break;
        case 'ArrowUp': rotatePiece(); break;
        case ' ': e.preventDefault(); hardDrop(); break;
        case 'p': case 'P': setGameState(prev => ({ ...prev, isPaused: !prev.isPaused })); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moveActivePiece, rotatePiece, hardDrop, gameState.isGameOver]);

  const renderBoard = () => {
    const displayBoard = gameState.board.map(row => [...row]);
    if (gameState.activePiece && !gameState.isPaused) {
      const { pos, tetromino } = gameState.activePiece;
      let ghostY = pos.y;
      while (!checkCollision({ x: pos.x, y: ghostY + 1 }, tetromino.shape, gameState.board)) ghostY++;
      tetromino.shape.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value !== 0) {
            const boardY = ghostY + y;
            const boardX = pos.x + x;
            if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS && displayBoard[boardY][boardX] === 'empty') displayBoard[boardY][boardX] = 'ghost';
          }
        });
      });
      tetromino.shape.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value !== 0) {
            const boardY = pos.y + y;
            const boardX = pos.x + x;
            if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) displayBoard[boardY][boardX] = tetromino.color;
          }
        });
      });
    }

    return (
      <div 
        className={`grid grid-cols-10 gap-0 p-1 bg-black border-[10px] border-[#888] shadow-[inset_4px_4px_0_#000,4px_4px_0_#fff] ${flash ? 'bg-white' : ''}`}
        style={{ width: `${COLS * 30 + 20}px`, height: `${ROWS * 30 + 20}px` }}
      >
        {displayBoard.map((row, y) => row.map((cell, x) => (
          <div key={`${x}-${y}`} className="w-[30px] h-[30px]">
            <Block color={cell === 'ghost' ? gameState.activePiece?.tetromino.color || 'white' : cell} ghost={cell === 'ghost'} />
          </div>
        )))}
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-[#008080] overflow-hidden select-none font-mono">
      
      {/* 90년대풍 제목 */}
      <div className="mb-8 p-4 bg-[#c0c0c0] border-t-2 border-l-2 border-white border-r-2 border-b-2 border-black shadow-md">
        <h1 className="text-4xl font-black text-blue-900 tracking-widest uppercase italic drop-shadow-sm">
          TETRIS 1990 CLASSIC
        </h1>
      </div>

      <div className="flex flex-row gap-8 items-start">
        
        {/* 왼쪽: 통계창 */}
        <div className="flex flex-col gap-4">
          <div className="bg-[#c0c0c0] border-t-2 border-l-2 border-white border-r-2 border-b-2 border-black p-4 w-40">
            <p className="text-xs font-bold text-black border-b border-black mb-2">SCORE</p>
            <p className="text-xl font-bold text-red-700 text-right">{gameState.score.toString().padStart(7, '0')}</p>
          </div>
          <div className="bg-[#c0c0c0] border-t-2 border-l-2 border-white border-r-2 border-b-2 border-black p-4 w-40">
            <p className="text-xs font-bold text-black border-b border-black mb-2">LINES</p>
            <p className="text-xl font-bold text-blue-700 text-right">{gameState.lines}</p>
          </div>
          <div className="bg-[#c0c0c0] border-t-2 border-l-2 border-white border-r-2 border-b-2 border-black p-4 w-40">
            <p className="text-xs font-bold text-black border-b border-black mb-2">LEVEL</p>
            <p className="text-xl font-bold text-green-700 text-right">{gameState.level}</p>
          </div>
        </div>

        {/* 가운데: 게임판 */}
        <div className="relative">
          {renderBoard()}
          
          {gameState.isGameOver && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center border-4 border-red-600 p-8 z-20">
              <h2 className="text-5xl font-black text-red-600 mb-6 text-center animate-bounce">GAME OVER</h2>
              <button 
                onClick={() => window.location.reload()} 
                className="bg-[#c0c0c0] border-t-4 border-l-4 border-white border-r-4 border-b-4 border-black px-6 py-2 font-bold text-black active:border-t-black active:border-l-black active:border-white active:border-r-white"
              >
                TRY AGAIN
              </button>
            </div>
          )}

          {gameState.isPaused && !gameState.isGameOver && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
              <h2 className="text-4xl font-black text-yellow-400 drop-shadow-lg">PAUSED</h2>
            </div>
          )}
        </div>

        {/* 오른쪽: 다음 블록 및 조작법 */}
        <div className="flex flex-col gap-4">
          <div className="bg-[#c0c0c0] border-t-2 border-l-2 border-white border-r-2 border-b-2 border-black p-4 w-40 h-40">
            <p className="text-xs font-bold text-black border-b border-black mb-4">NEXT</p>
            <div className="flex justify-center items-center h-20">
              <div className="grid grid-cols-4 grid-rows-2 gap-0 scale-125">
                {gameState.nextPiece.shape.map((row, y) => row.map((val, x) => (
                  <div key={`next-${x}-${y}`} className="w-4 h-4">
                    {val !== 0 && <Block color={gameState.nextPiece.color} />}
                  </div>
                )))}
              </div>
            </div>
          </div>
          
          <div className="bg-[#c0c0c0] border-t-2 border-l-2 border-white border-r-2 border-b-2 border-black p-4 w-40 text-[10px] leading-tight text-black">
            <p className="font-bold underline mb-2 text-center">CONTROLS</p>
            <p>←/→: MOVE</p>
            <p>↑: ROTATE</p>
            <p>↓: SOFT DROP</p>
            <p>SPACE: HARD DROP</p>
            <p>P: PAUSE</p>
          </div>

          <button 
            onClick={() => window.location.reload()}
            className="mt-2 bg-red-600 border-t-4 border-l-4 border-red-400 border-r-4 border-b-4 border-red-900 p-2 font-bold text-white text-xs shadow-md"
          >
            QUIT GAME
          </button>
        </div>
      </div>

      <div className="mt-12 text-[10px] text-white/50 font-mono tracking-widest bg-black/20 px-4 py-1 rounded-full">
        (C) 1990 SUPER-TETRIS ENTERTAINMENT. NO API KEY REQUIRED.
      </div>
    </div>
  );
};

export default App;
