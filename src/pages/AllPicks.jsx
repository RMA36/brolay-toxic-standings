import React from 'react';
import { useBrolayContext } from '../contexts/BrolayContext';
import { PLAYERS, SPORTS, PICK_TYPES, COMMON_PROP_TYPES } from '../constants/sports';
import Button from '../components/common/Button';
import { formatDateForDisplay, formatBetDescription, normalizePropType, getPicksArray, getPickBigGuy, getPickResult, getPickActualStats, getSubmittedBy, getPickPropType, getPickPlayerPosition, getPickPlayerTeam } from '../utils/formatters';

/**
 * AllPicks Page Component
 *
 * Displays all individual picks flattened from parlays with comprehensive filtering.
 * Supports inline editing of picks with full bet detail modification.
 * Includes pagination for performance with large datasets.
 */
const AllPicks = () => {
  // Get context values
  const {
    parlays,
    filters,
    setFilters,
    filtersExpanded,
    setFiltersExpanded,
    isMobile,
    editingPick,
    setEditingPick,
    saving,
    setSaving,
    updateBrolay,
    picksToShow,
    setPicksToShow,
    learnedPropTypes
  } = useBrolayContext();

  const players = PLAYERS;
  const sports = SPORTS;
  const betTypes = PICK_TYPES;
  const commonPropTypes = COMMON_PROP_TYPES;
  // Flatten all picks with parlay context (supports both old and new schemas)
  const allPicks = [];
  parlays.forEach(parlay => {
    // Get picks object (supports both picks and participants field names)
    const picksObj = parlay.picks || parlay.participants || {};
    Object.entries(picksObj).forEach(([pickId, pick]) => {
      allPicks.push({
        ...pick,
        participantId: pickId,
        parlayId: parlay.id,
        parlayDate: parlay.date,
        parlayBetAmount: parlay.betAmount,
        parlayTotalPayout: parlay.totalPayout,
        parlayPlacedBy: getSubmittedBy(parlay)
      });
    });
  });

  // Apply filters (using helper functions for dual-schema support)
  const filteredPicks = allPicks.filter(pick => {
    if (filters.dateFrom && pick.parlayDate < filters.dateFrom) return false;
    if (filters.dateTo && pick.parlayDate > filters.dateTo) return false;
    const bigGuy = getPickBigGuy(pick);
    if (filters.player && bigGuy !== filters.player) return false;
    if (filters.sport && pick.sport !== filters.sport) return false;
    if (filters.placedBy && pick.parlayPlacedBy !== filters.placedBy) return false;
    // Support both submittedBy filter and placedBy filter
    const submittedByFilter = filters.submittedBy || filters.placedBy;
    if (submittedByFilter && pick.parlayPlacedBy !== submittedByFilter) return false;
    const pickResult = getPickResult(pick);
    if (filters.result && pickResult !== filters.result) return false;
    if (filters.autoUpdated === 'true' && !pick.autoUpdated) return false;
    if (filters.autoUpdated === 'false' && pick.autoUpdated) return false;

    // Bet Type filter
    if (filters.betType && pick.betType !== filters.betType) return false;

    // Prop Type filter (works with both old and new schema)
    if (filters.propType) {
      // Use helper function to extract prop type consistently
      const pickPropType = getPickPropType(pick);
      if (!pickPropType) return false;

      const normalizedPickProp = normalizePropType(pickPropType);
      const normalizedFilterProp = normalizePropType(filters.propType);

      if (!normalizedPickProp.includes(normalizedFilterProp) &&
          !normalizedFilterProp.includes(normalizedPickProp)) {
        return false;
      }
    }

    if (filters.teamPlayer) {
      const normalizedFilter = filters.teamPlayer.toLowerCase();
      // Also check playerTeam and playerPosition fields for new schema support
      const pickPlayerTeam = getPickPlayerTeam(pick);
      const pickPlayerPosition = getPickPlayerPosition(pick);
      const hasTeamPlayer = (pick.team && pick.team.toLowerCase().includes(normalizedFilter)) ||
                            (pick.awayTeam && pick.awayTeam.toLowerCase().includes(normalizedFilter)) ||
                            (pick.homeTeam && pick.homeTeam.toLowerCase().includes(normalizedFilter)) ||
                            (pickPlayerTeam && pickPlayerTeam.toLowerCase().includes(normalizedFilter)) ||
                            (pickPlayerPosition && pickPlayerPosition.toLowerCase().includes(normalizedFilter));
      if (!hasTeamPlayer) return false;
    }

    return true;
  });

  // Sort by date descending
  const sortedPicks = filteredPicks.sort((a, b) =>
    new Date(b.parlayDate) - new Date(a.parlayDate)
  );

  const handleSavePickEdit = async () => {
    console.log('🎯 handleSavePickEdit called');
    console.log('📋 editingPick:', editingPick);

    if (!editingPick) {
      console.log('❌ No editingPick found, exiting');
      return;
    }

    try {
      setSaving(true);

      // Find the parlay this pick belongs to
      const parlay = parlays.find(p => p.id === editingPick.parlayId);
      if (!parlay) {
        console.error('Parlay not found for ID:', editingPick.parlayId);
        alert('Parlay not found');
        return;
      }

      // Determine which schema the parlay uses
      const isNewSchema = !!parlay.picks;
      const picksFieldName = isNewSchema ? 'picks' : 'participants';
      const picksObj = parlay[picksFieldName] || {};

      console.log('Found parlay:', parlay);
      console.log('Schema type:', isNewSchema ? 'new (picks)' : 'old (participants)');
      console.log('Editing pick:', editingPick.participantId);
      console.log('Current pick data:', picksObj[editingPick.participantId]);

      // Get the original pick to preserve any fields we're not editing
      const originalParticipant = picksObj[editingPick.participantId];

      // Update the specific pick, preserving all original fields
      // Support both old schema (player/result) and new schema (bigGuy/outcome.status)
      const updatedPicks = { ...picksObj };
      const bigGuyValue = editingPick.bigGuy || editingPick.player;

      updatedPicks[editingPick.participantId] = {
        ...originalParticipant, // Start with original to preserve any extra fields
        // Write to both old and new field names for compatibility
        player: bigGuyValue,
        bigGuy: bigGuyValue,
        sport: editingPick.sport,
        team: editingPick.team || '',
        awayTeam: editingPick.awayTeam || '',
        homeTeam: editingPick.homeTeam || '',
        betType: editingPick.betType,
        favorite: editingPick.favorite || 'Favorite',
        spread: editingPick.spread || '',
        total: editingPick.total || '',
        overUnder: editingPick.overUnder || 'Over',
        propType: editingPick.propType || '',
        line: editingPick.line || '',
        odds: editingPick.odds || '',
        yesNoRuns: editingPick.yesNoRuns || '',
        quarter: editingPick.quarter || '',
        // Write to both old (result) and new (outcome.status) field names
        result: editingPick.result,
        outcome: {
          ...(originalParticipant.outcome || {}),
          status: editingPick.result,
          actualStats: editingPick.actualStats || originalParticipant.outcome?.actualStats || null
        },
        actualStats: editingPick.actualStats || null,
        autoUpdated: editingPick.autoUpdated || false,
        manuallyOverridden: true // Mark as manually edited
      };

      console.log('Updated pick data:', updatedPicks[editingPick.participantId]);

      // Update in Firebase using the correct field name for this schema
      if (parlay.id) {
        console.log('🔄 Updating Firebase document:', parlay.id);
        console.log('📝 Parlay object:', parlay);
        console.log('📝 Updated picks:', updatedPicks);
        console.log('📝 Using field name:', picksFieldName);

        try {
          const result = await updateBrolay(parlay.id, {
            [picksFieldName]: updatedPicks
          });

          console.log('✅ Update result:', result);

          if (!result.success) {
            throw new Error(result.error?.message || 'Update failed without error details');
          }

          console.log('✅ Firebase update successful');
        } catch (fbError) {
          console.error('💥 Firebase update error:', fbError);
          console.error('Error code:', fbError.code);
          console.error('Error message:', fbError.message);
          console.error('Full error object:', fbError);
          throw fbError;
        }
      } else {
        console.error('❌ No Firestore ID found for parlay');
        console.log('Parlay object:', parlay);
        alert('Cannot update: Parlay has no Firestore ID');
        return;
      }

      // Close the modal and show success
      setEditingPick(null);
      alert('Pick updated successfully!');
      console.log('✅ Edit complete, modal closed');
    } catch (error) {
      console.error('Error updating pick:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      alert(`Failed to update pick: ${error.message || 'Unknown error'}. Check console for details.`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <h2 className="text-xl md:text-2xl font-bold text-yellow-400">📋 All Individual Picks</h2>

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
                <label className="block text-sm font-medium mb-1 text-gray-300">Submitted By</label>
                <select
                  value={filters.submittedBy || filters.placedBy || ''}
                  onChange={(e) => setFilters({...filters, submittedBy: e.target.value, placedBy: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                  style={{ fontSize: isMobile ? '16px' : '14px' }}
                >
                  <option value="">All</option>
                  {players.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
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
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">Team/Player</label>
                <input
                  type="text"
                  value={filters.teamPlayer}
                  onChange={(e) => setFilters({...filters, teamPlayer: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                  style={{ fontSize: isMobile ? '16px' : '14px' }}
                  placeholder="Search teams/players..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">Bet Type</label>
                <select
                  value={filters.betType || ''}
                  onChange={(e) => setFilters({...filters, betType: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                  style={{ fontSize: isMobile ? '16px' : '14px' }}
                >
                  <option value="">All</option>
                  {betTypes.map(bt => <option key={bt} value={bt}>{bt}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">Prop Type</label>
                <input
                  type="text"
                  value={filters.propType || ''}
                  onChange={(e) => setFilters({...filters, propType: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                  style={{ fontSize: isMobile ? '16px' : '14px' }}
                  placeholder="e.g., Passing Touchdowns"
                  list="prop-type-filter-suggestions"
                />
                <datalist id="prop-type-filter-suggestions">
                  {[...new Set([...commonPropTypes, ...learnedPropTypes])].map((prop, idx) => (
                    <option key={idx} value={prop} />
                  ))}
                </datalist>
              </div>
            </div>
            <Button
              onClick={() => setFilters({
                dateFrom: '', dateTo: '', player: '', sport: '', teamPlayer: '',
                submittedBy: '', placedBy: '', minPayout: '', maxPayout: '', result: '', autoUpdated: '',
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

      {/* Picks List */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl p-4 md:p-6 border border-yellow-500/20">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg md:text-xl font-bold text-yellow-400">
            {sortedPicks.length} Pick{sortedPicks.length !== 1 ? 's' : ''}
          </h3>
        </div>

        <div className="space-y-3">
          {sortedPicks.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No picks match your filters</p>
          ) : (
            sortedPicks.slice(0, picksToShow).map((pick, idx) => {
              // Use helper functions for dual-schema support
              const bigGuy = getPickBigGuy(pick);
              const pickResult = getPickResult(pick);
              const actualStats = getPickActualStats(pick);

              let teamDisplay = '';
              if (['Total', 'First Half Total', 'First Inning Runs', 'Quarter Total', '3-Way Moneyline'].includes(pick.betType)) {
                // Support both direct fields and nested game object
                const awayTeam = pick.awayTeam || pick.game?.awayTeam || '';
                const homeTeam = pick.homeTeam || pick.game?.homeTeam || '';
                teamDisplay = `${awayTeam} @ ${homeTeam}`;
              } else {
                teamDisplay = pick.team;
              }

              const betDetails = formatBetDescription(pick);

              return (
                <div key={`${pick.parlayId}-${pick.participantId}-${idx}`} className="border border-gray-700 rounded-lg p-4 bg-gray-800/50 hover:bg-gray-800/70 transition">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="text-sm text-gray-400 mb-1">
                        {formatDateForDisplay(pick.parlayDate)} • Submitted by {pick.parlayPlacedBy || 'Unknown'}
                      </div>
                      <div className="font-semibold text-white">
                        <strong className="text-yellow-400">{bigGuy}</strong> - {pick.sport} - {teamDisplay} {betDetails}
                      </div>
                      <div className="text-sm text-gray-400">
                        {pick.betType}
                        {pick.odds && ` • ${pick.odds}`}
                      </div>
                      {actualStats && (
                        <div className="text-sm text-blue-400 font-semibold mt-1">
                          [{actualStats}]
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      {pick.autoUpdated && (
                        <span
                          className="text-blue-600 cursor-help"
                          title={`Auto-updated on ${new Date(pick.autoUpdatedAt).toLocaleString()}`}
                        >
                          🤖
                        </span>
                      )}
                      <span className={`font-semibold text-sm ${
                        pickResult === 'win' ? 'text-green-400' :
                        pickResult === 'loss' ? 'text-red-400' :
                        pickResult === 'push' ? 'text-yellow-400' :
                        'text-gray-400'
                      }`}>
                        {pickResult.toUpperCase()}
                      </span>
                      <Button
                        onClick={() => setEditingPick(pick)}
                        variant="ghost"
                        size="small"
                        className="text-blue-400 hover:text-blue-300"
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {sortedPicks.length > picksToShow && (
          <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-center">
            <Button
              onClick={() => setPicksToShow(prev => prev + 20)}
              variant="secondary"
              className={isMobile ? 'min-h-[44px]' : ''}
            >
              Show 20 More
            </Button>
            <Button
              onClick={() => setPicksToShow(sortedPicks.length)}
              variant="secondary"
              className={isMobile ? 'min-h-[44px]' : ''}
            >
              Show All ({sortedPicks.length})
            </Button>
          </div>
        )}
        {picksToShow > 20 && picksToShow >= sortedPicks.length && (
          <div className="mt-4 text-center">
            <Button
              onClick={() => setPicksToShow(20)}
              variant="secondary"
              className={isMobile ? 'min-h-[44px]' : ''}
            >
              Show Less
            </Button>
          </div>
        )}
      </div>

      {/* Edit Pick Modal */}
      {editingPick && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 md:p-4 overflow-y-auto"
          onClick={(e) => {
            // Close modal if clicking the backdrop
            if (e.target === e.currentTarget) {
              setEditingPick(null);
            }
          }}
        >
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-xl w-full max-h-[90vh] overflow-y-auto border border-yellow-500/20" style={{ maxWidth: isMobile ? '100%' : '800px' }}>
            <div className="p-4 md:p-6">
              <h2 className="text-xl md:text-2xl font-bold mb-4 text-yellow-400">Edit Pick</h2>

              <div className="mb-4 p-3 bg-gray-900/50 border border-gray-700 rounded text-sm">
                <div className="font-semibold text-gray-300">From Brolay:</div>
                <div className="text-gray-400">
                  {formatDateForDisplay(editingPick.parlayDate)} • Submitted by {editingPick.parlayPlacedBy || 'Unknown'}
                </div>
              </div>

              {editingPick.autoUpdated && (
                <div className="mb-4 text-xs text-blue-600 bg-blue-50 p-2 rounded">
                  ✓ This pick was auto-updated on {new Date(editingPick.autoUpdatedAt).toLocaleString()}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-300">Big Guy</label>
                  <select
                    value={editingPick.bigGuy || editingPick.player || ''}
                    onChange={(e) => setEditingPick({...editingPick, bigGuy: e.target.value, player: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                    style={{ fontSize: isMobile ? '16px' : '14px' }}
                  >
                    <option value="">Select</option>
                    {players.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-300">Sport</label>
                  <select
                    value={editingPick.sport}
                    onChange={(e) => setEditingPick({...editingPick, sport: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                    style={{ fontSize: isMobile ? '16px' : '14px' }}
                  >
                    {sports.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-300">Bet Type</label>
                  <select
                    value={editingPick.betType}
                    onChange={(e) => setEditingPick({...editingPick, betType: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                    style={{ fontSize: isMobile ? '16px' : '14px' }}
                  >
                    {betTypes.map(bt => <option key={bt} value={bt}>{bt}</option>)}
                  </select>
                </div>
              </div>

              {!['Total', 'First Half Total', 'First Inning Runs', 'Quarter Total', '3-Way Moneyline'].includes(editingPick.betType) && (
                <div className="mb-3">
                  <label className="block text-sm font-medium mb-1 text-gray-300">Team/Player</label>
                  <input
                    type="text"
                    value={editingPick.team || ''}
                    onChange={(e) => setEditingPick({...editingPick, team: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                    style={{ fontSize: isMobile ? '16px' : '14px' }}
                  />
                </div>
              )}

              {['Total', 'First Half Total', 'First Inning Runs', 'Quarter Total', '3-Way Moneyline'].includes(editingPick.betType) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Away Team</label>
                    <input
                      type="text"
                      value={editingPick.awayTeam || ''}
                      onChange={(e) => setEditingPick({...editingPick, awayTeam: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                      style={{ fontSize: isMobile ? '16px' : '14px' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Home Team</label>
                    <input
                      type="text"
                      value={editingPick.homeTeam || ''}
                      onChange={(e) => setEditingPick({...editingPick, homeTeam: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                      style={{ fontSize: isMobile ? '16px' : '14px' }}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                {editingPick.betType === 'Prop Bet' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-300">Prop Type</label>
                      <input
                        type="text"
                        value={editingPick.propType || ''}
                        onChange={(e) => setEditingPick({...editingPick, propType: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                        style={{ fontSize: isMobile ? '16px' : '14px' }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-300">Over/Under</label>
                      <select
                        value={editingPick.overUnder || 'Over'}
                        onChange={(e) => setEditingPick({...editingPick, overUnder: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                        style={{ fontSize: isMobile ? '16px' : '14px' }}
                      >
                        <option value="Over">Over</option>
                        <option value="Under">Under</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-300">Line</label>
                      <input
                        type="text"
                        value={editingPick.line || ''}
                        onChange={(e) => setEditingPick({...editingPick, line: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                        style={{ fontSize: isMobile ? '16px' : '14px' }}
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-300">Odds (Optional)</label>
                  <input
                    type="text"
                    value={editingPick.odds || ''}
                    onChange={(e) => setEditingPick({...editingPick, odds: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                    style={{ fontSize: isMobile ? '16px' : '14px' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-300">Result</label>
                  <select
                    value={editingPick.outcome?.status || editingPick.result || 'pending'}
                    onChange={(e) => setEditingPick({
                      ...editingPick,
                      result: e.target.value,
                      outcome: { ...(editingPick.outcome || {}), status: e.target.value }
                    })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                    style={{ fontSize: isMobile ? '16px' : '14px' }}
                  >
                    <option value="pending">Pending</option>
                    <option value="win">Win</option>
                    <option value="loss">Loss</option>
                    <option value="push">Push</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-300">Actual Stats (Optional)</label>
                  <input
                    type="text"
                    value={editingPick.outcome?.actualStats || editingPick.actualStats || ''}
                    onChange={(e) => setEditingPick({
                      ...editingPick,
                      actualStats: e.target.value,
                      outcome: { ...(editingPick.outcome || {}), actualStats: e.target.value }
                    })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-base focus:border-yellow-500 focus:outline-none"
                    style={{ fontSize: isMobile ? '16px' : '14px' }}
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <Button
                  onClick={() => setEditingPick(null)}
                  variant="secondary"
                  className={isMobile ? 'min-h-[44px]' : ''}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSavePickEdit}
                  disabled={saving}
                  variant="primary"
                  className={isMobile ? 'min-h-[44px]' : ''}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllPicks;
