import React, { useState, useEffect } from 'react';
import Button from '../common/Button';
import PickEntry from '../forms/PickEntry';
import { createDefaultParticipant } from '../../utils/actionHandlers';

/**
 * EditParlayModal - Reusable modal for editing parlays across different pages
 *
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {Function} props.onClose - Callback when modal should close
 * @param {Object} props.parlay - The parlay object being edited
 * @param {Function} props.onSave - Callback when save is clicked with edited parlay
 * @param {Function} props.onToggleSettlement - Optional callback to toggle settlement status
 * @param {Function} props.onDelete - Optional callback to delete parlay
 * @param {Array} props.players - List of player names
 * @param {Array} props.sports - List of sport options
 * @param {Array} props.betTypes - List of bet type options
 * @param {Object} props.suggestions - Autocomplete suggestions object
 * @param {Object} props.showSuggestions - Object tracking which fields show suggestions
 * @param {Function} props.onTeamInput - Callback for team input changes
 * @param {Function} props.onPropTypeInput - Callback for prop type input changes
 * @param {Function} props.onAwayTeamInput - Callback for away team input changes
 * @param {Function} props.onHomeTeamInput - Callback for home team input changes
 * @param {Function} props.onPlayerInput - Callback for player input changes (H2H, Either, Combined props)
 * @param {Function} props.onSelectSuggestion - Callback when suggestion is selected
 * @param {boolean} props.isMobile - Whether on mobile device
 * @param {boolean} props.saving - Whether save operation is in progress
 */
const EditParlayModal = ({
  isOpen,
  onClose,
  parlay,
  onSave,
  onToggleSettlement,
  onDelete,
  players,
  sports,
  betTypes,
  suggestions,
  showSuggestions,
  onTeamInput,
  onPropTypeInput,
  onAwayTeamInput,
  onHomeTeamInput,
  onPlayerInput,
  onSelectSuggestion,
  isMobile = false,
  saving = false
}) => {
  const [editedParlay, setEditedParlay] = useState(null);

  // Initialize/update internal state when parlay changes
  useEffect(() => {
    if (parlay && isOpen) {
      setEditedParlay({ ...parlay });
    }
  }, [parlay, isOpen]);

  if (!isOpen || !editedParlay) return null;

  // Support both new (picks) and old (participants) schema
  const picksObj = editedParlay.picks || editedParlay.participants || {};
  const isNewSchema = !!editedParlay.picks;

  // Get the field name for picks (new schema: 'picks', old: 'participants')
  const picksFieldName = isNewSchema ? 'picks' : 'participants';

  const handleUpdateParticipant = (partId, field, value) => {
    const updated = { ...editedParlay };
    if (!updated[picksFieldName]) updated[picksFieldName] = {};
    if (!updated[picksFieldName][partId]) updated[picksFieldName][partId] = {};
    updated[picksFieldName][partId][field] = value;
    setEditedParlay(updated);
  };

  const handleRemoveParticipant = (partId) => {
    const updated = { ...editedParlay };
    delete updated[picksFieldName][partId];
    setEditedParlay(updated);
  };

  const handleAddParticipant = () => {
    const pickId = Object.keys(picksObj).length;
    const updated = { ...editedParlay };
    if (!updated[picksFieldName]) updated[picksFieldName] = {};
    updated[picksFieldName][pickId] = createDefaultParticipant();
    setEditedParlay(updated);
  };

  const handleTeamInputWrapper = (partId, value, sport) => {
    // Extract base participant ID (remove -player1, -player2 suffixes)
    const baseId = partId.replace(/-player[12]$/, '');
    const updated = { ...editedParlay };

    // Don't update team field for multi-entity props
    if (!partId.includes('-player')) {
      updated[picksFieldName][baseId].team = value;
    }

    setEditedParlay(updated);
    if (onTeamInput) {
      onTeamInput(partId, value, sport);
    }
  };

  const handlePropTypeInputWrapper = (partId, value) => {
    // Extract base participant ID (remove -prop1, -prop2 suffixes)
    const baseId = partId.replace(/-prop[12]$/, '');
    const updated = { ...editedParlay };

    // Don't update propType field for multi-entity props with separate prop types
    if (!partId.includes('-prop')) {
      updated[picksFieldName][baseId].propType = value;
    }

    setEditedParlay(updated);
    if (onPropTypeInput) {
      onPropTypeInput(partId, value);
    }
  };

  const handleAwayTeamInputWrapper = (partId, value, sport) => {
    const updated = { ...editedParlay };
    updated[picksFieldName][partId].awayTeam = value;
    setEditedParlay(updated);
    if (onAwayTeamInput) {
      onAwayTeamInput(partId, value, sport);
    }
  };

  const handleHomeTeamInputWrapper = (partId, value, sport) => {
    const updated = { ...editedParlay };
    updated[picksFieldName][partId].homeTeam = value;
    setEditedParlay(updated);
    if (onHomeTeamInput) {
      onHomeTeamInput(partId, value, sport);
    }
  };

  const handlePlayerInputWrapper = (partId, field, value, sport) => {
    // Extract base participant ID (remove -player1, -player2 suffixes)
    const baseId = partId.replace(/-player[12]$/, '');
    const updated = { ...editedParlay };

    // Update the specific player field
    if (field === 'player1' || field === 'player2') {
      updated[picksFieldName][baseId][field] = value;
    }

    setEditedParlay(updated);
    if (onPlayerInput) {
      onPlayerInput(partId, field, value, sport);
    }
  };

  const handleSelectSuggestionWrapper = (partId, field, value) => {
    // Extract base participant ID (remove -player1, -player2 suffixes)
    const baseId = partId.replace(/-player[12]$/, '');
    const updated = { ...editedParlay };

    // Update the field in editedParlay
    if (field === 'player1' || field === 'player2') {
      updated[picksFieldName][baseId][field] = value;
    } else {
      updated[picksFieldName][baseId][field] = value;
    }

    setEditedParlay(updated);
    if (onSelectSuggestion) {
      onSelectSuggestion(partId, field, value);
    }
  };

  const handleSave = () => {
    if (onSave) {
      onSave(editedParlay);
    }
  };

  const handleToggleSettlement = () => {
    if (onToggleSettlement && editedParlay.id) {
      onToggleSettlement(editedParlay.id);
    }
  };

  const handleDelete = () => {
    if (onDelete && editedParlay.id) {
      onDelete(editedParlay.id);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 md:p-4 overflow-y-auto"
      onClick={(e) => {
        // Close modal if clicking the backdrop
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-gray-900 rounded-lg shadow-xl w-full max-h-[90vh] overflow-y-auto border border-yellow-500/20"
        style={{ maxWidth: isMobile ? '100%' : '1024px' }}
      >
        <div className="p-4 md:p-6">
          <h2 className="text-xl md:text-2xl font-bold mb-4 text-yellow-400">Edit Brolay</h2>

          {/* Brolay Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1 text-white">Date</label>
              <input
                type="date"
                value={editedParlay.date}
                onChange={(e) => setEditedParlay({ ...editedParlay, date: e.target.value })}
                className="w-full px-3 py-2 border rounded text-base bg-gray-900 border-gray-700 text-white focus:border-yellow-500 focus:outline-none"
                style={{ fontSize: isMobile ? '16px' : '14px' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-white">Submitted By</label>
              <select
                value={editedParlay.submittedBy || editedParlay.placedBy || ''}
                onChange={(e) => setEditedParlay({
                  ...editedParlay,
                  submittedBy: e.target.value,
                  placedBy: e.target.value // Keep both for compatibility
                })}
                className="w-full px-3 py-2 border rounded text-base bg-gray-900 border-gray-700 text-white focus:border-yellow-500 focus:outline-none"
                style={{ fontSize: isMobile ? '16px' : '14px' }}
              >
                <option value="">Select Big Guy</option>
                {players.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1 text-white">Bet Amount (per person)</label>
              <input
                type="number"
                value={editedParlay.betAmount}
                onChange={(e) => setEditedParlay({ ...editedParlay, betAmount: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded text-base bg-gray-900 border-gray-700 text-white focus:border-yellow-500 focus:outline-none"
                style={{ fontSize: isMobile ? '16px' : '14px' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-white">Total Payout</label>
              <input
                type="number"
                value={editedParlay.totalPayout || ''}
                onChange={(e) => {
                  const payout = Number(e.target.value) || 0;
                  setEditedParlay({ ...editedParlay, totalPayout: payout });
                }}
                className="w-full px-3 py-2 border rounded text-base bg-gray-900 border-gray-700 text-white focus:border-yellow-500 focus:outline-none"
                style={{ fontSize: isMobile ? '16px' : '14px' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-white">Net Profit</label>
              <input
                type="number"
                value={Math.max(0, (editedParlay.totalPayout || 0) - (editedParlay.betAmount * Object.keys(picksObj).length))}
                onChange={(e) => {
                  const netProfit = Number(e.target.value) || 0;
                  const totalRisk = editedParlay.betAmount * Object.keys(picksObj).length;
                  const calculatedPayout = netProfit + totalRisk;
                  setEditedParlay({ ...editedParlay, totalPayout: calculatedPayout });
                }}
                className="w-full px-3 py-2 border rounded text-base bg-gray-900 border-gray-700 text-white focus:border-yellow-500 focus:outline-none"
                style={{ fontSize: isMobile ? '16px' : '14px' }}
              />
            </div>
          </div>

          {/* Picks */}
          <h3 className="text-base md:text-lg font-semibold mb-3 text-yellow-400">Picks</h3>
          <div className="space-y-4 mb-6">
            {Object.entries(picksObj).map(([id, participant]) => (
              <PickEntry
                key={id}
                participant={participant}
                participantId={id}
                onUpdate={handleUpdateParticipant}
                onRemove={handleRemoveParticipant}
                players={players}
                sports={sports}
                betTypes={betTypes}
                suggestions={suggestions}
                showSuggestions={showSuggestions}
                onTeamInput={handleTeamInputWrapper}
                onPropTypeInput={handlePropTypeInputWrapper}
                onAwayTeamInput={handleAwayTeamInputWrapper}
                onHomeTeamInput={handleHomeTeamInputWrapper}
                onPlayerInput={handlePlayerInputWrapper}
                onSelectSuggestion={handleSelectSuggestionWrapper}
                isMobile={isMobile}
                isEditMode={true}
              />
            ))}
          </div>

          {/* Add Pick Button */}
          <div className="mb-6">
            <Button
              onClick={handleAddParticipant}
              variant="primary"
              className={`flex items-center gap-2 ${isMobile ? 'min-h-[44px]' : ''}`}
            >
              + Add Pick
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <div className="flex gap-3">
              {onToggleSettlement && (
                <Button
                  variant="secondary"
                  onClick={handleToggleSettlement}
                  disabled={saving}
                  className={isMobile ? 'min-h-[44px]' : ''}
                >
                  {editedParlay.settled ? 'Mark Unsettled' : 'Mark Settled'}
                </Button>
              )}
            </div>
            <div className="flex gap-3 justify-between">
              <Button
                variant="danger"
                onClick={handleDelete}
                className={isMobile ? 'min-h-[44px]' : ''}
              >
                Delete Brolay
              </Button>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={onClose}
                  className={isMobile ? 'min-h-[44px]' : ''}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSave}
                  disabled={saving}
                  className={isMobile ? 'min-h-[44px]' : ''}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditParlayModal;
