import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Copy, LogOut, Play, UserPlus, Users, Loader2, Grid3X3, Skull, LayoutGrid, Crown, MoveHorizontal, Dices, BarChart2, X, ChevronLeft, Candy } from 'lucide-react';
import { useMultiplayer, GameType } from './store/useMultiplayer';
import { TicTacToe } from './components/TicTacToe';
import { Hangman } from './components/Hangman';
import { DotsAndBoxes } from './components/DotsAndBoxes';
import { Checkers } from './components/Checkers';
import { Ludo } from './components/Ludo';
import { StatsModal } from './components/StatsModal';
import { recordMatchResult } from './lib/stats';
import { cn } from './lib/utils';
import { ref, get, set } from 'firebase/database';
import { db } from './firebase';

const GAMES = [
  { id: 'tictactoe', name: 'Tres en Raya', icon: <Grid3X3 className="w-10 h-10 sm:w-12 sm:h-12 text-blue-300" /> },
  { id: 'hangman', name: 'Verdugo', icon: <Skull className="w-10 h-10 sm:w-12 sm:h-12 text-purple-300" /> },
  { id: 'dotsboxes', name: 'Puntos y Cajas', icon: <LayoutGrid className="w-10 h-10 sm:w-12 sm:h-12 text-rose-300" /> },
  { id: 'checkers', name: 'Damas', icon: <Crown className="w-10 h-10 sm:w-12 sm:h-12 text-amber-300" /> },
  { id: 'ludo', name: 'Ludo', icon: <Dices className="w-10 h-10 sm:w-12 sm:h-12 text-pink-300" /> },
  { id: 'gomita', name: 'Gomita', icon: <Candy className="w-10 h-10 sm:w-12 sm:h-12 text-teal-300" /> }
];

const getGameResult = (room: any, playerId: string): 'win' | 'loss' | 'draw' | null => {
  const { gameType, gameState, players } = room;
  const playerIds = Object.keys(players);
  const playerIndex = playerIds.indexOf(playerId);
  if (playerIndex === -1) return null;

  if (gameType === 'tictactoe') {
    if (gameState.winner === 'draw') return 'draw';
    if (gameState.winner === 'X') return playerIndex === 0 ? 'win' : 'loss';
    if (gameState.winner === 'O') return playerIndex === 1 ? 'win' : 'loss';
  } else if (gameType === 'hangman') {
    if (gameState.status === 'won') return playerIndex === 1 ? 'win' : 'loss';
    if (gameState.status === 'lost') return playerIndex === 1 ? 'loss' : 'win';
  } else if (gameType === 'dotsboxes') {
    if (gameState.status === 'finished') {
      const s0 = gameState.scores[0] || 0;
      const s1 = gameState.scores[1] || 0;
      if (s0 === s1) return 'draw';
      return (s0 > s1 ? 0 : 1) === playerIndex ? 'win' : 'loss';
    }
  } else if (gameType === 'checkers' || gameType === 'ludo') {
    if (gameState.winner === 'draw') return 'draw';
    if (gameState.winner !== null && gameState.winner !== undefined) {
      return gameState.winner === playerIndex ? 'win' : 'loss';
    }
  }

  return null;
};

const WaitingForPartner = ({ onTimeout }: { onTimeout: () => void }) => {
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    if (timeLeft <= 0) {
      onTimeout();
      return;
    }
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, onTimeout]);

  return (
    <div className="w-full max-w-3xl mb-8 flex items-center justify-center p-4 glass-panel bg-purple-500/20 border-purple-400/40 rounded-2xl shadow-[0_0_25px_rgba(168,85,247,0.4)] animate-pulse">
      <div className="flex flex-col sm:flex-row items-center gap-4 text-center">
        <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 text-purple-300 animate-spin" />
        <span className="text-xl sm:text-2xl font-bold text-purple-100 tracking-wide drop-shadow-md">
          Esperando a tu compañero... ({timeLeft}s)
        </span>
      </div>
    </div>
  );
};

export default function App() {
  const [playerId] = useState(() => {
    const stored = localStorage.getItem('liquid_games_player_id');
    if (stored) return stored;
    const newId = Math.random().toString(36).substring(2, 9);
    localStorage.setItem('liquid_games_player_id', newId);
    return newId;
  });

  const [playerName, setPlayerName] = useState('');
  const [hasName, setHasName] = useState(false);
  const [isLoadingName, setIsLoadingName] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [showJoinInput, setShowJoinInput] = useState(false);
  
  useEffect(() => {
    const fetchName = async () => {
      try {
        const nameRef = ref(db, `users/${playerId}/name`);
        const snapshot = await get(nameRef);
        if (snapshot.exists()) {
          setPlayerName(snapshot.val());
          setHasName(true);
        }
      } catch (e) {
        console.error("Error fetching name:", e);
      } finally {
        setIsLoadingName(false);
      }
    };
    fetchName();
  }, [playerId]);

  const handleSaveName = async () => {
    if (playerName.trim()) {
      setHasName(true);
      await set(ref(db, `users/${playerId}/name`), playerName.trim());
    }
  };

  const {
    roomId,
    room,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    updateGameState,
    clearError
  } = useMultiplayer(playerName, playerId);

  const [showStatsModal, setShowStatsModal] = useState(false);
  const processedGameRef = useRef(false);

  useEffect(() => {
    if (!room) {
      processedGameRef.current = false;
      return;
    }

    const result = getGameResult(room, playerId);
    
    if (result) {
      if (!processedGameRef.current) {
        // Record stat
        const opponentId = Object.keys(room.players).find(id => id !== playerId);
        if (opponentId) {
          const opponentName = room.players[opponentId].name;
          recordMatchResult(opponentId, opponentName, room.gameType, result);
        }
        processedGameRef.current = true;
      }
    } else {
      processedGameRef.current = false;
    }
  }, [room?.gameState, room?.players, playerId, room?.gameType]);

  const handleCopyCode = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      // Optional: show a small toast or visual feedback
    }
  };

  // Push state to browser history when navigating sub-views
  useEffect(() => {
    if (showJoinInput && !roomId) {
      window.history.pushState({ view: 'join' }, '', '');
    }
  }, [showJoinInput, roomId]);

  useEffect(() => {
    if (roomId) {
      window.history.pushState({ view: 'room' }, '', '');
    }
  }, [roomId]);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (roomId) {
        leaveRoom();
      } else if (showJoinInput) {
        setShowJoinInput(false);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [roomId, showJoinInput, leaveRoom]);

  const renderGame = () => {
    if (!room) return null;
    switch (room.gameType) {
      case 'tictactoe':
        return <TicTacToe room={room} playerId={playerId} updateGameState={updateGameState} />;
      case 'hangman':
        return <Hangman room={room} playerId={playerId} updateGameState={updateGameState} />;
      case 'dotsboxes':
        return <DotsAndBoxes room={room} playerId={playerId} updateGameState={updateGameState} />;
      case 'checkers':
        return <Checkers room={room} playerId={playerId} updateGameState={updateGameState} />;
      case 'ludo':
        return <Ludo room={room} playerId={playerId} updateGameState={updateGameState} />;
      default:
        return (
          <div className="flex flex-col items-center justify-center p-12 glass-panel rounded-3xl text-center">
            <div className="text-6xl mb-6">🚧</div>
            <h2 className="text-2xl font-bold mb-2">¡Próximamente!</h2>
            <p className="opacity-80 max-w-md">
              El juego {GAMES.find(g => g.id === room.gameType)?.name} está en construcción. 
              Estamos trabajando duro para traer esta experiencia con físicas y tablero complejo muy pronto.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-[100dvh] sm:min-h-screen w-full flex items-center justify-center p-2 sm:p-4 md:p-8 font-sans overflow-x-hidden">
      <div className="glass rounded-3xl md:rounded-[2.5rem] w-full max-w-6xl min-h-[calc(100dvh-1rem)] sm:min-h-[calc(100vh-2rem)] md:min-h-[80vh] p-4 sm:p-8 md:p-12 relative flex flex-col items-center shadow-2xl">
        
        {/* Top Right Stats Button */}
        {hasName && !room && (
          <div className="absolute top-4 right-4 sm:top-8 sm:right-8 z-50">
            <button
              onClick={() => setShowStatsModal(true)}
              className="glass-button p-3 sm:p-4 rounded-2xl hover:bg-white/10 transition-all shadow-md group"
              title="Estadísticas"
            >
              <BarChart2 className="w-6 h-6 sm:w-8 sm:h-8 text-blue-300 group-hover:scale-110 transition-transform" />
            </button>
          </div>
        )}

        {/* Title Area */}
        <div className="mb-6 sm:mb-8 md:mb-12 text-center z-10 mt-2 sm:mt-4 md:mt-0">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-2 sm:mb-3 drop-shadow-2xl text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-purple-300">
            JUEGOS
          </h1>
        </div>

        <AnimatePresence mode="wait">
          {isLoadingName ? (
            <motion.div
              key="loading-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center flex-1 z-10 w-full"
            >
              <Loader2 className="w-12 h-12 text-blue-300 animate-spin mb-4" />
              <p className="text-xl text-white/70">Cargando perfil...</p>
            </motion.div>
          ) : !hasName ? (
            <motion.div
              key="name-screen"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center w-full max-w-md z-10 flex-1 justify-center"
            >
              <div className="glass-panel p-6 sm:p-10 rounded-[2rem] w-full flex flex-col gap-6 sm:gap-8 shadow-xl">
                <h2 className="text-2xl sm:text-3xl font-bold text-center">¿Cómo te llamas?</h2>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Tu apodo..."
                  className="px-6 py-4 sm:py-5 rounded-2xl glass-input text-xl sm:text-2xl font-medium text-center focus:scale-[1.02] transition-transform"
                  maxLength={15}
                  onKeyDown={(e) => e.key === 'Enter' && playerName.trim() && handleSaveName()}
                />
                <button
                  onClick={handleSaveName}
                  disabled={!playerName.trim()}
                  className="py-4 sm:py-5 rounded-2xl glass-button font-bold text-lg sm:text-xl disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] transition-transform"
                >
                  Continuar
                </button>
              </div>
            </motion.div>
          ) : !roomId ? (
            <motion.div
              key="menu-screen"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="flex flex-col w-full max-w-5xl z-10 gap-6 sm:gap-8 flex-1 justify-center"
            >
              {error && (
                <div className="bg-rose-500/20 border border-rose-500/50 text-rose-200 px-4 py-3 rounded-xl flex items-center justify-between backdrop-blur-md">
                  <span className="flex-1 text-center">{error}</span>
                  <button onClick={clearError} className="p-1 hover:bg-rose-500/30 rounded-full transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}
              
              <div className="flex flex-col gap-6 lg:gap-8 w-full max-w-4xl mx-auto">
                {/* Top Action Bar */}
                <div className="flex justify-between items-center px-2">
                  <h2 className="text-2xl sm:text-3xl font-bold drop-shadow-md">¿A qué jugamos?</h2>
                  <button
                    onClick={() => {
                      if (showJoinInput) {
                         window.history.back();
                      } else {
                         setShowJoinInput(true);
                      }
                    }}
                    className="glass-button px-4 py-2 sm:px-5 sm:py-2.5 rounded-full flex items-center gap-2 hover:bg-white/10 transition-all shadow-md"
                    title="Unirse a una Sala"
                  >
                    <UserPlus className="w-5 h-5 text-purple-300" />
                  </button>
                </div>

                {showJoinInput && (
                  <div className="glass-panel p-4 sm:p-6 rounded-2xl flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-300 shadow-xl">
                    <div className="flex items-center gap-3 mb-2">
                      <button onClick={() => window.history.back()} className="p-2 glass-button rounded-full hover:bg-white/20 transition-all">
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <h3 className="text-lg font-bold">Ingresa el código</h3>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 items-center w-full">
                      <input
                        type="text"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                        placeholder="Código de 8 dígitos"
                        className="px-6 py-3 sm:py-4 rounded-xl glass-input text-xl sm:text-2xl tracking-widest text-center font-mono focus:scale-[1.02] transition-transform flex-1 w-full"
                        autoFocus
                      />
                      <button
                        onClick={() => joinRoom(joinCode)}
                        disabled={joinCode.length < 8}
                        className="py-3 sm:py-4 px-8 rounded-xl glass-button font-bold text-lg disabled:opacity-50 hover:scale-[1.02] transition-transform w-full sm:w-auto"
                      >
                        Entrar
                      </button>
                    </div>
                  </div>
                )}

                {/* Create Room */}
                <div className="glass-panel p-6 sm:p-8 lg:p-10 rounded-[2rem] shadow-xl">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
                    {GAMES.map((game) => (
                      <button
                        key={game.id}
                        onClick={() => createRoom(game.id as GameType)}
                        className="glass-button p-6 sm:p-8 rounded-2xl flex flex-col items-center justify-center gap-4 hover:bg-white/10 hover:scale-[1.03] transition-all group"
                      >
                        <div className="drop-shadow-md group-hover:scale-110 transition-transform duration-300">
                          {game.icon}
                        </div>
                        <span className="text-sm sm:text-base font-bold text-center leading-tight opacity-90 group-hover:opacity-100">{game.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : !room ? (
            <motion.div
              key="loading-room"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center flex-1 z-10 w-full"
            >
              <Loader2 className="w-12 h-12 text-blue-300 animate-spin mb-4" />
              <p className="text-xl text-white/70">Conectando a la sala...</p>
            </motion.div>
          ) : room.status === 'waiting' ? (
            <motion.div
              key="lobby-screen"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center w-full max-w-xl z-10 flex-1 justify-center"
            >
              <div className="glass-panel p-6 sm:p-10 rounded-[2rem] w-full flex flex-col items-center gap-8 sm:gap-10 shadow-xl">
                <div className="text-center w-full">
                  <h2 className="text-xl sm:text-2xl opacity-80 mb-4 font-medium">Código de la Sala</h2>
                  <div className="flex items-center justify-center gap-3 sm:gap-4 bg-black/20 px-4 sm:px-8 py-4 sm:py-5 rounded-2xl border border-white/10 w-full">
                    <span className="text-4xl sm:text-5xl font-mono tracking-widest font-bold text-blue-200 drop-shadow-md">
                      {roomId}
                    </span>
                    <button
                      onClick={handleCopyCode}
                      className="p-3 sm:p-4 rounded-xl glass-button hover:bg-white/20 hover:scale-110 transition-all"
                      title="Copiar Código"
                    >
                      <Copy className="w-6 h-6 sm:w-8 sm:h-8" />
                    </button>
                  </div>
                </div>

                <div className="w-full">
                  <h3 className="text-lg sm:text-xl font-medium mb-4 flex items-center gap-3">
                    <Users className="w-5 h-5 sm:w-6 sm:h-6" /> Jugadores en sala
                  </h3>
                  <div className="flex flex-col gap-3">
                    {Object.values(room.players).map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between px-6 py-4 rounded-xl glass-panel shadow-md">
                        <span className="font-bold text-lg sm:text-xl">{p.name} {p.id === playerId ? <span className="opacity-50 font-normal">(Tú)</span> : ''}</span>
                        {p.isHost && <span className="text-xs sm:text-sm bg-purple-500/50 px-3 py-1.5 rounded-full uppercase tracking-wider font-bold">Anfitrión</span>}
                      </div>
                    ))}
                  </div>
                </div>

                {room.players[playerId]?.isHost ? (
                  <div className="w-full flex flex-col sm:flex-row gap-4 mt-2">
                    <button onClick={() => window.history.back()} className="w-full sm:flex-1 py-4 sm:py-5 rounded-2xl glass-panel text-rose-300 font-bold hover:bg-rose-500/20 transition-all hover:scale-[1.02] text-lg flex items-center justify-center gap-2">
                      <ChevronLeft className="w-6 h-6" /> Cancelar
                    </button>
                    <button
                      onClick={startGame}
                      className="w-full sm:flex-1 py-4 sm:py-5 rounded-2xl glass-button bg-blue-500/30 border-blue-400/30 font-bold disabled:opacity-50 hover:scale-[1.02] transition-all text-lg"
                    >
                      Empezar Juego
                    </button>
                  </div>
                ) : (
                  <div className="w-full flex flex-col gap-4 mt-2">
                    <p className="text-center opacity-80 text-lg animate-pulse">Esperando a que el anfitrión inicie el juego...</p>
                    <button onClick={() => window.history.back()} className="py-4 sm:py-5 rounded-2xl glass-panel text-rose-300 font-bold hover:bg-rose-500/20 transition-all hover:scale-[1.02] text-lg flex items-center justify-center gap-2">
                      <ChevronLeft className="w-6 h-6" /> Salir de la Sala
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="game-screen"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center w-full z-10 flex-1"
            >
              <div className="w-full flex flex-wrap justify-between items-center mb-6 sm:mb-10 glass-panel px-4 sm:px-8 py-4 sm:py-5 rounded-2xl max-w-5xl shadow-lg gap-4">
                <div className="flex items-center gap-3 text-xl sm:text-2xl font-bold">
                  <div className="drop-shadow-md">{GAMES.find(g => g.id === room.gameType)?.icon}</div>
                  <span className="hidden sm:inline">{GAMES.find(g => g.id === room.gameType)?.name}</span>
                </div>
                <div className="font-mono bg-black/20 px-4 sm:px-5 py-2 sm:py-3 rounded-xl text-sm sm:text-base flex items-center gap-3 font-medium">
                  <span className="opacity-70 hidden sm:inline">Sala:</span> {roomId}
                  <button onClick={handleCopyCode} className="hover:text-blue-300 transition-colors p-1"><Copy size={18}/></button>
                </div>
                <button onClick={() => window.history.back()} className="flex items-center gap-2 text-rose-300 hover:text-rose-400 hover:bg-rose-500/10 px-4 py-2 rounded-lg transition-all font-medium">
                  <ChevronLeft size={20} /> <span className="hidden md:inline">Salir al Menú</span>
                </button>
              </div>

              {Object.keys(room.players).length < 2 && (
                <WaitingForPartner onTimeout={() => window.history.back()} />
              )}

              <div className="w-full flex justify-center flex-1">
                {renderGame()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <StatsModal isOpen={showStatsModal} onClose={() => setShowStatsModal(false)} />
    </div>
  );
}
