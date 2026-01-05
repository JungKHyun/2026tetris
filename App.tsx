
import { GoogleGenAI } from "@google/genai";
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  COLS, ROWS, createEmptyBoard, randomTetromino 
} from './constants';
import { GameState, Position, AiCommentary } from './types';
import { useInterval } from './hooks/useInterval';
import Block from './components/Block';
import { getAiFeedback } from './services/geminiService';

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

  const [aiLog, setAiLog] = useState<AiCommentary[]>([
    { message: "안녕! 내가 너의 끝내주는 코치야! 준비됐어?!", sentiment: "positive" }
  ]);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(true);
  const lastAiScoreRef = useRef(0);

  // Check for API Key on mount (only for the AI Coaching feature)
  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(selected);
      }
    };
    checkKey();
  }, []);

  const handleOpenKey = async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

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
        while (filteredBoard.length < ROWS) filteredBoard.unshift(Array(COLS).fill('empty'));

        const newScore = prev.score + (linesCleared === 4 ? 1000 : linesCleared * 100);
        return {
          ...prev,
          board: filteredBoard,
          activePiece: null,
          score: newScore,
          lines: prev.lines + linesCleared,
          level: Math.floor((prev.lines + linesCleared) / 10) + 1
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
      while (filteredBoard.length < ROWS) filteredBoard.unshift(Array(COLS).fill('empty'));
      return {
        ...prev,
        board: filteredBoard,
        activePiece: null,
        score: prev.score + (linesCleared === 4 ? 1500 : linesCleared * 150),
        lines: prev.lines + linesCleared,
        level: Math.floor((prev.lines + linesCleared) / 10) + 1
      };
    });
  }, [checkCollision]);

  useInterval(() => {
    if (!gameState.activePiece && !gameState.isGameOver && !gameState.isPaused) spawnPiece();
    else if (gameState.activePiece) moveActivePiece({ x: 0, y: 1 });
  }, gameState.isPaused || gameState.isGameOver ? null : Math.max(100, 1000 - (gameState.level - 1) * 100));

  useEffect(() => {
    const triggerAi = async () => {
      if (!hasApiKey || gameState.isGameOver || isAiThinking) return;
      if (gameState.score - lastAiScoreRef.current >= 500 || (gameState.score > 0 && lastAiScoreRef.current === 0)) {
        setIsAiThinking(true);
        const feedback = await getAiFeedback(gameState.board, gameState.score, gameState.nextPiece.name);
        setAiLog(prev => [feedback, ...prev].slice(0, 10));
        lastAiScoreRef.current = gameState.score;
        setIsAiThinking(false);
      }
    };
    const timer = setTimeout(triggerAi, 3000);
    return () => clearTimeout(timer);
  }, [gameState.score, gameState.board, gameState.isGameOver, hasApiKey, isAiThinking]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState.isGameOver) return;
      switch (e.key) {
        case 'ArrowLeft': moveActivePiece({ x: -1, y: 0 }); break;
        case 'ArrowRight': moveActivePiece({ x: 1, y: 0 }); break;
        case 'ArrowDown': moveActivePiece({ x: 0, y: 1 }); break;
        case 'ArrowUp': rotatePiece(); break;
        case ' ': hardDrop(); break;
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
        className="grid grid-cols-10 gap-0 p-1 bg-[#111] border-4 border-yellow-400 shadow-[0_0_20px_#ffff00]"
        style={{ width: `${COLS * 30 + 10}px`, height: `${ROWS * 30 + 10}px` }}
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
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-[#000080] text-white font-serif overflow-hidden select-none">
      
      {/* 촌스러운 타이틀 바 */}
      <div className="w-full max-w-4xl bg-gradient-to-r from-red-600 via-yellow-400 to-green-600 p-2 mb-6 border-4 border-white text-center shadow-[4px_4px_0px_#000]">
        <h1 className="text-4xl font-black italic tracking-tighter text-blue-900 drop-shadow-[2px_2px_0px_#fff]">
          SUPER AI RETRO TETRIS 2026
        </h1>
      </div>

      {!hasApiKey && (
        <div className="fixed top-2 right-2 z-50 animate-bounce">
          <button 
            onClick={handleOpenKey}
            className="bg-red-600 border-4 border-yellow-300 px-4 py-2 text-xs font-bold shadow-[4px_4px_0px_#000] hover:scale-110 transition-transform"
          >
            [AI 훈수 기능을 위해 API KEY를 설정하세요!]
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* 왼쪽: 정보창 */}
        <div className="flex flex-col gap-4 w-48">
          <div className="bg-black border-4 border-blue-400 p-4 text-center shadow-[4px_4px_0px_#000]">
            <p className="text-xs text-yellow-400 font-bold mb-1 underline">SCORE</p>
            <p className="text-2xl font-black text-white">{gameState.score}</p>
          </div>
          <div className="bg-black border-4 border-green-400 p-4 text-center shadow-[4px_4px_0px_#000]">
            <p className="text-xs text-yellow-400 font-bold mb-1 underline">LEVEL</p>
            <p className="text-2xl font-black text-white">{gameState.level}</p>
          </div>
          <div className="bg-black border-4 border-magenta-400 p-4 shadow-[4px_4px_0px_#000]">
            <p className="text-xs text-yellow-400 font-bold mb-2 text-center underline">NEXT</p>
            <div className="flex justify-center h-16 items-center">
              <div className="grid grid-cols-4 grid-rows-2 gap-1 scale-125">
                {gameState.nextPiece.shape.map((row, y) => row.map((val, x) => (
                  <div key={`next-${x}-${y}`} className="w-3 h-3">
                    {val !== 0 && <Block color={gameState.nextPiece.color} />}
                  </div>
                )))}
              </div>
            </div>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 bg-red-600 hover:bg-red-500 border-4 border-white p-3 font-black italic text-lg shadow-[4px_4px_0px_#000] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
          >
            RESET GAME
          </button>
        </div>

        {/* 가운데: 게임판 */}
        <div className="relative">
          {renderBoard()}
          {gameState.isGameOver && (
            <div className="absolute inset-0 bg-red-600/90 flex flex-col items-center justify-center border-8 border-yellow-400 p-10 animate-pulse">
              <h2 className="text-6xl font-black italic text-white mb-4 drop-shadow-xl">GAME OVER!</h2>
              <p className="text-2xl font-bold text-yellow-300 mb-8 underline">YOUR SCORE: {gameState.score}</p>
              <button onClick={() => window.location.reload()} className="bg-blue-600 text-white px-8 py-4 border-4 border-white text-xl font-bold hover:scale-110">REPLAY??</button>
            </div>
          )}
          {gameState.isPaused && !gameState.isGameOver && (
            <div className="absolute inset-0 bg-blue-900/60 flex items-center justify-center">
              <h2 className="text-5xl font-black text-yellow-400 animate-bounce shadow-black">PAUSE!!</h2>
            </div>
          )}
        </div>

        {/* 오른쪽: AI 훈수창 */}
        <div className="w-80 bg-black border-4 border-white p-4 flex flex-col h-[620px] shadow-[8px_8px_0px_#000]">
          <div className="bg-yellow-400 text-black p-1 text-center font-bold text-sm mb-4 border-2 border-black">
            AI COACH GENIE (v1.0)
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin">
            {aiLog.map((log, i) => (
              <div 
                key={i} 
                className={`p-3 border-2 text-sm font-bold shadow-[2px_2px_0px_#fff] ${
                  log.sentiment === 'positive' ? 'bg-green-700 border-green-300' :
                  log.sentiment === 'negative' ? 'bg-red-700 border-red-300' :
                  log.sentiment === 'advice' ? 'bg-blue-700 border-blue-300' : 'bg-gray-800 border-gray-400'
                }`}
              >
                <span className="text-yellow-300">▶</span> {log.message}
              </div>
            ))}
            {isAiThinking && <div className="text-center text-xs text-yellow-400 animate-pulse italic mt-2">... AI 분석중 ...</div>}
          </div>
          <div className="mt-4 p-2 bg-blue-900 border-2 border-blue-400 text-[10px] leading-tight font-mono">
            <p className="text-yellow-400 underline mb-1">USER MANUAL</p>
            <p>화살표: 움직이기 & 회전</p>
            <p>스페이스: 즉시 하강(깡드랍)</p>
            <p>P: 일시정지(커피타임)</p>
          </div>
        </div>
      </div>

      <div className="mt-8 text-xs text-gray-400 font-mono">
        (C) 1990 SUPER-AI GAMES INC. ALL RIGHTS RESERVED.
      </div>
    </div>
  );
};

export default App;
