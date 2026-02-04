import React from 'react';
import { PLAYERS, SPORTS } from '../../constants/sports';
import Button from '../common/Button';

/**
 * RankingsFilter - Filter component for Rankings page
 *
 * Provides filtering options for rankings statistics:
 * - Date range (with presets)
 * - Player multi-select
 * - Sport multi-select
 * - Minimum sample size slider
 */
const RankingsFilter = ({
  filters,
  setFilters,
  onClear,
  expanded,
  onToggle,
  isMobile = false
}) => {
  const players = PLAYERS;
  const sports = SPORTS;

  // Calculate active filter count
  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.dateFrom || filters.dateTo) count++;
    if (filters.players && filters.players.length > 0) count++;
    if (filters.sports && filters.sports.length > 0) count++;
    if (filters.minSampleSize !== 10) count++; // 10 is default
    return count;
  };

  const activeCount = getActiveFilterCount();

  // Date range presets
  const applyDatePreset = (preset) => {
    const today = new Date();
    const formatDate = (date) => date.toISOString().split('T')[0];

    let dateFrom = '';
    let dateTo = formatDate(today);

    switch (preset) {
      case 'last7':
        const last7 = new Date(today);
        last7.setDate(last7.getDate() - 7);
        dateFrom = formatDate(last7);
        break;
      case 'last30':
        const last30 = new Date(today);
        last30.setDate(last30.getDate() - 30);
        dateFrom = formatDate(last30);
        break;
      case 'thisYear':
        dateFrom = `${today.getFullYear()}-01-01`;
        break;
      case 'allTime':
        dateFrom = '';
        dateTo = '';
        break;
    }

    setFilters({ ...filters, dateFrom, dateTo });
  };

  // Toggle player in filters
  const togglePlayer = (player) => {
    const currentPlayers = filters.players || [];
    const newPlayers = currentPlayers.includes(player)
      ? currentPlayers.filter(p => p !== player)
      : [...currentPlayers, player];
    setFilters({ ...filters, players: newPlayers });
  };

  // Toggle sport in filters
  const toggleSport = (sport) => {
    const currentSports = filters.sports || [];
    const newSports = currentSports.includes(sport)
      ? currentSports.filter(s => s !== sport)
      : [...currentSports, sport];
    setFilters({ ...filters, sports: newSports });
  };

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl p-4 md:p-6 border border-yellow-500/20">
      <Button
        onClick={onToggle}
        variant="ghost"
        className="w-full flex justify-between items-center text-base md:text-lg font-semibold mb-2 text-white"
      >
        <span className="flex items-center gap-2">
          Filters
          {activeCount > 0 && (
            <span className="text-xs bg-yellow-500 text-black px-2 py-0.5 rounded-full font-bold">
              {activeCount} active
            </span>
          )}
        </span>
        <span className="text-2xl">{expanded ? '−' : '+'}</span>
      </Button>

      {expanded && (
        <>
          {/* Date Range Presets */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 text-gray-300">Date Range</label>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => applyDatePreset('last7')}
                variant="secondary"
                size="small"
                className={isMobile ? 'min-h-[44px]' : ''}
              >
                Last 7 Days
              </Button>
              <Button
                onClick={() => applyDatePreset('last30')}
                variant="secondary"
                size="small"
                className={isMobile ? 'min-h-[44px]' : ''}
              >
                Last 30 Days
              </Button>
              <Button
                onClick={() => applyDatePreset('thisYear')}
                variant="secondary"
                size="small"
                className={isMobile ? 'min-h-[44px]' : ''}
              >
                This Year
              </Button>
              <Button
                onClick={() => applyDatePreset('allTime')}
                variant="secondary"
                size="small"
                className={isMobile ? 'min-h-[44px]' : ''}
              >
                All Time
              </Button>
            </div>
          </div>

          {/* Custom Date Range */}
          <div className="grid grid-cols-2 gap-3 md:gap-4 mb-4">
            <div>
              <label htmlFor="rankings-date-from" className="block text-sm font-medium mb-1 text-gray-300">
                Date From
              </label>
              <input
                id="rankings-date-from"
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                style={{ fontSize: isMobile ? '16px' : '14px' }}
              />
            </div>
            <div>
              <label htmlFor="rankings-date-to" className="block text-sm font-medium mb-1 text-gray-300">
                Date To
              </label>
              <input
                id="rankings-date-to"
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                style={{ fontSize: isMobile ? '16px' : '14px' }}
              />
            </div>
          </div>

          {/* Player Multi-Select */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 text-gray-300">Players</label>
            <div className="flex flex-wrap gap-2">
              {players.map(player => (
                <label
                  key={player}
                  className={`flex items-center gap-2 px-3 py-2 rounded border cursor-pointer transition-all ${
                    (filters.players || []).includes(player)
                      ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400'
                      : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={(filters.players || []).includes(player)}
                    onChange={() => togglePlayer(player)}
                    className="sr-only"
                    aria-label={player}
                  />
                  <span className="text-sm font-medium">{player}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Sport Multi-Select */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 text-gray-300">Sports</label>
            <div className="flex flex-wrap gap-2">
              {sports.map(sport => (
                <label
                  key={sport}
                  className={`flex items-center gap-2 px-3 py-2 rounded border cursor-pointer transition-all ${
                    (filters.sports || []).includes(sport)
                      ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400'
                      : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={(filters.sports || []).includes(sport)}
                    onChange={() => toggleSport(sport)}
                    className="sr-only"
                    aria-label={sport}
                  />
                  <span className="text-sm font-medium">{sport}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Minimum Sample Size Slider */}
          <div className="mb-4">
            <label htmlFor="rankings-min-sample" className="block text-sm font-medium mb-2 text-gray-300">
              Min Sample Size: <span className="text-yellow-400 font-bold">{filters.minSampleSize || 10}</span>
            </label>
            <input
              id="rankings-min-sample"
              type="range"
              min="3"
              max="25"
              step="1"
              value={filters.minSampleSize || 10}
              onChange={(e) => setFilters({ ...filters, minSampleSize: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
              aria-label="Min Sample Size"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>3</span>
              <span>25</span>
            </div>
          </div>

          {/* Clear Filters Button */}
          <Button
            onClick={onClear}
            variant="secondary"
            className={`w-full ${isMobile ? 'min-h-[44px]' : ''}`}
          >
            Clear Filters
          </Button>
        </>
      )}
    </div>
  );
};

export default RankingsFilter;
