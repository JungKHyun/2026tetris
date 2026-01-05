
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  COLS, ROWS, createEmptyBoard, randomTetromino, TETROMINOS 
} from './constants';
import { GameState, ActivePiece, Position, Tetromino, AiCommentary } from './types';
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
    { message: "준비되셨나요? 게임을 시작해봅시다!", sentiment: "neutral" }
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

      // If moving down and hit something, lock the piece
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

  // Game tick
  useInterval(() => {
    if (!gameState.activePiece && !gameState.isGameOver && !gameState.isPaused) {
      spawnPiece();
    } else if (gameState.activePiece) {
      moveActivePiece({ x: 0, y: 1 });
    }
  }, gameState.isPaused || gameState.isGameOver ? null : Math.max(100, 800 - (gameState.level - 1) * 70));

  // AI Feedback
  useEffect(() => {
    const triggerAi = async () => {
      if (gameState.isGameOver || isAiThinking) return;
      
      // 스코어가 일정량 이상 오르거나, 줄이 지워졌을 때 AI 조언 요청
      if (gameState.score - lastAiScoreRef.current >= 300 || gameState.score === 0) {
        setIsAiThinking(true);
        const feedback = await getAiFeedback(gameState.board, gameState.score, gameState.nextPiece.name);
        setAiLog(prev => [feedback, ...prev].slice(0, 10));
        lastAiScoreRef.current = gameState.score;
        setIsAiThinking(false);
      }
    };

    const timer = setTimeout(triggerAi, 5000); // 5초 간격으로 체크
    return () => clearTimeout(timer);
  }, [gameState.score, gameState.board, gameState.isGameOver, gameState.nextPiece.name, isAiThinking]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState.isGameOver) return;

      switch (e.key) {
        case 'ArrowLeft':
          moveActivePiece({ x: -1, y: 0 });
          break;
        case 'ArrowRight':
          moveActivePiece({ x: 1, y: 0 });
          break;
        case 'ArrowDown':
          moveActivePiece({ x: 0, y: 1 });
          break;
        case 'ArrowUp':
          rotatePiece();
          break;
        case ' ':
          hardDrop();
          break;
        case 'p':
        case 'P':
          setGameState(prev => ({ ...prev, isPaused: !prev.isPaused }));
          break;
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
    setAiLog([{ message: "게임을 다시 시작합니다! 힘내세요.", sentiment: "neutral" }]);
    lastAiScoreRef.current = 0;
  };

  // --- Render Helpers ---

  const renderBoard = () => {
    const displayBoard = gameState.board.map(row => [...row]);
    
    // Render Ghost Piece
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
            if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
              // Only draw ghost if the cell is currently empty in the main display board
              if (displayBoard[boardY][boardX] === 'empty') {
                 displayBoard[boardY][boardX] = 'ghost';
              }
            }
          }
        });
      });
    }

    // Render Active Piece
    if (gameState.activePiece && !gameState.isPaused) {
      const { pos, tetromino } = gameState.activePiece;
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
        className="grid grid-cols-10 gap-0.5 p-1 bg-white/10 backdrop-blur-md rounded-lg shadow-2xl border border-white/20"
        style={{ width: `${COLS * 30 + 12}px`, height: `${ROWS * 30 + 12}px` }}
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
    positive: "bg-green-900/40 border-green-500/50 text-green-100",
    negative: "bg-red-900/40 border-red-500/50 text-red-100",
    advice: "bg-blue-900/40 border-blue-500/50 text-blue-100",
    neutral: "bg-gray-800/40 border-gray-500/50 text-gray-100"
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row items-center justify-center p-4 md:p-8 bg-gradient-to-br from-black via-gray-900 to-indigo-950 overflow-hidden">
      
      {/* --- Left Side: Game Controls & Info --- */}
      <div className="flex flex-col gap-6 order-2 md:order-1 mt-6 md:mt-0 md:mr-10 w-full max-w-[200px]">
        <div className="p-6 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl">
          <h2 className="text-xs uppercase tracking-widest text-indigo-400 mb-2 font-bold">Score</h2>
          <div className="text-3xl font-orbitron text-white">{gameState.score.toLocaleString()}</div>
        </div>

        <div className="p-6 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl">
          <h2 className="text-xs uppercase tracking-widest text-indigo-400 mb-2 font-bold">Level</h2>
          <div className="text-3xl font-orbitron text-white">{gameState.level}</div>
        </div>

        <div className="p-6 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl">
          <h2 className="text-xs uppercase tracking-widest text-indigo-400 mb-2 font-bold">Next</h2>
          <div className="flex justify-center mt-2 h-16 items-center">
            <div className="grid grid-cols-4 grid-rows-4 gap-0.5">
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
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
        >
          RESTART
        </button>
      </div>

      {/* --- Center: Game Board --- */}
      <div className="relative order-1 md:order-2">
        {renderBoard()}
        
        {/* Game Over Overlay */}
        {gameState.isGameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm rounded-lg z-10 p-6 text-center animate-in fade-in duration-500">
            <h2 className="text-4xl font-orbitron text-red-500 mb-4 tracking-tighter">GAME OVER</h2>
            <p className="text-gray-300 mb-6">최종 점수: {gameState.score}</p>
            <button 
              onClick={restartGame}
              className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white rounded-full font-bold transition-all"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* Pause Overlay */}
        {gameState.isPaused && !gameState.isGameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-lg z-10">
            <h2 className="text-4xl font-orbitron text-indigo-400 animate-pulse">PAUSED</h2>
          </div>
        )}
      </div>

      {/* --- Right Side: AI Assistant --- */}
      <div className="flex flex-col gap-4 order-3 md:ml-10 w-full max-w-[320px] h-[500px] mt-6 md:mt-0">
        <div className="flex items-center gap-3 mb-2 px-2">
          <div className={`w-3 h-3 rounded-full ${isAiThinking ? 'bg-indigo-400 animate-ping' : 'bg-indigo-600'}`}></div>
          <h2 className="text-lg font-orbitron text-white tracking-widest">GEMINI AI COACH</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto pr-2 space-y-4">
          {aiLog.map((log, i) => (
            <div 
              key={i} 
              className={`p-4 rounded-xl border text-sm leading-relaxed transition-all animate-in slide-in-from-right duration-500 ${sentimentStyles[log.sentiment] || sentimentStyles.neutral}`}
            >
              {log.message}
            </div>
          ))}
          {isAiThinking && (
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-sm animate-pulse italic">
              Gemini가 보드를 분석 중입니다...
            </div>
          )}
        </div>

        <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-[10px] text-gray-500 leading-tight">
          <p className="font-bold mb-1 uppercase text-indigo-400">Controls</p>
          <p>← → : 이동 | ↑ : 회전 | ↓ : 소프트 드랍</p>
          <p>Space : 하드 드랍 | P : 일시정지</p>
        </div>
      </div>

    </div>
  );
};

export default App;
