import React from 'react';
import Button from '../common/Button';

/**
 * PickEntry Component
 * Renders a single pick/participant entry with all bet-specific fields
 * Used in both new brolay creation and editing existing brolays
 */
const PickEntry = ({ 
  participant,
  participantId,
  onUpdate,
  onRemove,
  players,
  sports,
  betTypes,
  suggestions,
  showSuggestions,
  onTeamInput,
  onPropTypeInput,
  onAwayTeamInput,
  onHomeTeamInput,
  onSelectSuggestion,
  isMobile = false,
  isEditMode = false
}) => {
  const inputStyle = { fontSize: isMobile ? '16px' : '14px' };

  const updateField = (field, value) => {
    onUpdate(participantId, field, value);
  };

  // Render bet-specific fields based on betType
  const renderBetSpecificFields = () => {
    switch(participant.betType) {
      case 'Spread':
        return (
          <>
            <div>
              <label className="block text-xs font-medium mb-1 text-white">Favorite/Dog</label>
              <select
                value={participant.favorite || 'Favorite'}
                onChange={(e) => updateField('favorite', e.target.value)}
                className="w-full px-2 py-1 border rounded text-base"
                style={inputStyle}
              >
                <option value="Favorite">Favorite</option>
                <option value="Dog">Dog</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-white">Spread</label>
              <input
                type="text"
                value={participant.spread || ''}
                onChange={(e) => updateField('spread', e.target.value)}
                className="w-full px-2 py-1 border rounded text-base"
                style={inputStyle}
                placeholder="e.g., 7.5"
              />
            </div>
          </>
        );

      case 'Total':
        return (
          <>
            <div>
              <label className="block text-xs font-medium mb-1 text-white">Over/Under</label>
              <select
                value={participant.overUnder || 'Over'}
                onChange={(e) => updateField('overUnder', e.target.value)}
                className="w-full px-2 py-1 border rounded text-base"
                style={inputStyle}
              >
                <option value="Over">Over</option>
                <option value="Under">Under</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-white">Total</label>
              <input
                type="text"
                value={participant.total || ''}
                onChange={(e) => updateField('total', e.target.value)}
                className="w-full px-2 py-1 border rounded text-base"
                style={inputStyle}
                placeholder="e.g., 45.5"
              />
            </div>
          </>
        );

      case 'First Half Total':
      case 'Half Total':
        return (
          <>
            <div>
              <label className="block text-xs font-medium mb-1 text-white">Over/Under</label>
              <select
                value={participant.overUnder || 'Over'}
                onChange={(e) => updateField('overUnder', e.target.value)}
                className="w-full px-2 py-1 border rounded text-base"
                style={inputStyle}
              >
                <option value="Over">Over</option>
                <option value="Under">Under</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-white">Total</label>
              <input
                type="text"
                value={participant.total || ''}
                onChange={(e) => updateField('total', e.target.value)}
                className="w-full px-2 py-1 border rounded text-base"
                style={inputStyle}
                placeholder="e.g., 21.5"
              />
            </div>
          </>
        );

      case 'Team Total':
      case 'Half Team Total':
        return (
          <>
            <div>
              <label className="block text-xs font-medium mb-1 text-white">Over/Under</label>
              <select
                value={participant.overUnder || 'Over'}
                onChange={(e) => updateField('overUnder', e.target.value)}
                className="w-full px-2 py-1 border rounded text-base"
                style={inputStyle}
              >
                <option value="Over">Over</option>
                <option value="Under">Under</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-white">Total</label>
              <input
                type="text"
                value={participant.total || ''}
                onChange={(e) => updateField('total', e.target.value)}
                className="w-full px-2 py-1 border rounded text-base"
                style={inputStyle}
                placeholder="e.g., 23.5"
              />
            </div>
          </>
        );

      case 'Prop Bet':
        return (
          <>
            <div className="relative">
              <label className="block text-xs font-medium mb-1 text-white">Prop Type</label>
              <input
                type="text"
                value={participant.propType || ''}
                onChange={(e) => onPropTypeInput(participantId, e.target.value)}
                className="w-full px-2 py-1 border rounded text-base"
                style={inputStyle}
                placeholder="e.g., Passing TDs"
              />
              {showSuggestions[`prop-${participantId}`] && suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {suggestions.map((suggestion, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-black"
                      onClick={() => onSelectSuggestion(participantId, 'propType', suggestion)}
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-white">Over/Under</label>
              <select
                value={participant.overUnder || 'Over'}
                onChange={(e) => updateField('overUnder', e.target.value)}
                className="w-full px-2 py-1 border rounded text-base"
                style={inputStyle}
              >
                <option value="Over">Over</option>
                <option value="Under">Under</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-white">Line</label>
              <input
                type="text"
                value={participant.line || ''}
                onChange={(e) => updateField('line', e.target.value)}
                className="w-full px-2 py-1 border rounded text-base"
                style={inputStyle}
                placeholder="e.g., 2.5"
              />
            </div>
          </>
        );

      case 'First Inning Runs':
      case 'YRFI/NRFI':
        return (
          <div>
            <label className="block text-xs font-medium mb-1 text-white">Yes/No Runs</label>
            <select
              value={participant.yesNoRuns || 'Yes'}
              onChange={(e) => updateField('yesNoRuns', e.target.value)}
              className="w-full px-2 py-1 border rounded text-base"
              style={inputStyle}
            >
              <option value="Yes">YRFI (Yes)</option>
              <option value="No">NRFI (No)</option>
            </select>
          </div>
        );

      case 'Quarter Spread':
      case 'Half Spread':
        return (
          <>
            {participant.betType.includes('Quarter') && (
              <div>
                <label className="block text-xs font-medium mb-1 text-white">Quarter</label>
                <select
                  value={participant.quarter || '1Q'}
                  onChange={(e) => updateField('quarter', e.target.value)}
                  className="w-full px-2 py-1 border rounded text-base"
                  style={inputStyle}
                >
                  <option value="1Q">1Q</option>
                  <option value="2Q">2Q</option>
                  <option value="3Q">3Q</option>
                  <option value="4Q">4Q</option>
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium mb-1 text-white">Favorite/Dog</label>
              <select
                value={participant.favorite || 'Favorite'}
                onChange={(e) => updateField('favorite', e.target.value)}
                className="w-full px-2 py-1 border rounded text-base"
                style={inputStyle}
              >
                <option value="Favorite">Favorite</option>
                <option value="Dog">Dog</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-white">Spread</label>
              <input
                type="text"
                value={participant.spread || ''}
                onChange={(e) => updateField('spread', e.target.value)}
                className="w-full px-2 py-1 border rounded text-base"
                style={inputStyle}
                placeholder="e.g., 3.5"
              />
            </div>
          </>
        );

      case 'Quarter Total':
      case 'Quarter Team Total':
        return (
          <>
            <div>
              <label className="block text-xs font-medium mb-1 text-white">Quarter</label>
              <select
                value={participant.quarter || '1Q'}
                onChange={(e) => updateField('quarter', e.target.value)}
                className="w-full px-2 py-1 border rounded text-base"
                style={inputStyle}
              >
                <option value="1Q">1Q</option>
                <option value="2Q">2Q</option>
                <option value="3Q">3Q</option>
                <option value="4Q">4Q</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-white">Over/Under</label>
              <select
                value={participant.overUnder || 'Over'}
                onChange={(e) => updateField('overUnder', e.target.value)}
                className="w-full px-2 py-1 border rounded text-base"
                style={inputStyle}
              >
                <option value="Over">Over</option>
                <option value="Under">Under</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-white">Total</label>
              <input
                type="text"
                value={participant.total || ''}
                onChange={(e) => updateField('total', e.target.value)}
                className="w-full px-2 py-1 border rounded text-base"
                style={inputStyle}
                placeholder="e.g., 10.5"
              />
            </div>
          </>
        );

      case 'Quarter Moneyline':
      case 'Half Moneyline':
        return participant.betType.includes('Quarter') ? (
          <div>
            <label className="block text-xs font-medium mb-1 text-white">Quarter</label>
            <select
              value={participant.quarter || '1Q'}
              onChange={(e) => updateField('quarter', e.target.value)}
              className="w-full px-2 py-1 border rounded text-base"
              style={inputStyle}
            >
              <option value="1Q">1Q</option>
              <option value="2Q">2Q</option>
              <option value="3Q">3Q</option>
              <option value="4Q">4Q</option>
            </select>
          </div>
        ) : null;

      default:
        return null;
    }
  };

  return (
    <div className="bg-gray-800/50 rounded-lg p-3 md:p-4 border border-gray-700">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3 mb-3">
        {/* Player Selection */}
        <div>
          <label className="block text-xs font-medium mb-1 text-white">Big Guy</label>
          <select
            value={participant.player}
            onChange={(e) => updateField('player', e.target.value)}
            className="w-full px-2 py-1 border rounded text-base"
            style={inputStyle}
          >
            <option value="">Select</option>
            {players.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {/* Sport Selection */}
        <div>
          <label className="block text-xs font-medium mb-1 text-white">Sport</label>
          <select
            value={participant.sport}
            onChange={(e) => updateField('sport', e.target.value)}
            className="w-full px-2 py-1 border rounded text-base"
            style={inputStyle}
          >
            {sports.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Bet Type Selection */}
        <div>
          <label className="block text-xs font-medium mb-1 text-white">Bet Type</label>
          <select
            value={participant.betType}
            onChange={(e) => updateField('betType', e.target.value)}
            className="w-full px-2 py-1 border rounded text-base"
            style={inputStyle}
          >
            {betTypes.map(bt => <option key={bt} value={bt}>{bt}</option>)}
          </select>
        </div>
      </div>

      {/* Team/Player Fields - Conditional rendering based on bet type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 mb-3">
        {!['Total', 'First Half Total', 'First Inning Runs', 'Quarter Total'].includes(participant.betType) && (
          <div className="relative">
            <label className="block text-xs font-medium mb-1 text-white">Team/Player</label>
            <input
              type="text"
              value={participant.team || ''}
              onChange={(e) => onTeamInput(participantId, e.target.value, participant.sport)}
              className="w-full px-2 py-1 border rounded text-base"
              style={inputStyle}
              placeholder="Start typing..."
            />
            {showSuggestions[`team-${participantId}`] && suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                {suggestions.map((suggestion, idx) => (
                  <div
                    key={idx}
                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-black"
                    onClick={() => onSelectSuggestion(participantId, 'team', suggestion)}
                  >
                    {suggestion}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Away/Home Team fields for Total bets */}
        {['Total', 'First Half Total', 'First Inning Runs', 'Quarter Total'].includes(participant.betType) && (
          <>
            <div className="relative">
              <label className="block text-xs font-medium mb-1 text-white">Away Team</label>
              <input
                type="text"
                value={participant.awayTeam || ''}
                onChange={(e) => onAwayTeamInput(participantId, e.target.value, participant.sport)}
                className="w-full px-2 py-1 border rounded text-base"
                style={inputStyle}
                placeholder="Start typing..."
              />
              {showSuggestions[`awayTeam-${participantId}`] && suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {suggestions.map((suggestion, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-black"
                      onClick={() => onSelectSuggestion(participantId, 'awayTeam', suggestion)}
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="relative">
              <label className="block text-xs font-medium mb-1 text-white">Home Team</label>
              <input
                type="text"
                value={participant.homeTeam || ''}
                onChange={(e) => onHomeTeamInput(participantId, e.target.value, participant.sport)}
                className="w-full px-2 py-1 border rounded text-base"
                style={inputStyle}
                placeholder="Start typing..."
              />
              {showSuggestions[`homeTeam-${participantId}`] && suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {suggestions.map((suggestion, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-black"
                      onClick={() => onSelectSuggestion(participantId, 'homeTeam', suggestion)}
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Bet-Specific Fields */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3 mb-3">
        {renderBetSpecificFields()}
      </div>

      {/* Odds Field */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 mb-3">
        <div>
          <label className="block text-xs font-medium mb-1 text-white">Odds (optional)</label>
          <input
            type="text"
            value={participant.odds || ''}
            onChange={(e) => updateField('odds', e.target.value)}
            className="w-full px-2 py-1 border rounded text-base"
            style={inputStyle}
            placeholder="e.g., +150 or -110"
          />
        </div>
      </div>

      {/* Remove Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => onRemove(participantId)}
          variant="danger"
          size="small"
          className={isMobile ? 'min-h-[44px]' : ''}
        >
          Remove Pick
        </Button>
      </div>
    </div>
  );
};

export default PickEntry;
