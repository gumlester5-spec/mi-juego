import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface Props {
  room: any;
  playerId: string;
  updateGameState: (state: any) => void;
}

export function Hangman({ room, playerId, updateGameState }: Props) {
  const { gameState, players } = room;
  const playerIds = Object.keys(players);
  const playerIndex = playerIds.indexOf(playerId);
  
  const [wordInput, setWordInput] = useState('');

  const isHost = playerIndex === 0;
  const creatorIndex = gameState.creatorIndex ?? 0;
  const isCreator = playerIndex === creatorIndex;
  const guesserIndex = creatorIndex === 0 ? 1 : 0;

  const handleSetWord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wordInput.trim()) return;
    
    updateGameState({
      ...gameState,
      word: wordInput.toUpperCase(),
      guessedLetters: [],
      wrongGuesses: 0,
      maxWrong: 6,
      status: 'playing',
      turn: guesserIndex
    });
  };

  const handleGuess = (letter: string) => {
    if (gameState.status !== 'playing' || gameState.turn !== playerIndex) return;
    const guessedLetters = gameState.guessedLetters || [];
    if (guessedLetters.includes(letter)) return;

    const newGuessedLetters = [...guessedLetters, letter];
    const isWrong = !gameState.word.includes(letter);
    const newWrongGuesses = (gameState.wrongGuesses || 0) + (isWrong ? 1 : 0);

    let newStatus = 'playing';
    if (newWrongGuesses >= (gameState.maxWrong || 6)) {
      newStatus = 'lost';
    } else {
      const isWon = gameState.word.split('').every((char: string) => char === ' ' || newGuessedLetters.includes(char));
      if (isWon) newStatus = 'won';
    }

    updateGameState({
      ...gameState,
      guessedLetters: newGuessedLetters,
      wrongGuesses: newWrongGuesses,
      status: newStatus
    });
  };

  const resetGame = () => {
    updateGameState({
      ...gameState,
      word: '',
      guessedLetters: [],
      wrongGuesses: 0,
      maxWrong: 6,
      turn: 0,
      status: 'setup',
      creatorIndex: creatorIndex === 0 ? 1 : 0
    });
    setWordInput('');
  };

  const alphabet = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('');

  if (gameState.status === 'setup') {
    return (
      <div className="flex flex-col items-center gap-6 sm:gap-8 p-8 sm:p-12 glass-panel rounded-[2rem] w-full max-w-xl shadow-2xl">
        <h2 className="text-3xl sm:text-4xl font-bold drop-shadow-md">Verdugo</h2>
        {isCreator ? (
          <form onSubmit={handleSetWord} className="w-full flex flex-col gap-6">
            <label className="text-base sm:text-lg opacity-90 font-medium text-center">Escribe tu palabra secreta:</label>
            <input
              type="text"
              value={wordInput}
              onChange={(e) => {
                const val = e.target.value.toUpperCase().replace(/[^A-ZÑ]/g, '');
                if (val.length <= 15) setWordInput(val);
              }}
              className="px-6 py-5 rounded-2xl glass-input w-full text-2xl tracking-[0.2em] text-center uppercase font-black"
              placeholder="Ej: MURCIELAGO"
              maxLength={15}
              required
            />
            <button type="submit" disabled={!wordInput.trim()} className="w-full py-5 rounded-2xl glass-button font-bold text-xl hover:scale-[1.02] transition-transform disabled:opacity-50">
              ¡Comenzar juego!
            </button>
          </form>
        ) : (
          <div className="flex flex-col items-center gap-5 text-center py-8">
            <div className="flex gap-3 mb-4">
              <span className="w-4 h-4 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-4 h-4 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-4 h-4 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <p className="text-xl opacity-90 font-medium leading-relaxed max-w-xs">
              Tu oponente está pensando una palabra dificilísima... prepárate.
            </p>
          </div>
        )}
      </div>
    );
  }

  const isMyTurn = gameState.turn === playerIndex;
  const guessedLetters = gameState.guessedLetters || [];
  const wrongGuesses = gameState.wrongGuesses || 0;
  const maxWrong = gameState.maxWrong || 6;
  const wordLength = gameState.word ? gameState.word.length : 0;

  const draw = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: { duration: 0.6, ease: "easeOut" },
        opacity: { duration: 0.1 }
      }
    }
  };

  return (
    <div className={cn("flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-10 w-full max-w-6xl p-4 sm:p-6 rounded-3xl transition-colors duration-1000", gameState.status === 'lost' ? "bg-black/40" : "bg-transparent")}>
      
      {/* Left Column: Graphic */}
      <div className="w-full md:w-5/12 lg:w-1/2 flex flex-col items-center">
        <div className="flex justify-between w-full items-center mb-4 glass-panel px-6 py-4 rounded-2xl shadow-lg">
          <div className="text-lg sm:text-xl font-medium">Errores: <span className="font-bold text-rose-400 drop-shadow-md">{wrongGuesses} / {maxWrong}</span></div>
          <div className="text-lg sm:text-xl font-bold">
            {gameState.status === 'won' ? <span className="text-green-400 drop-shadow-md">¡Adivinó!</span> :
             gameState.status === 'lost' ? <span className="text-rose-400 drop-shadow-md">¡Perdió!</span> :
             isMyTurn ? <span className="text-blue-300 drop-shadow-md animate-pulse">Adivinando...</span> : <span className="text-gray-400/80">Observando...</span>}
          </div>
        </div>

        <div className="w-full aspect-[4/5] sm:aspect-square glass-panel rounded-3xl flex items-center justify-center shadow-xl relative overflow-hidden bg-gradient-to-b from-blue-900/10 to-black/30">
          <svg viewBox="0 0 200 220" className="w-full h-full stroke-white/90 fill-transparent stroke-[8] sm:stroke-[10]" style={{ strokeLinecap: 'round', strokeLinejoin: 'round' }}>
            {/* Base & Pole */}
            <motion.line x1="40" y1="200" x2="120" y2="200" variants={draw} initial="hidden" animate="visible" />
            {wrongGuesses > 0 && <motion.line x1="80" y1="200" x2="80" y2="20" variants={draw} initial="hidden" animate="visible" />}
            {wrongGuesses > 1 && <motion.line x1="80" y1="20" x2="150" y2="20" variants={draw} initial="hidden" animate="visible" />}
            
            {/* Rope - breaks if lost */}
            {wrongGuesses > 2 && (
              <motion.line 
                x1="150" y1="20" x2="150" y2="40" 
                variants={draw} initial="hidden" animate="visible" 
                className={cn("transition-all duration-300", gameState.status === 'lost' ? "opacity-0 translate-y-[-10px]" : "opacity-100")}
              />
            )}

            {/* Character Group - falls if lost */}
            <motion.g
              animate={gameState.status === 'lost' ? { y: 250, rotate: 15, opacity: 0 } : { y: 0, rotate: 0, opacity: 1 }}
              transition={{ duration: 1.2, ease: "easeIn", delay: gameState.status === 'lost' ? 0.3 : 0 }}
            >
              {/* Head */}
              {wrongGuesses > 3 && <motion.circle cx="150" cy="60" r="20" variants={draw} initial="hidden" animate="visible" />}
              {/* Body */}
              {wrongGuesses > 4 && <motion.line x1="150" y1="80" x2="150" y2="130" variants={draw} initial="hidden" animate="visible" />}
              {/* Arms & Legs */}
              {wrongGuesses > 5 && (
                <>
                  <motion.line x1="150" y1="90" x2="120" y2="110" variants={draw} initial="hidden" animate="visible" />
                  <motion.line x1="150" y1="90" x2="180" y2="110" variants={draw} initial="hidden" animate="visible" />
                  <motion.line x1="150" y1="130" x2="120" y2="170" variants={draw} initial="hidden" animate="visible" />
                  <motion.line x1="150" y1="130" x2="180" y2="170" variants={draw} initial="hidden" animate="visible" />
                  {/* Crossed out eyes */}
                  <motion.line x1="142" y1="55" x2="147" y2="60" strokeWidth="4" variants={draw} initial="hidden" animate="visible" />
                  <motion.line x1="147" y1="55" x2="142" y2="60" strokeWidth="4" variants={draw} initial="hidden" animate="visible" />
                  <motion.line x1="153" y1="55" x2="158" y2="60" strokeWidth="4" variants={draw} initial="hidden" animate="visible" />
                  <motion.line x1="158" y1="55" x2="153" y2="60" strokeWidth="4" variants={draw} initial="hidden" animate="visible" />
                </>
              )}
            </motion.g>
          </svg>
        </div>
      </div>

      {/* Right Column: Word & Keyboard */}
      <div className="w-full md:w-7/12 lg:w-1/2 flex flex-col items-center justify-center mt-4 md:mt-0">
        
        {/* Word Display */}
        <div className={cn(
          "flex flex-wrap justify-center gap-1.5 sm:gap-2 md:gap-3 mb-8 sm:mb-12 w-full",
          wordLength > 10 ? "max-w-full" : "max-w-2xl"
        )}>
          {gameState.word.split('').map((char: string, i: number) => {
            const isRevealed = guessedLetters.includes(char) || gameState.status === 'lost';
            const isSpace = char === ' ';
            return (
              <div key={i} className={cn(
                "flex items-center justify-center font-black border-b-[4px] sm:border-b-[6px] border-white/40",
                isSpace ? "border-transparent w-4 sm:w-8" : "bg-black/20 rounded-t-lg shadow-inner",
                wordLength > 10 ? "w-7 h-10 sm:w-10 sm:h-14 text-xl sm:text-3xl" : "w-10 h-14 sm:w-14 sm:h-20 text-3xl sm:text-5xl"
              )}>
                <AnimatePresence>
                  {isRevealed && !isSpace && (
                    <motion.span
                      initial={{ scale: 0, y: 15, opacity: 0 }}
                      animate={{ scale: 1, y: 0, opacity: 1 }}
                      transition={{ type: "spring", bounce: 0.6, duration: 0.6 }}
                      className={gameState.status === 'lost' && !guessedLetters.includes(char) ? "text-rose-400/90" : "text-white"}
                    >
                      {char}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Custom Virtual Keyboard */}
        <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 w-full max-w-xl">
          {alphabet.map((letter) => {
            const isGuessed = guessedLetters.includes(letter);
            const isCorrect = isGuessed && gameState.word.includes(letter);
            const isWrong = isGuessed && !gameState.word.includes(letter);

            return (
              <button
                key={letter}
                onClick={() => handleGuess(letter)}
                disabled={isGuessed || !isMyTurn || gameState.status !== 'playing'}
                className={cn(
                  "w-[12%] sm:w-12 h-12 sm:h-14 rounded-lg sm:rounded-xl font-bold text-lg sm:text-2xl flex items-center justify-center transition-all",
                  isCorrect ? "bg-green-500/80 text-white border border-green-400 shadow-[0_0_15px_rgba(34,197,94,0.4)] scale-95" :
                  isWrong ? "bg-black/40 text-white/30 border border-white/5 scale-95" :
                  !isGuessed && isMyTurn && gameState.status === 'playing' ? "glass-button hover:bg-white/20 hover:-translate-y-1 hover:shadow-lg active:scale-95" : "glass-panel opacity-50 cursor-default"
                )}
              >
                {letter}
              </button>
            )
          })}
        </div>

        {/* Game Over Actions */}
        {(gameState.status === 'won' || gameState.status === 'lost') && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="w-full flex flex-col items-center mt-10"
          >
            {isHost ? (
              <button onClick={resetGame} className="px-8 sm:px-10 py-4 sm:py-5 rounded-2xl glass-button font-bold text-lg sm:text-xl w-full max-w-xs hover:scale-105 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                Jugar de nuevo
              </button>
            ) : (
              <div className="text-lg opacity-80 bg-black/30 px-6 sm:px-8 py-3 sm:py-4 rounded-2xl backdrop-blur-sm border border-white/10 text-center">
                Esperando que el anfitrión reinicie...
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
