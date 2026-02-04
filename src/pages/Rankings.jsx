import React, { useMemo } from 'react';
import { useBrolayContext } from '../contexts/BrolayContext';
import { useFilterContext } from '../contexts/FilterContext';
import { PLAYERS } from '../constants/sports';
import Card from '../components/common/Card';
import RankingsFilter from '../components/filters/RankingsFilter';
import { formatDateForDisplay, getPicksArray, getPickBigGuy, getPickResult } from '../utils/formatters';

/**
 * Rankings - Rankings & Records page showing sole survivors, streaks, and player/team/sport combinations
 *
 * Features:
 * - Sole survivors (only winner in a lost parlay)
 * - Hot/cold streaks
 * - Player/team/sport combination records
 */
const Rankings = () => {
  // Get context values
  const { parlays, isMobile } = useBrolayContext();
  const {
    rankingsFilters,
    setRankingsFilters,
    rankingsFiltersExpanded,
    setRankingsFiltersExpanded
  } = useFilterContext();
  const players = PLAYERS;

  // Apply filters to parlays
  const filteredParlays = useMemo(() => {
    return parlays.filter(parlay => {
      // Date filters
      if (rankingsFilters.dateFrom && parlay.date < rankingsFilters.dateFrom) return false;
      if (rankingsFilters.dateTo && parlay.date > rankingsFilters.dateTo) return false;

      // Player filter (multi-select) - check if ANY pick matches selected players
      if (rankingsFilters.players && rankingsFilters.players.length > 0) {
        const picks = getPicksArray(parlay);
        const hasMatchingPlayer = picks.some(p =>
          rankingsFilters.players.includes(getPickBigGuy(p))
        );
        if (!hasMatchingPlayer) return false;
      }

      // Sport filter (multi-select) - check if ANY pick matches selected sports
      if (rankingsFilters.sports && rankingsFilters.sports.length > 0) {
        const picks = getPicksArray(parlay);
        const hasMatchingSport = picks.some(p =>
          rankingsFilters.sports.includes(p.sport)
        );
        if (!hasMatchingSport) return false;
      }

      return true;
    });
  }, [parlays, rankingsFilters]);

  // Use filteredParlays instead of parlays for all calculations
  const parlaysToUse = filteredParlays;
  const minSampleSize = rankingsFilters.minSampleSize || 10;

  // Clear all filters
  const handleClearFilters = () => {
    setRankingsFilters({
      dateFrom: '',
      dateTo: '',
      players: [],
      sports: [],
      minSampleSize: 10
    });
  };

  // Memoize Sole Survivors calculation
  const soleSurvivors = useMemo(() => {
    const survivors = {};
    players.forEach(player => { survivors[player] = 0; });

    parlaysToUse.forEach(parlay => {
      const picks = getPicksArray(parlay);
      const winners = picks.filter(p => getPickResult(p) === 'win');
      const losers = picks.filter(p => getPickResult(p) === 'loss');

      if (winners.length === 1 && losers.length > 0) {
        const survivor = getPickBigGuy(winners[0]);
        if (survivor) survivors[survivor]++;
      }
    });

    return survivors;
  }, [parlaysToUse, players]);

  // Memoize Hot/Cold Streaks calculation
  const { currentStreaks, allTimeStreaks } = useMemo(() => {
    const playerPicks = {};
    players.forEach(player => { playerPicks[player] = []; });

    // Get all picks chronologically - sort by date first, then by sortOrder/firestoreId/id for same-day brolays
    const sortedParlays = [...parlaysToUse].sort((a, b) => {
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
      const picks = getPicksArray(parlay);
      picks.forEach(p => {
        const bigGuy = getPickBigGuy(p);
        const result = getPickResult(p);
        if (bigGuy && result !== 'pending') {
          // Support both direct fields and nested game object
          const awayTeam = p.awayTeam || p.game?.awayTeam || '';
          const homeTeam = p.homeTeam || p.game?.homeTeam || '';
          playerPicks[bigGuy].push({
            result: result,
            date: parlay.date,
            parlayId: parlay.id,
            sport: p.sport,
            team: p.team || `${awayTeam} @ ${homeTeam}`
          });
        }
      });
    });

    // Calculate current and all-time streaks
    const currentStreaksResult = { hot: [], cold: [] };
    const allTimeStreaksResult = { hot: [], cold: [] };

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

        currentStreaksResult[currentType].push(streakData);
      }

      // All-time streaks
      let streak = 0;
      let streakType = null;
      let streakStart = null;
      let streakEnd = null;

      picks.forEach((pick, idx) => {
        const result = getPickResult(pick);
        const isWin = result === 'win';
        const isPush = result === 'push';

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
            allTimeStreaksResult[streakType].push({
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
          allTimeStreaksResult[streakType].push({
            player,
            count: streak,
            startDate: streakStart,
            endDate: streakEnd
          });
        }
      });
    });

    currentStreaksResult.hot.sort((a, b) => b.count - a.count);
    currentStreaksResult.cold.sort((a, b) => b.count - a.count);
    allTimeStreaksResult.hot.sort((a, b) => b.count - a.count);
    allTimeStreaksResult.cold.sort((a, b) => b.count - a.count);

    return { currentStreaks: currentStreaksResult, allTimeStreaks: allTimeStreaksResult };
  }, [parlaysToUse, players]);

  // Memoize Player/Sport Combinations calculation
  const { topCombos, worstCombos } = useMemo(() => {
    const playerSportCombos = {};
    parlaysToUse.forEach(parlay => {
      const picks = getPicksArray(parlay);
      picks.forEach(p => {
        const bigGuy = getPickBigGuy(p);
        const result = getPickResult(p);
        if (!bigGuy || !p.sport || result === 'pending') return;

        const key = `${bigGuy}-${p.sport}`;
        if (!playerSportCombos[key]) {
          playerSportCombos[key] = {
            player: bigGuy,
            sport: p.sport,
            wins: 0,
            losses: 0,
            pushes: 0,
            total: 0
          };
        }

        playerSportCombos[key].total++;
        if (result === 'win') playerSportCombos[key].wins++;
        else if (result === 'loss') playerSportCombos[key].losses++;
        else if (result === 'push') playerSportCombos[key].pushes++;
      });
    });

    const combosWithMin10 = Object.values(playerSportCombos)
      .filter(combo => combo.total >= minSampleSize)
      .map(combo => {
        const adjustedWins = combo.wins + (combo.pushes * 0.5);
        return {
          ...combo,
          winPct: (adjustedWins / combo.total) * 100
        };
      });

    return {
      topCombos: [...combosWithMin10].sort((a, b) => b.winPct - a.winPct).slice(0, 5),
      worstCombos: [...combosWithMin10].sort((a, b) => a.winPct - b.winPct).slice(0, 5)
    };
  }, [parlaysToUse, minSampleSize]);

  // Memoize Most Picked Teams/Players calculation
  const topTeams = useMemo(() => {
    const teamCounts = {};
    parlaysToUse.forEach(parlay => {
      const picks = getPicksArray(parlay);
      picks.forEach(p => {
        // Support both direct fields and nested game object
        const team = p.team;
        const awayTeam = p.awayTeam || p.game?.awayTeam;
        const homeTeam = p.homeTeam || p.game?.homeTeam;

        if (team) {
          teamCounts[team] = (teamCounts[team] || 0) + 1;
        }
        if (awayTeam) {
          teamCounts[awayTeam] = (teamCounts[awayTeam] || 0) + 1;
        }
        if (homeTeam) {
          teamCounts[homeTeam] = (teamCounts[homeTeam] || 0) + 1;
        }
      });
    });

    return Object.entries(teamCounts)
      .map(([team, count]) => ({ team, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [parlaysToUse]);

  // Memoize Player/Team Combinations calculation
  const { topPlayerTeamCombos, topPlayerTeamWinPct, worstPlayerTeamWinPct } = useMemo(() => {
    const playerTeamCombos = {};
    parlaysToUse.forEach(parlay => {
      const picks = getPicksArray(parlay);
      picks.forEach(p => {
        const bigGuy = getPickBigGuy(p);
        const result = getPickResult(p);
        if (!bigGuy || result === 'pending') return;

        // Support both direct fields and nested game object
        const teams = [];
        if (p.team) teams.push(p.team);
        const awayTeam = p.awayTeam || p.game?.awayTeam;
        const homeTeam = p.homeTeam || p.game?.homeTeam;
        if (awayTeam) teams.push(awayTeam);
        if (homeTeam) teams.push(homeTeam);

        teams.forEach(team => {
          const key = `${bigGuy}-${team}`;
          if (!playerTeamCombos[key]) {
            playerTeamCombos[key] = {
              player: bigGuy,
              team: team,
              wins: 0,
              losses: 0,
              pushes: 0,
              total: 0
            };
          }

          playerTeamCombos[key].total++;
          if (result === 'win') playerTeamCombos[key].wins++;
          else if (result === 'loss') playerTeamCombos[key].losses++;
          else if (result === 'push') playerTeamCombos[key].pushes++;
        });
      });
    });

    const topCombos = Object.values(playerTeamCombos)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const combosWithMin5 = Object.values(playerTeamCombos)
      .filter(combo => combo.total >= 5)
      .map(combo => {
        const adjustedWins = combo.wins + (combo.pushes * 0.5);
        return {
          ...combo,
          winPct: (adjustedWins / combo.total) * 100
        };
      });

    return {
      topPlayerTeamCombos: topCombos,
      topPlayerTeamWinPct: [...combosWithMin5].sort((a, b) => b.winPct - a.winPct).slice(0, 5),
      worstPlayerTeamWinPct: [...combosWithMin5].sort((a, b) => a.winPct - b.winPct).slice(0, 5)
    };
  }, [parlaysToUse]);

  return (
    <div className="space-y-4 md:space-y-6">
      <h2 className="text-xl md:text-2xl font-bold text-yellow-400">🏆 Rankings & Records</h2>

      {/* Rankings Filter */}
      <RankingsFilter
        filters={rankingsFilters}
        setFilters={setRankingsFilters}
        onClear={handleClearFilters}
        expanded={rankingsFiltersExpanded}
        onToggle={() => setRankingsFiltersExpanded(!rankingsFiltersExpanded)}
        isMobile={isMobile}
      />

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
        <Card title="⭐ Top 5 Player/Sport Combos" subtitle={`Minimum ${minSampleSize} picks`} className="text-green-400">
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

        <Card title="⚠️ Worst 5 Player/Sport Combos" subtitle={`Minimum ${minSampleSize} picks`} className="text-red-400">
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
