import React from 'react';
import { useBrolayContext } from '../contexts/BrolayContext';
import { PLAYERS, SPORTS, PRELOADED_TEAMS } from '../constants/sports';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import StatCard from '../components/dashboard/StatCard';
import FilterBar from '../components/filters/FilterBar';
import { Users, TrendingUp, Award, AlertCircle, RefreshCw } from 'lucide-react';
import { formatDateForDisplay, getPicksArray, getPickBigGuy, getPickResult, getSubmittedBy } from '../utils/formatters';
import { getCurrentSportsInSeason, getCurrentDayOfWeek, findMoneyMaker, findDangerZone, getSeasonalTip, formatComboDescription } from '../insightsHelper';

/**
 * GroupDashboard - Group statistics overview with insights, calendar, and settlement tracking
 */
const GroupDashboard = () => {
  // Get context values
  const {
    parlays,
    filters,
    setFilters,
    filtersExpanded,
    setFiltersExpanded,
    learnedTeams,
    isMobile,
    handleAutoUpdate,
    autoUpdating
  } = useBrolayContext();

  const players = PLAYERS;
  const sports = SPORTS;
  const preloadedTeams = PRELOADED_TEAMS;

  // Apply filters to parlays (supports both old and new schemas)
  const applyFilters = (parlayList) => {
    return parlayList.filter(parlay => {
      // Date filters
      if (filters.dateFrom && parlay.date < filters.dateFrom) return false;
      if (filters.dateTo && parlay.date > filters.dateTo) return false;

      // PlacedBy/SubmittedBy filter (supports both field names)
      const submittedByFilter = filters.submittedBy || filters.placedBy;
      const parlaySubmittedBy = getSubmittedBy(parlay);
      if (submittedByFilter && parlaySubmittedBy !== submittedByFilter) return false;

      // Payout filters
      if (filters.minPayout && parlay.totalPayout < parseFloat(filters.minPayout)) return false;
      if (filters.maxPayout && parlay.totalPayout > parseFloat(filters.maxPayout)) return false;

      // Settlement filter
      if (filters.result === 'settled' && !parlay.settled) return false;
      if (filters.result === 'pending' && parlay.settled) return false;

      // Participant-level filters (use helper function for dual-schema support)
      const picks = getPicksArray(parlay);

      // Player filter (supports both bigGuy and player field names)
      if (filters.player && !picks.some(p => getPickBigGuy(p) === filters.player)) return false;

      // Sport filter
      if (filters.sport && !picks.some(p => p.sport === filters.sport)) return false;

      // Team/Player filter (supports both direct fields and nested game object)
      if (filters.teamPlayer && !picks.some(p => {
        const team = p.team || '';
        const awayTeam = p.awayTeam || p.game?.awayTeam || '';
        const homeTeam = p.homeTeam || p.game?.homeTeam || '';
        return team.toLowerCase().includes(filters.teamPlayer.toLowerCase()) ||
               awayTeam.toLowerCase().includes(filters.teamPlayer.toLowerCase()) ||
               homeTeam.toLowerCase().includes(filters.teamPlayer.toLowerCase());
      })) return false;

      // Auto-updated filter
      if (filters.autoUpdated === 'yes' && !picks.some(p => p.autoUpdated === true)) return false;
      if (filters.autoUpdated === 'no' && !picks.some(p => p.autoUpdated === false)) return false;

      // Bet type filter
      if (filters.betType && !picks.some(p => p.betType === filters.betType || p.pickType === filters.betType)) return false;

      // Prop type filter (supports both propType and line.statType)
      if (filters.propType && !picks.some(p => p.propType === filters.propType || p.line?.statType === filters.propType)) return false;

      return true;
    });
  };

  const filteredParlays = applyFilters([...parlays]);

  // Count pending picks (supports both old and new schemas)
  const pendingPicksCount = filteredParlays.reduce((count, parlay) => {
    const picks = getPicksArray(parlay);
    return count + picks.filter(p => getPickResult(p) === 'pending').length;
  }, 0);

  const totalParlays = filteredParlays.length;
  const wonParlays = filteredParlays.filter(parlay => {
    const picks = getPicksArray(parlay);
    const losers = picks.filter(p => getPickResult(p) === 'loss');
    return losers.length === 0 && picks.some(p => getPickResult(p) === 'win');
  }).length;
  const lostParlays = filteredParlays.filter(parlay => {
    const picks = getPicksArray(parlay);
    return picks.some(p => getPickResult(p) === 'loss');
  }).length;
  const pendingParlays = totalParlays - wonParlays - lostParlays;
  const groupWinPct = totalParlays > 0 ? ((wonParlays / totalParlays) * 100).toFixed(1) : '0.0';

  // Calculate by sport (supports both old and new schemas)
  const bySport = {};
  filteredParlays.forEach(parlay => {
    const picks = getPicksArray(parlay);

    picks.forEach(pick => {
      if (pick.sport) {
        const result = getPickResult(pick);
        if (!bySport[pick.sport]) {
          bySport[pick.sport] = { total: 0, won: 0, lost: 0, pending: 0 };
        }
        bySport[pick.sport].total++;
        if (result === 'win') bySport[pick.sport].won++;
        else if (result === 'loss') bySport[pick.sport].lost++;
        else if (result === 'pending') bySport[pick.sport].pending++;
      }
    });
  });

  // Last 10 brolays
  const last10Brolays = [...filteredParlays]
    .sort((a, b) => {
      const dateCompare = new Date(b.date) - new Date(a.date);
      if (dateCompare !== 0) return dateCompare;
      const aKey = a.id || a.id;
      const bKey = b.id || b.id;
      return String(bKey).localeCompare(String(aKey));
    })
    .slice(0, 10);

  const last10Won = last10Brolays.filter(parlay => {
    const picks = getPicksArray(parlay);
    const losers = picks.filter(p => getPickResult(p) === 'loss');
    return losers.length === 0 && picks.some(p => getPickResult(p) === 'win');
  }).length;

  const last10Lost = last10Brolays.filter(parlay => {
    const picks = getPicksArray(parlay);
    return picks.some(p => getPickResult(p) === 'loss');
  }).length;

  // Current month stats
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthBrolays = filteredParlays.filter(p => {
    const parlayDate = new Date(p.date + 'T00:00:00');
    return parlayDate >= currentMonthStart;
  });

  const currentMonthWon = currentMonthBrolays.filter(parlay => {
    const picks = getPicksArray(parlay);
    const losers = picks.filter(p => getPickResult(p) === 'loss');
    return losers.length === 0 && picks.some(p => getPickResult(p) === 'win');
  }).length;

  const currentMonthLost = currentMonthBrolays.filter(parlay => {
    const picks = getPicksArray(parlay);
    return picks.some(p => getPickResult(p) === 'loss');
  }).length;

  // Calculate total money metrics (supports both old and new schemas)
  const totalMoneyWon = filteredParlays
    .filter(parlay => {
      const picks = getPicksArray(parlay);
      const losers = picks.filter(p => getPickResult(p) === 'loss');
      return losers.length === 0 && picks.some(p => getPickResult(p) === 'win');
    })
    .reduce((sum, parlay) => {
      const picks = getPicksArray(parlay);
      const netProfit = Math.max(0, (parlay.totalPayout || 0) - (parlay.betAmount * picks.length));
      return sum + netProfit;
    }, 0);

  const totalMoneyLost = filteredParlays
    .filter(parlay => {
      const picks = getPicksArray(parlay);
      return picks.some(p => getPickResult(p) === 'loss');
    })
    .reduce((sum, parlay) => {
      const picks = getPicksArray(parlay);
      return sum + (parlay.betAmount * picks.length);
    }, 0);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl md:text-2xl font-bold text-yellow-400">👥 Group Statistics</h2>
        {pendingPicksCount > 0 && (
          <Button
            onClick={handleAutoUpdate}
            disabled={autoUpdating}
            variant="primary"
            className={`flex items-center gap-2 ${isMobile ? 'min-h-[44px]' : ''}`}
          >
            <RefreshCw size={isMobile ? 20 : 16} className={autoUpdating ? 'animate-spin' : ''} />
            {autoUpdating ? 'Updating...' : `Auto-Update ${pendingPicksCount} Pending`}
          </Button>
        )}
      </div>


      {/* Filters - Collapsible */}
      <FilterBar
        filters={filters}
        onFilterChange={setFilters}
        onClearFilters={() => setFilters({
          dateFrom: '', dateTo: '', player: '', sport: '', teamPlayer: '',
          placedBy: '', minPayout: '', maxPayout: '', result: '', autoUpdated: ''
        })}
        isExpanded={filtersExpanded}
        onToggleExpand={() => setFiltersExpanded(!filtersExpanded)}
        players={players}
        sports={sports}
        preloadedTeams={preloadedTeams}
        learnedTeams={learnedTeams}
        isMobile={isMobile}
      />

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          icon={Users}
          iconColor="text-blue-400"
          title="Total Brolays"
          titleColor="text-blue-400"
          value={totalParlays}
          subtitle={`${wonParlays}W-${lostParlays}L`}
          variant="info"
        />

        <StatCard
          icon={TrendingUp}
          iconColor="text-green-400"
          title="Win Rate"
          titleColor="text-green-400"
          value={`${groupWinPct}%`}
          subtitle={`${wonParlays} wins out of ${totalParlays}`}
          variant="success"
        />

        <StatCard
          icon={Award}
          iconColor="text-yellow-400"
          title="Net Profit"
          titleColor="text-yellow-400"
          value={`$${(totalMoneyWon - totalMoneyLost).toFixed(0)}`}
          valueColor={(totalMoneyWon - totalMoneyLost) >= 0 ? 'text-green-400' : 'text-red-400'}
          subtitle={`$${totalMoneyWon.toFixed(0)} won, $${totalMoneyLost.toFixed(0)} lost`}
          variant="warning"
        />

        <StatCard
          icon={AlertCircle}
          iconColor="text-purple-400"
          title="Avg Payout"
          titleColor="text-purple-400"
          value={`$${wonParlays > 0 ? (totalMoneyWon / wonParlays).toFixed(0) : 0}`}
          variant="info"
          className="bg-gradient-to-br from-purple-900/30 to-gray-800 border-purple-500/30"
        />
      </div>

      {/* Recent Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl p-4 md:p-6 border border-yellow-500/20">
          <h3 className="text-lg font-bold mb-4 text-yellow-400">📅 This Month</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Brolays:</span>
              <span className="text-white font-semibold text-lg">{currentMonthBrolays.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Record:</span>
              <span className="text-white font-semibold text-lg">
                {currentMonthWon}-{currentMonthLost}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Win Rate:</span>
              <span className={`font-bold text-lg ${
                currentMonthBrolays.length > 0 && ((currentMonthWon / currentMonthBrolays.length) * 100) >= 50
                  ? 'text-green-400'
                  : 'text-red-400'
              }`}>
                {currentMonthBrolays.length > 0
                  ? ((currentMonthWon / currentMonthBrolays.length) * 100).toFixed(1)
                  : '0.0'}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl p-4 md:p-6 border border-yellow-500/20">
          <h3 className="text-lg font-bold mb-4 text-yellow-400">🔥 Last 10 Brolays</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Record:</span>
              <span className="text-white font-semibold text-lg">
                {last10Won}-{last10Lost}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Net Profit:</span>
              <span className={`font-bold text-lg ${
                (() => {
                  const last10NetProfit = last10Brolays.reduce((sum, parlay) => {
                    const picks = getPicksArray(parlay);
                    const losers = picks.filter(p => getPickResult(p) === 'loss');
                    const winners = picks.filter(p => getPickResult(p) === 'win');
                    const won = losers.length === 0 && winners.length > 0;

                    if (won) {
                      return sum + ((parlay.totalPayout || 0) - (parlay.betAmount * picks.length));
                    } else if (losers.length > 0) {
                      return sum - (parlay.betAmount * picks.length);
                    }
                    return sum;
                  }, 0);
                  return last10NetProfit >= 0 ? 'text-green-400' : 'text-red-400';
                })()
              }`}>
                ${(() => {
                  const last10NetProfit = last10Brolays.reduce((sum, parlay) => {
                    const picks = getPicksArray(parlay);
                    const losers = picks.filter(p => getPickResult(p) === 'loss');
                    const winners = picks.filter(p => getPickResult(p) === 'win');
                    const won = losers.length === 0 && winners.length > 0;

                    if (won) {
                      return sum + ((parlay.totalPayout || 0) - (parlay.betAmount * picks.length));
                    } else if (losers.length > 0) {
                      return sum - (parlay.betAmount * picks.length);
                    }
                    return sum;
                  }, 0);
                  return last10NetProfit.toFixed(2);
                })()}
              </span>
            </div>
            <div className="flex gap-1 mt-2">
              {last10Brolays.map((parlay, idx) => {
                const picks = getPicksArray(parlay);
                const losers = picks.filter(p => getPickResult(p) === 'loss');
                const winners = picks.filter(p => getPickResult(p) === 'win');
                const won = losers.length === 0 && winners.length > 0;
                const lost = losers.length > 0;

                return (
                  <div
                    key={idx}
                    className={`flex-1 h-8 rounded ${
                      won ? 'bg-green-500' : lost ? 'bg-red-500' : 'bg-gray-600'
                    }`}
                    title={`${formatDateForDisplay(parlay.date)} - ${won ? 'Won' : lost ? 'Lost' : 'Pending'}`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Performance by Sport */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl p-4 md:p-6 border border-yellow-500/20">
        <h3 className="text-lg md:text-xl font-bold mb-4 text-yellow-400">🏆 Performance by Sport</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {Object.entries(bySport)
            .sort(([, a], [, b]) => b.total - a.total)
            .map(([sport, data]) => {
              const winPct = data.total > 0 ? ((data.won / data.total) * 100).toFixed(1) : '0.0';
              return (
                <div key={sport} className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 hover:bg-gray-800/70 transition">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-white">{sport}</h4>
                    <span className={`text-sm font-bold px-2 py-1 rounded ${
                      parseFloat(winPct) >= 55 ? 'bg-green-500/20 text-green-400' :
                      parseFloat(winPct) >= 45 ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {winPct}%
                    </span>
                  </div>
                  <div className="text-sm text-gray-400">
                    {data.won}-{data.lost} ({data.total} picks)
                  </div>
                  {data.pending > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      {data.pending} pending
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};

export default GroupDashboard;
