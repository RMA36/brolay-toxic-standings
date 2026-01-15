import React from 'react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { RefreshCw } from 'lucide-react';

/**
 * AllBrolays Page Component
 *
 * Displays all brolays in either calendar view or list view with filtering capabilities.
 * Calendar view shows financial performance color-coded by profit/loss.
 * List view shows detailed brolay information with filtering options.
 *
 * @param {Object} props
 * @param {Array} props.parlays - Array of all parlays/brolays
 * @param {Array} props.players - Array of player names
 * @param {Array} props.sports - Array of sport names
 * @param {Function} props.applyFilters - Function to apply current filters to parlays
 * @param {Date} props.calendarMonth - Current month being viewed in calendar
 * @param {Function} props.setCalendarMonth - Set the calendar month
 * @param {Function} props.getCalendarDays - Get array of days for calendar grid
 * @param {string|null} props.selectedCalendarDate - Currently selected date in calendar
 * @param {Function} props.setSelectedCalendarDate - Set the selected calendar date
 * @param {boolean} props.calendarView - Whether calendar view is active
 * @param {Function} props.setCalendarView - Toggle calendar view
 * @param {Function} props.changeMonth - Navigate to previous/next month
 * @param {Function} props.formatCalendarDate - Format date for calendar
 * @param {Function} props.getBrolaysForDate - Get brolays for specific date
 * @param {Function} props.formatBetDescription - Format bet description text
 * @param {Function} props.setEditingParlay - Set parlay to edit
 * @param {Function} props.deleteParlay - Delete a parlay
 * @param {Function} props.handleAutoUpdate - Trigger auto-update for pending picks
 * @param {boolean} props.autoUpdating - Whether auto-update is in progress
 * @param {boolean} props.isMobile - Whether on mobile device
 * @param {Object} props.filters - Current filter values
 * @param {Function} props.setFilters - Update filter values
 * @param {boolean} props.filtersExpanded - Whether filters are expanded
 * @param {Function} props.setFiltersExpanded - Toggle filter expansion
 * @param {Object} props.preloadedTeams - Preloaded teams by sport
 * @param {Array} props.learnedTeams - Dynamically learned team names
 */
const AllBrolays = ({
  parlays,
  players,
  sports,
  applyFilters,
  calendarMonth,
  setCalendarMonth,
  getCalendarDays,
  selectedCalendarDate,
  setSelectedCalendarDate,
  calendarView,
  setCalendarView,
  changeMonth,
  formatCalendarDate,
  getBrolaysForDate,
  formatBetDescription,
  setEditingParlay,
  deleteParlay,
  handleAutoUpdate,
  autoUpdating,
  isMobile,
  filters,
  setFilters,
  filtersExpanded,
  setFiltersExpanded,
  preloadedTeams,
  learnedTeams
}) => {
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
              {filteredParlays.map(parlay => {
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
                    className={`bg-gray-800/50 rounded-lg p-3 md:p-4 border transition-all ${
                      won ? 'border-green-500/30' :
                      losers.length > 0 ? 'border-red-500/30' :
                      'border-yellow-500/30'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-3 gap-2">
                      <div className="flex-1">
                        <div className="text-white font-semibold text-sm md:text-base">
                          {new Date(parlay.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })} • {parlayType} • {participants.length} picks
                        </div>
                        <div className="text-gray-400 text-xs md:text-sm mt-1">
                          ${parlay.betAmount * participants.length} Risked •
                          ${parlay.totalPayout || 0} Total Payout •
                          ${Math.max(0, (parlay.totalPayout || 0) - (parlay.betAmount * participants.length))} Net Profit
                          {parlay.placedBy && ` • Placed by ${parlay.placedBy}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 md:px-3 py-1 rounded-full font-bold text-xs md:text-sm whitespace-nowrap ${
                          won ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-black' :
                          losers.length > 0 ? 'bg-gradient-to-r from-red-400 to-rose-500 text-white' :
                          'bg-gray-700 text-gray-300'
                        }`}>
                          {won ? 'WON' : losers.length > 0 ? (and1 ? 'LOST (And-1)' : 'LOST') : 'PENDING'}
                        </span>
                        {pushes.length > 0 && won && (
                          <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded border border-yellow-500/30 whitespace-nowrap">
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
        </>
      )}
    </div>
  );
};

export default AllBrolays;
