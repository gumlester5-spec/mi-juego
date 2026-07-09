import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Room } from '../store/useMultiplayer';
import { Crown } from 'lucide-react';

interface Props {
  room: Room;
  playerId: string;
  updateGameState: (state: any) => void;
}

type Piece = { player: number; isKing: boolean };
type Board = (Piece | null)[][];
type Position = { r: number; c: number };
type Move = { to: Position; jump?: Position };

export function Checkers({ room, playerId, updateGameState }: Props) {
  const { gameState, players } = room;
  const playerIds = Object.keys(players);
  const playerIndex = playerIds.indexOf(playerId);
  const isMyTurn = gameState.turn === playerIndex;

  const board: Board = gameState.board || Array(8).fill(null).map(() => Array(8).fill(null));
  const status = gameState.status || 'playing';
  const winner = gameState.winner;
  const mustJumpPiece: Position | null = gameState.mustJumpPiece || null;

  const [selectedPos, setSelectedPos] = useState<Position | null>(null);

  const p1 = players[playerIds[0]];
  const p2 = players[playerIds[1]];

  // Inverse board for player 2
  const isFlipped = playerIndex === 1;

  const getValidMoves = (b: Board, player: number, forcedPiece: Position | null) => {
    const jumps: { from: Position; move: Move }[] = [];
    const regular: { from: Position; move: Move }[] = [];

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = b[r][c];
        if (!piece || piece.player !== player) continue;
        if (forcedPiece && (forcedPiece.r !== r || forcedPiece.c !== c)) continue;

        const dirs = [];
        if (piece.isKing) {
          dirs.push({ dr: -1, dc: -1 }, { dr: -1, dc: 1 }, { dr: 1, dc: -1 }, { dr: 1, dc: 1 });
        } else {
          const dr = player === 0 ? -1 : 1; // 0 goes UP, 1 goes DOWN
          dirs.push({ dr, dc: -1 }, { dr, dc: 1 });
        }

        for (const { dr, dc } of dirs) {
          // Check regular
          let nr = r + dr;
          let nc = c + dc;
          if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && !b[nr][nc]) {
            regular.push({ from: { r, c }, move: { to: { r: nr, c: nc } } });
          }

          // Check jump
          let jr = r + dr * 2;
          let jc = c + dc * 2;
          if (
            jr >= 0 && jr < 8 && jc >= 0 && jc < 8 &&
            !b[jr][jc] &&
            b[nr][nc] && b[nr][nc]?.player !== player
          ) {
            jumps.push({ from: { r, c }, move: { to: { r: jr, c: jc }, jump: { r: nr, c: nc } } });
          }
        }
      }
    }

    return { jumps, regular };
  };

  const validMovesCache = useMemo(() => {
    return getValidMoves(board, gameState.turn, mustJumpPiece);
  }, [board, gameState.turn, mustJumpPiece]);

  // If we have selected a piece, what are its valid moves?
  const selectedPieceMoves = useMemo(() => {
    if (!selectedPos) return [];
    const source = validMovesCache.jumps.length > 0 ? validMovesCache.jumps : validMovesCache.regular;
    return source
      .filter(m => m.from.r === selectedPos.r && m.from.c === selectedPos.c)
      .map(m => m.move);
  }, [selectedPos, validMovesCache]);

  useEffect(() => {
    // Check win condition
    if (status === 'playing' && isMyTurn) {
      if (validMovesCache.jumps.length === 0 && validMovesCache.regular.length === 0) {
        // I have no moves, I lose
        updateGameState({
          ...gameState,
          status: 'finished',
          winner: gameState.turn === 0 ? 1 : 0
        });
      }
    }
  }, [status, isMyTurn, validMovesCache]);

  const handleSquareClick = (r: number, c: number) => {
    if (!isMyTurn || status !== 'playing') return;

    // Check if we clicked on our own piece
    const piece = board[r][c];
    if (piece && piece.player === playerIndex) {
      // Are we forced to use another piece?
      if (mustJumpPiece && (mustJumpPiece.r !== r || mustJumpPiece.c !== c)) {
        return; // Locked to the jumping piece
      }

      // Can this piece move?
      const source = validMovesCache.jumps.length > 0 ? validMovesCache.jumps : validMovesCache.regular;
      const canMove = source.some(m => m.from.r === r && m.from.c === c);
      
      if (canMove) {
        setSelectedPos({ r, c });
      }
      return;
    }

    // Check if we clicked on a valid destination
    if (selectedPos) {
      const move = selectedPieceMoves.find(m => m.to.r === r && m.to.c === c);
      if (move) {
        executeMove(selectedPos, move);
      } else {
        setSelectedPos(null);
      }
    }
  };

  const executeMove = (from: Position, move: Move) => {
    const newBoard = board.map(row => [...row]);
    const piece = newBoard[from.r][from.c]!;
    
    // Move piece
    newBoard[move.to.r][move.to.c] = piece;
    newBoard[from.r][from.c] = null;

    let madeJump = false;
    // Handle jump
    if (move.jump) {
      newBoard[move.jump.r][move.jump.c] = null;
      madeJump = true;
    }

    // Handle promotion
    let promoted = false;
    if (piece.player === 0 && move.to.r === 0 && !piece.isKing) {
      piece.isKing = true;
      promoted = true;
    } else if (piece.player === 1 && move.to.r === 7 && !piece.isKing) {
      piece.isKing = true;
      promoted = true;
    }

    // Check for multi-jumps
    let nextMustJump: Position | null = null;
    if (madeJump && !promoted) {
      // check if we can jump again with the same piece
      const nextMoves = getValidMoves(newBoard, playerIndex, move.to);
      if (nextMoves.jumps.length > 0) {
        nextMustJump = move.to;
      }
    }

    let nextTurn = gameState.turn;
    if (!nextMustJump) {
      nextTurn = gameState.turn === 0 ? 1 : 0;
    }

    updateGameState({
      ...gameState,
      board: newBoard,
      turn: nextTurn,
      mustJumpPiece: nextMustJump
    });
    
    if (nextMustJump) {
      setSelectedPos(move.to);
    } else {
      setSelectedPos(null);
    }
  };

  // Count captured pieces (each starts with 12)
  const countPieces = (player: number) => {
    let count = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (board[r][c]?.player === player) count++;
      }
    }
    return count;
  };

  const p1Pieces = countPieces(0);
  const p2Pieces = countPieces(1);
  const p1Captured = 12 - p2Pieces;
  const p2Captured = 12 - p1Pieces;

  return (
    <div className="flex flex-col lg:flex-row items-center justify-center gap-6 sm:gap-12 w-full max-w-6xl p-4 sm:p-8">
      {/* Player Top / Opponent */}
      <div className={cn(
        "flex lg:flex-col items-center gap-4 p-4 sm:p-6 rounded-3xl glass-panel w-full lg:w-64 transition-all duration-300",
        gameState.turn === (isFlipped ? 0 : 1) ? "scale-105 shadow-[0_0_30px_rgba(255,255,255,0.2)]" : "opacity-60 scale-95"
      )}>
        <div className={cn(
          "w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center font-bold text-xl sm:text-2xl border-4",
          isFlipped ? "bg-white text-gray-900 border-gray-300" : "bg-gray-800 text-white border-gray-600"
        )}>
          {(isFlipped ? p1 : p2)?.name.charAt(0).toUpperCase() || (isFlipped ? 'J1' : 'J2')}
        </div>
        <div className="flex-1 lg:text-center">
          <h3 className="font-bold text-lg sm:text-xl truncate">{(isFlipped ? p1 : p2)?.name || (isFlipped ? 'Jugador 1' : 'Jugador 2')}</h3>
          <p className="text-sm opacity-70">Capturas: {isFlipped ? p1Captured : p2Captured}</p>
        </div>
      </div>

      {/* Board */}
      <div className="glass-panel p-2 sm:p-4 rounded-xl shadow-2xl flex-shrink-0 touch-none">
        <div 
          className="grid border-4 border-amber-900/40 rounded-sm bg-amber-900 overflow-hidden relative"
          style={{
            gridTemplateColumns: `repeat(8, 1fr)`,
            width: 'min(90vw, 450px)',
            height: 'min(90vw, 450px)'
          }}
        >
          {Array.from({ length: 64 }).map((_, i) => {
            const row = Math.floor(i / 8);
            const col = i % 8;
            
            // Apply flip for UI mapping
            const actualRow = isFlipped ? 7 - row : row;
            const actualCol = isFlipped ? 7 - col : col;
            
            const isDark = (actualRow + actualCol) % 2 === 1;
            const piece = board[actualRow][actualCol];
            
            const isSelected = selectedPos?.r === actualRow && selectedPos?.c === actualCol;
            const validMove = selectedPieceMoves.find(m => m.to.r === actualRow && m.to.c === actualCol);
            
            const canSelect = isMyTurn && status === 'playing' && piece?.player === playerIndex && 
              (validMovesCache.jumps.length > 0 ? validMovesCache.jumps.some(m => m.from.r === actualRow && m.from.c === actualCol) :
               validMovesCache.regular.some(m => m.from.r === actualRow && m.from.c === actualCol)) &&
               (!mustJumpPiece || (mustJumpPiece.r === actualRow && mustJumpPiece.c === actualCol));

            return (
              <div 
                key={i}
                onClick={() => handleSquareClick(actualRow, actualCol)}
                className={cn(
                  "w-full h-full relative flex items-center justify-center transition-colors",
                  isDark ? "bg-amber-800" : "bg-amber-200",
                  isSelected && "bg-yellow-500/50",
                  validMove && "cursor-pointer"
                )}
              >
                {/* Valid Move Indicator */}
                {validMove && (
                  <div className="absolute inset-0 m-auto w-4 h-4 sm:w-6 sm:h-6 rounded-full bg-green-400/60 shadow-[0_0_10px_rgba(74,222,128,0.8)] animate-pulse" />
                )}

                {/* Piece */}
                <AnimatePresence>
                  {piece && (
                    <motion.div
                      layoutId={`piece-${piece.player}-${actualRow}-${actualCol}`}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className={cn(
                        "w-[80%] h-[80%] rounded-full shadow-lg flex items-center justify-center transition-transform",
                        piece.player === 0 
                          ? "bg-gradient-to-br from-white to-gray-300 border-4 border-gray-100" 
                          : "bg-gradient-to-br from-gray-700 to-gray-900 border-4 border-gray-800",
                        canSelect && !isSelected && "ring-4 ring-blue-400 ring-offset-2 ring-offset-transparent cursor-pointer hover:scale-105"
                      )}
                    >
                      {/* Inner Rings for classic look */}
                      <div className={cn(
                        "w-[70%] h-[70%] rounded-full border-2 opacity-50",
                        piece.player === 0 ? "border-gray-400" : "border-gray-600"
                      )} />
                      
                      {piece.isKing && (
                        <Crown className={cn(
                          "absolute w-1/2 h-1/2",
                          piece.player === 0 ? "text-amber-500" : "text-amber-400"
                        )} />
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {status === 'finished' && (
          <div className="absolute inset-0 bg-black/70 rounded-[3rem] flex flex-col items-center justify-center z-30 backdrop-blur-sm animate-in fade-in">
            <h2 className="text-4xl sm:text-5xl font-black mb-2 drop-shadow-lg text-white">
              {winner === 0 ? `¡Gana ${p1?.name}!` : `¡Gana ${p2?.name}!`}
            </h2>
          </div>
        )}
      </div>

      {/* Player Bottom / You */}
      <div className={cn(
        "flex lg:flex-col items-center gap-4 p-4 sm:p-6 rounded-3xl glass-panel w-full lg:w-64 transition-all duration-300",
        gameState.turn === (isFlipped ? 1 : 0) ? "scale-105 shadow-[0_0_30px_rgba(255,255,255,0.2)]" : "opacity-60 scale-95"
      )}>
        <div className="flex-1 lg:text-center text-right lg:order-2 order-2">
          <h3 className="font-bold text-lg sm:text-xl truncate">{(isFlipped ? p2 : p1)?.name || (isFlipped ? 'Jugador 2' : 'Jugador 1')} (Tú)</h3>
          <p className="text-sm opacity-70">Capturas: {isFlipped ? p2Captured : p1Captured}</p>
        </div>
        <div className={cn(
          "w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center font-bold text-xl sm:text-2xl border-4 lg:order-1 order-3",
          isFlipped ? "bg-gray-800 text-white border-gray-600" : "bg-white text-gray-900 border-gray-300"
        )}>
          {(isFlipped ? p2 : p1)?.name.charAt(0).toUpperCase() || (isFlipped ? 'J2' : 'J1')}
        </div>
      </div>
    </div>
  );
}
