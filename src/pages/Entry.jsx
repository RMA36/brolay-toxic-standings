import React, { useMemo } from 'react';
import { AlertCircle, PlusCircle } from 'lucide-react';
import { useBrolayContext } from '../contexts/BrolayContext';
import { PLAYERS, SPORTS, PICK_TYPES, PRELOADED_TEAMS, COMMON_PROP_TYPES, PRELOADED_PLAYERS } from '../constants/sports';
import { formatDateForDisplay, getCurrentETDate, getPickResult, getPickBigGuy, getPicksArray } from '../utils/formatters';
import { saveLearnedData, createDefaultParticipant } from '../utils/actionHandlers';
import Button from '../components/common/Button';
import PickEntry from '../components/forms/PickEntry';
import { useESPNTeams } from '../hooks/useESPNTeams';

/**
 * Entry Page Component
 *
 * Handles new brolay entry with:
 * - Entry form for new brolays
 * - Who's Out detection panel
 * - Participant management (add/remove/update)
 * - Team and prop type autocomplete
 * - Push detection warnings
 * - Form validation
 * - Firebase submission
 */
const Entry = () => {
  // Get context values
  const {
    newParlay,
    setNewParlay,
    parlays,
    players,
    saving,
    setSaving,
    addBrolay,
    isMobile,
    learnedTeams,
    learnedPropTypes,
    learnedPlayers,
    setLearnedTeams,
    setLearnedPropTypes,
    setLearnedPlayers,
    suggestions,
    setSuggestions,
    showSuggestions,
    setShowSuggestions,
    fetchOddsFromTheOddsAPI,
    prefetchEventsBySport
  } = useBrolayContext();

  // Initialize ESPN Teams hook for autocomplete
  const { lookupTeams, loading: teamsLoading } = useESPNTeams();

  // Helper function to get day of week from date string
  const getDayOfWeek = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00'); // Add time to avoid timezone issues
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  // Calculate who is currently out
  const getPlayerOut = () => {
    // Get all brolays sorted by date (most recent first)
    const sortedParlays = [...parlays].sort((a, b) => {
      const dateCompare = new Date(b.date) - new Date(a.date);
      if (dateCompare !== 0) return dateCompare;
      // For same-day brolays, use sortOrder if available (higher sortOrder = more recent)
      if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
        return b.sortOrder - a.sortOrder;
      }
      const aKey = a.id || a.id;
      const bKey = b.id || b.id;
      return String(bKey).localeCompare(String(aKey));
    });

    // Look for the most recent brolay that either:
    // 1. Had exactly 1 loss (And-1) - any number of participants
    // 2. Was a winning 4-person brolay
    for (const parlay of sortedParlays) {
      const picks = getPicksArray(parlay);

      const losers = picks.filter(p => getPickResult(p) === 'loss');
      const winners = picks.filter(p => getPickResult(p) === 'win');
      const pushes = picks.filter(p => getPickResult(p) === 'push');

      // Check for And-1 (exactly 1 loss, regardless of participant count)
      const isAnd1 = losers.length === 1;
      if (isAnd1) {
        const loserBigGuy = getPickBigGuy(losers[0]);
        return {
          player: loserBigGuy,
          reason: 'And-1',
          date: parlay.date,
          parlayId: parlay.id
        };
      }

      // Check for winning 4-person brolay (no losses, at least one win)
      // Skip if not 4 people
      if (picks.length === 4) {
        const isWinning = losers.length === 0 && winners.length > 0 && pushes.length < picks.length;
        if (isWinning) {
          // Find who was NOT in this brolay
          const bigGuysInParlay = picks.map(p => getPickBigGuy(p));
          const playerOut = players.find(p => !bigGuysInParlay.includes(p));
          return {
            player: playerOut,
            reason: '4-person win',
            date: parlay.date,
            parlayId: parlay.id
          };
        }
      }
    }

    return null;
  };

  // Add a new participant to the parlay
  const addParticipant = () => {
    const participantId = Object.keys(newParlay.participants).length;
    setNewParlay({
      ...newParlay,
      participants: {
        ...newParlay.participants,
        [participantId]: createDefaultParticipant()
      }
    });
  };

  // Update a participant field
  const updateParticipant = (id, field, value) => {
    // Extract base participant ID for multi-entity props
    // IDs like "participant-1-player2" should become "participant-1"
    const baseId = id.includes('-player') || id.includes('-prop') ? id.split('-').slice(0, 2).join('-') : id;

    // Use functional setState to avoid stale state issues when multiple updates happen rapidly
    setNewParlay(prevParlay => {
      // Only update if the base participant exists
      if (!prevParlay.participants[baseId]) {
        return prevParlay;
      }

      return {
        ...prevParlay,
        participants: {
          ...prevParlay.participants,
          [baseId]: {
            ...prevParlay.participants[baseId],
            [field]: value
          }
        }
      };
    });
  };

  // Remove a participant from the parlay
  const removeParticipant = (id) => {
    const updated = { ...newParlay.participants };
    delete updated[id];
    setNewParlay({ ...newParlay, participants: updated });
  };

  // Get team suggestions for autocomplete using ESPN API
  const getTeamSuggestions = async (input, sport) => {
    if (!input || input.length < 2) return [];

    try {
      // Try ESPN API first
      const espnTeams = await lookupTeams(input, sport);

      if (espnTeams && espnTeams.length > 0) {
        // Return full team names from ESPN (e.g., "Michigan Wolverines")
        return espnTeams.map(team => team.name);
      }

      // Fallback to static list if ESPN fails
      const inputLower = input.toLowerCase();
      const preloaded = PRELOADED_TEAMS[sport] || [];
      const allTeams = [...new Set([...preloaded, ...learnedTeams])];

      return allTeams
        .filter(team => team.toLowerCase().includes(inputLower))
        .slice(0, 8);
    } catch (error) {
      console.error('Error fetching team suggestions:', error);

      // Fallback to static list
      const inputLower = input.toLowerCase();
      const preloaded = PRELOADED_TEAMS[sport] || [];
      const allTeams = [...new Set([...preloaded, ...learnedTeams])];

      return allTeams
        .filter(team => team.toLowerCase().includes(inputLower))
        .slice(0, 8);
    }
  };

  // Get prop type suggestions for autocomplete
  const getPropTypeSuggestions = (input) => {
    if (!input || input.length < 2) return [];

    const inputLower = input.toLowerCase();
    const allPropTypes = [...new Set([...COMMON_PROP_TYPES, ...learnedPropTypes])];

    return allPropTypes
      .filter(prop => prop.toLowerCase().includes(inputLower))
      .slice(0, 8);
  };

  // Get player suggestions for autocomplete (separate from teams)
  const getPlayerSuggestions = (input, sport) => {
    console.log('🔍 getPlayerSuggestions:', { input, sport, learnedPlayersCount: learnedPlayers.length });
    if (!input || input.length < 2) return [];

    const inputLower = input.toLowerCase();
    const preloaded = PRELOADED_PLAYERS[sport] || [];
    console.log('🔍 Preloaded players for', sport, ':', preloaded.length);
    const allPlayers = [...new Set([...preloaded, ...learnedPlayers])];
    console.log('🔍 All players:', allPlayers.length);

    return allPlayers
      .filter(player => player.toLowerCase().includes(inputLower))
      .slice(0, 8);
  };

  // Handle team input with autocomplete
  const handleTeamInput = async (id, value, sport) => {
    // Only update newParlay if this is a real participant ID (not editing mode with modified IDs)
    if (newParlay.participants && newParlay.participants[id]) {
      updateParticipant(id, 'team', value);
    }
    const suggestions = await getTeamSuggestions(value, sport);
    setSuggestions(suggestions);
    setShowSuggestions({ ...showSuggestions, [`team-${id}`]: suggestions.length > 0 });
  };

  // Handle prop type input with autocomplete
  const handlePropTypeInput = (id, value) => {
    // Only update newParlay if this is a real participant ID (not editing mode with modified IDs)
    if (newParlay.participants && newParlay.participants[id]) {
      updateParticipant(id, 'propType', value);
    }
    const suggestions = getPropTypeSuggestions(value);
    setSuggestions(suggestions);
    setShowSuggestions({ ...showSuggestions, [`prop-${id}`]: suggestions.length > 0 });
  };

  // Handle away team input with autocomplete
  const handleAwayTeamInput = async (id, value, sport) => {
    updateParticipant(id, 'awayTeam', value);
    const suggestions = await getTeamSuggestions(value, sport);
    setSuggestions(suggestions);
    setShowSuggestions({ ...showSuggestions, [`awayTeam-${id}`]: suggestions.length > 0 });
  };

  // Handle home team input with autocomplete
  const handleHomeTeamInput = async (id, value, sport) => {
    updateParticipant(id, 'homeTeam', value);
    const suggestions = await getTeamSuggestions(value, sport);
    setSuggestions(suggestions);
    setShowSuggestions({ ...showSuggestions, [`homeTeam-${id}`]: suggestions.length > 0 });
  };

  // Handle player input with autocomplete (for H2H, Either, Combined props)
  const handlePlayerInput = (id, field, value, sport) => {
    console.log('🏈 handlePlayerInput called:', { id, field, value, sport });
    updateParticipant(id, field, value);
    const suggestions = getPlayerSuggestions(value, sport);
    console.log('🏈 Player suggestions:', suggestions);
    setSuggestions(suggestions);
    setShowSuggestions({ ...showSuggestions, [`player-${id}`]: suggestions.length > 0 });
  };

  // Select a suggestion from autocomplete
  const selectSuggestion = (id, field, value) => {
    updateParticipant(id, field, value);
    setShowSuggestions({});
    setSuggestions([]);
  };

  // Submit the parlay
  const submitParlay = async () => {
    const participantCount = Object.keys(newParlay.participants).length;
    if (participantCount < 3) {
      alert('Minimum 3 participants required');
      return;
    }

    // Check for empty Big Guy selection (supports both old 'player' and new 'bigGuy' fields)
    const hasEmptyBigGuy = Object.values(newParlay.participants).some(p => !p.bigGuy && !p.player);
    if (hasEmptyBigGuy) {
      alert('Please select a Big Guy for all picks');
      return;
    }

    // Auto-fetch odds for ALL picks without odds from The Odds API (FanDuel primary, DraftKings secondary)
    setSaving(true);
    const participantsWithOdds = {};
    let oddsFetchedCount = 0;
    let oddsFailedCount = 0;

    // Pre-fetch all events for all sports needed (do this once, not per pick)
    const sportsNeeded = new Set();
    Object.values(newParlay.participants).forEach(p => {
      if (!p.odds) sportsNeeded.add(p.sport);
    });

    // Use the context function to pre-fetch events
    const eventsBySport = await prefetchEventsBySport(Array.from(sportsNeeded), newParlay.date);

    // Now fetch odds for each pick, using the pre-fetched events
    for (const [id, participant] of Object.entries(newParlay.participants)) {
      if (!participant.odds) {
        try {
          const result = await fetchOddsFromTheOddsAPI(participant, newParlay.date, eventsBySport[participant.sport]);

          if (result) {
            const odds = result.odds;
            const bookmaker = result.bookmaker;

            participantsWithOdds[id] = {
              ...participant,
              odds: typeof odds === 'string' ? odds : (odds > 0 ? `+${odds}` : `${odds}`),
              oddsSource: bookmaker
            };
            oddsFetchedCount++;
          } else {
            participantsWithOdds[id] = participant;
            oddsFailedCount++;
          }
        } catch (error) {
          console.error(`Error fetching odds for pick ${id}:`, error);
          participantsWithOdds[id] = participant;
          oddsFailedCount++;
        }
      } else {
        participantsWithOdds[id] = participant;
      }
    }

    const parlayData = {
      ...newParlay,
      participants: participantsWithOdds,
      totalParticipants: participantCount,
      dayOfWeek: getDayOfWeek(newParlay.date)
    };

    // Learn from new entries
    const newTeams = [...learnedTeams];
    const newPropTypes = [...learnedPropTypes];
    const newPlayers = [...learnedPlayers];

    Object.values(parlayData.participants).forEach(p => {
      if (p.team && !newTeams.includes(p.team)) {
        newTeams.push(p.team);
      }
      if (p.awayTeam && !newTeams.includes(p.awayTeam)) {
        newTeams.push(p.awayTeam);
      }
      if (p.homeTeam && !newTeams.includes(p.homeTeam)) {
        newTeams.push(p.homeTeam);
      }
      if (p.propType && !newPropTypes.includes(p.propType)) {
        newPropTypes.push(p.propType);
      }
      // Learn player names from multi-entity props
      if (p.player1 && !newPlayers.includes(p.player1)) {
        newPlayers.push(p.player1);
      }
      if (p.player2 && !newPlayers.includes(p.player2)) {
        newPlayers.push(p.player2);
      }
      if (p.selectedPlayer && !newPlayers.includes(p.selectedPlayer)) {
        newPlayers.push(p.selectedPlayer);
      }
    });

    setLearnedTeams(newTeams);
    setLearnedPropTypes(newPropTypes);
    setLearnedPlayers(newPlayers);
    saveLearnedData(newTeams, newPropTypes, newPlayers);

    try {
      // Save to Firebase using the hook
      const result = await addBrolay(parlayData);

      if (!result.success) {
        throw result.error;
      }

      // Show success message with odds info
      let message = 'Brolay saved successfully!';
      if (oddsFetchedCount > 0) {
        message += ` Fetched odds for ${oddsFetchedCount} pick(s).`;
      }
      if (oddsFailedCount > 0) {
        message += ` Could not find odds for ${oddsFailedCount} pick(s) - enter manually if needed.`;
      }
      alert(message);
    } catch (error) {
      console.error('Error adding parlay:', error);
      alert('Failed to save parlay. Please try again.');
    } finally {
      setSaving(false);
    }

    setNewParlay({
      date: getCurrentETDate(),
      betAmount: 10,
      totalPayout: 0,
      participants: {},
      // Support both old and new schema field names during transition
      placedBy: '',
      submittedBy: '',
      settled: false
    });
  };

  // Memoize player out calculation to prevent blocking on every render
  const playerOutInfo = useMemo(() => getPlayerOut(), [parlays]);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Who's Out Panel */}
      {playerOutInfo && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 md:p-6">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="text-red-600" size={24} />
            <h3 className="text-lg md:text-xl font-bold text-red-900">Who's Out</h3>
          </div>
          <div className="text-base md:text-lg">
            <span className="font-bold text-red-700">{playerOutInfo.player}</span> is currently out
          </div>
          <div className="text-sm text-red-700 mt-1">
            Reason: {playerOutInfo.reason} on {formatDateForDisplay(playerOutInfo.date)}
          </div>
          <div className="text-xs text-red-600 mt-2">
            Next 4-man brolay should not include {playerOutInfo.player}
          </div>
        </div>
      )}

      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl p-4 md:p-6 border border-yellow-500/20">
        <h2 className="text-xl md:text-2xl font-bold mb-4 text-yellow-400">✨ New Brolay Entry</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-white">Bet Amount (per person)</label>
            <input
              type="number"
              value={newParlay.betAmount}
              onChange={(e) => setNewParlay({...newParlay, betAmount: Number(e.target.value)})}
              className="w-full px-3 py-2 border rounded text-base"
              style={{ fontSize: isMobile ? '16px' : '14px' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-white">Total Payout</label>
            <input
              type="number"
              value={newParlay.totalPayout || ''}
              onChange={(e) => {
                const payout = Number(e.target.value) || 0;
                setNewParlay({...newParlay, totalPayout: payout});
              }}
              className="w-full px-3 py-2 border rounded text-base"
              style={{ fontSize: isMobile ? '16px' : '14px' }}
              placeholder="Enter total payout"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-white">Net Profit</label>
            <input
              type="number"
              value={Math.max(0, (newParlay.totalPayout || 0) - (newParlay.betAmount * Object.keys(newParlay.participants).length))}
              onChange={(e) => {
                const netProfit = Number(e.target.value) || 0;
                const totalRisk = newParlay.betAmount * Object.keys(newParlay.participants).length;
                const calculatedPayout = netProfit + totalRisk;
                setNewParlay({...newParlay, totalPayout: calculatedPayout});
              }}
              className="w-full px-3 py-2 border rounded text-base"
              style={{ fontSize: isMobile ? '16px' : '14px' }}
              placeholder="Or enter net profit"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-4">
          <div className={isMobile ? 'max-w-full overflow-hidden' : ''}>
            <label className="block text-sm font-medium mb-1 text-white">Date</label>
            <input
              type="date"
              value={newParlay.date}
              onChange={(e) => setNewParlay({...newParlay, date: e.target.value})}
              className="w-full px-3 py-2 border rounded text-base"
              style={{
                fontSize: isMobile ? '16px' : '14px',
                maxWidth: '100%'
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-white">Submitted By</label>
            <select
              value={newParlay.submittedBy || newParlay.placedBy || ''}
              onChange={(e) => setNewParlay({
                ...newParlay,
                submittedBy: e.target.value,
                placedBy: e.target.value // Keep both for compatibility
              })}
              className="w-full px-3 py-2 border rounded text-base"
              style={{ fontSize: isMobile ? '16px' : '14px' }}
            >
              <option value="">Select Big Guy</option>
              {players.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          {(() => {
            const participants = Object.values(newParlay.participants);
            const pushes = participants.filter(p => p.result === 'push');
            const losses = participants.filter(p => p.result === 'loss');
            const wins = participants.filter(p => p.result === 'win');
            const hasPushesAndWon = pushes.length > 0 && losses.length === 0 && wins.length > 0;

            return hasPushesAndWon && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="text-yellow-600 mt-1" size={20} />
                  <div>
                    <h4 className="font-semibold text-yellow-800">Push Detected on Winning Brolay</h4>
                    <p className="text-sm text-yellow-700">
                      {pushes.length} leg{pushes.length > 1 ? 's' : ''} pushed. Make sure to enter the <strong>adjusted payout</strong> you actually received from your sportsbook, not the original expected payout.
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="flex justify-between items-center">
            <h3 className="text-base md:text-lg font-semibold text-yellow-400">Picks</h3>
          </div>
          {Object.entries(newParlay.participants).map(([id, participant]) => (
            <PickEntry
              key={id}
              participant={participant}
              participantId={id}
              onUpdate={updateParticipant}
              onRemove={removeParticipant}
              players={PLAYERS}
              sports={SPORTS}
              betTypes={PICK_TYPES}
              suggestions={suggestions}
              showSuggestions={showSuggestions}
              onTeamInput={handleTeamInput}
              onPropTypeInput={handlePropTypeInput}
              onAwayTeamInput={handleAwayTeamInput}
              onHomeTeamInput={handleHomeTeamInput}
              onPlayerInput={handlePlayerInput}
              onSelectSuggestion={selectSuggestion}
              isMobile={isMobile}
            />
          ))}
        </div>

        <div className="flex justify-end">
          <Button
            onClick={addParticipant}
            variant="primary"
            className={`flex items-center gap-2 ${isMobile ? 'min-h-[44px]' : ''}`}
          >
            <PlusCircle size={isMobile ? 24 : 20} />
            Add Pick
          </Button>
        </div>

        <Button
          onClick={submitParlay}
          disabled={saving}
          variant="success"
          className={`w-full ${isMobile ? 'min-h-[44px]' : ''}`}
        >
          {saving ? 'Submitting...' : 'Submit Brolay'}
        </Button>
      </div>
    </div>
  );
};

export default Entry;
