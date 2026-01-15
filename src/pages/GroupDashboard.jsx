import React from 'react';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import StatCard from '../components/dashboard/StatCard';
import FilterBar from '../components/filters/FilterBar';
import { Users, TrendingUp, Award, AlertCircle, RefreshCw } from 'lucide-react';
import { formatDateForDisplay, formatComboDescription } from '../utils/formatters';
import { getCurrentSportsInSeason, getCurrentDayOfWeek, findMoneyMaker, findDangerZone, getSeasonalTip } from '../insightsHelper';

/**
 * GroupDashboard - Group statistics overview with insights, calendar, and settlement tracking
 *
 * @param {Object} props
 * @param {Array} props.parlays - Array of parlay objects
 * @param {Array} props.players - Array of player names
 * @param {function} props.applyFilters - Function to filter parlays
 * @param {Date} props.selectedCalendarDate - Selected calendar date
 * @param {function} props.setSelectedCalendarDate - Setter for calendar date
 * @param {Date} props.calendarMonth - Current calendar month
 * @param {function} props.setCalendarMonth - Setter for calendar month
 * @param {Object} props.filters - Current filter values
 * @param {function} props.setFilters - Setter for filters
 * @param {boolean} props.filtersExpanded - Whether filters are expanded
 * @param {function} props.setFiltersExpanded - Setter for filters expanded
 * @param {Object} props.preloadedTeams - Preloaded team data
 * @param {Array} props.learnedTeams - Learned team names
 * @param {boolean} props.isMobile - Whether on mobile device
 * @param {function} props.handleESPNSync - Function to trigger ESPN sync
 * @param {boolean} props.isSyncing - Whether ESPN sync is in progress
 * @param {Object} props.autoUpdateStatus - Auto-update status object
 * @param {string} props.searchQuery - Current search query
 * @param {function} props.setSearchQuery - Setter for search query
 * @param {Object} props.searchResults - Current search results
 * @param {function} props.setSearchResults - Setter for search results
 * @param {string} props.lastSearchedQuery - Last searched query
 * @param {function} props.setLastSearchedQuery - Setter for last searched query
 * @param {Object} props.showSuggestions - Show suggestions state
 * @param {function} props.generateSearchInsights - Function to generate search insights
 */
const GroupDashboard = ({
  parlays,
  players,
  applyFilters,
  selectedCalendarDate,
  setSelectedCalendarDate,
  calendarMonth,
  setCalendarMonth,
  filters,
  setFilters,
  filtersExpanded,
  setFiltersExpanded,
  preloadedTeams,
  learnedTeams,
  isMobile,
  handleESPNSync,
  isSyncing,
  autoUpdateStatus,
  searchQuery,
  setSearchQuery,
  searchResults,
  setSearchResults,
  lastSearchedQuery,
  setLastSearchedQuery,
  showSuggestions,
  generateSearchInsights
}) => {
  const filteredParlays = applyFilters([...parlays]);
  
  const pendingPicksCount = filteredParlays.reduce((count, parlay) => {
    const participants = Object.values(parlay.participants || {});
    return count + participants.filter(p => p.result === 'pending').length;
  }, 0);
  
  const totalParlays = filteredParlays.length;
  const wonParlays = filteredParlays.filter(p => {
    const participants = Object.values(p.participants);
    const losers = participants.filter(part => part.result === 'loss');
    return losers.length === 0 && participants.some(part => part.result === 'win');
  }).length;
  const lostParlays = filteredParlays.filter(p => {
    const participants = Object.values(p.participants);
    return participants.some(part => part.result === 'loss');
  }).length;
  const pendingParlays = totalParlays - wonParlays - lostParlays;
  const groupWinPct = totalParlays > 0 ? ((wonParlays / totalParlays) * 100).toFixed(1) : '0.0';

  // Calculate by sport
  const bySport = {};
  filteredParlays.forEach(p => {
    const participants = Object.values(p.participants);
    
    participants.forEach(part => {
      if (part.sport) {
        if (!bySport[part.sport]) {
          bySport[part.sport] = { total: 0, won: 0, lost: 0, pending: 0 };
        }
        bySport[part.sport].total++;
        if (part.result === 'win') bySport[part.sport].won++;
        else if (part.result === 'loss') bySport[part.sport].lost++;
        else if (part.result === 'pending') bySport[part.sport].pending++;
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
  
  const last10Won = last10Brolays.filter(p => {
    const participants = Object.values(p.participants);
    const losers = participants.filter(part => part.result === 'loss');
    return losers.length === 0 && participants.some(part => part.result === 'win');
  }).length;
  
  const last10Lost = last10Brolays.filter(p => {
    const participants = Object.values(p.participants);
    return participants.some(part => part.result === 'loss');
  }).length;

  // Current month stats
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthBrolays = filteredParlays.filter(p => {
    const parlayDate = new Date(p.date + 'T00:00:00');
    return parlayDate >= currentMonthStart;
  });
  
  const currentMonthWon = currentMonthBrolays.filter(p => {
    const participants = Object.values(p.participants);
    const losers = participants.filter(part => part.result === 'loss');
    return losers.length === 0 && participants.some(part => part.result === 'win');
  }).length;
  
  const currentMonthLost = currentMonthBrolays.filter(p => {
    const participants = Object.values(p.participants);
    return participants.some(part => part.result === 'loss');
  }).length;

  // Calculate total money metrics
  const totalMoneyWon = filteredParlays
    .filter(p => {
      const participants = Object.values(p.participants);
      const losers = participants.filter(part => part.result === 'loss');
      return losers.length === 0 && participants.some(part => part.result === 'win');
    })
    .reduce((sum, p) => {
      const participants = Object.values(p.participants);
      const netProfit = Math.max(0, (p.totalPayout || 0) - (p.betAmount * participants.length));
      return sum + netProfit;
    }, 0);
  
  const totalMoneyLost = filteredParlays
    .filter(p => {
      const participants = Object.values(p.participants);
      return participants.some(part => part.result === 'loss');
    })
    .reduce((sum, p) => {
      const participants = Object.values(p.participants);
      return sum + (p.betAmount * participants.length);
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
                    const participants = Object.values(parlay.participants);
                    const losers = participants.filter(p => p.result === 'loss');
                    const winners = participants.filter(p => p.result === 'win');
                    const won = losers.length === 0 && winners.length > 0;
                    
                    if (won) {
                      return sum + ((parlay.totalPayout || 0) - (parlay.betAmount * participants.length));
                    } else if (losers.length > 0) {
                      return sum - (parlay.betAmount * participants.length);
                    }
                    return sum;
                  }, 0);
                  return last10NetProfit >= 0 ? 'text-green-400' : 'text-red-400';
                })()
              }`}>
                ${(() => {
                  const last10NetProfit = last10Brolays.reduce((sum, parlay) => {
                    const participants = Object.values(parlay.participants);
                    const losers = participants.filter(p => p.result === 'loss');
                    const winners = participants.filter(p => p.result === 'win');
                    const won = losers.length === 0 && winners.length > 0;
                    
                    if (won) {
                      return sum + ((parlay.totalPayout || 0) - (parlay.betAmount * participants.length));
                    } else if (losers.length > 0) {
                      return sum - (parlay.betAmount * participants.length);
                    }
                    return sum;
                  }, 0);
                  return last10NetProfit.toFixed(2);
                })()}
              </span>
            </div>
            <div className="flex gap-1 mt-2">
              {last10Brolays.map((parlay, idx) => {
                const participants = Object.values(parlay.participants);
                const losers = participants.filter(p => p.result === 'loss');
                const winners = participants.filter(p => p.result === 'win');
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
      {/* Sport Distribution Pie Chart */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl p-4 md:p-6 border border-yellow-500/20">
        <h3 className="text-lg md:text-xl font-bold mb-4 text-yellow-400">📊 Sport Distribution</h3>
        <div className="flex justify-center">
          {/* Pie Chart */}
          <div className="relative" style={{ width: '400px', height: '400px' }}>
            <svg viewBox="0 0 200 200" className="transform -rotate-90">
              {(() => {
                const sortedSports = Object.entries(bySport).sort(([, a], [, b]) => b.total - a.total);
                const totalPicks = sortedSports.reduce((sum, [, data]) => sum + data.total, 0);
                let cumulativePercent = 0;
                
                return sortedSports.map(([sport, data], idx) => {
                  const percentage = (data.total / totalPicks) * 100;
                  const hue = idx * 360 / sortedSports.length;
                  
                  // Calculate SVG arc
                  const startAngle = (cumulativePercent / 100) * 360;
                  const endAngle = ((cumulativePercent + percentage) / 100) * 360;
                  const midAngle = (startAngle + endAngle) / 2;
                  cumulativePercent += percentage;
                  
                  const startRad = (startAngle - 90) * Math.PI / 180;
                  const endRad = (endAngle - 90) * Math.PI / 180;
                  
                  const x1 = 100 + 80 * Math.cos(startRad);
                  const y1 = 100 + 80 * Math.sin(startRad);
                  const x2 = 100 + 80 * Math.cos(endRad);
                  const y2 = 100 + 80 * Math.sin(endRad);
                  
                  const largeArcFlag = percentage > 50 ? 1 : 0;
                  
                  const pathData = [
                    `M 100 100`,
                    `L ${x1} ${y1}`,
                    `A 80 80 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                    `Z`
                  ].join(' ');
                  
                  // Calculate label position (for large slices)
                  const midRad = (midAngle - 90) * Math.PI / 180;
                  const labelRadius = 50; // Closer to center for label
                  const labelX = 100 + labelRadius * Math.cos(midRad);
                  const labelY = 100 + labelRadius * Math.sin(midRad);
                  
                  const showLabel = percentage >= 15; // Only show labels for slices >= 15%
                  
                  return (
                    <g key={sport}>
                      <path
                        d={pathData}
                        fill={`hsl(${hue}, 70%, 55%)`}
                        stroke="#1f2937"
                        strokeWidth="1"
                        className="hover:opacity-80 transition-opacity cursor-pointer"
                        data-sport={sport}
                        data-total={data.total}
                        data-percentage={percentage.toFixed(1)}
                        onMouseEnter={(e) => {
                          const tooltip = document.getElementById('sport-tooltip');
                          tooltip.style.display = 'block';
                          tooltip.innerHTML = `
                            <div class="bg-gray-900 text-white p-3 rounded-lg border border-gray-700 shadow-xl">
                              <div class="font-bold text-yellow-400">${sport}</div>
                              <div class="text-sm">${data.total} picks (${percentage.toFixed(1)}%)</div>
                              <div class="text-xs text-gray-400 mt-1">${data.won}W-${data.lost}L</div>
                            </div>
                          `;
                        }}
                        onMouseMove={(e) => {
                          const tooltip = document.getElementById('sport-tooltip');
                          tooltip.style.left = e.pageX + 10 + 'px';
                          tooltip.style.top = e.pageY + 10 + 'px';
                        }}
                        onMouseLeave={() => {
                          const tooltip = document.getElementById('sport-tooltip');
                          tooltip.style.display = 'none';
                        }}
                      />
                      {showLabel && (
                        <g transform={`rotate(${midAngle} ${labelX} ${labelY})`}>
                          <text
                            x={labelX}
                            y={labelY}
                            fill="white"
                            fontSize="10"
                            fontWeight="bold"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="pointer-events-none"
                          >
                            {sport}
                          </text>
                          <text
                            x={labelX}
                            y={labelY + 12}
                            fill="white"
                            fontSize="8"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="pointer-events-none"
                          >
                            {percentage.toFixed(1)}%
                          </text>
                        </g>
                      )}
                    </g>
                  );
                });
              })()}
            </svg>
            {/* Center circle for donut effect */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-gray-800 rounded-full" style={{ width: '120px', height: '120px' }} />
            </div>
            {/* Tooltip */}
            <div id="sport-tooltip" style={{ display: 'none', position: 'fixed', zIndex: 1000, pointerEvents: 'none' }}></div>
          </div>
        </div>
      </div>
      
      {/* Rolling 12-Month Stats */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl p-4 md:p-6 border border-yellow-500/20">
        <h3 className="text-lg md:text-xl font-bold mb-4 text-yellow-400">📅 Rolling 12-Month Performance</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(() => {
            const twelveMonthsAgo = new Date();
            twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
            
            const recentBrolays = filteredParlays.filter(p => {
              const parlayDate = new Date(p.date + 'T00:00:00');
              return parlayDate >= twelveMonthsAgo;
            });
            
            const recent12Won = recentBrolays.filter(p => {
              const participants = Object.values(p.participants);
              const losers = participants.filter(part => part.result === 'loss');
              return losers.length === 0 && participants.some(part => part.result === 'win');
            }).length;
            
            const recent12Lost = recentBrolays.filter(p => {
              const participants = Object.values(p.participants);
              return participants.some(part => part.result === 'loss');
            }).length;
            
            const recent12WinRate = recentBrolays.length > 0 
              ? ((recent12Won / recentBrolays.length) * 100).toFixed(1) 
              : '0.0';
            
            const recent12Payout = recentBrolays
              .filter(p => {
                const participants = Object.values(p.participants);
                const losers = participants.filter(part => part.result === 'loss');
                return losers.length === 0 && participants.some(part => part.result === 'win');
              })
              .reduce((sum, p) => {
                const participants = Object.values(p.participants);
                return sum + Math.max(0, (p.totalPayout || 0) - (p.betAmount * participants.length));
              }, 0);

            return (
              <>
                <div className="bg-blue-900/30 rounded-lg p-4 border border-blue-500/30">
                  <div className="text-sm text-gray-400 mb-1">Record</div>
                  <div className="text-2xl font-bold text-white">
                    {recent12Won}W-{recent12Lost}L
                  </div>
                </div>
                <div className="bg-purple-900/30 rounded-lg p-4 border border-purple-500/30">
                  <div className="text-sm text-gray-400 mb-1">Win Rate</div>
                  <div className={`text-2xl font-bold ${
                    parseFloat(recent12WinRate) >= 50 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {recent12WinRate}%
                  </div>
                </div>
                <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/30">
                  <div className="text-sm text-gray-400 mb-1">Total Brolays</div>
                  <div className="text-2xl font-bold text-white">
                    {recentBrolays.length}
                  </div>
                </div>
                <div className="bg-green-900/30 rounded-lg p-4 border border-green-500/30">
                  <div className="text-sm text-gray-400 mb-1">Net Profit</div>
                  <div className={`text-2xl font-bold ${
                    (() => {
                      const recent12Lost = recentBrolays
                        .filter(p => {
                          const participants = Object.values(p.participants);
                          return participants.some(part => part.result === 'loss');
                        })
                        .reduce((sum, p) => {
                          const participants = Object.values(p.participants);
                          return sum + (p.betAmount * participants.length);
                        }, 0);
                      const netProfit = recent12Payout - recent12Lost;
                      return netProfit >= 0 ? 'text-green-400' : 'text-red-400';
                    })()
                  }`}>
                    ${(() => {
                      const recent12Lost = recentBrolays
                        .filter(p => {
                          const participants = Object.values(p.participants);
                          return participants.some(part => part.result === 'loss');
                        })
                        .reduce((sum, p) => {
                          const participants = Object.values(p.participants);
                          return sum + (p.betAmount * participants.length);
                        }, 0);
                      return (recent12Payout - recent12Lost).toFixed(0);
                    })()}
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Net Profit Over Time Line Graph */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl p-4 md:p-6 border border-yellow-500/20">
        <h3 className="text-lg md:text-xl font-bold mb-4 text-yellow-400">📈 Net Profit Over Time</h3>
        {(() => {
          // Group brolays by month
          const monthlyData = {};
          const sortedParlays = [...filteredParlays].sort((a, b) => new Date(a.date) - new Date(b.date));
          
          sortedParlays.forEach(parlay => {
            const date = new Date(parlay.date + 'T00:00:00');
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!monthlyData[monthKey]) {
              monthlyData[monthKey] = {
                month: monthKey,
                total: 0,
                byPlayer: {},
                stats: {
                  total: { wins: 0, losses: 0, profit: 0 },
                  byPlayer: {}
                }
              };
              players.forEach(p => {
                monthlyData[monthKey].byPlayer[p] = 0;
                monthlyData[monthKey].stats.byPlayer[p] = { wins: 0, losses: 0, profit: 0 };
              });
            }
            
            const participants = Object.values(parlay.participants);
            const losers = participants.filter(p => p.result === 'loss');
            const winners = participants.filter(p => p.result === 'win');
            const won = losers.length === 0 && winners.length > 0;
            
            if (won) {
              const netProfit = (parlay.totalPayout || 0) - (parlay.betAmount * participants.length);
              monthlyData[monthKey].total += netProfit;
              monthlyData[monthKey].stats.total.wins++;
              monthlyData[monthKey].stats.total.profit += netProfit;
              
              winners.forEach(winner => {
                if (winner.player && monthlyData[monthKey].byPlayer[winner.player] !== undefined) {
                  const playerProfit = netProfit / winners.length;
                  monthlyData[monthKey].byPlayer[winner.player] += playerProfit;
                  monthlyData[monthKey].stats.byPlayer[winner.player].wins++;
                  monthlyData[monthKey].stats.byPlayer[winner.player].profit += playerProfit;
                }
              });
            } else if (losers.length > 0) {
              const loss = parlay.betAmount * participants.length;
              monthlyData[monthKey].total -= loss;
              monthlyData[monthKey].stats.total.losses++;
              monthlyData[monthKey].stats.total.profit -= loss;
              
              losers.forEach(loser => {
                if (loser.player && monthlyData[monthKey].byPlayer[loser.player] !== undefined) {
                  const playerLoss = loss / losers.length;
                  monthlyData[monthKey].byPlayer[loser.player] -= playerLoss;
                  monthlyData[monthKey].stats.byPlayer[loser.player].losses++;
                  monthlyData[monthKey].stats.byPlayer[loser.player].profit -= playerLoss;
                }
              });
            }
          });
          
          // Convert to cumulative data
          const months = Object.keys(monthlyData).sort();
          const cumulativeData = [];
          let cumulativeTotal = 0;
          const cumulativeByPlayer = {};
          players.forEach(p => { cumulativeByPlayer[p] = 0; });
          
          months.forEach(month => {
            cumulativeTotal += monthlyData[month].total;
            players.forEach(p => {
              cumulativeByPlayer[p] += monthlyData[month].byPlayer[p];
            });
            
            cumulativeData.push({
              month,
              displayMonth: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
              total: cumulativeTotal,
              monthStats: monthlyData[month].stats,
              ...cumulativeByPlayer
            });
          });
          
          if (cumulativeData.length === 0) {
            return <p className="text-gray-400 text-center py-8">No data available yet</p>;
          }
          
          // Calculate graph dimensions
          const maxProfit = Math.max(...cumulativeData.map(d => d.total), ...players.flatMap(p => cumulativeData.map(d => d[p])));
          const minProfit = Math.min(...cumulativeData.map(d => d.total), ...players.flatMap(p => cumulativeData.map(d => d[p])), 0);
          const range = maxProfit - minProfit;
          const padding = range * 0.1;
          
          const graphHeight = 300;
          const graphWidth = Math.max(800, cumulativeData.length * 60);
          const leftMargin = 60;
          
          const getY = (value) => {
            const normalized = (value - (minProfit - padding)) / (range + 2 * padding);
            return graphHeight - (normalized * graphHeight);
          };
          
          const getX = (index) => {
            return leftMargin + (index / (cumulativeData.length - 1)) * (graphWidth - leftMargin);
          };
          
          // Generate line paths
          const totalPath = cumulativeData.map((d, i) => 
            `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.total)}`
          ).join(' ');
          
          const playerColors = {
            'Management': 'hsl(0, 70%, 55%)',
            'CD': 'hsl(330, 70%, 60%)', // Pink for CD
            '914': 'hsl(120, 70%, 55%)',
            'Junior': 'hsl(180, 70%, 55%)',
            'Jacoby': 'hsl(240, 70%, 55%)'
          };
          
          return (
            <div className="overflow-x-auto">
              <svg viewBox={`0 0 ${graphWidth + 20} ${graphHeight + 60}`} className="w-full" style={{ minWidth: '600px' }}>
                {/* Y-axis scale */}
                {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
                  const y = graphHeight * ratio;
                  const value = maxProfit + padding - (ratio * (range + 2 * padding));
                  return (
                    <g key={ratio}>
                      <line
                        x1={leftMargin}
                        y1={y}
                        x2={graphWidth}
                        y2={y}
                        stroke="#374151"
                        strokeWidth="1"
                        strokeDasharray="4"
                      />
                      <text
                        x={leftMargin - 10}
                        y={y + 5}
                        fill="#9ca3af"
                        fontSize="12"
                        textAnchor="end"
                      >
                        ${value.toFixed(0)}
                      </text>
                    </g>
                  );
                })}
                
                {/* Y-axis label */}
                <text
                  x="15"
                  y={graphHeight / 2}
                  fill="#fbbf24"
                  fontSize="14"
                  fontWeight="bold"
                  textAnchor="middle"
                  transform={`rotate(-90 15 ${graphHeight / 2})`}
                >
                  Net Profit ($)
                </text>
                
                {/* Zero line */}
                <line
                  x1={leftMargin}
                  y1={getY(0)}
                  x2={graphWidth}
                  y2={getY(0)}
                  stroke="#ef4444"
                  strokeWidth="2"
                  strokeDasharray="8"
                />
                
                {/* Player lines */}
                {players.map(player => {
                  const path = cumulativeData.map((d, i) => 
                    `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d[player])}`
                  ).join(' ');
                  
                  return (
                    <path
                      key={player}
                      d={path}
                      fill="none"
                      stroke={playerColors[player]}
                      strokeWidth="2"
                      opacity="0.6"
                    />
                  );
                })}
                
                {/* Total line (bold) */}
                <path
                  d={totalPath}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="4"
                />
                
                {/* Data points with hover */}
                {cumulativeData.map((d, i) => {
                  const stats = d.monthStats;
                  const totalBrolays = stats.total.wins + stats.total.losses;
                  const totalWinPct = totalBrolays > 0 ? ((stats.total.wins / totalBrolays) * 100).toFixed(1) : '0.0';
                  
                  return (
                    <circle
                      key={i}
                      cx={getX(i)}
                      cy={getY(d.total)}
                      r="6"
                      fill="#fbbf24"
                      className="cursor-pointer hover:r-8 transition-all"
                      onMouseEnter={(e) => {
                        const tooltip = document.getElementById('month-tooltip');
                        tooltip.style.display = 'block';
                        
                        let playerStatsHTML = players.map(player => {
                          const pStats = stats.byPlayer[player];
                          const pTotal = pStats.wins + pStats.losses;
                          const pWinPct = pTotal > 0 ? ((pStats.wins / pTotal) * 100).toFixed(1) : '0.0';
                          return `
                            <div class="flex justify-between gap-4 text-xs border-t border-gray-700 pt-1 mt-1">
                              <span style="color: ${playerColors[player]}">${player}:</span>
                              <span>${pStats.wins}-${pStats.losses} (${pWinPct}%) • $${pStats.profit.toFixed(0)}</span>
                            </div>
                          `;
                        }).join('');
                        
                        tooltip.innerHTML = `
                          <div class="bg-gray-900 text-white p-3 rounded-lg border border-gray-700 shadow-xl">
                            <div class="font-bold text-yellow-400 mb-2">${d.displayMonth}</div>
                            <div class="text-sm mb-1">
                              <span class="font-semibold">Group:</span> ${stats.total.wins}-${stats.total.losses} (${totalWinPct}%)
                            </div>
                            <div class="text-sm font-bold mb-2">
                              Net: $${stats.total.profit.toFixed(0)}
                            </div>
                            ${playerStatsHTML}
                          </div>
                        `;
                      }}
                      onMouseMove={(e) => {
                        const tooltip = document.getElementById('month-tooltip');
                        tooltip.style.left = e.pageX + 10 + 'px';
                        tooltip.style.top = e.pageY + 10 + 'px';
                      }}
                      onMouseLeave={() => {
                        const tooltip = document.getElementById('month-tooltip');
                        tooltip.style.display = 'none';
                      }}
                    />
                  );
                })}
                
                {/* X-axis labels */}
                {cumulativeData.map((d, i) => {
                  if (cumulativeData.length > 12 && i % 2 !== 0) return null;
                  return (
                    <text
                      key={i}
                      x={getX(i)}
                      y={graphHeight + 20}
                      fill="#9ca3af"
                      fontSize="12"
                      textAnchor="middle"
                    >
                      {d.displayMonth}
                    </text>
                  );
                })}
              </svg>
              
              {/* Tooltip */}
              <div id="month-tooltip" style={{ display: 'none', position: 'fixed', zIndex: 1000, pointerEvents: 'none' }}></div>
              
              {/* Legend */}
              <div className="flex flex-wrap gap-4 mt-4 justify-center">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-1 bg-yellow-400"></div>
                  <span className="text-sm text-gray-300 font-bold">Total Group</span>
                </div>
                {players.map(player => (
                  <div key={player} className="flex items-center gap-2">
                    <div className="w-8 h-1" style={{ backgroundColor: playerColors[player] }}></div>
                    <span className="text-sm text-gray-300">{player}</span>
                  </div>
                ))}</div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

const renderAllBrolays = () => {
  const filteredParlays = applyFilters([...parlays]).sort((a, b) => {
    const dateCompare = new Date(b.date) - new Date(a.date);
    if (dateCompare !== 0) return dateCompare;
    // For same-day brolays, use sortOrder if available
    if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
      return b.sortOrder - a.sortOrder;
    }
    const aKey = a.id || a.id;
    const bKey = b.id || b.id;
    return String(bKey).localeCompare(String(aKey));
  });

  const pendingPicksCount = filteredParlays.reduce((count, parlay) => {
    const participants = Object.values(parlay.participants || {});
    return count + participants.filter(p => p.result === 'pending').length;
  }, 0);

  // Calculate dynamic color scale thresholds based on all settled brolays
  const calculateDynamicThresholds = () => {
    const allProfits = [];
    const allLosses = [];
    
    parlays.forEach(parlay => {
      const participants = Object.values(parlay.participants);
      const losers = participants.filter(p => p.result === 'loss');
      const winners = participants.filter(p => p.result === 'win');
      const pushes = participants.filter(p => p.result === 'push');
      const won = losers.length === 0 && winners.length > 0 && pushes.length < participants.length;
      
      if (won) {
        const netProfit = (parlay.totalPayout || 0) - (parlay.betAmount * participants.length);
        if (netProfit > 0) allProfits.push(netProfit);
      } else if (losers.length > 0) {
        const totalRisk = parlay.betAmount * participants.length;
        allLosses.push(-totalRisk);
      }
    });
    
    // Sort to find percentiles
    allProfits.sort((a, b) => a - b);
    allLosses.sort((a, b) => a - b);
    
    // Calculate profit thresholds (20th, 40th, 60th, 80th percentiles)
    const getPercentile = (arr, percentile) => {
      if (arr.length === 0) return 0;
      const index = Math.floor(arr.length * percentile);
      return arr[Math.min(index, arr.length - 1)];
    };
    
    return {
      profit: {
        tiny: getPercentile(allProfits, 0.2) || 150,
        small: getPercentile(allProfits, 0.4) || 300,
        medium: getPercentile(allProfits, 0.6) || 500,
        big: getPercentile(allProfits, 0.8) || 800,
        huge: getPercentile(allProfits, 0.95) || 1000
      },
      loss: {
        tiny: getPercentile(allLosses, 0.2) || -40,
        small: getPercentile(allLosses, 0.4) || -60,
        medium: getPercentile(allLosses, 0.6) || -90,
        big: getPercentile(allLosses, 0.8) || -130,
        huge: getPercentile(allLosses, 0.95) || -200
      }
    };
  };
  
  const thresholds = calculateDynamicThresholds();

  // Calendar data
  const currentMonth = calendarMonth.getMonth();
  const currentYear = calendarMonth.getFullYear();
  const calendarDays = getCalendarDays(currentMonth, currentYear);
  const monthName = calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  
  // Get today's date in Eastern Time
  const getTodayET = () => {
    const now = new Date();
    const etDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    return etDate.toDateString();
  };
  const todayET = getTodayET();

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl md:text-2xl font-bold text-yellow-400">📅 All Brolays</h2>
        <div className="flex gap-2">
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
            onClick={() => setCalendarView(!calendarView)}
            variant="secondary"
            className={isMobile ? 'min-h-[44px]' : ''}
          >
            {calendarView ? '📋 List View' : '📅 Calendar View'}
          </Button>
        </div>
      </div>
      
      {/* Calendar View */}
      {calendarView && (
        <Card padding="default" className="animate-fadeInUp">
          {/* Calendar Header */}
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl md:text-2xl font-bold text-yellow-400">{monthName}</h3>
            <div className="flex gap-2">
              <Button
                onClick={() => changeMonth(-1)}
                variant="secondary"
                size="small"
              >
                ← Prev
              </Button>
              <Button
                onClick={() => setCalendarMonth(new Date())}
                variant="secondary"
                size="small"
              >
                Today
              </Button>
              <Button
                onClick={() => changeMonth(1)}
                variant="secondary"
                size="small"
              >
                Next →
              </Button>
            </div>
          </div>
          
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2 mb-6">
            {/* Day headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-gray-500 font-semibold py-2 text-sm">
                {day}
              </div>
            ))}
            
            {/* Calendar days */}
            {calendarDays.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="aspect-square" />;
              }
              
              const dateStr = formatCalendarDate(currentYear, currentMonth, day);
              const dayBrolays = getBrolaysForDate(dateStr);
              const hasBrolays = dayBrolays.length > 0;
              const isSelected = selectedCalendarDate === dateStr;
              const isToday = todayET === new Date(dateStr + 'T00:00:00').toDateString();
              
              // Calculate day's financial performance
              let dayNetProfit = 0;
              let dayWins = 0;
              let dayLosses = 0;
              let dayAnd1s = 0;
              
              dayBrolays.forEach(parlay => {
                const participants = Object.values(parlay.participants);
                const losers = participants.filter(p => p.result === 'loss');
                const winners = participants.filter(p => p.result === 'win');
                const pushes = participants.filter(p => p.result === 'push');
                const won = losers.length === 0 && winners.length > 0 && pushes.length < participants.length;
                const and1 = losers.length === 1 && winners.length === participants.length - 1;
                
                if (won) {
                  const netProfit = (parlay.totalPayout || 0) - (parlay.betAmount * participants.length);
                  dayNetProfit += netProfit;
                  dayWins++;
                } else if (losers.length > 0) {
                  const totalRisk = parlay.betAmount * participants.length;
                  dayNetProfit -= totalRisk;
                  dayLosses++;
                  if (and1) dayAnd1s++;
                }
              });
              
              // Determine color based on profit/loss using DYNAMIC thresholds
              let bgColorClass = 'bg-gray-800';
              let borderColorClass = 'border-gray-700';
              let hoverBorderClass = 'hover:border-yellow-500/50';
              
              if (hasBrolays && dayNetProfit !== 0) {
                if (dayNetProfit > 0) {
                  // Green gradient based on dynamic profit thresholds
                  if (dayNetProfit >= thresholds.profit.huge) {
                    bgColorClass = 'bg-gradient-to-br from-green-400 via-emerald-500 to-green-600 shadow-lg shadow-green-500/30';
                    borderColorClass = 'border-green-300';
                    hoverBorderClass = 'hover:border-green-200';
                  } else if (dayNetProfit >= thresholds.profit.big) {
                    bgColorClass = 'bg-gradient-to-br from-green-500 to-emerald-700';
                    borderColorClass = 'border-green-400';
                    hoverBorderClass = 'hover:border-green-300';
                  } else if (dayNetProfit >= thresholds.profit.medium) {
                    bgColorClass = 'bg-gradient-to-br from-green-600 to-green-800';
                    borderColorClass = 'border-green-500';
                    hoverBorderClass = 'hover:border-green-400';
                  } else if (dayNetProfit >= thresholds.profit.small) {
                    bgColorClass = 'bg-gradient-to-br from-green-700 to-green-900';
                    borderColorClass = 'border-green-600';
                    hoverBorderClass = 'hover:border-green-500';
                  } else {
                    bgColorClass = 'bg-gradient-to-br from-green-800 to-gray-800';
                    borderColorClass = 'border-green-700';
                    hoverBorderClass = 'hover:border-green-600';
                  }
                } else {
                  // Red gradient based on dynamic loss thresholds
                  if (dayNetProfit <= thresholds.loss.huge) {
                    bgColorClass = 'bg-gradient-to-br from-red-500 via-rose-600 to-red-700 shadow-lg shadow-red-500/30';
                    borderColorClass = 'border-red-400';
                    hoverBorderClass = 'hover:border-red-300';
                  } else if (dayNetProfit <= thresholds.loss.big) {
                    bgColorClass = 'bg-gradient-to-br from-red-600 to-red-800';
                    borderColorClass = 'border-red-500';
                    hoverBorderClass = 'hover:border-red-400';
                  } else if (dayNetProfit <= thresholds.loss.medium) {
                    bgColorClass = 'bg-gradient-to-br from-red-700 to-red-900';
                    borderColorClass = 'border-red-600';
                    hoverBorderClass = 'hover:border-red-500';
                  } else if (dayNetProfit <= thresholds.loss.small) {
                    bgColorClass = 'bg-gradient-to-br from-red-800 to-gray-800';
                    borderColorClass = 'border-red-700';
                    hoverBorderClass = 'hover:border-red-600';
                  } else {
                    bgColorClass = 'bg-gradient-to-br from-red-900 to-gray-800';
                    borderColorClass = 'border-red-800';
                    hoverBorderClass = 'hover:border-red-700';
                  }
                }
              } else if (hasBrolays) {
                // Pending/no result yet
                bgColorClass = 'bg-gray-700';
                borderColorClass = 'border-gray-600';
              }
              
              // Emoji indicator - ONLY show skull for And-1s
              let emoji = '';
              if (dayAnd1s > 0) {
                emoji = '💀'; // Had and-1(s)
              }
              
              return (
                <button
                  key={day}
                  onClick={() => setSelectedCalendarDate(isSelected ? null : dateStr)}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center border transition-all ${
                    isSelected
                      ? 'bg-yellow-500/30 border-yellow-400 scale-105 shadow-lg shadow-yellow-500/50'
                      : `${bgColorClass} ${borderColorClass} ${hoverBorderClass} hover:scale-105`
                  } ${isToday ? 'ring-2 ring-blue-500' : ''} relative overflow-hidden`}
                >
                  {/* Emoji indicator at top - only And-1 skull */}
                  {emoji && (
                    <div className="absolute top-0.5 right-0.5 text-xs md:text-sm">
                      {emoji}
                    </div>
                  )}
                  
                  <div className={`text-lg font-bold ${
                    hasBrolays ? 'text-white' : 'text-gray-500'
                  }`}>
                    {day}
                  </div>
                  
                  {/* Desktop: Show all details */}
                  {hasBrolays && !isMobile && (
                    <div className="text-center mt-1">
                      <div className="text-xs text-gray-200 font-semibold">
                        {dayBrolays.length} {dayBrolays.length === 1 ? 'brolay' : 'brolays'}
                      </div>
                      {dayBrolays.length > 1 && (
                        <div className="text-xs font-bold mt-0.5" style={{
                          color: dayNetProfit > 0 ? '#4ade80' : dayNetProfit < 0 ? '#f87171' : '#fbbf24'
                        }}>
                          {dayWins}-{dayLosses}
                        </div>
                      )}
                      {dayNetProfit !== 0 && (
                        <div className={`text-xs font-bold mt-0.5 ${
                          dayNetProfit > 0 ? 'text-green-300' : 'text-red-300'
                        }`}>
                          {dayNetProfit > 0 ? '+' : ''}{dayNetProfit > 0 ? `$${dayNetProfit.toFixed(0)}` : `-$${Math.abs(dayNetProfit).toFixed(0)}`}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Mobile: Just show small dot indicator if has brolays */}
                  {hasBrolays && isMobile && (
                    <div className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-yellow-400"></div>
                  )}
                </button>
              );
            })}
          </div>
          
          {/* Selected Day Details */}
          {selectedCalendarDate && (
            <div className="mt-6">
              <div className="space-y-4">
                {getBrolaysForDate(selectedCalendarDate).map(parlay => {
                  const participants = Object.values(parlay.participants);
                  const losers = participants.filter(p => p.result === 'loss');
                  const winners = participants.filter(p => p.result === 'win');
                  const pushes = participants.filter(p => p.result === 'push');
                  const won = losers.length === 0 && winners.length > 0 && pushes.length < participants.length;
                  const and1 = losers.length === 1 && winners.length === participants.length - 1;
                  
                  const sports = [...new Set(participants.map(p => p.sport).filter(Boolean))];
                  const parlayType = sports.length > 1 ? 'Multi-Sport' : sports[0] || 'Brolay';
                  
                  return (
                    <div
                      key={parlay.id}
                      className={`bg-gray-800/50 rounded-lg p-4 border transition-all ${
                        won ? 'border-green-500/30' :
                        losers.length > 0 ? 'border-red-500/30' :
                        'border-yellow-500/30'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="text-white font-semibold">{parlayType} • {participants.length} picks</div>
                          <div className="text-gray-400 text-sm">
                            ${parlay.betAmount * participants.length} Risked • 
                            ${parlay.totalPayout || 0} Total Payout • 
                            ${Math.max(0, (parlay.totalPayout || 0) - (parlay.betAmount * participants.length))} Net Profit
                            {parlay.placedBy && ` • Placed by ${parlay.placedBy}`}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full font-bold text-sm ${
                            won ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-black' :
                            losers.length > 0 ? 'bg-gradient-to-r from-red-400 to-rose-500 text-white' :
                            'bg-gray-700 text-gray-300'
                          }`}>
                            {won ? 'WON' : losers.length > 0 ? (and1 ? 'LOST (And-1)' : 'LOST') : 'PENDING'}
                          </span>
                          {pushes.length > 0 && won && (
                            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded border border-yellow-500/30">
                              ⚠️ {pushes.length} Push{pushes.length > 1 ? 'es' : ''}
                            </span>
                          )}
                          <Button
                            onClick={() => setEditingParlay(parlay)}
                            variant="ghost"
                            size="small"
                            className={`text-blue-400 hover:text-blue-300 ${isMobile ? 'min-h-[44px]' : ''}`}
                          >
                            Edit
                          </Button>
                          <Button
                            onClick={() => deleteParlay(parlay.id)}
                            variant="ghost"
                            size="small"
                            className={`text-red-400 hover:text-red-300 ${isMobile ? 'min-h-[44px]' : ''}`}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                      
                      {/* Individual Picks */}
                      <div className="space-y-2">
                        {Object.entries(parlay.participants).map(([pid, participant]) => {
                          let teamDisplay = '';
                          if (['Total', 'First Half Total', 'First Inning Runs', 'Quarter Total'].includes(participant.betType)) {
                            teamDisplay = `${participant.awayTeam} @ ${participant.homeTeam}`;
                          } else {
                            teamDisplay = participant.team;
                          }
                        
                          const betDetails = formatBetDescription(participant);
                        
                          return (
                            <div key={pid} className="flex flex-col md:flex-row md:items-center md:justify-between text-xs md:text-sm bg-gray-900/50 p-2 rounded gap-1 border border-gray-800">
                              <span className="flex-1 text-gray-300">
                                <strong className="text-white">{participant.player}</strong> - {participant.sport} - {teamDisplay} {betDetails}
                                {participant.odds && (
                                  <span className="ml-2 text-purple-400 font-semibold">
                                    {participant.odds}
                                    {participant.oddsSource && <span className="text-xs text-gray-500"> ({participant.oddsSource})</span>}
                                  </span>
                                )}
                                {participant.actualStats && (
                                  <span className="ml-2 text-blue-400 font-semibold">
                                    [{participant.actualStats}]
                                  </span>
                                )}
                              </span>
                                
                              <div className="flex items-center gap-2">
                                {participant.autoUpdated && (
                                  <span 
                                    className="text-blue-400 cursor-help text-base" 
                                    title={`Auto-updated on ${new Date(participant.autoUpdatedAt).toLocaleString()}`}
                                  >
                                    🤖
                                  </span>
                                )}
                                
                                <span className={`font-semibold ${
                                  participant.result === 'win' ? 'text-green-400' :
                                  participant.result === 'loss' ? 'text-red-400' :
                                  participant.result === 'push' ? 'text-yellow-400' :
                                  'text-gray-500'
                                }`}>
                                  {participant.result.toUpperCase()}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
             </div>
            )}
          </Card>
        )}
            
      {/* List View (existing code) */}
      {!calendarView && (
        <>
          {/* Filters */}
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl p-4 md:p-6 border border-yellow-500/20">
            <Button
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              variant="ghost"
              className="w-full flex justify-between items-center text-base md:text-lg font-semibold mb-2 text-white"
            >
              <span>Filters</span>
              <span className="text-2xl">{filtersExpanded ? '−' : '+'}</span>
            </Button>
            
            {filtersExpanded && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Date From</label>
                    <input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                      style={{ fontSize: isMobile ? '16px' : '14px' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Date To</label>
                    <input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                      style={{ fontSize: isMobile ? '16px' : '14px' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Big Guy</label>
                    <select
                      value={filters.player}
                      onChange={(e) => setFilters({...filters, player: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                      style={{ fontSize: isMobile ? '16px' : '14px' }}
                    >
                      <option value="">All</option>
                      {players.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Sport</label>
                    <select
                      value={filters.sport}
                      onChange={(e) => setFilters({...filters, sport: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                      style={{ fontSize: isMobile ? '16px' : '14px' }}
                    >
                      <option value="">All</option>
                      {sports.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Placed By</label>
                    <select
                      value={filters.placedBy}
                      onChange={(e) => setFilters({...filters, placedBy: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                      style={{ fontSize: isMobile ? '16px' : '14px' }}
                    >
                      <option value="">All</option>
                      {players.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Min Payout</label>
                    <input
                      type="number"
                      value={filters.minPayout}
                      onChange={(e) => setFilters({...filters, minPayout: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                      style={{ fontSize: isMobile ? '16px' : '14px' }}
                      placeholder="$0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Max Payout</label>
                    <input
                      type="number"
                      value={filters.maxPayout}
                      onChange={(e) => setFilters({...filters, maxPayout: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                      style={{ fontSize: isMobile ? '16px' : '14px' }}
                      placeholder="Any"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Result</label>
                    <select
                      value={filters.result}
                      onChange={(e) => setFilters({...filters, result: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                      style={{ fontSize: isMobile ? '16px' : '14px' }}
                    >
                      <option value="">All</option>
                      <option value="win">Win</option>
                      <option value="loss">Loss</option>
                      <option value="push">Push</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Auto-Updated</label>
                    <select
                      value={filters.autoUpdated}
                      onChange={(e) => setFilters({...filters, autoUpdated: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                      style={{ fontSize: isMobile ? '16px' : '14px' }}
                    >
                      <option value="">All</option>
                      <option value="true">Auto-Updated Only</option>
                      <option value="false">Manual Only</option>
                    </select>
                  </div>
                  <div className="relative">
                    <label className="block text-sm font-medium mb-1 text-gray-300">Team/Player</label>
                    <input
                      type="text"
                      value={filters.teamPlayer}
                      onChange={(e) => setFilters({...filters, teamPlayer: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                      style={{ fontSize: isMobile ? '16px' : '14px' }}
                      placeholder="Search teams/players..."
                      list="team-player-suggestions"
                    />
                    <datalist id="team-player-suggestions">
                      {[...new Set([...Object.values(preloadedTeams).flat(), ...learnedTeams])].map((team, idx) => (
                        <option key={idx} value={team} />
                      ))}
                    </datalist>
                  </div>
                </div>
                <Button
                  onClick={() => setFilters({
                    dateFrom: '', dateTo: '', player: '', sport: '', teamPlayer: '',
                    placedBy: '', minPayout: '', maxPayout: '', result: '', autoUpdated: '',
                    betType: '', propType: ''
                  })}
                  variant="secondary"
                  className={`mt-4 ${isMobile ? 'min-h-[44px]' : ''}`}
                >
                  Clear Filters
                </Button>
              </>
            )}
          </div>

          {/* Brolays List */}
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl p-4 md:p-6 border border-yellow-500/20">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg md:text-xl font-bold text-white">
                {filteredParlays.length} Brolay{filteredParlays.length !== 1 ? 's' : ''}
              </h3>
            </div>
            
            <div className="space-y-3">
              {filteredParlays.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No brolays match your filters</p>
              ) : (
                filteredParlays.slice(0, brolaysToShow).map(parlay => {
                  const participants = Object.values(parlay.participants);
                  const losers = participants.filter(p => p.result === 'loss');
                  const winners = participants.filter(p => p.result === 'win');
                  const pushes = participants.filter(p => p.result === 'push');
                  const won = losers.length === 0 && winners.length > 0 && pushes.length < participants.length;
                  const and1 = losers.length === 1 && winners.length === participants.length - 1;
                  
                  const sports = [...new Set(participants.map(p => p.sport).filter(Boolean))];
                  const parlayType = sports.length > 1 ? 'Multi-Sport Brolay' : 
                                     sports.length === 1 ? `${sports[0]} Brolay` : 'Brolay';
                  
                  return (
                    <div key={parlay.id} className="border border-gray-700 rounded-lg p-4 md:p-6 bg-gray-800/50">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-semibold text-white">{formatDateForDisplay(parlay.date)} - {parlayType}</div>
                          <div className="text-sm text-gray-400">
                            {participants.length} picks • ${parlay.betAmount * participants.length} Risked • 
                            ${parlay.totalPayout || 0} Total Payout • 
                            ${Math.max(0, (parlay.totalPayout || 0) - (parlay.betAmount * participants.length))} Net Profit
                            {parlay.placedBy && <span> • Placed by {parlay.placedBy}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {won && (
                            <>
                              <span className="text-green-600 font-semibold">WON</span>
                              {pushes.length > 0 && (
                                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                  ⚠️ {pushes.length} Push{pushes.length > 1 ? 'es' : ''} - Adjusted Payout
                                </span>
                              )}
                            </>
                          )}
                          {!won && losers.length > 0 && (
                            <span className="text-red-600 font-semibold">
                              LOST {and1 && '(And-1)'}
                            </span>
                          )}
                          {losers.length === 0 && winners.length === 0 && (
                            <span className="text-gray-500 font-semibold">PENDING</span>
                          )}
                          <Button
                            onClick={() => setEditingParlay(parlay)}
                            variant="ghost"
                            size="small"
                            className={`text-blue-400 hover:text-blue-300 ${isMobile ? 'min-h-[44px]' : ''}`}
                          >
                            Edit
                          </Button>
                          <Button
                            onClick={() => deleteParlay(parlay.id)}
                            variant="ghost"
                            size="small"
                            className={`text-red-400 hover:text-red-300 ${isMobile ? 'min-h-[44px]' : ''}`}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {Object.entries(parlay.participants).map(([pid, participant]) => {
                          let teamDisplay = '';
                          if (['Total', 'First Half Total', 'First Inning Runs', 'Quarter Total'].includes(participant.betType)) {
                            teamDisplay = `${participant.awayTeam} @ ${participant.homeTeam}`;
                          } else {
                            teamDisplay = participant.team;
                          }
                        
                          const betDetails = formatBetDescription(participant);
                        
                          return (
                            <div key={pid} className="flex flex-col md:flex-row md:items-center md:justify-between text-xs md:text-sm bg-gray-900/50 p-2 rounded gap-1">
                              <span className="flex-1 text-gray-300">
                                <strong className="text-white">{participant.player}</strong> - {participant.sport} - {teamDisplay} {betDetails}
                                {participant.odds && (
                                  <span className="ml-2 text-purple-400 font-semibold">
                                    {participant.odds}
                                    {participant.oddsSource && <span className="text-xs text-gray-500"> ({participant.oddsSource})</span>}
                                  </span>
                                )}
                                {participant.actualStats && (
                                  <span className="ml-2 text-blue-400 font-semibold">
                                    [{participant.actualStats}]
                                  </span>
                                )}
                              </span>
                                
                              <div className="flex items-center gap-2">
                                {participant.autoUpdated && (
                                  <span 
                                    className="text-blue-400 cursor-help text-base" 
                                    title={`Auto-updated on ${new Date(participant.autoUpdatedAt).toLocaleString()}`}
                                  >
                                    🤖
                                  </span>
                                )}
                                
                                <span className={`font-semibold ${
                                  participant.result === 'win' ? 'text-green-400' :
                                  participant.result === 'loss' ? 'text-red-400' :
                                  participant.result === 'push' ? 'text-yellow-400' :
                                  'text-gray-500'
                                }`}>
                                  {participant.result.toUpperCase()}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            {/* Pagination Controls */}
            {filteredParlays.length > brolaysToShow && (
              <div className="mt-4 flex gap-3 justify-center">
                <Button
                  onClick={() => setBrolaysToShow(prev => prev + 10)}
                  variant="blue"
                  className={isMobile ? 'min-h-[44px]' : ''}
                >
                  Show More (10)
                </Button>
                <Button
                  onClick={() => setBrolaysToShow(filteredParlays.length)}
                  variant="secondary"
                  className={isMobile ? 'min-h-[44px]' : ''}
                >
                  Show All ({filteredParlays.length})
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
      
const renderPayments = () => {
  const filteredParlays = applyFilters([...parlays]).sort((a, b) => {
    const dateCompare = new Date(a.date) - new Date(b.date);
    if (dateCompare !== 0) return dateCompare;
    if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
      return a.sortOrder - b.sortOrder;
    }
    const aKey = a.id || a.id;
    const bKey = b.id || b.id;
    return String(aKey).localeCompare(String(bKey));
  });
  const unsettledParlays = filteredParlays.filter(p => !p.settled);
  const settledParlays = filteredParlays.filter(p => p.settled);
  const lostParlays = unsettledParlays.filter(p => {
    const participants = Object.values(p.participants);
    return participants.some(part => part.result === 'loss');
  });
  const wonParlays = unsettledParlays.filter(p => {
    const participants = Object.values(p.participants);
    const losers = participants.filter(part => part.result === 'loss');
    return losers.length === 0 && participants.some(part => part.result === 'win');
  });

  // Calculate who owes who
  const payments = [];
  
  // Lost parlays - winners get paid by placer
  lostParlays.forEach(parlay => {
    const participants = Object.values(parlay.participants);
    const losers = participants.filter(p => p.result === 'loss');
    const winners = participants.filter(p => p.result === 'win');
    const and1 = losers.length === 1 && winners.length === participants.length - 1; // For tracking only
    const totalAmount = parlay.betAmount * participants.length;
    const amountPerLoser = losers.length === 1 ? totalAmount : totalAmount / losers.length; // Payment logic
    
    losers.forEach(loser => {
      if (loser.player && parlay.placedBy) {
        payments.push({
          from: loser.player,
          to: parlay.placedBy,
          amount: amountPerLoser,
          parlayId: parlay.id,
          parlayDate: parlay.date,
          type: 'loss',
          and1: and1
        });
      }
    });
  });
  
  // Won parlays - placer pays winners
  wonParlays.forEach(parlay => {
    const participants = Object.values(parlay.participants);
    const winners = participants.filter(p => p.result === 'win');
    const netProfit = Math.max(0, (parlay.totalPayout || 0) - (parlay.betAmount * participants.length));
    const amountPerWinner = winners.length > 0 ? netProfit / winners.length : 0;
    
    winners.forEach(winner => {
      if (winner.player && parlay.placedBy) {
        payments.push({
          from: parlay.placedBy,
          to: winner.player,
          amount: amountPerWinner,
          parlayId: parlay.id,
          parlayDate: parlay.date,
          type: 'win'
        });
      }
    });
  });

  // Get all unique players from payments
  const allPlayersSet = new Set();
  payments.forEach(payment => {
    if (payment.from) allPlayersSet.add(payment.from);
    if (payment.to) allPlayersSet.add(payment.to);
  });
  const allPlayers = Array.from(allPlayersSet);

  // Calculate net positions (who owes who overall)
  const netPositions = {};
  allPlayers.forEach(player => {
    netPositions[player] = {};
    allPlayers.forEach(otherPlayer => {
      if (player !== otherPlayer) {
        netPositions[player][otherPlayer] = 0;
      }
    });
  });
    
  payments.forEach(payment => {
    if (payment.from && payment.to && payment.from !== payment.to && 
        netPositions[payment.from] && netPositions[payment.from][payment.to] !== undefined) {
      netPositions[payment.from][payment.to] += payment.amount;
    }
  });

  // Simplify: if A owes B and B owes A, net them out
  const simplifiedPayments = [];
  allPlayers.forEach(player1 => {
    allPlayers.forEach(player2 => {
      if (player1 < player2) { // Only process each pair once
        const player1OwesPlayer2 = netPositions[player1]?.[player2] || 0;
        const player2OwesPlayer1 = netPositions[player2]?.[player1] || 0;
        const netAmount = player1OwesPlayer2 - player2OwesPlayer1;
        
        if (Math.abs(netAmount) > 0.01) { // Ignore tiny amounts due to rounding
          simplifiedPayments.push({
            from: netAmount > 0 ? player1 : player2,
            to: netAmount > 0 ? player2 : player1,
            amount: Math.abs(netAmount)
          });
        }
      }
    });
  });

return (
    <div className="space-y-4 md:space-y-6">
      <h2 className="text-xl md:text-2xl font-bold text-yellow-400">💰 Payment Tracker</h2>
      
      {/* Filters - Compact for Payments */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl p-4 md:p-6 border border-yellow-500/20">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[140px]">
            <label className="block text-sm font-medium mb-1 text-gray-300">Date From</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
              style={{ fontSize: isMobile ? '16px' : '14px' }}
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-sm font-medium mb-1 text-gray-300">Date To</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
              style={{ fontSize: isMobile ? '16px' : '14px' }}
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-sm font-medium mb-1 text-gray-300">Placed By</label>
            <select
              value={filters.placedBy}
              onChange={(e) => setFilters({...filters, placedBy: e.target.value})}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
              style={{ fontSize: isMobile ? '16px' : '14px' }}
            >
              <option value="">All</option>
              {players.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <Button
            onClick={() => setFilters({
              dateFrom: '', dateTo: '', player: '', sport: '', teamPlayer: '', 
              placedBy: '', minPayout: '', maxPayout: '', result: '', autoUpdated: ''
            })}
            variant="secondary"
            className={isMobile ? 'min-h-[44px]' : ''}
          >
            Clear
          </Button>
        </div>
      </div>
      
      {/* Visual Summary Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card variant="warning" padding="default">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="text-yellow-400" size={24} />
            <h3 className="text-yellow-400 font-bold text-lg">Unsettled</h3>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {lostParlays.length + wonParlays.length}
          </div>
          <div className="text-sm text-gray-400">
            {lostParlays.length} lost • {wonParlays.length} won
          </div>
        </Card>

        <Card variant="danger" padding="default">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">💸</span>
            <h3 className="text-red-400 font-bold text-lg">Total Owed</h3>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            ${simplifiedPayments.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}
          </div>
          <div className="text-sm text-gray-400">
            {simplifiedPayments.length} payment{simplifiedPayments.length !== 1 ? 's' : ''} pending
          </div>
        </Card>

        <Card variant="success" padding="default">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">✅</span>
            <h3 className="text-green-400 font-bold text-lg">Recently Settled</h3>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {parlays.filter(p => p.settled).length}
          </div>
          <div className="text-sm text-gray-400">
            All-time settlements
          </div>
        </Card>
      </div>

      {/* Who Owes Who Summary Table */}
      {simplifiedPayments.length > 0 && (
        <Card title="💰 Who Owes Who (Net Summary)">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-300 font-semibold">From</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-semibold">To</th>
                  <th className="text-right py-3 px-4 text-gray-300 font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {simplifiedPayments.map((payment, idx) => (
                  <tr key={idx} className="border-b border-gray-700 hover:bg-gray-700/30 transition">
                    <td className="py-3 px-4 font-semibold text-red-400">{payment.from}</td>
                    <td className="py-3 px-4 font-semibold text-green-400">{payment.to}</td>
                    <td className="py-3 px-4 text-right font-bold text-base md:text-lg text-white">
                      ${payment.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Won Brolays */}
        <Card title="✅ Won Brolays" className="text-green-400">
          <div className="space-y-3">
            {wonParlays.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No won brolays to settle</p>
            ) : (
              wonParlays.map(parlay => {
                const participants = Object.values(parlay.participants);
                const winners = participants.filter(p => p.result === 'win');
                const netProfit = Math.max(0, (parlay.totalPayout || 0) - (parlay.betAmount * participants.length));
                const amountPerWinner = winners.length > 0 ? (netProfit / winners.length).toFixed(2) : 0;
                
                return (
                  <div key={parlay.id} className="border border-gray-700 rounded-lg p-4 bg-gray-800/50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-semibold text-white">{formatDateForDisplay(parlay.date)}</div>
                      <div className="text-sm text-gray-400">
                        Placed by: {parlay.placedBy || 'Unknown'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base md:text-lg font-bold text-green-400">
                        ${netProfit.toFixed(2)} profit
                      </div>
                      <div className="text-xs text-gray-500">
                        (${parlay.totalPayout || 0} payout)
                      </div>
                    </div>
                  </div>
                  <div className="text-sm mb-2 text-gray-300">
                    <span className="font-medium text-white">{parlay.placedBy || 'Unknown'} pays winners: </span>
                    {winners.map(winner => `${winner.player} ($${amountPerWinner.toFixed(2)})`).join(', ')}
                  </div>
                  <Button
                    onClick={() => toggleSettlement(parlay.id)}
                    disabled={saving}
                    variant="success"
                    size="small"
                    className={`mt-2 ${isMobile ? 'min-h-[44px]' : ''}`}
                  >
                    Mark as Settled
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </Card>
      
      {/* Lost Brolays */}
      <Card title="❌ Lost Brolays" className="text-red-400">
        <div className="space-y-3">
          {lostParlays.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No lost brolays to settle</p>
          ) : (
            lostParlays.map(parlay => {
              const participants = Object.values(parlay.participants);
              const losers = participants.filter(p => p.result === 'loss');
              const winners = participants.filter(p => p.result === 'win');
              const and1 = losers.length === 1 && winners.length === participants.length - 1;
              const totalLost = parlay.betAmount * participants.length;
              const amountPerLoser = losers.length > 0 ? (totalLost / losers.length) : 0;
              
              return (
                <div key={parlay.id} className="border border-gray-700 rounded-lg p-4 bg-gray-800/50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-semibold text-white">{formatDateForDisplay(parlay.date)}</div>
                      <div className="text-sm text-gray-400">
                        Placed by: {parlay.placedBy || 'Unknown'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base md:text-lg font-bold text-red-400">
                        ${(parlay.betAmount * participants.length).toFixed(2)}
                      </div>
                      {and1 && <span className="text-xs text-red-400 font-semibold">And-1</span>}
                    </div>
                  </div>
                  <div className="text-sm mb-2 text-gray-300">
                    <span className="font-medium text-white">Losers pay {parlay.placedBy || 'Unknown'}: </span>
                    {losers.map(loser => `${loser.player} ($${Number(amountPerLoser).toFixed(2)})`).join(', ')}
                  </div>
                  <Button
                    onClick={() => toggleSettlement(parlay.id)}
                    disabled={saving}
                    variant="success"
                    size="small"
                    className={`mt-2 ${isMobile ? 'min-h-[44px]' : ''}`}
                  >
                    Mark as Settled
                  </Button>
                  </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Recently Settled */}
      <Card title="✅ Recently Settled" className="text-gray-400">
        <div className="space-y-3">
          {settledParlays.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No recently settled brolays</p>
          ) : (
            <>
              {settledParlays
                .sort((a, b) => {
                  // Sort by settledAt date (most recent first), fallback to date
                  const dateA = new Date(a.settledAt || a.date);
                  const dateB = new Date(b.settledAt || b.date);
                  return dateB - dateA;
                })
                .slice(0, settledBrolaysToShow)
                .map(parlay => {
                  const participants = Object.values(parlay.participants);
                  const winners = participants.filter(p => p.result === 'win');
                  const losers = participants.filter(p => p.result === 'loss');
                  const won = losers.length === 0 && winners.length > 0;

                  return (
                    <div key={parlay.id} className="border border-gray-700 rounded-lg p-4 bg-gray-800/50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-semibold text-sm text-white">{formatDateForDisplay(parlay.date)}</div>
                          <div className="text-xs text-gray-400">
                            {won ? `Winners paid by ${parlay.placedBy || 'Unknown'}: ${winners.map(w => w.player).join(', ')}`
                                 : `Losers paid ${parlay.placedBy || 'Unknown'}: ${losers.map(l => l.player).join(', ')}`}
                          </div>
                        </div>
                        <Button
                          onClick={() => toggleSettlement(parlay.id)}
                          disabled={saving}
                          variant="danger"
                          size="small"
                          className={`ml-3 whitespace-nowrap ${isMobile ? 'min-h-[44px]' : ''}`}
                        >
                          Unsettle
                        </Button>
                      </div>
                    </div>
                  );
                })}

              {/* Pagination controls */}
              {settledParlays.length > settledBrolaysToShow && (
                <div className="flex justify-center gap-2 mt-4 pt-4 border-t border-gray-700">
                  <Button
                    onClick={() => setSettledBrolaysToShow(prev => prev + 10)}
                    variant="outline"
                    size="small"
                  >
                    Show 10 More
                  </Button>
                  <Button
                    onClick={() => setSettledBrolaysToShow(settledParlays.length)}
                    variant="outline"
                    size="small"
                  >
                    Show All ({settledParlays.length})
                  </Button>
                </div>
              )}

              {/* Show Less button when expanded */}
              {settledBrolaysToShow > 10 && settledBrolaysToShow >= settledParlays.length && (
                <div className="flex justify-center mt-4 pt-4 border-t border-gray-700">
                  <Button
                    onClick={() => setSettledBrolaysToShow(10)}
                    variant="outline"
                    size="small"
                  >
                    Show Less
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </Card>
    </div>
  );
};

const renderImport = () => (
  <div className="space-y-4 md:space-y-6">
    <div className="bg-white rounded-lg shadow p-4 md:p-6">
      <h2 className="text-xl md:text-2xl font-bold mb-4 text-yellow-400">📥 Import Historical Data</h2>
      <p className="text-gray-600 mb-4">
        Paste your CSV data below. Make sure it follows the exact format with all required columns.
      </p>
      
      <textarea
        value={csvInput}
        onChange={(e) => setCsvInput(e.target.value)}
        className="w-full h-64 px-3 py-2 border rounded font-mono text-sm"
        style={{ fontSize: isMobile ? '16px' : '14px' }}
        placeholder="Paste CSV data here..."
      />
      
      <Button
        onClick={() => {
          if (window.confirm('Import this data? This will add all rows to your database.')) {
            importFromCSV(csvInput);
          }
        }}
        disabled={saving || !csvInput}
        variant="primary"
        className={`mt-4 ${isMobile ? 'min-h-[44px]' : ''}`}
      >
        {saving ? 'Importing...' : 'Import Data'}
      </Button>
      <Button
        onClick={extractTeamsFromExistingParlays}
        disabled={parlays.length === 0}
        variant="success"
        className={`mt-4 ml-4 ${isMobile ? 'min-h-[44px]' : ''}`}
      >
        Extract Teams from Existing Data
      </Button>
    </div>
    
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 md:p-6">
      <h3 className="font-semibold text-blue-900 mb-2">CSV Format Requirements:</h3>
      <ul className="text-sm text-blue-800 space-y-1">
        <li>• First row must be headers (column names)</li>
        <li>• Date format: YYYY-MM-DD (e.g., 2024-12-20)</li>
        <li>• Required: date, betAmount, totalPayout, settled</li>
        <li>• Optional: placedBy (leave blank if unknown)</li>
        <li>• For each pick (pick1 through pick5):</li>
        <li className="ml-4">- pick#_player, pick#_sport, pick#_team, pick#_betType, pick#_result</li>
        <li className="ml-4">- For Spread: pick#_favorite, pick#_spread</li>
        <li className="ml-4">- For Total: pick#_awayTeam, pick#_homeTeam, pick#_overUnder, pick#_total</li>
        <li className="ml-4">- For Prop: pick#_propType, pick#_overUnder, pick#_line</li>
        <li>• Results: win, loss, push, or pending</li>
        <li>• If a brolay won but had pushes, enter the actual adjusted payout received</li>
      </ul>
    </div>
    
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 md:p-6">
      <h3 className="font-semibold text-gray-900 mb-2">Example CSV:</h3>
      <pre className="text-xs overflow-x-auto">
{`date,betAmount,totalPayout,placedBy,settled,pick1_player,pick1_sport,pick1_team,pick1_betType,pick1_favorite,pick1_spread,pick1_result,pick2_player,pick2_sport,pick2_awayTeam,pick2_homeTeam,pick2_betType,pick2_overUnder,pick2_total,pick2_result,pick3_player,pick3_sport,pick3_team,pick3_betType,pick3_propType,pick3_overUnder,pick3_line,pick3_result
2024-12-20,10,675,Management,false,Management,NFL,Chiefs,Spread,Favorite,7.5,win,CD,NFL,Bills,Chiefs,Total,Over,45.5,win,914,NBA,Lakers,Prop Bet,Points,Over,25.5,loss`}
      </pre>
    </div>
  </div>
);
 

export default GroupDashboard;
