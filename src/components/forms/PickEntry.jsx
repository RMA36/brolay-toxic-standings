import React, { useState } from 'react';
import Button from '../common/Button';

import { colors } from '../../constants/theme';
import { inputClasses } from '../../constants/theme';
import { INDIVIDUAL_SPORTS, FIRST_HALF_BET_TYPES, QUARTER_PERIOD_BET_TYPES, TEAM_PROP_TYPES, GAME_PROP_TYPES } from '../../constants/sports';
import { useESPNPlayers } from '../../hooks/useESPNPlayers';

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
  onPlayerInput,
  onSelectSuggestion,
  isMobile = false,
  isEditMode = false
}) => {
  const inputStyle = { fontSize: isMobile ? '16px' : '14px' };
  const inputClassName = inputClasses.base;

  // Map stored betType to display category for the main dropdown
  const getDisplayCategory = (betType) => {
    if (FIRST_HALF_BET_TYPES.includes(betType)) return 'First Half Bet';
    if (QUARTER_PERIOD_BET_TYPES.includes(betType)) return 'Quarter/Period Bet';
    if (betType === 'Team Total') return 'Team Prop';
    if (betType === 'First Inning Runs') return 'Game Prop';
    return betType;
  };

  // Get the sub-type for consolidated categories
  const getSubType = (betType) => {
    if (FIRST_HALF_BET_TYPES.includes(betType)) return betType;
    if (QUARTER_PERIOD_BET_TYPES.includes(betType)) return betType;
    if (betType === 'Team Total') return 'Team Total';
    if (betType === 'First Inning Runs') return 'First Inning Runs';
    return null;
  };

  const displayCategory = getDisplayCategory(participant.betType);

  // Handle main category change
  const handleCategoryChange = (category) => {
    if (category === 'First Half Bet') {
      updateField('betType', 'First Half Spread'); // Default sub-type
    } else if (category === 'Quarter/Period Bet') {
      updateField('betType', 'Quarter Spread'); // Default sub-type
    } else if (category === 'Team Prop') {
      updateField('betType', 'Team Prop');
    } else if (category === 'Game Prop') {
      updateField('betType', 'Game Prop');
    } else {
      updateField('betType', category);
    }
  };

  // Player lookup state
  const [playerSuggestions, setPlayerSuggestions] = useState([]);
  const [showPlayerSuggestions, setShowPlayerSuggestions] = useState(false);
  const [loadingPlayerData, setLoadingPlayerData] = useState(false);
  const [currentPlayerField, setCurrentPlayerField] = useState(null); // 'player1', 'player2', or null
  const { lookupPlayer } = useESPNPlayers();

  const updateField = (field, value) => {
    onUpdate(participantId, field, value);
  };

  // Player lookup handler (called on blur for Player Prop bet type)
  const handlePlayerBlur = async (playerName, sport) => {
    if (!playerName || playerName.length < 3) return;
    if (participant.betType !== 'Player Prop') return;

    setLoadingPlayerData(true);

    const result = await lookupPlayer(playerName, sport);

    setLoadingPlayerData(false);

    if (result) {
      if (result.team && result.position) {
        // Exact match - auto-fill
        updateField('playerTeam', result.team);
        updateField('playerPosition', result.position);
        if (result.fullName !== playerName) {
          updateField('team', result.fullName); // Normalize name
        }
        setPlayerSuggestions([]);
        setShowPlayerSuggestions(false);
      } else if (result.suggestions && result.suggestions.length > 0) {
        // Show suggestions
        setPlayerSuggestions(result.suggestions);
        setShowPlayerSuggestions(true);
      }
    }
  };

  // Handle selecting a player suggestion
  const handleSelectPlayerSuggestion = (suggestion) => {
    updateField('team', suggestion.name);
    updateField('playerTeam', suggestion.team);
    updateField('playerPosition', suggestion.position);
    setPlayerSuggestions([]);
    setShowPlayerSuggestions(false);
  };

  // Player 1 lookup handler for multi-player props (H2H, Either, Combined)
  const handlePlayer1Blur = async (playerName, sport) => {
    if (!playerName || playerName.length < 3) return;
    if (!['H2H Prop', 'Either Prop', 'Combined Prop'].includes(participant.betType)) return;

    setLoadingPlayerData(true);

    const result = await lookupPlayer(playerName, sport);

    setLoadingPlayerData(false);

    if (result) {
      if (result.team && result.position) {
        // Exact match - auto-fill
        updateField('player1Team', result.team);
        updateField('player1Position', result.position);
        if (result.fullName !== playerName) {
          updateField('player1', result.fullName); // Normalize name
        }
        setPlayerSuggestions([]);
        setShowPlayerSuggestions(false);
      } else if (result.suggestions && result.suggestions.length > 0) {
        // Show suggestions
        setPlayerSuggestions(result.suggestions);
        setShowPlayerSuggestions(true);
      }
    }
  };

  // Player 2 lookup handler for multi-player props (H2H, Either, Combined)
  const handlePlayer2Blur = async (playerName, sport) => {
    if (!playerName || playerName.length < 3) return;
    if (!['H2H Prop', 'Either Prop', 'Combined Prop'].includes(participant.betType)) return;

    setLoadingPlayerData(true);

    const result = await lookupPlayer(playerName, sport);

    setLoadingPlayerData(false);

    if (result) {
      if (result.team && result.position) {
        // Exact match - auto-fill
        updateField('player2Team', result.team);
        updateField('player2Position', result.position);
        if (result.fullName !== playerName) {
          updateField('player2', result.fullName); // Normalize name
        }
        setPlayerSuggestions([]);
        setShowPlayerSuggestions(false);
      } else if (result.suggestions && result.suggestions.length > 0) {
        // Show suggestions
        setPlayerSuggestions(result.suggestions);
        setShowPlayerSuggestions(true);
      }
    }
  };

  // Handle selecting a player1 suggestion
  const handleSelectPlayer1Suggestion = (suggestion) => {
    updateField('player1', suggestion.name);
    updateField('player1Team', suggestion.team);
    updateField('player1Position', suggestion.position);
    setPlayerSuggestions([]);
    setShowPlayerSuggestions(false);
  };

  // Handle selecting a player2 suggestion
  const handleSelectPlayer2Suggestion = (suggestion) => {
    updateField('player2', suggestion.name);
    updateField('player2Team', suggestion.team);
    updateField('player2Position', suggestion.position);
    setPlayerSuggestions([]);
    setShowPlayerSuggestions(false);
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
                className={inputClassName}
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
                className={inputClassName}
                style={inputStyle}
                placeholder="e.g., 7.5"
              />
            </div>
          </>
        );

      case '3-Way Moneyline':
        return (
          <div>
            <label className="block text-xs font-medium mb-1 text-white">Pick</label>
            <select
              value={participant.threeWayPick || 'Home'}
              onChange={(e) => updateField('threeWayPick', e.target.value)}
              className={inputClassName}
              style={inputStyle}
            >
              <option value="Home">Home</option>
              <option value="Away">Away</option>
              <option value="Draw">Draw</option>
            </select>
          </div>
        );

      case 'Total':
        return (
          <>
            <div>
              <label className="block text-xs font-medium mb-1 text-white">Over/Under</label>
              <select
                value={participant.overUnder || 'Over'}
                onChange={(e) => updateField('overUnder', e.target.value)}
                className={inputClassName}
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
                className={inputClassName}
                style={inputStyle}
                placeholder="e.g., 45.5"
              />
            </div>
          </>
        );

      case 'First Half Total':
        return (
          <>
            <div>
              <label className="block text-xs font-medium mb-1 text-white">Over/Under</label>
              <select
                value={participant.overUnder || 'Over'}
                onChange={(e) => updateField('overUnder', e.target.value)}
                className={inputClassName}
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
                className={inputClassName}
                style={inputStyle}
                placeholder="e.g., 21.5"
              />
            </div>
          </>
        );

      case 'Team Total':
      case 'First Half Team Total':
        return (
          <>
            <div>
              <label className="block text-xs font-medium mb-1 text-white">Over/Under</label>
              <select
                value={participant.overUnder || 'Over'}
                onChange={(e) => updateField('overUnder', e.target.value)}
                className={inputClassName}
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
                className={inputClassName}
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
                className={inputClassName}
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
                className={inputClassName}
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
                className={inputClassName}
                style={inputStyle}
                placeholder="e.g., 2.5"
              />
            </div>
          </>
        );

      case 'Player Prop':
      case 'Team Prop':
      case 'Game Prop':
        return (
          <>
            <div className="relative">
              <label className="block text-xs font-medium mb-1 text-white">Prop Type</label>
              <input
                type="text"
                value={participant.propType || ''}
                onChange={(e) => onPropTypeInput(participantId, e.target.value)}
                className={inputClassName}
                style={inputStyle}
                placeholder="e.g., Passing Yards, Rushing TDs"
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
                className={inputClassName}
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
                className={inputClassName}
                style={inputStyle}
                placeholder="e.g., 250.5"
              />
            </div>
          </>
        );

      case 'H2H Prop':
        return (
          <>
            <div className="md:col-span-3 relative">
              <label className="block text-xs font-medium mb-1 text-white">Player 1</label>
              <input
                type="text"
                value={participant.player1 || ''}
                onChange={(e) => {
                  updateField('player1', e.target.value);
                  if (onPlayerInput) {
                    onPlayerInput(`${participantId}-player1`, 'player1', e.target.value, participant.sport);
                  }
                }}
                onBlur={() => {
                  setCurrentPlayerField('player1');
                  handlePlayer1Blur(participant.player1, participant.sport);
                }}
                className={inputClassName}
                style={inputStyle}
                placeholder="First player name"
              />
              {/* Auto-filled team/position display for Player 1 */}
              {participant.player1Team && (
                <div className="mt-1 text-xs text-gray-300">
                  {participant.player1Team} • {participant.player1Position}
                  {loadingPlayerData && currentPlayerField === 'player1' && <span className="ml-2">Loading...</span>}
                </div>
              )}
              {showSuggestions[`player-${participantId}-player1`] && suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {suggestions.map((suggestion, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-black"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        updateField('player1', suggestion);
                        onSelectSuggestion(`${participantId}-player1`, 'player1', suggestion);
                      }}
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="md:col-span-3 relative">
              <label className="block text-xs font-medium mb-1 text-white">Player 1 Prop Type</label>
              <input
                type="text"
                value={participant.player1PropType || ''}
                onChange={(e) => {
                  updateField('player1PropType', e.target.value);
                  onPropTypeInput(`${participantId}-prop1`, e.target.value);
                }}
                className={inputClassName}
                style={inputStyle}
                placeholder="e.g., Passing Yards, Points"
              />
              {showSuggestions[`prop-${participantId}-prop1`] && suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {suggestions.map((suggestion, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-black"
                      onClick={() => {
                        updateField('player1PropType', suggestion);
                        onSelectSuggestion(`${participantId}-prop1`, 'propType', suggestion);
                      }}
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="md:col-span-3 relative">
              <label className="block text-xs font-medium mb-1 text-white">Player 2</label>
              <input
                type="text"
                value={participant.player2 || ''}
                onChange={(e) => {
                  updateField('player2', e.target.value);
                  if (onPlayerInput) {
                    onPlayerInput(`${participantId}-player2`, 'player2', e.target.value, participant.sport);
                  }
                }}
                onBlur={() => {
                  setCurrentPlayerField('player2');
                  handlePlayer2Blur(participant.player2, participant.sport);
                }}
                className={inputClassName}
                style={inputStyle}
                placeholder="Second player name"
              />
              {/* Auto-filled team/position display for Player 2 */}
              {participant.player2Team && (
                <div className="mt-1 text-xs text-gray-300">
                  {participant.player2Team} • {participant.player2Position}
                  {loadingPlayerData && currentPlayerField === 'player2' && <span className="ml-2">Loading...</span>}
                </div>
              )}
              {showSuggestions[`player-${participantId}-player2`] && suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {suggestions.map((suggestion, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-black"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        updateField('player2', suggestion);
                        onSelectSuggestion(`${participantId}-player2`, 'player2', suggestion);
                      }}
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="md:col-span-3 relative">
              <label className="block text-xs font-medium mb-1 text-white">Player 2 Prop Type</label>
              <input
                type="text"
                value={participant.player2PropType || ''}
                onChange={(e) => {
                  updateField('player2PropType', e.target.value);
                  onPropTypeInput(`${participantId}-prop2`, e.target.value);
                }}
                className={inputClassName}
                style={inputStyle}
                placeholder="e.g., Rushing Yards, Assists (can be different!)"
              />
              {showSuggestions[`prop-${participantId}-prop2`] && suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {suggestions.map((suggestion, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-black"
                      onClick={() => {
                        updateField('player2PropType', suggestion);
                        onSelectSuggestion(`${participantId}-prop2`, 'propType', suggestion);
                      }}
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium mb-1 text-white">Betting On</label>
              <select
                value={participant.selectedPlayer || ''}
                onChange={(e) => updateField('selectedPlayer', e.target.value)}
                className={inputClassName}
                style={inputStyle}
              >
                <option value="">Select player</option>
                {participant.player1 && (
                  <option value={participant.player1}>{participant.player1}</option>
                )}
                {participant.player2 && (
                  <option value={participant.player2}>{participant.player2}</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-white">Favorite/Dog</label>
              <select
                value={participant.h2hLineType || ''}
                onChange={(e) => updateField('h2hLineType', e.target.value)}
                className={inputClassName}
                style={inputStyle}
              >
                <option value="">Straight Up</option>
                <option value="Favorite">Favorite</option>
                <option value="Dog">Dog</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium mb-1 text-white">Spread (optional)</label>
              <input
                type="text"
                value={participant.h2hLine || ''}
                onChange={(e) => updateField('h2hLine', e.target.value)}
                className={inputClassName}
                style={inputStyle}
                placeholder="e.g., 18.5 (leave empty for straight up)"
              />
            </div>

            {/* Editable team/position fields */}
            <div className="md:col-span-2">
              <label className="block text-xs font-medium mb-1 text-white">Player 1 Team</label>
              <input
                type="text"
                value={participant.player1Team || ''}
                onChange={(e) => updateField('player1Team', e.target.value)}
                className={inputClassName}
                style={inputStyle}
                placeholder="Auto-filled from ESPN"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium mb-1 text-white">Player 1 Position</label>
              <input
                type="text"
                value={participant.player1Position || ''}
                onChange={(e) => updateField('player1Position', e.target.value)}
                className={inputClassName}
                style={inputStyle}
                placeholder="Auto-filled from ESPN"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium mb-1 text-white">Player 2 Team</label>
              <input
                type="text"
                value={participant.player2Team || ''}
                onChange={(e) => updateField('player2Team', e.target.value)}
                className={inputClassName}
                style={inputStyle}
                placeholder="Auto-filled from ESPN"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium mb-1 text-white">Player 2 Position</label>
              <input
                type="text"
                value={participant.player2Position || ''}
                onChange={(e) => updateField('player2Position', e.target.value)}
                className={inputClassName}
                style={inputStyle}
                placeholder="Auto-filled from ESPN"
              />
            </div>
          </>
        );

      case 'Either Prop':
        return (
          <>
            <div className="md:col-span-3 relative">
              <label className="block text-xs font-medium mb-1 text-white">Prop Type</label>
              <input
                type="text"
                value={participant.propType || ''}
                onChange={(e) => onPropTypeInput(participantId, e.target.value)}
                className={inputClassName}
                style={inputStyle}
                placeholder="e.g., Passing TDs, Points, Strikeouts"
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
                className={inputClassName}
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
                className={inputClassName}
                style={inputStyle}
                placeholder="e.g., 2.5"
              />
            </div>
            <div className="md:col-span-3 relative">
              <label className="block text-xs font-medium mb-1 text-white">Player 1</label>
              <input
                type="text"
                value={participant.player1 || ''}
                onChange={(e) => {
                  updateField('player1', e.target.value);
                  if (onPlayerInput) {
                    onPlayerInput(`${participantId}-player1`, 'player1', e.target.value, participant.sport);
                  }
                }}
                onBlur={() => {
                  setCurrentPlayerField('player1');
                  handlePlayer1Blur(participant.player1, participant.sport);
                }}
                className={inputClassName}
                style={inputStyle}
                placeholder="First player name"
              />
              {/* Auto-filled team/position display for Player 1 */}
              {participant.player1Team && (
                <div className="mt-1 text-xs text-gray-300">
                  {participant.player1Team} • {participant.player1Position}
                  {loadingPlayerData && currentPlayerField === 'player1' && <span className="ml-2">Loading...</span>}
                </div>
              )}
              {showSuggestions[`player-${participantId}-player1`] && suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {suggestions.map((suggestion, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-black"
                      onClick={() => {
                        updateField('player1', suggestion);
                        onSelectSuggestion(`${participantId}-player1`, 'player1', suggestion);
                      }}
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="md:col-span-3 relative">
              <label className="block text-xs font-medium mb-1 text-white">Player 2</label>
              <input
                type="text"
                value={participant.player2 || ''}
                onChange={(e) => {
                  updateField('player2', e.target.value);
                  if (onPlayerInput) {
                    onPlayerInput(`${participantId}-player2`, 'player2', e.target.value, participant.sport);
                  }
                }}
                onBlur={() => {
                  setCurrentPlayerField('player2');
                  handlePlayer2Blur(participant.player2, participant.sport);
                }}
                className={inputClassName}
                style={inputStyle}
                placeholder="Second player name"
              />
              {participant.player2Team && (
                <div className="mt-1 text-xs text-gray-300">
                  {participant.player2Team} • {participant.player2Position}
                  {loadingPlayerData && currentPlayerField === 'player2' && <span className="ml-2">Loading...</span>}
                </div>
              )}
              {showSuggestions[`player-${participantId}-player2`] && suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {suggestions.map((suggestion, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-black"
                      onClick={() => {
                        updateField('player2', suggestion);
                        onSelectSuggestion(`${participantId}-player2`, 'player2', suggestion);
                      }}
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-1">
                Win if EITHER player/team hits the line
              </p>
            </div>

            {/* Editable team/position fields */}
            <div className="md:col-span-2">
              <label className="block text-xs font-medium mb-1 text-white">Player 1 Team</label>
              <input
                type="text"
                value={participant.player1Team || ''}
                onChange={(e) => updateField('player1Team', e.target.value)}
                className={inputClassName}
                style={inputStyle}
                placeholder="Auto-filled from ESPN"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium mb-1 text-white">Player 1 Position</label>
              <input
                type="text"
                value={participant.player1Position || ''}
                onChange={(e) => updateField('player1Position', e.target.value)}
                className={inputClassName}
                style={inputStyle}
                placeholder="Auto-filled from ESPN"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium mb-1 text-white">Player 2 Team</label>
              <input
                type="text"
                value={participant.player2Team || ''}
                onChange={(e) => updateField('player2Team', e.target.value)}
                className={inputClassName}
                style={inputStyle}
                placeholder="Auto-filled from ESPN"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium mb-1 text-white">Player 2 Position</label>
              <input
                type="text"
                value={participant.player2Position || ''}
                onChange={(e) => updateField('player2Position', e.target.value)}
                className={inputClassName}
                style={inputStyle}
                placeholder="Auto-filled from ESPN"
              />
            </div>
          </>
        );

      case 'Combined Prop':
        return (
          <>
            <div className="md:col-span-3 relative">
              <label className="block text-xs font-medium mb-1 text-white">Prop Type</label>
              <input
                type="text"
                value={participant.propType || ''}
                onChange={(e) => onPropTypeInput(participantId, e.target.value)}
                className={inputClassName}
                style={inputStyle}
                placeholder="e.g., Home Runs, Touchdowns, Goals"
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
                className={inputClassName}
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
                className={inputClassName}
                style={inputStyle}
                placeholder="e.g., 2.5"
              />
            </div>
            <div className="md:col-span-3 relative">
              <label className="block text-xs font-medium mb-1 text-white">Player 1</label>
              <input
                type="text"
                value={participant.player1 || ''}
                onChange={(e) => {
                  updateField('player1', e.target.value);
                  if (onPlayerInput) {
                    onPlayerInput(`${participantId}-player1`, 'player1', e.target.value, participant.sport);
                  }
                }}
                onBlur={() => {
                  setCurrentPlayerField('player1');
                  handlePlayer1Blur(participant.player1, participant.sport);
                }}
                className={inputClassName}
                style={inputStyle}
                placeholder="First player name"
              />
              {/* Auto-filled team/position display for Player 1 */}
              {participant.player1Team && (
                <div className="mt-1 text-xs text-gray-300">
                  {participant.player1Team} • {participant.player1Position}
                  {loadingPlayerData && currentPlayerField === 'player1' && <span className="ml-2">Loading...</span>}
                </div>
              )}
              {showSuggestions[`player-${participantId}-player1`] && suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {suggestions.map((suggestion, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-black"
                      onClick={() => {
                        updateField('player1', suggestion);
                        onSelectSuggestion(`${participantId}-player1`, 'player1', suggestion);
                      }}
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="md:col-span-3 relative">
              <label className="block text-xs font-medium mb-1 text-white">Player 2</label>
              <input
                type="text"
                value={participant.player2 || ''}
                onChange={(e) => {
                  updateField('player2', e.target.value);
                  if (onPlayerInput) {
                    onPlayerInput(`${participantId}-player2`, 'player2', e.target.value, participant.sport);
                  }
                }}
                onBlur={() => {
                  setCurrentPlayerField('player2');
                  handlePlayer2Blur(participant.player2, participant.sport);
                }}
                className={inputClassName}
                style={inputStyle}
                placeholder="Second player name"
              />
              {/* Auto-filled team/position display for Player 2 */}
              {participant.player2Team && (
                <div className="mt-1 text-xs text-gray-300">
                  {participant.player2Team} • {participant.player2Position}
                  {loadingPlayerData && currentPlayerField === 'player2' && <span className="ml-2">Loading...</span>}
                </div>
              )}
              {showSuggestions[`player-${participantId}-player2`] && suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {suggestions.map((suggestion, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-black"
                      onClick={() => {
                        updateField('player2', suggestion);
                        onSelectSuggestion(`${participantId}-player2`, 'player2', suggestion);
                      }}
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-1">
                Win if COMBINED total hits the line
              </p>
            </div>

            {/* Editable team/position fields */}
            <div className="md:col-span-2">
              <label className="block text-xs font-medium mb-1 text-white">Player 1 Team</label>
              <input
                type="text"
                value={participant.player1Team || ''}
                onChange={(e) => updateField('player1Team', e.target.value)}
                className={inputClassName}
                style={inputStyle}
                placeholder="Auto-filled from ESPN"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium mb-1 text-white">Player 1 Position</label>
              <input
                type="text"
                value={participant.player1Position || ''}
                onChange={(e) => updateField('player1Position', e.target.value)}
                className={inputClassName}
                style={inputStyle}
                placeholder="Auto-filled from ESPN"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium mb-1 text-white">Player 2 Team</label>
              <input
                type="text"
                value={participant.player2Team || ''}
                onChange={(e) => updateField('player2Team', e.target.value)}
                className={inputClassName}
                style={inputStyle}
                placeholder="Auto-filled from ESPN"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium mb-1 text-white">Player 2 Position</label>
              <input
                type="text"
                value={participant.player2Position || ''}
                onChange={(e) => updateField('player2Position', e.target.value)}
                className={inputClassName}
                style={inputStyle}
                placeholder="Auto-filled from ESPN"
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
              className={inputClassName}
              style={inputStyle}
            >
              <option value="Yes">YRFI (Yes)</option>
              <option value="No">NRFI (No)</option>
            </select>
          </div>
        );

      case 'First Half Spread':
      case 'Quarter Spread':
        return (
          <>
            <div>
              <label className="block text-xs font-medium mb-1 text-white">Favorite/Dog</label>
              <select
                value={participant.favorite || 'Favorite'}
                onChange={(e) => updateField('favorite', e.target.value)}
                className={inputClassName}
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
                className={inputClassName}
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
              <label className="block text-xs font-medium mb-1 text-white">Over/Under</label>
              <select
                value={participant.overUnder || 'Over'}
                onChange={(e) => updateField('overUnder', e.target.value)}
                className={inputClassName}
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
                className={inputClassName}
                style={inputStyle}
                placeholder="e.g., 10.5"
              />
            </div>
          </>
        );

      case 'Quarter Moneyline':
      case 'First Half Moneyline':
        return null; // Quarter/period selection is handled in the sub-type selector above

      default:
        return null;
    }
  };

  return (
    <div className="bg-gray-800/50 rounded-lg p-3 md:p-4 border border-gray-700">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3 mb-3">
        {/* Big Guy Selection - supports both old (player) and new (bigGuy) schema */}
        <div>
          <label className="block text-xs font-medium mb-1 text-white">Big Guy</label>
          <select
            value={participant.bigGuy || participant.player || ''}
            onChange={(e) => {
              // Update both fields for compatibility during transition
              updateField('bigGuy', e.target.value);
              updateField('player', e.target.value);
            }}
            className={inputClassName}
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
            className={inputClassName}
            style={inputStyle}
          >
            {sports.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Bet Type Selection */}
        <div>
          <label className="block text-xs font-medium mb-1 text-white">Bet Type</label>
          <select
            value={displayCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className={inputClassName}
            style={inputStyle}
          >
            {betTypes.map(bt => <option key={bt} value={bt}>{bt}</option>)}
          </select>
        </div>
      </div>

      {/* Sub-type selectors for consolidated bet categories */}
      {displayCategory === 'First Half Bet' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium mb-1 text-white">First Half Bet Type</label>
            <select
              value={participant.betType}
              onChange={(e) => updateField('betType', e.target.value)}
              className={inputClassName}
              style={inputStyle}
            >
              {FIRST_HALF_BET_TYPES.map(bt => <option key={bt} value={bt}>{bt.replace('First Half ', '')}</option>)}
            </select>
          </div>
        </div>
      )}

      {displayCategory === 'Quarter/Period Bet' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium mb-1 text-white">Quarter/Period Bet Type</label>
            <select
              value={participant.betType}
              onChange={(e) => updateField('betType', e.target.value)}
              className={inputClassName}
              style={inputStyle}
            >
              {QUARTER_PERIOD_BET_TYPES.map(bt => <option key={bt} value={bt}>{bt.replace('Quarter ', '')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-white">Quarter/Period</label>
            <select
              value={participant.quarter || '1Q'}
              onChange={(e) => updateField('quarter', e.target.value)}
              className={inputClassName}
              style={inputStyle}
            >
              <option value="1Q">1st Quarter/Period</option>
              <option value="2Q">2nd Quarter/Period</option>
              <option value="3Q">3rd Quarter/Period</option>
              <option value="4Q">4th Quarter/Period</option>
            </select>
          </div>
        </div>
      )}

      {displayCategory === 'Team Prop' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium mb-1 text-white">Team Prop Type</label>
            <select
              value={participant.betType === 'Team Total' ? 'Team Total' : 'Team Prop'}
              onChange={(e) => updateField('betType', e.target.value)}
              className={inputClassName}
              style={inputStyle}
            >
              {TEAM_PROP_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
            </select>
          </div>
        </div>
      )}

      {displayCategory === 'Game Prop' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium mb-1 text-white">Game Prop Type</label>
            <select
              value={participant.betType === 'First Inning Runs' ? 'First Inning Runs' : 'Game Prop'}
              onChange={(e) => updateField('betType', e.target.value)}
              className={inputClassName}
              style={inputStyle}
            >
              {GAME_PROP_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Team/Player Fields - Conditional rendering based on bet type */}
      <div className={`grid gap-2 md:gap-3 mb-3 ${participant.betType === 'Player Prop' ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
        {/* Player field for Player Props and individual sports */}
        {(() => {
          const showPlayerField = INDIVIDUAL_SPORTS.includes(participant.sport) || participant.betType === 'Player Prop';
          const showTeamField = !INDIVIDUAL_SPORTS.includes(participant.sport) &&
            ['Spread', 'Moneyline', 'First Half Spread', 'First Half Moneyline',
             'Team Total', 'First Half Team Total', 'Quarter Moneyline',
             'Quarter Team Total', 'Quarter Spread', 'Team Prop'].includes(participant.betType);

          if (!showPlayerField && !showTeamField) return null;

          return (
            <div className="relative">
              <label className="block text-xs font-medium mb-1 text-white">
                {showPlayerField ? 'Player' : 'Team'}
              </label>
              <input
                type="text"
                value={participant.team || ''}
                onChange={(e) => onTeamInput(participantId, e.target.value, participant.sport)}
                onBlur={() => {
                  if (showPlayerField) {
                    handlePlayerBlur(participant.team, participant.sport);
                  }
                }}
                className={inputClassName}
                style={inputStyle}
                placeholder={showPlayerField ? "Enter player name" : "Start typing..."}
              />

              {/* Player suggestions dropdown (for Player Props and multi-player props) */}
              {showPlayerField && showPlayerSuggestions && playerSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-48 overflow-y-auto">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-600 border-b">
                    Did you mean?
                  </div>
                  {playerSuggestions.map((suggestion, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                      onClick={() => {
                        if (currentPlayerField === 'player1') {
                          handleSelectPlayer1Suggestion(suggestion);
                        } else if (currentPlayerField === 'player2') {
                          handleSelectPlayer2Suggestion(suggestion);
                        } else {
                          handleSelectPlayerSuggestion(suggestion); // Original Player Prop handler
                        }
                      }}
                    >
                      <div className="font-medium text-sm text-black">{suggestion.name}</div>
                      <div className="text-xs text-gray-600">
                        {suggestion.team} • {suggestion.position}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Team suggestions dropdown (for team bets) */}
              {!showPlayerField && showSuggestions[`team-${participantId}`] && suggestions.length > 0 && (
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

              {/* Auto-filled team/position display (for Player Props) */}
              {showPlayerField && participant.playerTeam && (
                <div className="mt-1 text-xs text-gray-300">
                  {participant.playerTeam} • {participant.playerPosition}
                  {loadingPlayerData && <span className="ml-2">Loading...</span>}
                </div>
              )}
            </div>
          );
        })()}

        {/* Player Team and Position fields for Player Props */}
        {participant.betType === 'Player Prop' && (
          <>
            <div>
              <label className="block text-xs font-medium mb-1 text-white">Player Team</label>
              <input
                type="text"
                value={participant.playerTeam || ''}
                onChange={(e) => updateField('playerTeam', e.target.value)}
                className={inputClassName}
                style={inputStyle}
                placeholder="Auto-filled from ESPN"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-white">Position</label>
              <input
                type="text"
                value={participant.playerPosition || ''}
                onChange={(e) => updateField('playerPosition', e.target.value)}
                className={inputClassName}
                style={inputStyle}
                placeholder="Auto-filled from ESPN"
              />
            </div>
          </>
        )}

        {/* Away/Home Team fields for Game Prop and Total bets */}
        {['Total', 'First Half Total', 'First Inning Runs', 'Quarter Total', 'Game Prop', '3-Way Moneyline'].includes(participant.betType) && (
          <>
            <div className="relative">
              <label className="block text-xs font-medium mb-1 text-white">Away Team</label>
              <input
                type="text"
                value={participant.awayTeam || ''}
                onChange={(e) => onAwayTeamInput(participantId, e.target.value, participant.sport)}
                className={inputClassName}
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
                className={inputClassName}
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

      {/* Odds, Result, and Actual Stats Fields */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3 mb-3">
        <div>
          <label className="block text-xs font-medium mb-1 text-white">Odds (optional)</label>
          <input
            type="text"
            value={participant.odds || ''}
            onChange={(e) => updateField('odds', e.target.value)}
            className={inputClassName}
            style={inputStyle}
            placeholder="e.g., +150 or -110"
          />
        </div>

        {isEditMode && (
          <>
            <div>
              <label className="block text-xs font-medium mb-1 text-white">Result</label>
              <select
                value={participant.result || 'pending'}
                onChange={(e) => {
                  updateField('result', e.target.value);
                  updateField('autoUpdated', false);
                  updateField('manuallyOverridden', e.target.value !== 'pending');
                  // Clear actualStats if setting to pending
                  if (e.target.value === 'pending') {
                    updateField('actualStats', null);
                  }
                }}
                className={inputClassName}
                style={inputStyle}
              >
                <option value="pending">Pending</option>
                <option value="win">Win</option>
                <option value="loss">Loss</option>
                <option value="push">Push</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1 text-white">Actual Stats (optional)</label>
              <input
                type="text"
                value={participant.actualStats || ''}
                onChange={(e) => updateField('actualStats', e.target.value || null)}
                className={inputClassName}
                style={inputStyle}
                placeholder="e.g., 212 passing yards"
              />
            </div>
          </>
        )}
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
