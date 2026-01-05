
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
    { message: "안정적인 시작입니다. 지형을 평평하게 유지하세요.", sentiment: "neutral" }
  ]);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const lastAiScoreRef = useRef(0);

  // --- Game Logic Functions ---

  const checkCollision = useCallback((pos: Position, shape: number[][], board: string[][]) => {
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x] !== 0) {
          const newX = pos.x + x;
          const newY = pos.y + y;

          if (
            newX < 0 || 
            newX >= COLS || 
            newY >= ROWS || 
            (newY >= 0 && board[newY][newX] !== 'empty')
          ) {
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
      
      if (checkCollision(startPos, piece.shape, prev.board)) {
        return { ...prev, isGameOver: true };
      }

      return {
        ...prev,
        activePiece: {
          pos: startPos,
          tetromino: piece,
          collided: false
        },
        nextPiece: randomTetromino()
      };
    });
  }, [checkCollision]);

  const rotate = (shape: number[][]): number[][] => {
    const rotated = shape[0].map((_, index) => shape.map(col => col[index]).reverse());
    return rotated;
  };

  const clearLines = (board: string[][]) => {
    let linesCleared = 0;
    const newBoard = board.filter(row => {
      const isFull = row.every(cell => cell !== 'empty');
      if (isFull) linesCleared++;
      return !isFull;
    });

    while (newBoard.length < ROWS) {
      newBoard.unshift(Array(COLS).fill('empty'));
    }

    return { newBoard, linesCleared };
  };

  const moveActivePiece = useCallback((dir: { x: number, y: number }) => {
    setGameState(prev => {
      if (!prev.activePiece || prev.isPaused || prev.isGameOver) return prev;

      const newPos = {
        x: prev.activePiece.pos.x + dir.x,
        y: prev.activePiece.pos.y + dir.y
      };

      if (!checkCollision(newPos, prev.activePiece.tetromino.shape, prev.board)) {
        return {
          ...prev,
          activePiece: { ...prev.activePiece, pos: newPos }
        };
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

        const { newBoard: boardAfterClear, linesCleared } = clearLines(newBoard);
        const newScore = prev.score + (linesCleared === 4 ? 800 : linesCleared * 100);
        const newLines = prev.lines + linesCleared;
        const newLevel = Math.floor(newLines / 10) + 1;

        return {
          ...prev,
          board: boardAfterClear,
          activePiece: null,
          score: newScore,
          lines: newLines,
          level: newLevel
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
        return {
          ...prev,
          activePiece: {
            ...prev.activePiece,
            tetromino: { ...prev.activePiece.tetromino, shape: rotatedShape }
          }
        };
      }
      return prev;
    });
  }, [checkCollision]);

  const hardDrop = useCallback(() => {
    setGameState(prev => {
      if (!prev.activePiece || prev.isPaused || prev.isGameOver) return prev;
      let finalY = prev.activePiece.pos.y;
      while (!checkCollision({ x: prev.activePiece.pos.x, y: finalY + 1 }, prev.activePiece.tetromino.shape, prev.board)) {
        finalY++;
      }
      
      const newBoard = [...prev.board.map(row => [...row])];
      const { shape, color } = prev.activePiece.tetromino;
      const { x } = prev.activePiece.pos;

      shape.forEach((row, rowIdx) => {
        row.forEach((value, colIdx) => {
          if (value !== 0) {
            const boardY = finalY + rowIdx;
            const boardX = x + colIdx;
            if (boardY >= 0) newBoard[boardY][boardX] = color;
          }
        });
      });

      const { newBoard: boardAfterClear, linesCleared } = clearLines(newBoard);
      const newScore = prev.score + (linesCleared === 4 ? 1200 : linesCleared * 150) + (finalY - prev.activePiece.pos.y);
      const newLines = prev.lines + linesCleared;
      const newLevel = Math.floor(newLines / 10) + 1;

      return {
        ...prev,
        board: boardAfterClear,
        activePiece: null,
        score: newScore,
        lines: newLines,
        level: newLevel
      };
    });
  }, [checkCollision]);

  // --- Effects ---

  useInterval(() => {
    if (!gameState.activePiece && !gameState.isGameOver && !gameState.isPaused) {
      spawnPiece();
    } else if (gameState.activePiece) {
      moveActivePiece({ x: 0, y: 1 });
    }
  }, gameState.isPaused || gameState.isGameOver ? null : Math.max(80, 700 - (gameState.level - 1) * 60));

  useEffect(() => {
    const triggerAi = async () => {
      if (gameState.isGameOver || isAiThinking) return;
      if (gameState.score - lastAiScoreRef.current >= 400 || (gameState.score > 0 && lastAiScoreRef.current === 0)) {
        setIsAiThinking(true);
        const feedback = await getAiFeedback(gameState.board, gameState.score, gameState.nextPiece.name);
        setAiLog(prev => [feedback, ...prev].slice(0, 15));
        lastAiScoreRef.current = gameState.score;
        setIsAiThinking(false);
      }
    };

    const timer = setTimeout(triggerAi, 4000);
    return () => clearTimeout(timer);
  }, [gameState.score, gameState.board, gameState.isGameOver, gameState.nextPiece.name, isAiThinking]);

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

  const restartGame = () => {
    setGameState({
      board: createEmptyBoard(),
      activePiece: null,
      nextPiece: randomTetromino(),
      score: 0,
      level: 1,
      lines: 0,
      isGameOver: false,
      isPaused: false,
    });
    setAiLog([{ message: "새로운 게임을 시작합니다. 행운을 빕니다.", sentiment: "neutral" }]);
    lastAiScoreRef.current = 0;
  };

  const renderBoard = () => {
    const displayBoard = gameState.board.map(row => [...row]);
    
    if (gameState.activePiece && !gameState.isPaused) {
      const { pos, tetromino } = gameState.activePiece;
      let ghostY = pos.y;
      while (!checkCollision({ x: pos.x, y: ghostY + 1 }, tetromino.shape, gameState.board)) {
        ghostY++;
      }
      tetromino.shape.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value !== 0) {
            const boardY = ghostY + y;
            const boardX = pos.x + x;
            if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS && displayBoard[boardY][boardX] === 'empty') {
              displayBoard[boardY][boardX] = 'ghost';
            }
          }
        });
      });
      tetromino.shape.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value !== 0) {
            const boardY = pos.y + y;
            const boardX = pos.x + x;
            if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
              displayBoard[boardY][boardX] = tetromino.color;
            }
          }
        });
      });
    }

    return (
      <div 
        className="grid grid-cols-10 gap-[1px] p-2 bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10"
        style={{ width: `${COLS * 30 + 16}px`, height: `${ROWS * 30 + 16}px` }}
      >
        {displayBoard.map((row, y) => 
          row.map((cell, x) => (
            <div key={`${x}-${y}`} className="w-[30px] h-[30px]">
              <Block color={cell === 'ghost' ? gameState.activePiece?.tetromino.color || 'white' : cell} ghost={cell === 'ghost'} />
            </div>
          ))
        )}
      </div>
    );
  };

  const sentimentStyles: {[key: string]: string} = {
    positive: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.1)]",
    negative: "bg-rose-500/10 border-rose-500/30 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.1)]",
    advice: "bg-amber-500/10 border-amber-500/30 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.1)]",
    neutral: "bg-slate-500/10 border-white/10 text-slate-300"
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row items-center justify-center p-4 md:p-8 bg-[#020617] text-slate-200 font-sans selection:bg-indigo-500/30">
      
      {/* Background Orbs */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-900/20 blur-[120px] rounded-full -z-10" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-900/20 blur-[120px] rounded-full -z-10" />

      {/* --- Left: Info --- */}
      <div className="flex flex-col gap-5 order-2 md:order-1 mt-8 md:mt-0 md:mr-12 w-full max-w-[220px]">
        <div className="group p-5 bg-white/[0.03] hover:bg-white/[0.05] backdrop-blur-lg rounded-2xl border border-white/10 transition-all duration-300">
          <h2 className="text-[10px] uppercase tracking-[0.2em] text-indigo-400/80 mb-1 font-bold">Current Score</h2>
          <div className="text-3xl font-orbitron font-bold tracking-tighter text-white group-hover:text-indigo-300 transition-colors">
            {gameState.score.toLocaleString()}
          </div>
        </div>

        <div className="p-5 bg-white/[0.03] backdrop-blur-lg rounded-2xl border border-white/10">
          <h2 className="text-[10px] uppercase tracking-[0.2em] text-indigo-400/80 mb-1 font-bold">Level</h2>
          <div className="text-3xl font-orbitron font-bold text-white">{gameState.level}</div>
        </div>

        <div className="p-5 bg-white/[0.03] backdrop-blur-lg rounded-2xl border border-white/10">
          <h2 className="text-[10px] uppercase tracking-[0.2em] text-indigo-400/80 mb-3 font-bold">Next Piece</h2>
          <div className="flex justify-center h-16 items-center">
            <div className="grid grid-cols-4 grid-rows-2 gap-1 scale-110">
              {gameState.nextPiece.shape.map((row, y) => 
                row.map((val, x) => (
                  <div key={`next-${x}-${y}`} className="w-4 h-4">
                    {val !== 0 && <Block color={gameState.nextPiece.color} />}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <button 
          onClick={restartGame}
          className="group relative w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold transition-all border border-white/10 active:scale-95 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className="relative z-10 tracking-widest text-xs">REBOOT SYSTEM</span>
        </button>
      </div>

      {/* --- Center: Game Board --- */}
      <div className="relative order-1 md:order-2">
        {renderBoard()}
        
        {gameState.isGameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md rounded-xl z-10 p-10 text-center animate-in zoom-in duration-300">
            <h2 className="text-5xl font-orbitron font-bold text-rose-500 mb-2 tracking-tighter">TERMINATED</h2>
            <p className="text-slate-400 mb-8 text-sm">FINAL SCORE: <span className="text-white font-bold">{gameState.score}</span></p>
            <button 
              onClick={restartGame}
              className="px-10 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-full font-bold transition-all shadow-[0_0_20px_rgba(225,29,72,0.4)]"
            >
              INITIALIZE AGAIN
            </button>
          </div>
        )}

        {gameState.isPaused && !gameState.isGameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm rounded-xl z-10">
            <h2 className="text-3xl font-orbitron font-bold text-indigo-400 tracking-[0.5em] animate-pulse">SUSPENDED</h2>
          </div>
        )}
      </div>

      {/* --- Right: AI --- */}
      <div className="flex flex-col gap-4 order-3 md:ml-12 w-full max-w-[340px] h-[520px] mt-8 md:mt-0">
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${isAiThinking ? 'bg-indigo-400 animate-ping' : 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]'}`}></div>
            <h2 className="text-xs font-orbitron font-bold text-white tracking-[0.2em]">GEMINI ANALYTICS</h2>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">v3.1-PRO</span>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
          {aiLog.map((log, i) => (
            <div 
              key={i} 
              className={`p-4 rounded-xl border text-sm leading-relaxed transition-all duration-500 animate-in fade-in slide-in-from-bottom-2 ${sentimentStyles[log.sentiment] || sentimentStyles.neutral}`}
            >
              <div className="flex items-start gap-3">
                <span className="mt-1 text-xs opacity-50">#</span>
                <p>{log.message}</p>
              </div>
            </div>
          ))}
          {isAiThinking && (
            <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20 text-indigo-300/60 text-[11px] animate-pulse italic flex items-center gap-2">
              <div className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" />
              Gemini가 실시간 전략을 계산 중...
            </div>
          )}
        </div>

        <div className="p-5 bg-white/[0.02] rounded-2xl border border-white/[0.05] text-[10px] text-slate-500 font-mono">
          <div className="flex justify-between border-b border-white/[0.05] pb-2 mb-2">
            <span className="text-indigo-400/60 uppercase">Command Map</span>
            <span>OS 2.5.0</span>
          </div>
          <div className="grid grid-cols-2 gap-y-1">
            <span>ARROWS</span><span className="text-slate-400 text-right">NAVIGATE</span>
            <span>SPACE</span><span className="text-slate-400 text-right">FORCE DROP</span>
            <span>P KEY</span><span className="text-slate-400 text-right">PAUSE CMD</span>
          </div>
        </div>
      </div>

    </div>
  );
};

export default App;
