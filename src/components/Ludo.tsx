import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Room } from '../store/useMultiplayer';
import { Dices, Star } from 'lucide-react';

interface Props {
  room: Room;
  playerId: string;
  updateGameState: (state: any) => void;
}

const GLOBAL_PATH = [
  {r: 6, c: 1}, {r: 6, c: 2}, {r: 6, c: 3}, {r: 6, c: 4}, {r: 6, c: 5},
  {r: 5, c: 6}, {r: 4, c: 6}, {r: 3, c: 6}, {r: 2, c: 6}, {r: 1, c: 6}, {r: 0, c: 6},
  {r: 0, c: 7},
  {r: 0, c: 8}, {r: 1, c: 8}, {r: 2, c: 8}, {r: 3, c: 8}, {r: 4, c: 8}, {r: 5, c: 8},
  {r: 6, c: 9}, {r: 6, c: 10}, {r: 6, c: 11}, {r: 6, c: 12}, {r: 6, c: 13}, {r: 6, c: 14},
  {r: 7, c: 14},
  {r: 8, c: 14}, {r: 8, c: 13}, {r: 8, c: 12}, {r: 8, c: 11}, {r: 8, c: 10}, {r: 8, c: 9},
  {r: 9, c: 8}, {r: 10, c: 8}, {r: 11, c: 8}, {r: 12, c: 8}, {r: 13, c: 8}, {r: 14, c: 8},
  {r: 14, c: 7},
  {r: 14, c: 6}, {r: 13, c: 6}, {r: 12, c: 6}, {r: 11, c: 6}, {r: 10, c: 6}, {r: 9, c: 6},
  {r: 8, c: 5}, {r: 8, c: 4}, {r: 8, c: 3}, {r: 8, c: 2}, {r: 8, c: 1}, {r: 8, c: 0},
  {r: 7, c: 0}
];

const HOME_PATHS = {
  0: [{r: 7, c: 1}, {r: 7, c: 2}, {r: 7, c: 3}, {r: 7, c: 4}, {r: 7, c: 5}], // Red
  1: [{r: 7, c: 13}, {r: 7, c: 12}, {r: 7, c: 11}, {r: 7, c: 10}, {r: 7, c: 9}] // Yellow
};

const BASE_POSITIONS = {
  0: [{r: 2, c: 2}, {r: 2, c: 3}, {r: 3, c: 2}, {r: 3, c: 3}], // Red Base
  1: [{r: 11, c: 11}, {r: 11, c: 12}, {r: 12, c: 11}, {r: 12, c: 12}] // Yellow Base
};

const SAFE_SPOTS = [0, 8, 13, 21, 26, 34, 39, 47];
const SAFE_SPOTS_COORDS = [
  {r: 6, c: 1}, {r: 2, c: 6}, {r: 1, c: 8}, {r: 6, c: 12},
  {r: 8, c: 13}, {r: 12, c: 8}, {r: 13, c: 6}, {r: 8, c: 2}
];

export function Ludo({ room, playerId, updateGameState }: Props) {
  const { gameState, players } = room;
  const playerIds = Object.keys(players);
  const playerIndex = playerIds.indexOf(playerId);
  const isMyTurn = gameState.turn === playerIndex;

  const tokens = gameState.tokens || { 0: [-1, -1, -1, -1], 1: [-1, -1, -1, -1] };
  const diceValue = gameState.diceValue || 1;
  const diceRolled = gameState.diceRolled || false;
  const consecutiveSixes = gameState.consecutiveSixes || 0;
  const status = gameState.status || 'playing';
  const winner = gameState.winner;

  const p1 = players[playerIds[0]];
  const p2 = players[playerIds[1]];
  const isFlipped = playerIndex === 1;

  const [isRolling, setIsRolling] = useState(false);

  const canMoveToken = (player: number, tokenIndex: number, dice: number) => {
    const pos = tokens[player][tokenIndex];
    if (pos === 56) return false; // In goal
    if (pos === -1) return dice === 6; // Need 6 to exit
    if (pos + dice > 56) return false; // Bounce not implemented, just require exact
    return true;
  };

  useEffect(() => {
    if (isMyTurn && diceRolled && status === 'playing') {
      const canMoveAny = tokens[playerIndex].some((_, i) => canMoveToken(playerIndex, i, diceValue));
      if (!canMoveAny) {
        const timer = setTimeout(() => {
          updateGameState({
            ...gameState,
            diceRolled: false,
            consecutiveSixes: 0,
            turn: playerIndex === 0 ? 1 : 0
          });
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [diceRolled, isMyTurn, diceValue, tokens, playerIndex, status]);

  const handleRollDice = () => {
    if (diceRolled || !isMyTurn || status !== 'playing' || isRolling) return;
    
    setIsRolling(true);
    
    // Animate dice roll quickly
    let rolls = 0;
    const interval = setInterval(() => {
      rolls++;
      if (rolls > 10) {
        clearInterval(interval);
        setIsRolling(false);
        
        const val = Math.floor(Math.random() * 6) + 1;
        const nextConsecutive = val === 6 ? consecutiveSixes + 1 : 0;
        
        if (nextConsecutive === 3) {
          // Lose turn on 3rd six
          updateGameState({
            ...gameState,
            diceValue: val,
            diceRolled: false,
            consecutiveSixes: 0,
            turn: gameState.turn === 0 ? 1 : 0
          });
        } else {
          updateGameState({
            ...gameState,
            diceValue: val,
            diceRolled: true,
            consecutiveSixes: nextConsecutive
          });
        }
      }
    }, 50);
  };

  const handleTokenClick = (player: number, tokenIndex: number) => {
    if (!isMyTurn || !diceRolled || player !== playerIndex || status !== 'playing') return;
    if (!canMoveToken(player, tokenIndex, diceValue)) return;

    const currentPos = tokens[player][tokenIndex];
    let newPos = currentPos;
    
    if (currentPos === -1 && diceValue === 6) {
      newPos = 0;
    } else {
      newPos += diceValue;
    }

    let capture = false;
    let newTokens = {
      0: [...tokens[0]],
      1: [...tokens[1]]
    };
    newTokens[player][tokenIndex] = newPos;

    // Check capture
    if (newPos >= 0 && newPos <= 50) {
      const globalPos = player === 0 ? newPos : (newPos + 26) % 52;
      const isSafe = SAFE_SPOTS.includes(globalPos);
      const opponent = player === 0 ? 1 : 0;

      if (!isSafe) {
        newTokens[opponent].forEach((oppPos, oppIdx) => {
          if (oppPos >= 0 && oppPos <= 50) {
            const oppGlobalPos = opponent === 0 ? oppPos : (oppPos + 26) % 52;
            if (oppGlobalPos === globalPos) {
              newTokens[opponent][oppIdx] = -1; // Send to base
              capture = true;
              if (navigator.vibrate) navigator.vibrate(200); // Juice!
            }
          }
        });
      }
    }

    const reachedGoal = newPos === 56;
    let nextTurn = gameState.turn;
    let nextConsecutive = consecutiveSixes;

    if (diceValue === 6 || capture || reachedGoal) {
      // Extra turn
    } else {
      nextTurn = gameState.turn === 0 ? 1 : 0;
      nextConsecutive = 0;
    }

    const hasWon = newTokens[player].every(p => p === 56);

    updateGameState({
      ...gameState,
      tokens: newTokens,
      turn: nextTurn,
      diceRolled: false,
      consecutiveSixes: nextConsecutive,
      status: hasWon ? 'finished' : 'playing',
      winner: hasWon ? player : null
    });
  };

  const getTokenCell = (player: number, tokenIndex: number, pos: number) => {
    if (pos === -1) return BASE_POSITIONS[player as 0|1][tokenIndex];
    if (pos === 56) return { r: 7, c: 7 };
    if (pos >= 51 && pos <= 55) return HOME_PATHS[player as 0|1][pos - 51];
    const globalPos = player === 0 ? pos : (pos + 26) % 52;
    return GLOBAL_PATH[globalPos];
  };

  // Render helpers
  const tokenPlacements: any[] = [];
  const cellCounts: Record<string, number> = {};
  
  [0, 1].forEach(p => {
    tokens[p as 0|1].forEach((pos, idx) => {
      const {r, c} = getTokenCell(p, idx, pos);
      const key = `${r}-${c}`;
      cellCounts[key] = (cellCounts[key] || 0) + 1;
      tokenPlacements.push({ p, idx, r, c, pos, key });
    });
  });

  const currentCellCounts: Record<string, number> = {};
  tokenPlacements.forEach(t => {
    const count = currentCellCounts[t.key] || 0;
    t.offsetIdx = count;
    currentCellCounts[t.key] = count + 1;
    t.totalInCell = cellCounts[t.key];
  });

  return (
    <div className="flex flex-col lg:flex-row items-center justify-center gap-6 sm:gap-12 w-full max-w-6xl p-4 sm:p-8">
      {/* Top Player (Opponent) */}
      <div className={cn(
        "flex lg:flex-col items-center gap-4 p-4 sm:p-6 rounded-3xl glass-panel w-full lg:w-64 transition-all duration-300",
        gameState.turn === (isFlipped ? 0 : 1) ? "scale-105 shadow-[0_0_30px_rgba(255,255,255,0.2)]" : "opacity-60 scale-95"
      )}>
        <div className={cn(
          "w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center font-bold text-xl sm:text-2xl border-4",
          isFlipped ? "bg-red-500 text-white border-red-300" : "bg-yellow-400 text-yellow-900 border-yellow-200"
        )}>
          {(isFlipped ? p1 : p2)?.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 lg:text-center">
          <h3 className="font-bold text-lg sm:text-xl truncate">{(isFlipped ? p1 : p2)?.name}</h3>
          <p className="text-sm opacity-70">Color {isFlipped ? 'Rojo' : 'Amarillo'}</p>
        </div>
      </div>

      {/* Board */}
      <div className="glass-panel p-2 sm:p-4 rounded-xl shadow-2xl flex-shrink-0 touch-none">
        <div 
          className={cn(
            "relative bg-gray-100 rounded-lg overflow-hidden border-4 border-gray-300 shadow-inner",
            isFlipped && "rotate-180" // Rotate the board for Player 2 so their base is at the bottom!
          )}
          style={{ width: 'min(90vw, 450px)', height: 'min(90vw, 450px)' }}
        >
          {/* Grid Background */}
          <div className="absolute inset-0 grid grid-cols-15 grid-rows-15">
            {Array.from({ length: 225 }).map((_, i) => {
              const r = Math.floor(i / 15);
              const c = i % 15;
              
              const isRedBase = r < 6 && c < 6;
              const isGreenBase = r < 6 && c > 8;
              const isBlueBase = r > 8 && c < 6;
              const isYellowBase = r > 8 && c > 8;

              const isRedHome = r === 7 && c >= 1 && c <= 5;
              const isYellowHome = r === 7 && c >= 9 && c <= 13;
              const isGreenHome = c === 7 && r >= 1 && r <= 5;
              const isBlueHome = c === 7 && r >= 9 && r <= 13;

              const isCenter = r >= 6 && r <= 8 && c >= 6 && c <= 8;
              const isPath = GLOBAL_PATH.some(p => p.r === r && p.c === c);
              const isSafe = SAFE_SPOTS_COORDS.some(s => s.r === r && s.c === c);

              let bgClass = "bg-white border-[0.5px] border-gray-300/50";
              if (isRedBase) bgClass = "bg-red-500";
              else if (isYellowBase) bgClass = "bg-yellow-400";
              else if (isGreenBase) bgClass = "bg-green-600/30 grayscale";
              else if (isBlueBase) bgClass = "bg-blue-500/30 grayscale";
              else if (isRedHome) bgClass = "bg-red-400 border-red-500";
              else if (isYellowHome) bgClass = "bg-yellow-300 border-yellow-400";
              else if (isGreenHome) bgClass = "bg-green-500/30 grayscale";
              else if (isBlueHome) bgClass = "bg-blue-400/30 grayscale";
              else if (isCenter) bgClass = "bg-gradient-to-br from-red-400 via-gray-300 to-yellow-400";
              else if (isPath && isSafe) {
                if (r===6 && c===1) bgClass = "bg-red-200 border-gray-300";
                else if (r===8 && c===13) bgClass = "bg-yellow-200 border-gray-300";
                else bgClass = "bg-gray-200 border-gray-300";
              }

              return (
                <div key={i} className={cn("relative flex items-center justify-center", bgClass)}>
                  {isRedBase && (r===1 || r===4) && (c===1 || c===4) && <div className="absolute inset-2 bg-white rounded-md opacity-20" />}
                  {isSafe && <Star className="w-1/2 h-1/2 text-gray-400 opacity-50" />}
                </div>
              );
            })}
          </div>

          {/* Tokens */}
          {tokenPlacements.map(t => {
            let dx = 0;
            let dy = 0;
            if (t.pos !== -1 && t.pos !== 56 && t.totalInCell > 1) {
              const offset = 25;
              if (t.offsetIdx === 0) { dx = -offset; dy = -offset; }
              else if (t.offsetIdx === 1) { dx = offset; dy = offset; }
              else if (t.offsetIdx === 2) { dx = -offset; dy = offset; }
              else { dx = offset; dy = -offset; }
            }

            const canMove = isMyTurn && diceRolled && t.p === playerIndex && status === 'playing' && canMoveToken(t.p, t.idx, diceValue);

            return (
              <motion.div
                key={`token-${t.p}-${t.idx}`}
                layout
                initial={false}
                animate={{
                  top: `${(t.r / 15) * 100}%`,
                  left: `${(t.c / 15) * 100}%`,
                  x: `${dx}%`,
                  y: `${dy}%`,
                  scale: canMove ? 1.15 : 1
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                onClick={() => handleTokenClick(t.p, t.idx)}
                className={cn(
                  "absolute flex items-center justify-center drop-shadow-md z-10",
                  canMove && "cursor-pointer z-20"
                )}
                style={{ width: `${100/15}%`, height: `${100/15}%` }}
              >
                <div className={cn(
                  "w-[75%] h-[75%] rounded-full border-2 sm:border-[3px] shadow-sm flex items-center justify-center",
                  t.p === 0 ? "bg-red-500 border-white text-white" : "bg-yellow-400 border-white text-yellow-900",
                  canMove && "ring-4 ring-white/50 animate-pulse",
                  isFlipped && "rotate-180" // Keep numbers upright
                )}>
                  {t.pos === 56 ? <Star className="w-1/2 h-1/2" /> : <div className="w-2 h-2 rounded-full bg-white/30" />}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Bottom Player (You) & Dice */}
      <div className={cn(
        "flex flex-col items-center gap-4 p-4 sm:p-6 rounded-3xl glass-panel w-full lg:w-64 transition-all duration-300",
        gameState.turn === (isFlipped ? 1 : 0) ? "scale-105 shadow-[0_0_30px_rgba(255,255,255,0.2)]" : "opacity-60 scale-95"
      )}>
        <div className="flex items-center gap-4 w-full">
          <div className="flex-1 lg:text-center text-right">
            <h3 className="font-bold text-lg sm:text-xl truncate">{(isFlipped ? p2 : p1)?.name} (Tú)</h3>
            <p className="text-sm opacity-70">Color {isFlipped ? 'Amarillo' : 'Rojo'}</p>
          </div>
          <div className={cn(
            "w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center font-bold text-xl sm:text-2xl border-4",
            isFlipped ? "bg-yellow-400 text-yellow-900 border-yellow-200" : "bg-red-500 text-white border-red-300"
          )}>
            {(isFlipped ? p2 : p1)?.name.charAt(0).toUpperCase()}
          </div>
        </div>

        {/* Dice Area */}
        <div className="w-full mt-4 flex flex-col items-center gap-3">
          <button
            onClick={handleRollDice}
            disabled={!isMyTurn || diceRolled || status !== 'playing' || isRolling}
            className={cn(
              "w-24 h-24 sm:w-32 sm:h-32 rounded-3xl flex items-center justify-center text-4xl sm:text-5xl font-black shadow-xl transition-all",
              !isMyTurn || diceRolled || status !== 'playing' 
                ? "bg-gray-800 text-gray-500 cursor-not-allowed opacity-50"
                : "bg-white text-gray-900 hover:scale-105 active:scale-95 cursor-pointer",
              isRolling && "animate-spin"
            )}
          >
            {isRolling ? <Dices className="w-12 h-12 opacity-50" /> : diceValue}
          </button>
          
          <div className="h-6 text-sm font-medium text-center opacity-90">
            {isMyTurn && !diceRolled && "¡Tu turno de tirar!"}
            {isMyTurn && diceRolled && "Mueve una ficha"}
            {!isMyTurn && "Esperando al rival..."}
            {consecutiveSixes > 0 && <div className="text-yellow-400">¡Llevas {consecutiveSixes} seis!</div>}
          </div>
        </div>
      </div>
      
      {/* Win Overlay */}
      {status === 'finished' && (
        <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50 backdrop-blur-sm animate-in fade-in">
          <h2 className="text-5xl sm:text-7xl font-black mb-4 drop-shadow-lg text-white">
            {winner === 0 ? `¡Gana ${p1?.name}!` : `¡Gana ${p2?.name}!`}
          </h2>
          <button onClick={() => updateGameState({
            tokens: { 0: [-1, -1, -1, -1], 1: [-1, -1, -1, -1] },
            turn: 0, diceValue: 1, diceRolled: false, consecutiveSixes: 0,
            status: 'playing', winner: null
          })} className="px-8 py-4 rounded-2xl glass-button font-bold text-xl mt-8">
            Volver a jugar
          </button>
        </div>
      )}
    </div>
  );
}
