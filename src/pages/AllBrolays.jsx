import React, { useMemo } from 'react';
import { useBrolayContext } from '../contexts/BrolayContext';
import { PLAYERS, SPORTS, PICK_TYPES, PRELOADED_TEAMS } from '../constants/sports';
import { formatBetDescription, formatCalendarDate, formatDateForDisplay, getPickBigGuy, getPickResult, getPicksArray, getSubmittedBy, getPickActualStats } from '../utils/formatters';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import AllBrolaysFilter from '../components/filters/AllBrolaysFilter';
import EditParlayModal from '../components/modals/EditParlayModal';
import CalendarDay from '../components/calendar/CalendarDay';
import { RefreshCw } from 'lucide-react';

/**
 * AllBrolays Page Component
 *
 * Displays all brolays in either calendar view or list view with filtering capabilities.
 * Calendar view shows financial performance color-coded by profit/loss.
 * List view shows detailed brolay information with filtering options.
 */
const AllBrolays = () => {
  // Get context values
  const {
    parlays,
    calendarMonth,
    setCalendarMonth,
    selectedCalendarDate,
    setSelectedCalendarDate,
    calendarView,
    setCalendarView,
    editingParlay,
    setEditingParlay,
    handleDeleteParlay,
    handleSaveEditedParlay,
    handleAutoUpdate,
    autoUpdating,
    isMobile,
    filters,
    setFilters,
    filtersExpanded,
    setFiltersExpanded,
    learnedTeams,
    brolaysToShow,
    setBrolaysToShow,
    suggestions,
    showSuggestions,
    handleTeamInput,
    handlePropTypeInput,
    handleAwayTeamInput,
    handleHomeTeamInput,
    handlePlayerInput,
    handleSelectSuggestion,
    saving
  } = useBrolayContext();

  const players = PLAYERS;
  const sports = SPORTS;
  const preloadedTeams = PRELOADED_TEAMS;

  // Helper functions
  const getCalendarDays = (month, year) => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];

    // Add empty slots for days before the first of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const changeMonth = (direction) => {
    const newMonth = new Date(calendarMonth);
    newMonth.setMonth(newMonth.getMonth() + direction);
    setCalendarMonth(newMonth);
  };

  const getBrolaysForDate = (dateStr) => {
    return parlays.filter(p => p.date === dateStr);
  };

  // Apply filters to parlays (supports both old and new schema)
  const applyFilters = (parlayList) => {
    return parlayList.filter(parlay => {
      // Date filters
      if (filters.dateFrom && parlay.date < filters.dateFrom) return false;
      if (filters.dateTo && parlay.date > filters.dateTo) return false;

      // Submitted By filter (supports both submittedBy and placedBy)
      const filterSubmittedBy = filters.submittedBy || filters.placedBy;
      if (filterSubmittedBy) {
        const parlaySubmittedBy = getSubmittedBy(parlay);
        if (parlaySubmittedBy !== filterSubmittedBy) return false;
      }

      // Payout filters
      if (filters.minPayout && parlay.totalPayout < parseFloat(filters.minPayout)) return false;
      if (filters.maxPayout && parlay.totalPayout > parseFloat(filters.maxPayout)) return false;

      // Settlement filter
      if (filters.result === 'settled' && !parlay.settled) return false;
      if (filters.result === 'pending' && parlay.settled) return false;

      // Pick-level filters (supports both schemas)
      const picks = getPicksArray(parlay);

      // Big Guy filter - support both old single-select and new multi-select
      const playerFilter = filters.players && filters.players.length > 0 ? filters.players : (filters.player ? [filters.player] : []);
      if (playerFilter.length > 0 && !picks.some(p => playerFilter.includes(getPickBigGuy(p)))) return false;

      // Sport filter - support both old single-select and new multi-select
      const sportFilter = filters.sports && filters.sports.length > 0 ? filters.sports : (filters.sport ? [filters.sport] : []);
      if (sportFilter.length > 0 && !picks.some(p => sportFilter.includes(p.sport))) return false;

      // Team/Player filter
      if (filters.teamPlayer && !picks.some(p =>
        p.team?.toLowerCase().includes(filters.teamPlayer.toLowerCase()) ||
        p.awayTeam?.toLowerCase().includes(filters.teamPlayer.toLowerCase()) ||
        p.homeTeam?.toLowerCase().includes(filters.teamPlayer.toLowerCase())
      )) return false;

      return true;
    });
  };

  // Memoize filtered and sorted parlays - recalculates only when parlays or filters change
  const filteredParlays = useMemo(() => {
    return applyFilters([...parlays]).sort((a, b) => {
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
  }, [parlays, filters]);

  // Memoize pending picks count - depends on filteredParlays
  const pendingPicksCount = useMemo(() => {
    return filteredParlays.reduce((count, parlay) => {
      const picks = getPicksArray(parlay);
      return count + picks.filter(p => getPickResult(p) === 'pending').length;
    }, 0);
  }, [filteredParlays]);

  // Memoize dynamic color scale thresholds - only recalculates when parlays change
  const thresholds = useMemo(() => {
    const allProfits = [];
    const allLosses = [];

    parlays.forEach(parlay => {
      const picks = getPicksArray(parlay);
      const losers = picks.filter(p => getPickResult(p) === 'loss');
      const winners = picks.filter(p => getPickResult(p) === 'win');
      const pushes = picks.filter(p => getPickResult(p) === 'push');
      const won = losers.length === 0 && winners.length > 0 && pushes.length < picks.length;

      if (won) {
        const netProfit = (parlay.totalPayout || 0) - (parlay.betAmount * picks.length);
        if (netProfit > 0) allProfits.push(netProfit);
      } else if (losers.length > 0) {
        const totalRisk = parlay.betAmount * picks.length;
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
  }, [parlays]);

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

  // Clear all filters
  const handleClearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      player: '',
      players: [],
      sport: '',
      sports: [],
      teamPlayer: '',
      submittedBy: '',
      placedBy: '',
      minPayout: '',
      maxPayout: '',
      result: '',
      autoUpdated: '',
      betType: '',
      propType: ''
    });
  };

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

              return (
                <CalendarDay
                  key={day}
                  day={day}
                  currentYear={currentYear}
                  currentMonth={currentMonth}
                  getBrolaysForDate={getBrolaysForDate}
                  thresholds={thresholds}
                  selectedCalendarDate={selectedCalendarDate}
                  setSelectedCalendarDate={setSelectedCalendarDate}
                  todayET={todayET}
                  isMobile={isMobile}
                />
              );
            })}
          </div>

          {/* Selected Day Details */}
          {selectedCalendarDate && (
            <div className="mt-6">
              <div className="space-y-4">
                {getBrolaysForDate(selectedCalendarDate).map(parlay => {
                  const picks = getPicksArray(parlay);
                  const losers = picks.filter(p => getPickResult(p) === 'loss');
                  const winners = picks.filter(p => getPickResult(p) === 'win');
                  const pushes = picks.filter(p => getPickResult(p) === 'push');
                  const won = losers.length === 0 && winners.length > 0 && pushes.length < picks.length;
                  const and1 = losers.length === 1 && winners.length === picks.length - 1;

                  const sportsSet = [...new Set(picks.map(p => p.sport).filter(Boolean))];
                  const parlayType = sportsSet.length > 1 ? 'Multi-Sport' : sportsSet[0] || 'Brolay';
                  const submittedBy = getSubmittedBy(parlay);

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
                          <div className="text-white font-semibold">{parlayType} • {picks.length} picks</div>
                          <div className="text-gray-400 text-sm">
                            ${parlay.betAmount * picks.length} Risked •
                            ${parlay.totalPayout || 0} Total Payout •
                            ${Math.max(0, (parlay.totalPayout || 0) - (parlay.betAmount * picks.length))} Net Profit
                            {submittedBy && ` • Submitted by ${submittedBy}`}
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
                        </div>
                      </div>

                      {/* Individual Picks */}
                      <div className="space-y-2">
                        {picks.map((pick, pickIndex) => {
                          const bigGuy = getPickBigGuy(pick);
                          const result = getPickResult(pick);
                          const actualStats = getPickActualStats(pick);
                          const autoUpdated = pick.outcome?.autoUpdated || pick.autoUpdated;
                          const autoUpdatedAt = pick.outcome?.settledAt || pick.autoUpdatedAt;

                          let teamDisplay = '';
                          if (['Total', 'First Half Total', 'First Inning Runs', 'Quarter Total'].includes(pick.betType)) {
                            const awayTeam = pick.game?.awayTeam || pick.awayTeam;
                            const homeTeam = pick.game?.homeTeam || pick.homeTeam;
                            teamDisplay = `${awayTeam} @ ${homeTeam}`;
                          } else {
                            // For new schema, get team from entities
                            if (pick.entities && pick.entities.length > 0) {
                              const primary = pick.entities.find(e => e.role === 'primary') || pick.entities[0];
                              teamDisplay = primary?.name || pick.team;
                            } else {
                              teamDisplay = pick.team;
                            }
                          }

                          const betDetails = formatBetDescription(pick);

                          return (
                            <div key={pickIndex} className="flex flex-col md:flex-row md:items-center md:justify-between text-xs md:text-sm bg-gray-900/50 p-2 rounded gap-1 border border-gray-800">
                              <span className="flex-1 text-gray-300">
                                <strong className="text-white">{bigGuy}</strong> - {pick.sport} - {teamDisplay} {betDetails}
                                {pick.odds && (
                                  <span className="ml-2 text-purple-400 font-semibold">
                                    {pick.odds}
                                    {pick.oddsSource && <span className="text-xs text-gray-500"> ({pick.oddsSource})</span>}
                                  </span>
                                )}
                                {actualStats && (
                                  <span className="ml-2 text-blue-400 font-semibold">
                                    [{actualStats}]
                                  </span>
                                )}
                              </span>

                              <div className="flex items-center gap-2">
                                {autoUpdated && (
                                  <span
                                    className="text-blue-400 cursor-help text-base"
                                    title={`Auto-updated on ${new Date(autoUpdatedAt).toLocaleString()}`}
                                  >
                                    🤖
                                  </span>
                                )}

                                <span className={`font-semibold ${
                                  result === 'win' ? 'text-green-400' :
                                  result === 'loss' ? 'text-red-400' :
                                  result === 'push' ? 'text-yellow-400' :
                                  'text-gray-500'
                                }`}>
                                  {result?.toUpperCase() || 'PENDING'}
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
          <AllBrolaysFilter
            filters={filters}
            setFilters={setFilters}
            onClear={handleClearFilters}
            expanded={filtersExpanded}
            onToggle={() => setFiltersExpanded(!filtersExpanded)}
            isMobile={isMobile}
            learnedTeams={learnedTeams}
            preloadedTeams={preloadedTeams}
          />

          {/* Brolays List */}
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl p-4 md:p-6 border border-yellow-500/20">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg md:text-xl font-bold text-white">
                {filteredParlays.length} Brolay{filteredParlays.length !== 1 ? 's' : ''}
              </h3>
            </div>

            <div className="space-y-3">
              {filteredParlays.slice(0, brolaysToShow).map(parlay => {
                const picks = getPicksArray(parlay);
                const losers = picks.filter(p => getPickResult(p) === 'loss');
                const winners = picks.filter(p => getPickResult(p) === 'win');
                const pushes = picks.filter(p => getPickResult(p) === 'push');
                const won = losers.length === 0 && winners.length > 0 && pushes.length < picks.length;
                const and1 = losers.length === 1 && winners.length === picks.length - 1;

                const sportsSet = [...new Set(picks.map(p => p.sport).filter(Boolean))];
                const parlayType = sportsSet.length > 1 ? 'Multi-Sport' : sportsSet[0] || 'Brolay';
                const submittedBy = getSubmittedBy(parlay);

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
                          {(() => {
                            // Parse date as local time to avoid timezone issues
                            const [year, month, day] = parlay.date.split('-').map(Number);
                            const localDate = new Date(year, month - 1, day);
                            return localDate.toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            });
                          })()} • {parlayType} • {picks.length} picks
                        </div>
                        <div className="text-gray-400 text-xs md:text-sm mt-1">
                          ${parlay.betAmount * picks.length} Risked •
                          ${parlay.totalPayout || 0} Total Payout •
                          ${Math.max(0, (parlay.totalPayout || 0) - (parlay.betAmount * picks.length))} Net Profit
                          {submittedBy && ` • Submitted by ${submittedBy}`}
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
                      </div>
                    </div>

                    {/* Individual Picks */}
                    <div className="space-y-2">
                      {picks.map((pick, pickIndex) => {
                        const bigGuy = getPickBigGuy(pick);
                        const result = getPickResult(pick);
                        const actualStats = getPickActualStats(pick);
                        const autoUpdated = pick.outcome?.autoUpdated || pick.autoUpdated;
                        const autoUpdatedAt = pick.outcome?.settledAt || pick.autoUpdatedAt;

                        let teamDisplay = '';
                        if (['Total', 'First Half Total', 'First Inning Runs', 'Quarter Total'].includes(pick.betType)) {
                          const awayTeam = pick.game?.awayTeam || pick.awayTeam;
                          const homeTeam = pick.game?.homeTeam || pick.homeTeam;
                          teamDisplay = `${awayTeam} @ ${homeTeam}`;
                        } else {
                          if (pick.entities && pick.entities.length > 0) {
                            const primary = pick.entities.find(e => e.role === 'primary') || pick.entities[0];
                            teamDisplay = primary?.name || pick.team;
                          } else {
                            teamDisplay = pick.team;
                          }
                        }

                        const betDetails = formatBetDescription(pick);

                        return (
                          <div key={pickIndex} className="flex flex-col md:flex-row md:items-center md:justify-between text-xs md:text-sm bg-gray-900/50 p-2 rounded gap-1 border border-gray-800">
                            <span className="flex-1 text-gray-300">
                              <strong className="text-white">{bigGuy}</strong> - {pick.sport} - {teamDisplay} {betDetails}
                              {pick.odds && (
                                <span className="ml-2 text-purple-400 font-semibold">
                                  {pick.odds}
                                  {pick.oddsSource && <span className="text-xs text-gray-500"> ({pick.oddsSource})</span>}
                                </span>
                              )}
                              {actualStats && (
                                <span className="ml-2 text-blue-400 font-semibold">
                                  [{actualStats}]
                                </span>
                              )}
                            </span>

                            <div className="flex items-center gap-2">
                              {autoUpdated && (
                                <span
                                  className="text-blue-400 cursor-help text-base"
                                  title={`Auto-updated on ${new Date(autoUpdatedAt).toLocaleString()}`}
                                >
                                  🤖
                                </span>
                              )}

                              <span className={`font-semibold ${
                                result === 'win' ? 'text-green-400' :
                                result === 'loss' ? 'text-red-400' :
                                result === 'push' ? 'text-yellow-400' :
                                'text-gray-500'
                              }`}>
                                {result?.toUpperCase() || 'PENDING'}
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

            {/* Pagination Controls */}
            {filteredParlays.length > brolaysToShow && (
              <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-center">
                <Button
                  onClick={() => setBrolaysToShow(brolaysToShow + 10)}
                  variant="secondary"
                  className={isMobile ? 'min-h-[44px]' : ''}
                >
                  Show 10 More
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
            {brolaysToShow > 10 && brolaysToShow >= filteredParlays.length && (
              <div className="mt-4 text-center">
                <Button
                  onClick={() => setBrolaysToShow(10)}
                  variant="secondary"
                  className={isMobile ? 'min-h-[44px]' : ''}
                >
                  Show Less
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Edit Parlay Modal */}
      {editingParlay && (
        <EditParlayModal
          isOpen={!!editingParlay}
          onClose={() => setEditingParlay(null)}
          parlay={editingParlay}
          onSave={handleSaveEditedParlay}
          onDelete={handleDeleteParlay}
          players={players}
          sports={sports}
          betTypes={PICK_TYPES}
          suggestions={suggestions}
          showSuggestions={showSuggestions}
          onTeamInput={handleTeamInput}
          onPropTypeInput={handlePropTypeInput}
          onAwayTeamInput={handleAwayTeamInput}
          onHomeTeamInput={handleHomeTeamInput}
          onPlayerInput={handlePlayerInput}
          onSelectSuggestion={handleSelectSuggestion}
          isMobile={isMobile}
          saving={saving}
        />
      )}
    </div>
  );
};

export default AllBrolays;
