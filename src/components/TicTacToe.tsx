import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { GameType } from '../store/useMultiplayer';

interface Props {
  room: any;
  playerId: string;
  updateGameState: (state: any) => void;
}

export function TicTacToe({ room, playerId, updateGameState }: Props) {
  const { gameState, players } = room;
  const playerIds = Object.keys(players);
  const board = gameState.board || Array(9).fill(null);
  
  // Player 0 is X, Player 1 is O
  const playerIndex = playerIds.indexOf(playerId);
  const mySymbol = playerIndex === 0 ? 'X' : 'O';
  const opponentSymbol = playerIndex === 0 ? 'O' : 'X';
  const isMyTurn = gameState.turn === playerIndex;

  const handleCellClick = (index: number) => {
    if (!isMyTurn || board[index] !== null || gameState.winner) return;

    const newBoard = [...board];
    newBoard[index] = mySymbol;

    const result = checkWinner(newBoard);
    
    updateGameState({
      ...gameState,
      board: newBoard,
      turn: (gameState.turn + 1) % 2,
      winner: result ? result.winner : null,
      winningLine: result ? result.line : null
    });
  };

  const checkWinner = (board: string[]) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
      [0, 4, 8], [2, 4, 6]             // diagonals
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return { winner: board[a], line: [a, b, c] };
      }
    }
    if (board.every(cell => cell !== null)) return { winner: 'draw', line: null };
    return null;
  };

  const resetGame = () => {
    updateGameState({
      phase: 'rps',
      rpsChoices: {},
      rpsWinner: null,
      board: Array(9).fill(null),
      turn: 0,
      winner: null,
      winningLine: null
    });
  };

  const { phase = 'playing', rpsChoices = {}, rpsWinner = null } = gameState;
  const opponentId = playerIds.find(id => id !== playerId) || '';

  const handleRpsChoice = (choice: string) => {
    if (rpsChoices[playerId]) return;
    
    const newChoices = { ...rpsChoices, [playerId]: choice };
    const update: any = { ...gameState, rpsChoices: newChoices };
    
    const chosenIds = Object.keys(newChoices);
    if (chosenIds.length === 2 && playerIds.length === 2) {
      update.phase = 'rps-result';
      const p1Choice = newChoices[playerIds[0]];
      const p2Choice = newChoices[playerIds[1]];
      
      let winnerIdx: number | 'draw' = 'draw';
      if (p1Choice === p2Choice) {
        winnerIdx = 'draw';
      } else if (
        (p1Choice === 'rock' && p2Choice === 'scissors') ||
        (p1Choice === 'paper' && p2Choice === 'rock') ||
        (p1Choice === 'scissors' && p2Choice === 'paper')
      ) {
        winnerIdx = 0;
      } else {
        winnerIdx = 1;
      }
      
      update.rpsWinner = winnerIdx;
    }
    updateGameState(update);
  };

  if (phase === 'rps') {
    const myChoice = rpsChoices[playerId];
    const oppChoice = rpsChoices[opponentId];
    
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] w-full text-center max-w-lg mx-auto px-4">
        <h2 className="text-3xl font-black tracking-tight mb-2">Piedra, Papel o Tijera</h2>
        <p className="text-white/70 mb-10 text-lg">El ganador empieza la partida</p>
        
        {!myChoice ? (
          <div className="flex flex-col gap-6 w-full">
             <div className="flex justify-center gap-4 sm:gap-8">
               <button onClick={() => handleRpsChoice('rock')} className="text-5xl sm:text-6xl p-6 sm:p-8 glass-button rounded-3xl hover:bg-white/20 transition-all hover:scale-110 shadow-lg">🪨</button>
               <button onClick={() => handleRpsChoice('paper')} className="text-5xl sm:text-6xl p-6 sm:p-8 glass-button rounded-3xl hover:bg-white/20 transition-all hover:scale-110 shadow-lg">📄</button>
               <button onClick={() => handleRpsChoice('scissors')} className="text-5xl sm:text-6xl p-6 sm:p-8 glass-button rounded-3xl hover:bg-white/20 transition-all hover:scale-110 shadow-lg">✂️</button>
             </div>
             {oppChoice && <p className="text-blue-300 font-medium animate-pulse mt-4">Tu compañero ya eligió, ¡te toca!</p>}
          </div>
        ) : !oppChoice ? (
          <div className="glass-panel p-10 rounded-3xl w-full flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-white/20 border-t-white/80 rounded-full animate-spin"></div>
            <p className="text-xl font-bold">Esperando respuesta de tu compañero...</p>
          </div>
        ) : null}
      </div>
    );
  }

  if (phase === 'rps-result') {
    const myChoice = rpsChoices[playerId];
    const oppChoice = rpsChoices[opponentId];
    const isDraw = rpsWinner === 'draw';
    const iWon = rpsWinner === playerIndex;
    
    return (
      <div className="flex flex-col items-center justify-center w-full max-w-xl mx-auto text-center gap-8 px-4">
        <h2 className="text-3xl sm:text-4xl font-black">Resultado</h2>
        
        <div className="flex flex-row items-center justify-around glass-panel p-6 sm:p-10 rounded-3xl w-full gap-4">
          <div className="flex flex-col items-center gap-3">
            <span className="text-sm font-bold text-white/50 tracking-wider">TÚ</span>
            <span className="text-6xl sm:text-7xl drop-shadow-xl">{myChoice === 'rock' ? '🪨' : myChoice === 'paper' ? '📄' : '✂️'}</span>
          </div>
          <span className="text-2xl sm:text-3xl font-black text-white/30 italic">VS</span>
          <div className="flex flex-col items-center gap-3">
            <span className="text-sm font-bold text-white/50 tracking-wider">RIVAL</span>
            <span className="text-6xl sm:text-7xl drop-shadow-xl">{oppChoice === 'rock' ? '🪨' : oppChoice === 'paper' ? '📄' : '✂️'}</span>
          </div>
        </div>
        
        <div className="text-2xl sm:text-3xl font-black h-12 flex items-center justify-center w-full">
          {isDraw ? <span className="text-yellow-400 drop-shadow-md">¡Empate! 🤝</span> : 
           iWon ? <span className="text-green-400 drop-shadow-md">¡Ganas tú! Empiezas la partida.</span> :
           <span className="text-rose-400 drop-shadow-md">Gana el rival. Empieza él.</span>}
        </div>
        
        <button 
          onClick={() => {
            if (isDraw) {
               updateGameState({ ...gameState, phase: 'rps', rpsChoices: {}, rpsWinner: null });
            } else {
               // Assign X to the winner (or just let them go first)
               // The rules for mySymbol are tied to playerIndex.
               // So if rpsWinner is 1, player 1 (O) will start first. That's fine.
               updateGameState({ ...gameState, phase: 'playing', turn: rpsWinner });
            }
          }}
          className="mt-4 glass-button px-8 sm:px-12 py-4 sm:py-5 rounded-2xl font-bold text-xl sm:text-2xl hover:scale-105 transition-all shadow-xl bg-white/10"
        >
          {isDraw ? 'Volver a jugar piedra, papel o tijera' : 'Empezar Tres en Raya'}
        </button>
      </div>
    );
  }

  const getLineCoords = (line: number[] | null) => {
    if (!line) return null;
    const start = line[0];
    const end = line[2];
    
    const startX = (start % 3) * 33.33 + 16.66;
    const startY = Math.floor(start / 3) * 33.33 + 16.66;
    
    const endX = (end % 3) * 33.33 + 16.66;
    const endY = Math.floor(end / 3) * 33.33 + 16.66;
    
    return { x1: `${startX}%`, y1: `${startY}%`, x2: `${endX}%`, y2: `${endY}%` };
  };

  const lineCoords = getLineCoords(gameState.winningLine);

  return (
    <div className="flex flex-col items-center gap-6 sm:gap-10 w-full max-w-4xl mx-auto px-2">
      {/* Players Header */}
      <div className="flex flex-row items-center justify-between w-full max-w-md gap-4">
        {playerIds.map((id, index) => {
          const isPlayerTurn = gameState.turn === index;
          const symbol = index === 0 ? 'X' : 'O';
          const symbolColor = symbol === 'X' ? 'text-blue-400' : 'text-rose-400';
          const isMe = id === playerId;
          
          return (
            <div 
              key={id}
              className={cn(
                "flex-1 flex flex-col items-center p-3 sm:p-4 rounded-2xl glass-panel relative transition-all duration-300",
                isPlayerTurn && !gameState.winner ? "ring-2 ring-white/50 scale-105 shadow-[0_0_20px_rgba(255,255,255,0.2)]" : "opacity-70 scale-95"
              )}
            >
              {isPlayerTurn && !gameState.winner && (
                <motion.div 
                  layoutId="turn-indicator"
                  className="absolute -inset-0.5 bg-gradient-to-r from-blue-400/30 to-purple-400/30 rounded-[18px] blur-sm -z-10"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
              <span className={cn("text-3xl sm:text-5xl font-black drop-shadow-lg", symbolColor)}>
                {symbol}
              </span>
              <span className="text-sm sm:text-base font-bold mt-2 truncate w-full text-center">
                {players[id].name} {isMe && "(Tú)"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Game Status */}
      <div className="text-xl sm:text-2xl font-bold h-8 text-center w-full">
        <AnimatePresence mode="wait">
          {gameState.winner ? (
            <motion.div
              key="winner"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl sm:text-3xl"
            >
              {gameState.winner === 'draw' ? (
                <span className="text-yellow-300 drop-shadow-md">¡Es un empate! 🤝</span>
              ) : (
                <span className="text-green-300 drop-shadow-[0_0_15px_rgba(74,222,128,0.5)]">
                  ¡{gameState.winner === mySymbol ? 'Has ganado' : 'Has perdido'}!
                </span>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="turn"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {isMyTurn ? (
                <span className="text-blue-300 drop-shadow-md">Es tu turno</span>
              ) : (
                <span className="text-white/60">Turno del rival...</span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Board */}
      <div className="relative p-2 sm:p-4 glass-panel rounded-3xl sm:rounded-[2rem] w-full max-w-[min(90vw,450px)] aspect-square shadow-2xl">
        <div className="grid grid-cols-3 gap-2 sm:gap-4 w-full h-full relative z-10">
          {board.map((cell: string, idx: number) => {
            const isWinningCell = gameState.winningLine?.includes(idx);
            
            return (
              <button
                key={idx}
                onClick={() => handleCellClick(idx)}
                disabled={cell !== null || !isMyTurn || !!gameState.winner}
                className={cn(
                  "w-full h-full rounded-2xl sm:rounded-3xl flex items-center justify-center transition-all",
                  cell === null && isMyTurn && !gameState.winner 
                    ? "hover:bg-white/10 cursor-pointer glass-button hover:scale-[1.03] hover:shadow-lg" 
                    : "bg-black/20",
                  !isMyTurn && cell === null && !gameState.winner && "cursor-default opacity-50",
                  gameState.winner && !isWinningCell && cell !== null && "opacity-40 grayscale"
                )}
              >
                <AnimatePresence>
                  {cell && (
                    <motion.span
                      initial={{ scale: 0, rotate: cell === 'X' ? -45 : 45, opacity: 0 }}
                      animate={{ scale: 1, rotate: 0, opacity: 1 }}
                      transition={{ type: "spring", bounce: 0.6, duration: 0.6 }}
                      className={cn(
                        "text-5xl sm:text-7xl md:text-8xl font-black",
                        cell === 'X' ? 'text-blue-400 drop-shadow-[0_0_20px_rgba(96,165,250,0.6)]' : 'text-rose-400 drop-shadow-[0_0_20px_rgba(251,113,133,0.6)]',
                        isWinningCell && "scale-110 drop-shadow-[0_0_30px_rgba(255,255,255,0.8)] z-20"
                      )}
                    >
                      {cell}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            );
          })}
        </div>

        {/* Winning Line SVG Overlay */}
        {lineCoords && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-30 drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] p-2 sm:p-4">
            <motion.line
              x1={lineCoords.x1}
              y1={lineCoords.y1}
              x2={lineCoords.x2}
              y2={lineCoords.y2}
              stroke="white"
              strokeWidth="12"
              strokeLinecap="round"
              className="sm:stroke-[16px]"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </svg>
        )}
      </div>

      {/* Reset Button */}
      <AnimatePresence>
        {gameState.winner && (
          <motion.button 
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={resetGame} 
            className="mt-2 sm:mt-6 px-10 py-4 sm:py-5 rounded-2xl glass-button font-bold text-xl sm:text-2xl hover:scale-105 transition-transform shadow-xl bg-white/10 border-white/20 hover:bg-white/20"
          >
            Jugar de nuevo
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

