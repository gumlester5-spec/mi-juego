import { useState, useEffect } from 'react';

export type GameStats = {
  wins: number;
  losses: number;
  draws: number;
};

export type OpponentStats = {
  opponentName: string;
  total: GameStats;
  games: {
    [gameId: string]: GameStats;
  };
};

export type UserStats = {
  [opponentId: string]: OpponentStats;
};

const STATS_KEY = 'liquid_games_user_stats';

export const getStats = (): UserStats => {
  try {
    const data = localStorage.getItem(STATS_KEY);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error('Error reading stats from local storage', e);
  }
  return {};
};

export const saveStats = (stats: UserStats) => {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (e) {
    console.error('Error saving stats to local storage', e);
  }
};

export const recordMatchResult = (opponentId: string, opponentName: string, gameType: string, result: 'win' | 'loss' | 'draw') => {
  const stats = getStats();
  
  if (!stats[opponentId]) {
    stats[opponentId] = {
      opponentName,
      total: { wins: 0, losses: 0, draws: 0 },
      games: {}
    };
  } else {
    // Update the opponent's name in case they changed it
    stats[opponentId].opponentName = opponentName;
  }

  const oppStats = stats[opponentId];
  
  if (!oppStats.games[gameType]) {
    oppStats.games[gameType] = { wins: 0, losses: 0, draws: 0 };
  }

  if (result === 'win') {
    oppStats.total.wins++;
    oppStats.games[gameType].wins++;
  } else if (result === 'loss') {
    oppStats.total.losses++;
    oppStats.games[gameType].losses++;
  } else if (result === 'draw') {
    oppStats.total.draws++;
    oppStats.games[gameType].draws++;
  }

  saveStats(stats);
};
