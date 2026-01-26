import React from 'react';
import Button from '../common/Button';

/**
 * FilterBar - Collapsible filter controls for brolay data
 *
 * @param {Object} props
 * @param {Object} props.filters - Current filter values
 * @param {function} props.onFilterChange - Callback when filters change
 * @param {function} props.onClearFilters - Callback to clear all filters
 * @param {boolean} props.isExpanded - Whether filter section is expanded
 * @param {function} props.onToggleExpand - Callback to toggle expansion
 * @param {Array} props.players - List of player names
 * @param {Array} props.sports - List of sport names
 * @param {Array} props.preloadedTeams - Preloaded team names
 * @param {Array} props.learnedTeams - Learned team names
 * @param {boolean} props.isMobile - Whether on mobile device
 */
const FilterBar = ({
  filters,
  onFilterChange,
  onClearFilters,
  isExpanded,
  onToggleExpand,
  players,
  sports,
  preloadedTeams,
  learnedTeams,
  isMobile = false
}) => {
  const handleFilterChange = (field, value) => {
    onFilterChange({ ...filters, [field]: value });
  };

  const inputClassName = "w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none";
  const inputStyle = { fontSize: isMobile ? '16px' : '14px' };

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl p-4 md:p-6 border border-yellow-500/20">
      <Button
        onClick={onToggleExpand}
        variant="ghost"
        className="w-full flex justify-between items-center text-base md:text-lg font-semibold mb-2 text-white"
      >
        <span>Filters</span>
        <span className="text-2xl">{isExpanded ? '−' : '+'}</span>
      </Button>

      {isExpanded && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300">Date From</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className={inputClassName}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300">Date To</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className={inputClassName}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300">Big Guy</label>
              <select
                value={filters.player}
                onChange={(e) => handleFilterChange('player', e.target.value)}
                className={inputClassName}
                style={inputStyle}
              >
                <option value="">All</option>
                {players.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300">Sport</label>
              <select
                value={filters.sport}
                onChange={(e) => handleFilterChange('sport', e.target.value)}
                className={inputClassName}
                style={inputStyle}
              >
                <option value="">All</option>
                {sports.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300">Submitted By</label>
              <select
                value={filters.submittedBy || filters.placedBy || ''}
                onChange={(e) => handleFilterChange('submittedBy', e.target.value)}
                className={inputClassName}
                style={inputStyle}
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
                onChange={(e) => handleFilterChange('minPayout', e.target.value)}
                className={inputClassName}
                style={inputStyle}
                placeholder="$0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300">Max Payout</label>
              <input
                type="number"
                value={filters.maxPayout}
                onChange={(e) => handleFilterChange('maxPayout', e.target.value)}
                className={inputClassName}
                style={inputStyle}
                placeholder="Any"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300">Result</label>
              <select
                value={filters.result}
                onChange={(e) => handleFilterChange('result', e.target.value)}
                className={inputClassName}
                style={inputStyle}
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
                onChange={(e) => handleFilterChange('autoUpdated', e.target.value)}
                className={inputClassName}
                style={inputStyle}
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
                onChange={(e) => handleFilterChange('teamPlayer', e.target.value)}
                className={inputClassName}
                style={inputStyle}
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
            onClick={onClearFilters}
            variant="secondary"
            className={`mt-4 ${isMobile ? 'min-h-[44px]' : ''}`}
          >
            Clear Filters
          </Button>
        </>
      )}
    </div>
  );
};

export default FilterBar;
