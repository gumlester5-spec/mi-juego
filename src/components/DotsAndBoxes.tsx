import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Room } from '../store/useMultiplayer';

interface Props {
  room: Room;
  playerId: string;
  updateGameState: (state: any) => void;
}

const ROWS = 4;
const COLS = 4;

export function DotsAndBoxes({ room, playerId, updateGameState }: Props) {
  const { gameState, players } = room;
  const playerIds = Object.keys(players);
  const playerIndex = playerIds.indexOf(playerId);
  const isMyTurn = gameState.turn === playerIndex;
  
  const horizontalLines = gameState.horizontalLines || {};
  const verticalLines = gameState.verticalLines || {};
  const boxes = gameState.boxes || {};
  const scores = gameState.scores || { 0: 0, 1: 0 };
  
  const p1 = players[playerIds[0]];
  const p2 = players[playerIds[1]];

  const handleLineClick = (type: 'horizontal' | 'vertical', r: number, c: number) => {
    if (!isMyTurn || gameState.status === 'finished') return;
    
    const key = `${r}-${c}`;
    if (type === 'horizontal' && horizontalLines[key] !== undefined) return;
    if (type === 'vertical' && verticalLines[key] !== undefined) return;

    let newH = { ...horizontalLines };
    let newV = { ...verticalLines };

    if (type === 'horizontal') {
      newH[key] = playerIndex;
    } else {
      newV[key] = playerIndex;
    }

    // Check for completed boxes
    let newBoxes = { ...boxes };
    let boxesCompleted = 0;

    for (let br = 0; br < ROWS; br++) {
      for (let bc = 0; bc < COLS; bc++) {
        const boxKey = `${br}-${bc}`;
        if (newBoxes[boxKey] === undefined) {
          const top = newH[`${br}-${bc}`] !== undefined;
          const bottom = newH[`${br + 1}-${bc}`] !== undefined;
          const left = newV[`${br}-${bc}`] !== undefined;
          const right = newV[`${br}-${bc + 1}`] !== undefined;
          
          if (top && bottom && left && right) {
            newBoxes[boxKey] = playerIndex;
            boxesCompleted++;
          }
        }
      }
    }

    const newScores = { ...scores };
    if (boxesCompleted > 0) {
      newScores[playerIndex] += boxesCompleted;
    }

    const totalBoxes = ROWS * COLS;
    const isFinished = Object.keys(newBoxes).length === totalBoxes;

    updateGameState({
      ...gameState,
      horizontalLines: newH,
      verticalLines: newV,
      boxes: newBoxes,
      scores: newScores,
      turn: boxesCompleted > 0 ? gameState.turn : (gameState.turn === 0 ? 1 : 0),
      status: isFinished ? 'finished' : 'playing'
    });
  };

  const resetGame = () => {
    updateGameState({
      ...gameState,
      horizontalLines: {},
      verticalLines: {},
      boxes: {},
      scores: { 0: 0, 1: 0 },
      turn: 0,
      status: 'playing'
    });
  };

  return (
    <div className="flex flex-col lg:flex-row items-center justify-center gap-6 sm:gap-12 w-full max-w-6xl p-4 sm:p-8">
      {/* Player 1 Stats (Top on Mobile, Left on Desktop) */}
      <div className={cn(
        "flex lg:flex-col items-center gap-4 p-4 sm:p-6 rounded-3xl glass-panel w-full lg:w-64 transition-all duration-300",
        gameState.turn === 0 ? "scale-105 shadow-[0_0_30px_rgba(59,130,246,0.3)] border-blue-400/50" : "opacity-60 scale-95"
      )}>
        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-300 font-bold text-xl sm:text-2xl border-2 border-blue-400/50">
          {p1?.name.charAt(0).toUpperCase() || 'J1'}
        </div>
        <div className="flex-1 lg:text-center">
          <h3 className="font-bold text-lg sm:text-xl truncate text-blue-200">{p1?.name || 'Jugador 1'}</h3>
          <p className="text-sm opacity-70">Color Azul</p>
        </div>
        <motion.div 
          key={scores[0]}
          initial={{ scale: 1.5, color: '#93c5fd' }}
          animate={{ scale: 1, color: '#ffffff' }}
          className="text-4xl sm:text-5xl lg:text-6xl font-black"
        >
          {scores[0]}
        </motion.div>
      </div>

      {/* Board */}
      <div className="relative glass-panel p-6 sm:p-10 rounded-[3rem] shadow-2xl flex-shrink-0 touch-none">
        <div 
          className="relative grid"
          style={{
            gridTemplateColumns: `repeat(${COLS}, 1fr)`,
            gridTemplateRows: `repeat(${ROWS}, 1fr)`,
            width: 'min(85vw, 400px)',
            height: 'min(85vw, 400px)'
          }}
        >
          {/* Boxes */}
          {Array.from({ length: ROWS }).map((_, r) => (
            Array.from({ length: COLS }).map((_, c) => {
              const owner = boxes[`${r}-${c}`];
              return (
                <div key={`box-${r}-${c}`} className="relative w-full h-full">
                  <AnimatePresence>
                    {owner !== undefined && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0, rotate: -15 }}
                        animate={{ scale: 1, opacity: 1, rotate: 0 }}
                        transition={{ type: 'spring', bounce: 0.6 }}
                        className={cn(
                          "absolute inset-1 sm:inset-2 rounded-xl sm:rounded-2xl flex items-center justify-center text-2xl sm:text-4xl font-black shadow-inner",
                          owner === 0 ? "bg-blue-500/30 text-blue-300" : "bg-rose-500/30 text-rose-300"
                        )}
                      >
                        {owner === 0 ? p1?.name.charAt(0).toUpperCase() : p2?.name.charAt(0).toUpperCase()}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          ))}

          {/* Horizontal Lines (including hitboxes) */}
          {Array.from({ length: ROWS + 1 }).map((_, r) => (
            Array.from({ length: COLS }).map((_, c) => {
              const owner = horizontalLines[`${r}-${c}`];
              const isHoverable = owner === undefined && isMyTurn && gameState.status !== 'finished';
              return (
                <div 
                  key={`h-${r}-${c}`}
                  onClick={() => handleLineClick('horizontal', r, c)}
                  className={cn(
                    "absolute h-10 sm:h-12 -translate-y-1/2 z-10 flex items-center justify-center group cursor-pointer",
                    isHoverable ? "" : "cursor-default"
                  )}
                  style={{
                    top: `${(r / ROWS) * 100}%`,
                    left: `${(c / COLS) * 100}%`,
                    width: `${(1 / COLS) * 100}%`,
                  }}
                >
                  <div className={cn(
                    "w-full h-1 sm:h-1.5 rounded-full mx-2 transition-all duration-300",
                    owner === 0 ? "bg-blue-400 shadow-[0_0_15px_rgba(96,165,250,1)] scale-x-100 opacity-100" :
                    owner === 1 ? "bg-rose-400 shadow-[0_0_15px_rgba(251,113,133,1)] scale-x-100 opacity-100" :
                    isHoverable ? "bg-white/20 group-hover:bg-white/60 scale-x-100 opacity-0 group-hover:opacity-100" : "bg-transparent scale-x-0 opacity-0"
                  )} />
                </div>
              );
            })
          ))}

          {/* Vertical Lines (including hitboxes) */}
          {Array.from({ length: ROWS }).map((_, r) => (
            Array.from({ length: COLS + 1 }).map((_, c) => {
              const owner = verticalLines[`${r}-${c}`];
              const isHoverable = owner === undefined && isMyTurn && gameState.status !== 'finished';
              return (
                <div 
                  key={`v-${r}-${c}`}
                  onClick={() => handleLineClick('vertical', r, c)}
                  className={cn(
                    "absolute w-10 sm:w-12 -translate-x-1/2 z-10 flex items-center justify-center group cursor-pointer",
                    isHoverable ? "" : "cursor-default"
                  )}
                  style={{
                    top: `${(r / ROWS) * 100}%`,
                    left: `${(c / COLS) * 100}%`,
                    height: `${(1 / ROWS) * 100}%`,
                  }}
                >
                  <div className={cn(
                    "h-full w-1 sm:w-1.5 rounded-full my-2 transition-all duration-300",
                    owner === 0 ? "bg-blue-400 shadow-[0_0_15px_rgba(96,165,250,1)] scale-y-100 opacity-100" :
                    owner === 1 ? "bg-rose-400 shadow-[0_0_15px_rgba(251,113,133,1)] scale-y-100 opacity-100" :
                    isHoverable ? "bg-white/20 group-hover:bg-white/60 scale-y-100 opacity-0 group-hover:opacity-100" : "bg-transparent scale-y-0 opacity-0"
                  )} />
                </div>
              );
            })
          ))}

          {/* Dots */}
          {Array.from({ length: ROWS + 1 }).map((_, r) => (
            Array.from({ length: COLS + 1 }).map((_, c) => (
              <div 
                key={`dot-${r}-${c}`}
                className="absolute w-3 h-3 sm:w-4 sm:h-4 bg-white/80 rounded-full -translate-x-1/2 -translate-y-1/2 z-20 shadow-md"
                style={{
                  top: `${(r / ROWS) * 100}%`,
                  left: `${(c / COLS) * 100}%`,
                }}
              />
            ))
          ))}
        </div>
        
        {gameState.status === 'finished' && (
          <div className="absolute inset-0 bg-black/60 rounded-[3rem] flex flex-col items-center justify-center z-30 backdrop-blur-sm animate-in fade-in">
            <h2 className="text-4xl sm:text-5xl font-black mb-2 drop-shadow-lg">
              {scores[0] > scores[1] ? '¡Gana ' + (p1?.name || 'Jugador 1') + '!' : 
               scores[1] > scores[0] ? '¡Gana ' + (p2?.name || 'Jugador 2') + '!' : '¡Empate!'}
            </h2>
            <p className="text-xl opacity-80 mb-8">Puntuación: {scores[0]} - {scores[1]}</p>
            {playerIndex === 0 && (
              <button onClick={resetGame} className="px-8 py-4 rounded-2xl glass-button font-bold text-xl hover:scale-105 transition-transform">
                Jugar de nuevo
              </button>
            )}
          </div>
        )}
      </div>

      {/* Player 2 Stats (Bottom on Mobile, Right on Desktop) */}
      <div className={cn(
        "flex lg:flex-col items-center gap-4 p-4 sm:p-6 rounded-3xl glass-panel w-full lg:w-64 transition-all duration-300",
        gameState.turn === 1 ? "scale-105 shadow-[0_0_30px_rgba(244,63,94,0.3)] border-rose-400/50" : "opacity-60 scale-95"
      )}>
        <motion.div 
          key={scores[1]}
          initial={{ scale: 1.5, color: '#fda4af' }}
          animate={{ scale: 1, color: '#ffffff' }}
          className="text-4xl sm:text-5xl lg:text-6xl font-black lg:order-1 order-3"
        >
          {scores[1]}
        </motion.div>
        <div className="flex-1 lg:text-center text-right lg:order-2 order-2">
          <h3 className="font-bold text-lg sm:text-xl truncate text-rose-200">{p2?.name || 'Jugador 2'}</h3>
          <p className="text-sm opacity-70">Color Rojo</p>
        </div>
        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-300 font-bold text-xl sm:text-2xl border-2 border-rose-400/50 lg:order-3 order-1">
          {p2?.name.charAt(0).toUpperCase() || 'J2'}
        </div>
      </div>
    </div>
  );
}
