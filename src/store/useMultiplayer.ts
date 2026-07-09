import { useEffect, useState } from 'react';
import { db } from '../firebase';
import { ref, set, onValue, update, remove, get } from 'firebase/database';

export type GameType = 'tictactoe' | 'hangman' | 'checkers' | 'dotsboxes' | 'ludo' | 'gomita';

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  score?: number;
}

export interface Room {
  id: string;
  gameType: GameType;
  status: 'waiting' | 'playing' | 'finished';
  players: Record<string, Player>;
  gameState: any;
  winner?: string | null;
}

export function useMultiplayer(playerName: string, playerId: string) {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!roomId) {
      setRoom(null);
      return;
    }

    const roomRef = ref(db, `rooms/${roomId}`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setRoom(data);
      } else {
        setError('La sala ya no existe');
        setRoomId(null);
      }
    });

    return () => unsubscribe();
  }, [roomId]);

  const generateRoomCode = () => {
    return Math.floor(10000000 + Math.random() * 90000000).toString();
  };

  const createRoom = async (gameType: GameType) => {
    const newRoomId = generateRoomCode();
    const roomRef = ref(db, `rooms/${newRoomId}`);
    
    const initialRoom: Room = {
      id: newRoomId,
      gameType,
      status: 'waiting',
      players: {
        [playerId]: { id: playerId, name: playerName || 'Jugador 1', isHost: true }
      },
      gameState: getInitialGameState(gameType)
    };

    await set(roomRef, initialRoom);
    setRoomId(newRoomId);
  };

  const joinRoom = async (code: string) => {
    const roomRef = ref(db, `rooms/${code}`);
    const snapshot = await get(roomRef);
    
    if (snapshot.exists()) {
      const roomData = snapshot.val() as Room;
      if (roomData.status === 'waiting' || Object.keys(roomData.players).length < getMaxPlayers(roomData.gameType)) {
        await update(ref(db, `rooms/${code}/players`), {
          [playerId]: { id: playerId, name: playerName || `Jugador ${Object.keys(roomData.players).length + 1}`, isHost: false }
        });
        setRoomId(code);
        setError('');
      } else {
        setError('La sala está llena o el juego ya empezó');
      }
    } else {
      setError('Código de sala inválido');
    }
  };

  const leaveRoom = async () => {
    if (!roomId || !room) return;
    
    if (room.players[playerId]?.isHost) {
      // Host leaves -> destroy room
      await remove(ref(db, `rooms/${roomId}`));
    } else {
      // Player leaves
      await remove(ref(db, `rooms/${roomId}/players/${playerId}`));
    }
    
    setRoomId(null);
  };

  const startGame = async () => {
    if (!roomId || !room || !room.players[playerId]?.isHost) return;
    await update(ref(db, `rooms/${roomId}`), { status: 'playing' });
  };

  const updateGameState = async (newState: any) => {
    if (!roomId) return;
    await update(ref(db, `rooms/${roomId}/gameState`), newState);
  };

  const clearError = () => setError('');

  return {
    roomId,
    room,
    playerId,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    updateGameState,
    clearError
  };
}

function getInitialGameState(gameType: GameType) {
  switch (gameType) {
    case 'tictactoe': return { phase: 'rps', rpsChoices: {}, rpsWinner: null, board: Array(9).fill(null), turn: 0, winner: null, winningLine: null };
    case 'hangman': return { word: '', guessedLetters: [], wrongGuesses: 0, maxWrong: 6, turn: 0, status: 'setup' };
    case 'dotsboxes': return { horizontalLines: {}, verticalLines: {}, boxes: {}, turn: 0, scores: {0:0, 1:0} };
    case 'checkers': return { board: [], turn: 0 };
    case 'ludo': return { 
      tokens: {
        0: [-1, -1, -1, -1],
        1: [-1, -1, -1, -1]
      },
      turn: 0, 
      diceValue: 1,
      diceRolled: false,
      consecutiveSixes: 0,
      status: 'playing',
      winner: null
    };
    case 'gomita': return { status: 'coming_soon' };
    default: return {};
  }
}

function getMaxPlayers(gameType: GameType) {
  switch (gameType) {
    case 'ludo': return 4;
    default: return 2;
  }
}
