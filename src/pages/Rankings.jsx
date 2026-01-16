import React from 'react';
import Card from '../components/common/Card';
import { formatDateForDisplay } from '../utils/formatters';

/**
 * Rankings - Rankings & Records page showing sole survivors, streaks, and player/team/sport combinations
 *
 * @param {Object} props
 * @param {Array} props.parlays - Array of parlay objects (already filtered)
 * @param {Array} props.players - Array of player names
 */
const Rankings = ({ parlays, players }) => {
  // Calculate Sole Survivors
  const soleSurvivors = {};
  players.forEach(player => { soleSurvivors[player] = 0; });

  parlays.forEach(parlay => {
    const participants = Object.values(parlay.participants);
    const winners = participants.filter(p => p.result === 'win');
    const losers = participants.filter(p => p.result === 'loss');

    if (winners.length === 1 && losers.length > 0) {
      const survivor = winners[0].player;
      if (survivor) soleSurvivors[survivor]++;
    }
  });

  // Calculate Hot/Cold Streaks
  const getStreaks = () => {
    const playerPicks = {};
    players.forEach(player => { playerPicks[player] = []; });

    // Get all picks chronologically - sort by date first, then by sortOrder/firestoreId/id for same-day brolays
    const sortedParlays = [...parlays].sort((a, b) => {
      const dateCompare = new Date(a.date) - new Date(b.date);
      if (dateCompare !== 0) return dateCompare;
      // If dates are the same, use sortOrder if available, otherwise fall back to firestoreId/id
      if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
        return a.sortOrder - b.sortOrder;
      }
      const aKey = a.id || a.id;
      const bKey = b.id || b.id;
      return String(aKey).localeCompare(String(bKey));
    });

    sortedParlays.forEach(parlay => {
      Object.values(parlay.participants).forEach(p => {
        if (p.player && p.result !== 'pending') {
          playerPicks[p.player].push({
            result: p.result,
            date: parlay.date,
            parlayId: parlay.id,
            sport: p.sport,
            team: p.team || `${p.awayTeam} @ ${p.homeTeam}`
          });
        }
      });
    });

    // Calculate current and all-time streaks
    const currentStreaks = { hot: [], cold: [] };
    const allTimeStreaks = { hot: [], cold: [] };

    players.forEach(player => {
      const picks = playerPicks[player];
      if (picks.length === 0) return;

      // Current streak
      let currentStreak = 0;
      let currentType = null;
      let lastOppositeDate = null;

      for (let i = picks.length - 1; i >= 0; i--) {
        const isWin = picks[i].result === 'win';
        const isPush = picks[i].result === 'push';

        if (isPush) continue;

        if (currentType === null) {
          currentType = isWin ? 'hot' : 'cold';
          currentStreak = 1;
        } else if ((currentType === 'hot' && isWin) || (currentType === 'cold' && !isWin)) {
          currentStreak++;
        } else {
          lastOppositeDate = picks[i].date;
          break;
        }
      }

      if (currentStreak > 0) {
        const streakData = {
          player,
          count: currentStreak,
          lastDate: picks[picks.length - 1].date
        };

        if (currentType === 'hot') {
          streakData.lastLossDate = lastOppositeDate;
        } else {
          streakData.lastWinDate = lastOppositeDate;
        }

        currentStreaks[currentType].push(streakData);
      }

      // All-time streaks
      let streak = 0;
      let streakType = null;
      let streakStart = null;
      let streakEnd = null;

      picks.forEach((pick, idx) => {
        const isWin = pick.result === 'win';
        const isPush = pick.result === 'push';

        if (isPush) return;

        if (streakType === null || ((streakType === 'hot' && isWin) || (streakType === 'cold' && !isWin))) {
          if (streakType === null) {
            streakType = isWin ? 'hot' : 'cold';
            streakStart = pick.date;
          }
          streak++;
          streakEnd = pick.date;
        } else {
          if (streak >= 3) {
            allTimeStreaks[streakType].push({
              player,
              count: streak,
              startDate: streakStart,
              endDate: streakEnd
            });
          }
          streakType = isWin ? 'hot' : 'cold';
          streak = 1;
          streakStart = pick.date;
          streakEnd = pick.date;
        }

        if (idx === picks.length - 1 && streak >= 3) {
          allTimeStreaks[streakType].push({
            player,
            count: streak,
            startDate: streakStart,
            endDate: streakEnd
          });
        }
      });
    });

    currentStreaks.hot.sort((a, b) => b.count - a.count);
    currentStreaks.cold.sort((a, b) => b.count - a.count);
    allTimeStreaks.hot.sort((a, b) => b.count - a.count);
    allTimeStreaks.cold.sort((a, b) => b.count - a.count);

    return { currentStreaks, allTimeStreaks };
  };

  const { currentStreaks, allTimeStreaks } = getStreaks();

  // Calculate Player/Sport Combinations
  const playerSportCombos = {};
  parlays.forEach(parlay => {
    Object.values(parlay.participants).forEach(p => {
      if (!p.player || !p.sport || p.result === 'pending') return;

      const key = `${p.player}-${p.sport}`;
      if (!playerSportCombos[key]) {
        playerSportCombos[key] = {
          player: p.player,
          sport: p.sport,
          wins: 0,
          losses: 0,
          pushes: 0,
          total: 0
        };
      }

      playerSportCombos[key].total++;
      if (p.result === 'win') playerSportCombos[key].wins++;
      else if (p.result === 'loss') playerSportCombos[key].losses++;
      else if (p.result === 'push') playerSportCombos[key].pushes++;
    });
  });

  const combosWithMin10 = Object.values(playerSportCombos)
    .filter(combo => combo.total >= 10)
    .map(combo => {
      const adjustedWins = combo.wins + (combo.pushes * 0.5);
      return {
        ...combo,
        winPct: (adjustedWins / combo.total) * 100
      };
    });

  const topCombos = [...combosWithMin10].sort((a, b) => b.winPct - a.winPct).slice(0, 5);
  const worstCombos = [...combosWithMin10].sort((a, b) => a.winPct - b.winPct).slice(0, 5);

  // Most Picked Teams/Players
  const teamCounts = {};
  parlays.forEach(parlay => {
    Object.values(parlay.participants).forEach(p => {
      if (p.team) {
        teamCounts[p.team] = (teamCounts[p.team] || 0) + 1;
      }
      if (p.awayTeam) {
        teamCounts[p.awayTeam] = (teamCounts[p.awayTeam] || 0) + 1;
      }
      if (p.homeTeam) {
        teamCounts[p.homeTeam] = (teamCounts[p.homeTeam] || 0) + 1;
      }
    });
  });

  const topTeams = Object.entries(teamCounts)
    .map(([team, count]) => ({ team, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Player/Team Combinations
  const playerTeamCombos = {};
  parlays.forEach(parlay => {
    Object.values(parlay.participants).forEach(p => {
      if (!p.player || p.result === 'pending') return;

      const teams = [];
      if (p.team) teams.push(p.team);
      if (p.awayTeam) teams.push(p.awayTeam);
      if (p.homeTeam) teams.push(p.homeTeam);

      teams.forEach(team => {
        const key = `${p.player}-${team}`;
        if (!playerTeamCombos[key]) {
          playerTeamCombos[key] = {
            player: p.player,
            team: team,
            wins: 0,
            losses: 0,
            pushes: 0,
            total: 0
          };
        }

        playerTeamCombos[key].total++;
        if (p.result === 'win') playerTeamCombos[key].wins++;
        else if (p.result === 'loss') playerTeamCombos[key].losses++;
        else if (p.result === 'push') playerTeamCombos[key].pushes++;
      });
    });
  });

  const topPlayerTeamCombos = Object.values(playerTeamCombos)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const playerTeamCombosWithMin5 = Object.values(playerTeamCombos)
    .filter(combo => combo.total >= 5)
    .map(combo => {
      const adjustedWins = combo.wins + (combo.pushes * 0.5);
      return {
        ...combo,
        winPct: (adjustedWins / combo.total) * 100
      };
    });

  const topPlayerTeamWinPct = [...playerTeamCombosWithMin5]
    .sort((a, b) => b.winPct - a.winPct)
    .slice(0, 5);

  const worstPlayerTeamWinPct = [...playerTeamCombosWithMin5]
    .sort((a, b) => a.winPct - b.winPct)
    .slice(0, 5);

  return (
    <div className="space-y-4 md:space-y-6">
      <h2 className="text-xl md:text-2xl font-bold text-yellow-400">🏆 Rankings & Records</h2>

      {/* Sole Survivors */}
      <Card title="💪 Sole Survivors" subtitle="Only winner when everyone else lost">
        <div className="space-y-2">
          {Object.entries(soleSurvivors)
            .sort(([, a], [, b]) => b - a)
            .map(([player, count], idx) => (
              <div key={player} className="flex items-center justify-between p-3 bg-gray-900/50 border border-gray-700 rounded">
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-gray-400">#{idx + 1}</span>
                  <span className="font-semibold text-yellow-400">{player}</span>
                </div>
                <span className="text-xl font-bold text-yellow-400">{count}</span>
              </div>
            ))}
        </div>
      </Card>

      {/* Current Streaks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="🔥 Current Hot Streak" className="text-green-400">
          {currentStreaks.hot.length > 0 ? (
            <div className="space-y-2">
              {currentStreaks.hot.slice(0, 3).map((streak, idx) => (
                <div key={idx} className="p-3 bg-green-900/20 rounded border border-green-500/30">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-white">{streak.player}</span>
                    <span className="text-xl font-bold text-green-400">{streak.count} wins</span>
                  </div>
                  <div className="text-xs text-gray-400">Last loss: {formatDateForDisplay(streak.lastLossDate || 'Never')}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-300 text-center py-4">No active hot streaks</p>
          )}
        </Card>

        <Card title="❄️ Current Cold Streak" className="text-red-400">
          {currentStreaks.cold.length > 0 ? (
            <div className="space-y-2">
              {currentStreaks.cold.slice(0, 3).map((streak, idx) => (
                <div key={idx} className="p-3 bg-red-900/20 rounded border border-red-500/30">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-white">{streak.player}</span>
                    <span className="text-xl font-bold text-red-400">{streak.count} losses</span>
                  </div>
                  <div className="text-xs text-gray-400">Last win: {formatDateForDisplay(streak.lastWinDate || 'Never')}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-300 text-center py-4">No active cold streaks</p>
          )}
        </Card>
      </div>

      {/* All-Time Streaks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="📈 Top 5 Hot Streaks (All-Time)" className="text-green-400">
          {allTimeStreaks.hot.slice(0, 5).length > 0 ? (
            <div className="space-y-2">
              {allTimeStreaks.hot.slice(0, 5).map((streak, idx) => (
                <div key={idx} className="p-3 bg-green-900/20 rounded border border-green-500/30">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-white">{streak.player}</span>
                    <span className="text-lg font-bold text-green-400">{streak.count} wins</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {formatDateForDisplay(streak.startDate)} - {formatDateForDisplay(streak.endDate)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-300 text-center py-4">No streaks of 3+ yet</p>
          )}
        </Card>

        <Card title="📉 Top 5 Cold Streaks (All-Time)" className="text-red-400">
          {allTimeStreaks.cold.slice(0, 5).length > 0 ? (
            <div className="space-y-2">
              {allTimeStreaks.cold.slice(0, 5).map((streak, idx) => (
                <div key={idx} className="p-3 bg-red-900/20 rounded border border-red-500/30">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-white">{streak.player}</span>
                    <span className="text-lg font-bold text-red-400">{streak.count} losses</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {formatDateForDisplay(streak.startDate)} - {formatDateForDisplay(streak.endDate)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-300 text-center py-4">No streaks of 3+ yet</p>
          )}
        </Card>
      </div>

      {/* Player/Sport Combinations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="⭐ Top 5 Player/Sport Combos" subtitle="Minimum 10 picks" className="text-green-400">
          {topCombos.length > 0 ? (
            <div className="space-y-2">
              {topCombos.map((combo, idx) => (
                <div key={idx} className="p-3 bg-green-900/20 rounded border border-green-500/30">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-white">{combo.player} + {combo.sport}</span>
                    <span className="text-lg font-bold text-green-400">{combo.winPct.toFixed(1)}%</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {combo.wins}-{combo.losses} ({combo.total} picks)
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-300 text-center py-4">Not enough data yet</p>
          )}
        </Card>

        <Card title="⚠️ Worst 5 Player/Sport Combos" subtitle="Minimum 10 picks" className="text-red-400">
          {worstCombos.length > 0 ? (
            <div className="space-y-2">
              {worstCombos.map((combo, idx) => (
                <div key={idx} className="p-3 bg-red-900/20 rounded border border-red-500/30">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-white">{combo.player} + {combo.sport}</span>
                    <span className="text-lg font-bold text-red-400">{combo.winPct.toFixed(1)}%</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {combo.wins}-{combo.losses} ({combo.total} picks)
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-300 text-center py-4">Not enough data yet</p>
          )}
        </Card>
      </div>

      {/* Most Picked Teams */}
      <Card title="📊 Most Picked Teams" subtitle="All brolays">
        {topTeams.length > 0 ? (
          <div className="space-y-2">
            {topTeams.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-900/50 border border-gray-700 rounded">
                <div className="flex items-center gap-3">
                  <span className="text-xl font-bold text-gray-400">#{idx + 1}</span>
                  <span className="font-semibold text-white">{item.team}</span>
                </div>
                <span className="text-lg font-bold text-yellow-400">{item.count} picks</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-300 text-center py-4">No data yet</p>
        )}
      </Card>

      {/* Player/Team Combinations */}
      <Card title="🎯 Most Frequent Player/Team Combos" subtitle="All brolays">
        {topPlayerTeamCombos.length > 0 ? (
          <div className="space-y-2">
            {topPlayerTeamCombos.map((combo, idx) => (
              <div key={idx} className="p-3 bg-gray-900/50 border border-gray-700 rounded">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-white">{combo.player} + {combo.team}</span>
                  <span className="text-lg font-bold text-yellow-400">{combo.total} picks</span>
                </div>
                <div className="text-xs text-gray-400">
                  {combo.wins}-{combo.losses}{combo.pushes > 0 ? `-${combo.pushes}` : ''}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-300 text-center py-4">No data yet</p>
        )}
      </Card>

      {/* Best/Worst Player/Team Win% */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Card title="💚 Best Player/Team Win%" subtitle="Minimum 5 picks" className="text-green-400">
            {topPlayerTeamWinPct.length > 0 ? (
              <div className="space-y-2">
                {topPlayerTeamWinPct.map((combo, idx) => (
                  <div key={idx} className="p-3 bg-green-900/20 rounded border border-green-500/30">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-white">{combo.player} + {combo.team}</span>
                      <span className="text-lg font-bold text-green-400">{combo.winPct.toFixed(1)}%</span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {combo.wins}-{combo.losses}{combo.pushes > 0 ? `-${combo.pushes}` : ''} ({combo.total} picks)
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-300 text-center py-4">Not enough data yet</p>
            )}
          </Card>
        </div>

        <div>
          <Card title="💔 Worst Player/Team Win%" subtitle="Minimum 5 picks" className="text-red-400">
            {worstPlayerTeamWinPct.length > 0 ? (
              <div className="space-y-2">
                {worstPlayerTeamWinPct.map((combo, idx) => (
                  <div key={idx} className="p-3 bg-red-900/20 rounded border border-red-500/30">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-white">{combo.player} + {combo.team}</span>
                      <span className="text-lg font-bold text-red-400">{combo.winPct.toFixed(1)}%</span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {combo.wins}-{combo.losses}{combo.pushes > 0 ? `-${combo.pushes}` : ''} ({combo.total} picks)
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-300 text-center py-4">Not enough data yet</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Rankings;
