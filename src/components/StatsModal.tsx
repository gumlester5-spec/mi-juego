import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, BarChart2, ChevronRight, ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getStats, OpponentStats, GameStats, UserStats } from '../lib/stats';
import { cn } from '../lib/utils';

export function StatsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [stats, setStats] = useState<UserStats>({});
  const [expandedOpponent, setExpandedOpponent] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setStats(getStats());
    }
  }, [isOpen]);

  const statEntries = Object.entries(stats) as [string, OpponentStats][];
  const totalMatches = statEntries.reduce((acc, [, opp]) => acc + opp.total.wins + opp.total.losses + opp.total.draws, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-panel w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col rounded-3xl shadow-2xl relative"
            >
              <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-500/20 rounded-xl">
                    <BarChart2 className="w-6 h-6 text-blue-300" />
                  </div>
                  <h2 className="text-2xl font-bold">Estadísticas</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 p-6 space-y-6 custom-scrollbar">
                {statEntries.length === 0 ? (
                  <div className="text-center py-12 text-white/50 flex flex-col items-center">
                    <BarChart2 className="w-16 h-16 mb-4 opacity-50" />
                    <p className="text-lg">Aún no has jugado partidas.</p>
                    <p className="text-sm">¡Comienza a jugar para ver tus estadísticas aquí!</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-4 mb-8">
                      {['Victorias', 'Derrotas', 'Empates'].map((label, idx) => {
                        const count = statEntries.reduce((acc, [, opp]) => acc + (idx === 0 ? opp.total.wins : idx === 1 ? opp.total.losses : opp.total.draws), 0);
                        const colors = ['text-green-400', 'text-rose-400', 'text-yellow-400'];
                        return (
                          <div key={label} className="glass-panel p-4 rounded-2xl flex flex-col items-center justify-center text-center">
                            <span className="text-sm text-white/70 font-medium mb-1">{label}</span>
                            <span className={cn("text-3xl sm:text-4xl font-black drop-shadow-md", colors[idx])}>
                              {count}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <h3 className="text-xl font-bold mb-4 opacity-90">Rivalidades</h3>
                    <div className="space-y-4">
                      {statEntries.map(([oppId, oppStats]) => {
                        const isExpanded = expandedOpponent === oppId;
                        const totalOpp = oppStats.total.wins + oppStats.total.losses + oppStats.total.draws;
                        
                        return (
                          <div key={oppId} className="glass-panel rounded-2xl overflow-hidden transition-all duration-300">
                            <button
                              onClick={() => setExpandedOpponent(isExpanded ? null : oppId)}
                              className="w-full p-5 flex items-center justify-between hover:bg-white/5 transition-colors"
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/40 to-blue-500/40 flex items-center justify-center font-bold text-xl border border-white/20">
                                  {oppStats.opponentName.charAt(0).toUpperCase()}
                                </div>
                                <div className="text-left">
                                  <div className="font-bold text-lg">{oppStats.opponentName}</div>
                                  <div className="text-sm text-white/50">{totalOpp} partidas jugadas</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-6">
                                <div className="hidden sm:flex gap-4 text-sm font-medium">
                                  <span className="text-green-400">{oppStats.total.wins} V</span>
                                  <span className="text-rose-400">{oppStats.total.losses} D</span>
                                </div>
                                {isExpanded ? <ChevronUp className="w-5 h-5 text-white/50" /> : <ChevronDown className="w-5 h-5 text-white/50" />}
                              </div>
                            </button>

                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden bg-black/20"
                                >
                                  <div className="p-6 border-t border-white/5">
                                    <div className="h-48 w-full mb-6">
                                      <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                          data={[
                                            { name: 'Victorias', value: oppStats.total.wins, color: '#4ade80' },
                                            { name: 'Derrotas', value: oppStats.total.losses, color: '#fb7185' },
                                            { name: 'Empates', value: oppStats.total.draws, color: '#facc15' }
                                          ]}
                                          margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                                        >
                                          <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" tickLine={false} axisLine={false} />
                                          <YAxis stroke="rgba(255,255,255,0.3)" tickLine={false} axisLine={false} allowDecimals={false} />
                                          <Tooltip
                                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                            contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                          />
                                          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                            {
                                              [
                                                { name: 'Victorias', value: oppStats.total.wins, color: '#4ade80' },
                                                { name: 'Derrotas', value: oppStats.total.losses, color: '#fb7185' },
                                                { name: 'Empates', value: oppStats.total.draws, color: '#facc15' }
                                              ].map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                              ))
                                            }
                                          </Bar>
                                        </BarChart>
                                      </ResponsiveContainer>
                                    </div>
                                    
                                    <h4 className="font-semibold text-white/70 mb-3 text-sm uppercase tracking-wider">Desglose por Juego</h4>
                                    <div className="space-y-3">
                                      {Object.entries(oppStats.games).map(([gameId, gameStat]) => {
                                        const gameNames: Record<string, string> = {
                                          'tictactoe': 'Tres en Raya',
                                          'hangman': 'Verdugo',
                                          'dotsboxes': 'Puntos y Cajas',
                                          'checkers': 'Damas',
                                          'ludo': 'Ludo',
                                          'gomita': 'Gomita'
                                        };
                                        const gameName = gameNames[gameId] || gameId;
                                        const totalGame = gameStat.wins + gameStat.losses + gameStat.draws;
                                        
                                        return (
                                          <div key={gameId} className="flex items-center justify-between bg-white/5 p-3 rounded-xl text-sm">
                                            <div className="font-medium">{gameName} <span className="text-white/40 ml-1">({totalGame})</span></div>
                                            <div className="flex gap-4 font-bold">
                                              <span className="text-green-400">{gameStat.wins} V</span>
                                              <span className="text-rose-400">{gameStat.losses} D</span>
                                              {gameStat.draws > 0 && <span className="text-yellow-400">{gameStat.draws} E</span>}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
