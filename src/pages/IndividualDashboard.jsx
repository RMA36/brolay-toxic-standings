import React from 'react';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import FilterBar from '../components/filters/FilterBar';
import ComparisonTable from '../components/dashboard/ComparisonTable';
import { formatDateForDisplay } from '../utils/formatters';

/**
 * IndividualDashboard - Individual player statistics and leaderboard
 *
 * @param {Object} props
 * @param {Array} props.parlays - Array of parlay objects
 * @param {Array} props.players - Array of player names
 * @param {function} props.applyFilters - Function to filter parlays
 * @param {function} props.calculateStatsForPlayer - Function to calculate player stats
 * @param {Object} props.stats - Calculated stats for all players
 * @param {number} props.currentInsightIndex - Current insight rotation index
 * @param {function} props.setCurrentInsightIndex - Setter for insight index
 * @param {boolean} props.comparisonMode - Whether comparison mode is active
 * @param {function} props.setComparisonMode - Setter for comparison mode
 * @param {Set} props.selectedForComparison - Set of selected players for comparison
 * @param {function} props.setSelectedForComparison - Setter for selected players
 * @param {Object} props.filters - Current filter values
 * @param {function} props.setFilters - Setter for filters
 * @param {boolean} props.filtersExpanded - Whether filters are expanded
 * @param {function} props.setFiltersExpanded - Setter for filters expanded
 * @param {Object} props.preloadedTeams - Preloaded team data
 * @param {Array} props.learnedTeams - Learned team names
 * @param {boolean} props.isMobile - Whether on mobile device
 */
const IndividualDashboard = ({
  parlays,
  players,
  sports,
  applyFilters,
  calculateStatsForPlayer,
  stats,
  currentInsightIndex,
  setCurrentInsightIndex,
  comparisonMode,
  setComparisonMode,
  selectedForComparison,
  setSelectedForComparison,
  filters,
  setFilters,
  filtersExpanded,
  setFiltersExpanded,
  preloadedTeams,
  learnedTeams,
  isMobile
}) => {
    const filteredParlays = applyFilters([...parlays]);

    const pendingPicksCount = filteredParlays.reduce((count, parlay) => {
        const participants = Object.values(parlay.participants || {});
        return count + participants.filter(p => p.result === 'pending').length;
      }, 0);
    
    // Calculate insights
    const allStats = players.map(p => ({
      player: p,
      ...calculateStatsForPlayer(p, filteredParlays)
    }));
    
    const hottestPlayer = allStats
      .filter(s => s.totalPicks >= 5)
      .sort((a, b) => {
        const aWinRate = ((a.wins + a.pushes * 0.5) / a.totalPicks) * 100;
        const bWinRate = ((b.wins + b.pushes * 0.5) / b.totalPicks) * 100;
        return bWinRate - aWinRate;
      })[0];
    
    const coldestPlayer = allStats
      .filter(s => s.totalPicks >= 5)
      .sort((a, b) => {
        const aWinRate = ((a.wins + a.pushes * 0.5) / a.totalPicks) * 100;
        const bWinRate = ((b.wins + b.pushes * 0.5) / b.totalPicks) * 100;
        return aWinRate - bWinRate;
      })[0];
    
    const biggestWinner = [...allStats].sort((a, b) => 
      (b.moneyWon - b.moneyLost) - (a.moneyWon - a.moneyLost)
    )[0];
    
    const mostAnd1s = [...allStats].sort((a, b) => b.and1s - a.and1s)[0];
    
    const insights = [];
    
    if (hottestPlayer) {
      const winRate = ((hottestPlayer.wins + hottestPlayer.pushes * 0.5) / hottestPlayer.totalPicks * 100).toFixed(1);
      insights.push(`🔥 ${hottestPlayer.player} is on fire with a ${winRate}% win rate!`);
    }
    
    if (coldestPlayer) {
      const winRate = ((coldestPlayer.wins + coldestPlayer.pushes * 0.5) / coldestPlayer.totalPicks * 100).toFixed(1);
      insights.push(`❄️ ${coldestPlayer.player} is struggling at ${winRate}% - time to turn it around!`);
    }
    
    if (biggestWinner && (biggestWinner.moneyWon - biggestWinner.moneyLost) > 0) {
      const netMoney = (biggestWinner.moneyWon - biggestWinner.moneyLost).toFixed(2);
      insights.push(`💰 ${biggestWinner.player} leads with $${netMoney} in profits!`);
    }
    
    if (mostAnd1s && mostAnd1s.and1s > 0) {
      insights.push(`💀 ${mostAnd1s.player} has the most And-1s (${mostAnd1s.and1s}) - so close!`);
    }
       
    const currentInsight = insights[currentInsightIndex] || 'Keep betting to unlock insights!';
    
return (
    <div className="space-y-4 md:space-y-6">
      {/* Rotating Insights Ticker */}
      <div className="bg-gradient-to-r from-blue-900/30 via-purple-900/30 to-blue-900/30 rounded-xl p-4 border border-blue-500/30 overflow-hidden">
        <div className="flex items-center gap-3">
          <span className="text-2xl">💡</span>
          <div className="flex-1">
            <div className="font-semibold text-blue-400 text-sm">Quick Insight</div>
            <div className="text-white text-sm md:text-base">
              {currentInsight}
            </div>
          </div>
        </div>
      </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 className="text-xl md:text-2xl font-bold text-yellow-400" style={{ margin: 0 }}>👤 Individual Statistics</h2>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
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
          <Button
            onClick={() => {
              setComparisonMode(!comparisonMode);
              setSelectedForComparison(new Set());
            }}
            variant={comparisonMode ? 'primary' : 'secondary'}
            className={isMobile ? 'min-h-[44px]' : ''}
          >
            {comparisonMode ? '✓ Comparing' : '🔄 Compare Players'}
          </Button>
        </div>
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
      
      {/* Leaderboard */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl p-4 md:p-6 border border-yellow-500/20">
        <h3 className="text-lg md:text-xl font-bold mb-4 text-yellow-400">🏆 Leaderboard</h3>
        <div className="space-y-3">
          {players
            .map(player => ({
              player,
              ...calculateStatsForPlayer(player, filteredParlays)
            }))
            .sort((a, b) => {
              const aWinRate = a.totalPicks > 0 ? ((a.wins + a.pushes * 0.5) / a.totalPicks) * 100 : 0;
              const bWinRate = b.totalPicks > 0 ? ((b.wins + b.pushes * 0.5) / b.totalPicks) * 100 : 0;
              return bWinRate - aWinRate;
            })
            .map((stats, index) => {
              const isExpanded = expandedPlayers.has(stats.player);
              const isSelected = selectedForComparison.has(stats.player);
              const adjustedWins = stats.wins + (stats.pushes * 0.5);
              const winPct = stats.totalPicks > 0 
                ? ((adjustedWins / stats.totalPicks) * 100).toFixed(1)
                : '0.0';
              const netMoney = stats.moneyWon - stats.moneyLost;
              
              // Medal for top 3
              const medals = ['🥇', '🥈', '🥉'];
              const medal = index < 3 ? medals[index] : null;

              return (
                <div 
                  key={stats.player} 
                  className={`border rounded-lg transition-all ${
                    isSelected 
                      ? 'border-purple-500 bg-purple-900/20'
                      : 'border-gray-700 bg-gray-800/50'
                  } ${isExpanded ? 'shadow-xl' : 'hover:bg-gray-800/70'}`}
                >
                  {/* Header - Always Visible */}
                  <div className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      {comparisonMode && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            const newSelected = new Set(selectedForComparison);
                            if (isSelected) {
                              newSelected.delete(stats.player);
                            } else {
                              newSelected.add(stats.player);
                            }
                            setSelectedForComparison(newSelected);
                          }}
                          className="w-5 h-5"
                        />
                      )}
                      <div className="flex items-center gap-2 flex-1">
                        {medal && <span className="text-2xl">{medal}</span>}
                        <div className="flex-1">
                          <h4 className="text-lg font-bold text-white">{stats.player}</h4>
                          <div className="text-xs text-gray-400">Rank #{index + 1}</div>
                        </div>
                      </div>
                      <Button
                        onClick={() => {
                          const newExpanded = new Set(expandedPlayers);
                          if (isExpanded) {
                            newExpanded.delete(stats.player);
                          } else {
                            newExpanded.add(stats.player);
                          }
                          setExpandedPlayers(newExpanded);
                        }}
                        variant="ghost"
                        size="small"
                        className="text-yellow-400 hover:text-yellow-300"
                      >
                        {isExpanded ? '▲' : '▼'}
                      </Button>
                    </div>

                    {/* Quick Stats - Always Visible */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-gray-900/50 rounded p-2 border border-gray-700">
                        <div className="text-xs text-gray-400">Record</div>
                        <div className="text-sm font-semibold text-white">
                          {stats.wins}-{stats.losses}-{stats.pushes}
                        </div>
                      </div>
                      <div className="bg-gray-900/50 rounded p-2 border border-gray-700">
                        <div className="text-xs text-gray-400">Win %</div>
                        <div className="text-sm font-semibold text-white">{winPct}%</div>
                      </div>
                      <div className="bg-gray-900/50 rounded p-2 border border-gray-700">
                        <div className="text-xs text-gray-400">Net Money</div>
                        <div className={`text-sm font-semibold ${netMoney >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          ${netMoney.toFixed(2)}
                        </div>
                      </div>
                      <div className="bg-gray-900/50 rounded p-2 border border-gray-700">
                        <div className="text-xs text-gray-400">And-1s</div>
                        <div className="text-sm font-semibold text-red-400">{stats.and1s}</div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-gray-700 p-4 space-y-4 bg-gray-900/30">
                      {/* And-1 Cost */}
                      <div className="bg-red-900/20 rounded-lg p-3 border border-red-500/30">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-300">And-1 Cost (Lost Profit):</span>
                          <span className="text-lg font-bold text-red-400">
                            ${stats.and1Cost.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* By Sport */}
                      {Object.keys(stats.bySport).length > 0 && (
                        <div>
                          <h5 className="font-semibold text-sm mb-2 text-gray-300">📊 By Sport</h5>
                          <div className="space-y-2">
                            {Object.entries(stats.bySport)
                              .sort(([, a], [, b]) => b.total - a.total)
                              .map(([sport, data]) => {
                                const sportWinPct = data.total > 0 ? (((data.wins + data.pushes * 0.5) / data.total) * 100).toFixed(0) : 0;
                                return (
                                  <div key={sport} className="flex justify-between items-center bg-gray-800/50 rounded p-2 border border-gray-700">
                                    <span className="text-sm text-gray-300">{sport}</span>
                                    <div className="flex items-center gap-3">
                                      <span className="text-xs text-gray-400">
                                        {data.wins}-{data.losses}-{data.pushes}
                                      </span>
                                      <span className={`text-sm font-semibold ${
                                        sportWinPct >= 55 ? 'text-green-400' :
                                        sportWinPct >= 45 ? 'text-yellow-400' :
                                        'text-red-400'
                                      }`}>
                                        {sportWinPct}%
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      {/* By Bet Type */}
                      {Object.keys(stats.byBetType).length > 0 && (
                        <div>
                          <h5 className="font-semibold text-sm mb-2 text-gray-300">🎲 By Bet Type</h5>
                          <div className="space-y-2">
                            {Object.entries(stats.byBetType)
                              .sort(([, a], [, b]) => b.total - a.total)
                              .map(([type, data]) => {
                                const betWinPct = data.total > 0 ? (((data.wins + data.pushes * 0.5) / data.total) * 100).toFixed(0) : 0;
                                return (
                                  <div key={type} className="flex justify-between items-center bg-gray-800/50 rounded p-2 border border-gray-700">
                                    <span className="text-sm text-gray-300">{type}</span>
                                    <div className="flex items-center gap-3">
                                      <span className="text-xs text-gray-400">
                                        {data.wins}-{data.losses}-{data.pushes}
                                      </span>
                                      <span className={`text-sm font-semibold ${
                                        betWinPct >= 55 ? 'text-green-400' :
                                        betWinPct >= 45 ? 'text-yellow-400' :
                                        'text-red-400'
                                      }`}>
                                        {betWinPct}%
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}
                      
                      {/* Multi-Entity Props Breakdowns */}
                      {(Object.keys(stats.byH2HPropType || {}).length > 0 || 
                        Object.keys(stats.byEitherPropType || {}).length > 0 || 
                        Object.keys(stats.byCombinedPropType || {}).length > 0) && (
                        <div className="mt-4 pt-4 border-t border-gray-700">
                          <h5 className="font-semibold text-sm mb-3 text-gray-300">🎯 Multi-Entity Props Breakdown</h5>
                          
                          {/* H2H Props by Type */}
                          {Object.keys(stats.byH2HPropType || {}).length > 0 && (
                            <div className="mb-4">
                              <h6 className="text-xs font-medium text-gray-400 mb-2">🆚 H2H Props</h6>
                              <div className="space-y-2">
                                {Object.entries(stats.byH2HPropType)
                                  .sort((a, b) => b[1].total - a[1].total)
                                  .map(([propType, data]) => {
                                    const winPct = data.total > 0 ? (((data.wins + data.pushes * 0.5) / data.total) * 100).toFixed(0) : 0;
                                    return (
                                      <div key={propType} className="flex justify-between items-center bg-gray-900/50 rounded p-2 border border-gray-600">
                                        <span className="text-xs text-gray-300">{propType}</span>
                                        <div className="flex items-center gap-3">
                                          <span className="text-xs text-gray-400">
                                            {data.wins}-{data.losses}-{data.pushes}
                                          </span>
                                          <span className={`text-xs font-semibold ${
                                            winPct >= 55 ? 'text-green-400' :
                                            winPct >= 45 ? 'text-yellow-400' :
                                            'text-red-400'
                                          }`}>
                                            {winPct}%
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          )}
                          
                          {/* Either Props by Type */}
                          {Object.keys(stats.byEitherPropType || {}).length > 0 && (
                            <div className="mb-4">
                              <h6 className="text-xs font-medium text-gray-400 mb-2">🎲 Either Props</h6>
                              <div className="space-y-2">
                                {Object.entries(stats.byEitherPropType)
                                  .sort((a, b) => b[1].total - a[1].total)
                                  .map(([propType, data]) => {
                                    const winPct = data.total > 0 ? ((data.wins / data.total) * 100).toFixed(0) : 0;
                                    return (
                                      <div key={propType} className="flex justify-between items-center bg-gray-900/50 rounded p-2 border border-gray-600">
                                        <span className="text-xs text-gray-300">{propType}</span>
                                        <div className="flex items-center gap-3">
                                          <span className="text-xs text-gray-400">
                                            {data.wins}-{data.losses}
                                          </span>
                                          <span className={`text-xs font-semibold ${
                                            winPct >= 55 ? 'text-green-400' :
                                            winPct >= 45 ? 'text-yellow-400' :
                                            'text-red-400'
                                          }`}>
                                            {winPct}%
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          )}
                          
                          {/* Combined Props by Type */}
                          {Object.keys(stats.byCombinedPropType || {}).length > 0 && (
                            <div>
                              <h6 className="text-xs font-medium text-gray-400 mb-2">➕ Combined Props</h6>
                              <div className="space-y-2">
                                {Object.entries(stats.byCombinedPropType)
                                  .sort((a, b) => b[1].total - a[1].total)
                                  .map(([propType, data]) => {
                                    const winPct = data.total > 0 ? ((data.wins / data.total) * 100).toFixed(0) : 0;
                                    return (
                                      <div key={propType} className="flex justify-between items-center bg-gray-900/50 rounded p-2 border border-gray-600">
                                        <span className="text-xs text-gray-300">{propType}</span>
                                        <div className="flex items-center gap-3">
                                          <span className="text-xs text-gray-400">
                                            {data.wins}-{data.losses}
                                          </span>
                                          <span className={`text-xs font-semibold ${
                                            winPct >= 55 ? 'text-green-400' :
                                            winPct >= 45 ? 'text-yellow-400' :
                                            'text-red-400'
                                          }`}>
                                            {winPct}%
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {/* Comparison Table - Below Leaderboard */}
      {comparisonMode && selectedForComparison.size >= 2 && (
        <div className="bg-gradient-to-br from-purple-900/30 to-gray-800 rounded-xl shadow-xl p-4 md:p-6 border border-purple-500/30">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-purple-400">
              📊 Comparing {selectedForComparison.size} Players
            </h3>
            <Button
              onClick={() => setSelectedForComparison(new Set())}
              variant="ghost"
              size="small"
              className="text-gray-400 hover:text-red-400"
            >
              Clear Selection
            </Button>
          </div>
          
          {(() => {
            // Calculate stats for all selected players
            const comparisonData = Array.from(selectedForComparison).map(player => {
              const stats = calculateStatsForPlayer(player, filteredParlays);
              const adjustedWins = stats.wins + (stats.pushes * 0.5);
              const winPct = stats.totalPicks > 0 
                ? ((adjustedWins / stats.totalPicks) * 100)
                : 0;
              const netMoney = stats.moneyWon - stats.moneyLost;
              
              return {
                player,
                record: `${stats.wins}-${stats.losses}-${stats.pushes}`,
                winPct,
                netMoney,
                and1s: stats.and1s,
                and1Cost: stats.and1Cost,
                bySport: stats.bySport,
                byBetType: stats.byBetType
              };
            });

            // Find common sports (where all players have 10+ bets)
            const commonSports = {};
            Object.keys(comparisonData[0]?.bySport || {}).forEach(sport => {
              const allHaveEnough = comparisonData.every(p => 
                p.bySport[sport] && p.bySport[sport].total >= 10
              );
              if (allHaveEnough) {
                commonSports[sport] = true;
              }
            });

            // Find common bet types (where all players have 10+ bets)
            const commonBetTypes = {};
            Object.keys(comparisonData[0]?.byBetType || {}).forEach(betType => {
              const allHaveEnough = comparisonData.every(p => 
                p.byBetType[betType] && p.byBetType[betType].total >= 10
              );
              if (allHaveEnough) {
                commonBetTypes[betType] = true;
              }
            });

            return (
              <ComparisonTable
                comparisonData={comparisonData}
                commonSports={commonSports}
                commonBetTypes={commonBetTypes}
              />
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default IndividualDashboard;
