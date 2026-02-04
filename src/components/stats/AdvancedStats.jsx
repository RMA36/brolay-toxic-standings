import React, { useMemo, useState } from 'react';
import { useBrolayContext } from '../../contexts/BrolayContext';
import { PLAYERS } from '../../constants/sports';
import Card from '../common/Card';
import Button from '../common/Button';
import { getPicksArray, getPickBigGuy, getPickResult } from '../../utils/formatters';

/**
 * AdvancedStats - Advanced statistics and analytics
 *
 * Features:
 * - Win rate trends over time (monthly)
 * - Head-to-head player comparison
 * - Performance by day of week
 * - Monthly performance breakdown
 */
const AdvancedStats = ({ filteredParlays = [] }) => {
  const { isMobile } = useBrolayContext();
  const players = PLAYERS;

  // Head-to-head comparison state
  const [player1, setPlayer1] = useState(players[0]);
  const [player2, setPlayer2] = useState(players[1]);

  // Calculate Win Rate Trends (monthly)
  const winRateTrends = useMemo(() => {
    const playerMonthlyStats = {};
    players.forEach(player => { playerMonthlyStats[player] = {}; });

    filteredParlays.forEach(parlay => {
      const picks = getPicksArray(parlay);
      const monthKey = parlay.date.substring(0, 7); // YYYY-MM

      picks.forEach(p => {
        const bigGuy = getPickBigGuy(p);
        const result = getPickResult(p);
        if (!bigGuy || result === 'pending') return;

        if (!playerMonthlyStats[bigGuy][monthKey]) {
          playerMonthlyStats[bigGuy][monthKey] = { wins: 0, losses: 0, pushes: 0, total: 0 };
        }

        playerMonthlyStats[bigGuy][monthKey].total++;
        if (result === 'win') playerMonthlyStats[bigGuy][monthKey].wins++;
        else if (result === 'loss') playerMonthlyStats[bigGuy][monthKey].losses++;
        else if (result === 'push') playerMonthlyStats[bigGuy][monthKey].pushes++;
      });
    });

    // Get all unique months sorted
    const allMonths = new Set();
    Object.values(playerMonthlyStats).forEach(playerStats => {
      Object.keys(playerStats).forEach(month => allMonths.add(month));
    });
    const sortedMonths = Array.from(allMonths).sort();

    // Calculate win % for each player/month
    const trends = {};
    players.forEach(player => {
      trends[player] = sortedMonths.map(month => {
        const stats = playerMonthlyStats[player][month];
        if (!stats || stats.total === 0) return { month, winPct: null, total: 0 };

        const adjustedWins = stats.wins + (stats.pushes * 0.5);
        return {
          month,
          winPct: (adjustedWins / stats.total) * 100,
          total: stats.total,
          wins: stats.wins,
          losses: stats.losses,
          pushes: stats.pushes
        };
      });
    });

    return { trends, months: sortedMonths };
  }, [filteredParlays, players]);

  // Calculate Head-to-Head Comparison
  const headToHead = useMemo(() => {
    const stats = {};
    [player1, player2].forEach(player => {
      stats[player] = {
        totalPicks: 0,
        wins: 0,
        losses: 0,
        pushes: 0,
        winPct: 0,
        bestSport: null,
        worstSport: null,
        avgPayout: 0,
        totalPayout: 0
      };
    });

    const sportStats = {};
    [player1, player2].forEach(player => { sportStats[player] = {}; });

    filteredParlays.forEach(parlay => {
      const picks = getPicksArray(parlay);

      picks.forEach(p => {
        const bigGuy = getPickBigGuy(p);
        const result = getPickResult(p);
        if (![player1, player2].includes(bigGuy) || result === 'pending') return;

        stats[bigGuy].totalPicks++;
        if (result === 'win') stats[bigGuy].wins++;
        else if (result === 'loss') stats[bigGuy].losses++;
        else if (result === 'push') stats[bigGuy].pushes++;

        // Sport breakdown
        if (!sportStats[bigGuy][p.sport]) {
          sportStats[bigGuy][p.sport] = { wins: 0, total: 0 };
        }
        sportStats[bigGuy][p.sport].total++;
        if (result === 'win') sportStats[bigGuy][p.sport].wins++;

        // Payout tracking (only for wins on parlays)
        if (parlay.result === 'win' && parlay.payout) {
          stats[bigGuy].totalPayout += parlay.payout;
        }
      });
    });

    // Calculate final stats
    [player1, player2].forEach(player => {
      const adjustedWins = stats[player].wins + (stats[player].pushes * 0.5);
      stats[player].winPct = stats[player].totalPicks > 0
        ? (adjustedWins / stats[player].totalPicks) * 100
        : 0;

      stats[player].avgPayout = stats[player].wins > 0
        ? stats[player].totalPayout / stats[player].wins
        : 0;

      // Find best/worst sports
      const sports = Object.entries(sportStats[player])
        .filter(([, s]) => s.total >= 3)
        .map(([sport, s]) => ({ sport, winPct: (s.wins / s.total) * 100, total: s.total }))
        .sort((a, b) => b.winPct - a.winPct);

      stats[player].bestSport = sports[0] || null;
      stats[player].worstSport = sports[sports.length - 1] || null;
    });

    return stats;
  }, [filteredParlays, player1, player2]);

  // Calculate Performance by Day of Week
  const dayOfWeekStats = useMemo(() => {
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const playerDayStats = {};
    players.forEach(player => {
      playerDayStats[player] = {};
      daysOfWeek.forEach(day => {
        playerDayStats[player][day] = { wins: 0, losses: 0, pushes: 0, total: 0 };
      });
    });

    filteredParlays.forEach(parlay => {
      const picks = getPicksArray(parlay);
      const date = new Date(parlay.date);
      const dayName = daysOfWeek[date.getDay()];

      picks.forEach(p => {
        const bigGuy = getPickBigGuy(p);
        const result = getPickResult(p);
        if (!bigGuy || result === 'pending') return;

        playerDayStats[bigGuy][dayName].total++;
        if (result === 'win') playerDayStats[bigGuy][dayName].wins++;
        else if (result === 'loss') playerDayStats[bigGuy][dayName].losses++;
        else if (result === 'push') playerDayStats[bigGuy][dayName].pushes++;
      });
    });

    // Calculate win % for each player/day
    const dayStats = {};
    players.forEach(player => {
      dayStats[player] = daysOfWeek.map(day => {
        const stats = playerDayStats[player][day];
        const adjustedWins = stats.wins + (stats.pushes * 0.5);
        const winPct = stats.total > 0 ? (adjustedWins / stats.total) * 100 : 0;
        return { day, winPct, ...stats };
      });
    });

    return dayStats;
  }, [filteredParlays, players]);

  // Calculate Monthly Breakdown
  const monthlyBreakdown = useMemo(() => {
    const playerMonthStats = {};
    players.forEach(player => { playerMonthStats[player] = {}; });

    filteredParlays.forEach(parlay => {
      const picks = getPicksArray(parlay);
      const monthKey = parlay.date.substring(0, 7); // YYYY-MM

      picks.forEach(p => {
        const bigGuy = getPickBigGuy(p);
        const result = getPickResult(p);
        if (!bigGuy || result === 'pending') return;

        if (!playerMonthStats[bigGuy][monthKey]) {
          playerMonthStats[bigGuy][monthKey] = {
            wins: 0,
            losses: 0,
            pushes: 0,
            total: 0,
            winningParlays: 0,
            losingParlays: 0,
            totalPayout: 0
          };
        }

        playerMonthStats[bigGuy][monthKey].total++;
        if (result === 'win') playerMonthStats[bigGuy][monthKey].wins++;
        else if (result === 'loss') playerMonthStats[bigGuy][monthKey].losses++;
        else if (result === 'push') playerMonthStats[bigGuy][monthKey].pushes++;
      });

      // Track parlay-level stats
      const picks2 = getPicksArray(parlay);
      picks2.forEach(p => {
        const bigGuy = getPickBigGuy(p);
        if (!bigGuy) return;

        const monthKey = parlay.date.substring(0, 7);
        if (playerMonthStats[bigGuy][monthKey]) {
          if (parlay.result === 'win') {
            playerMonthStats[bigGuy][monthKey].totalPayout += parlay.payout || 0;
          }
        }
      });
    });

    // Format for display
    const breakdown = {};
    players.forEach(player => {
      breakdown[player] = Object.entries(playerMonthStats[player])
        .map(([month, stats]) => {
          const adjustedWins = stats.wins + (stats.pushes * 0.5);
          const winPct = stats.total > 0 ? (adjustedWins / stats.total) * 100 : 0;
          return { month, winPct, ...stats };
        })
        .sort((a, b) => b.month.localeCompare(a.month));
    });

    return breakdown;
  }, [filteredParlays, players]);

  const hasData = filteredParlays.length > 0;

  return (
    <div className="space-y-4 md:space-y-6">
      <h2 className="text-xl md:text-2xl font-bold text-yellow-400">📊 Advanced Statistics</h2>

      {/* Win Rate Trends Over Time */}
      <Card title="📈 Win Rate Trends" subtitle="Monthly win percentage over time">
        {hasData && winRateTrends.months.length > 0 ? (
          <div className="space-y-4">
            {players.map(player => {
              const playerTrends = winRateTrends.trends[player].filter(t => t.total > 0);
              if (playerTrends.length === 0) return null;

              return (
                <div key={player} className="space-y-2">
                  <h4 className="font-semibold text-yellow-400">{player}</h4>
                  <div className="space-y-1">
                    {playerTrends.map(trend => (
                      <div key={trend.month} className="flex items-center justify-between p-2 bg-gray-900/50 rounded border border-gray-700">
                        <span className="text-sm text-gray-300">{trend.month}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-400">
                            {trend.wins}-{trend.losses} ({trend.total} picks)
                          </span>
                          <span className={`text-sm font-bold ${trend.winPct >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                            {trend.winPct.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-300 text-center py-4">Not enough data yet</p>
        )}
      </Card>

      {/* Head-to-Head Comparison */}
      <Card title="⚔️ Head-to-Head Comparison" subtitle="Compare two players side by side">
        <div className="space-y-4">
          {/* Player Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="h2h-player1" className="block text-sm font-medium mb-1 text-gray-300">
                Player 1
              </label>
              <select
                id="h2h-player1"
                value={player1}
                onChange={(e) => setPlayer1(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                style={{ fontSize: isMobile ? '16px' : '14px' }}
              >
                {players.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="h2h-player2" className="block text-sm font-medium mb-1 text-gray-300">
                Player 2
              </label>
              <select
                id="h2h-player2"
                value={player2}
                onChange={(e) => setPlayer2(e.target.value)}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                style={{ fontSize: isMobile ? '16px' : '14px' }}
              >
                {players.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* Comparison Table */}
          {hasData ? (
            <div className="grid grid-cols-2 gap-3">
              {[player1, player2].map((player, idx) => (
                <div key={player} className={`p-4 rounded border ${idx === 0 ? 'bg-blue-900/20 border-blue-500/30' : 'bg-purple-900/20 border-purple-500/30'}`}>
                  <h4 className={`font-bold mb-3 ${idx === 0 ? 'text-blue-400' : 'text-purple-400'}`}>{player}</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Picks:</span>
                      <span className="text-white font-semibold">{headToHead[player].totalPicks}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Record:</span>
                      <span className="text-white font-semibold">
                        {headToHead[player].wins}-{headToHead[player].losses}
                        {headToHead[player].pushes > 0 && `-${headToHead[player].pushes}`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Win Rate:</span>
                      <span className={`font-bold ${headToHead[player].winPct >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                        {headToHead[player].winPct.toFixed(1)}%
                      </span>
                    </div>
                    {headToHead[player].bestSport && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Best Sport:</span>
                        <span className="text-green-400 font-semibold">
                          {headToHead[player].bestSport.sport} ({headToHead[player].bestSport.winPct.toFixed(0)}%)
                        </span>
                      </div>
                    )}
                    {headToHead[player].worstSport && headToHead[player].worstSport.sport !== headToHead[player].bestSport?.sport && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Worst Sport:</span>
                        <span className="text-red-400 font-semibold">
                          {headToHead[player].worstSport.sport} ({headToHead[player].worstSport.winPct.toFixed(0)}%)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-300 text-center py-4">Not enough data yet</p>
          )}
        </div>
      </Card>

      {/* Performance by Day of Week */}
      <Card title="📅 Performance by Day" subtitle="Win rate by day of the week">
        {hasData ? (
          <div className="space-y-4">
            {players.map(player => {
              const playerDays = dayOfWeekStats[player].filter(d => d.total > 0);
              if (playerDays.length === 0) return null;

              return (
                <div key={player} className="space-y-2">
                  <h4 className="font-semibold text-yellow-400">{player}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
                    {dayOfWeekStats[player].map(day => (
                      <div
                        key={day.day}
                        className={`p-2 rounded border text-center ${
                          day.total === 0
                            ? 'bg-gray-900/30 border-gray-700 opacity-50'
                            : day.winPct >= 50
                            ? 'bg-green-900/20 border-green-500/30'
                            : 'bg-red-900/20 border-red-500/30'
                        }`}
                      >
                        <div className="text-xs font-semibold text-gray-300 mb-1">{day.day.substring(0, 3)}</div>
                        {day.total > 0 ? (
                          <>
                            <div className={`text-lg font-bold ${day.winPct >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                              {day.winPct.toFixed(0)}%
                            </div>
                            <div className="text-xs text-gray-400">
                              {day.wins}-{day.losses}
                            </div>
                          </>
                        ) : (
                          <div className="text-sm text-gray-500">-</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-300 text-center py-4">Not enough data yet</p>
        )}
      </Card>

      {/* Monthly Breakdown */}
      <Card title="📆 Monthly Breakdown" subtitle="Performance statistics by month">
        {hasData ? (
          <div className="space-y-4">
            {players.map(player => {
              const playerMonths = monthlyBreakdown[player];
              if (playerMonths.length === 0) return null;

              return (
                <div key={player} className="space-y-2">
                  <h4 className="font-semibold text-yellow-400">{player}</h4>
                  <div className="space-y-1">
                    {playerMonths.map(month => (
                      <div key={month.month} className="flex items-center justify-between p-3 bg-gray-900/50 rounded border border-gray-700">
                        <div className="flex-1">
                          <div className="font-semibold text-white">{month.month}</div>
                          <div className="text-xs text-gray-400">
                            {month.wins}-{month.losses}{month.pushes > 0 && `-${month.pushes}`} ({month.total} picks)
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-bold ${month.winPct >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                            {month.winPct.toFixed(1)}%
                          </div>
                          {month.totalPayout > 0 && (
                            <div className="text-xs text-green-400">
                              +${month.totalPayout.toFixed(2)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-300 text-center py-4">Not enough data yet</p>
        )}
      </Card>
    </div>
  );
};

export default AdvancedStats;
