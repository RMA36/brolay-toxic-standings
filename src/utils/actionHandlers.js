/**
 * Action Handlers - Helper functions for user actions and data manipulation
 * Extracted from App.jsx to improve organization
 */

import { normalizePlayerName } from './formatters';

/**
 * Matches player names between pick and API data
 * @param {string} pickPlayer - Player name from pick
 * @param {string} apiPlayer - Player name from API
 * @returns {boolean} Whether the names match
 */
export const matchPlayerName = (pickPlayer, apiPlayer) => {
  if (!pickPlayer || !apiPlayer) return false;

  const normalizedPick = normalizePlayerName(pickPlayer);
  const normalizedApi = normalizePlayerName(apiPlayer);

  if (normalizedPick === normalizedApi) return true;

  const pickParts = normalizedPick.split(' ');
  const apiParts = normalizedApi.split(' ');
  const pickLastName = pickParts[pickParts.length - 1];
  const apiLastName = apiParts[apiParts.length - 1];

  if (pickLastName === apiLastName && pickLastName.length > 3) {
    return true;
  }

  return false;
};

/**
 * Saves learned teams and prop types to localStorage
 * @param {string[]} teams - Array of team names
 * @param {string[]} propTypes - Array of prop types
 */
export const saveLearnedData = (teams, propTypes) => {
  localStorage.setItem('brolay-learned-data', JSON.stringify({
    teams: teams,
    propTypes: propTypes
  }));
};

/**
 * Extracts teams and prop types from existing parlays
 * @param {Object[]} parlays - Array of parlay objects
 * @param {string[]} currentLearnedTeams - Current learned teams
 * @param {string[]} currentLearnedPropTypes - Current learned prop types
 * @returns {Object} Object with newTeams and newPropTypes arrays
 */
export const extractTeamsFromParlays = (parlays, currentLearnedTeams = [], currentLearnedPropTypes = []) => {
  const newTeams = [...currentLearnedTeams];
  const newPropTypes = [...currentLearnedPropTypes];

  parlays.forEach(parlay => {
    Object.values(parlay.participants || {}).forEach(p => {
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
    });
  });

  return {
    newTeams,
    newPropTypes,
    teamsAdded: newTeams.length - currentLearnedTeams.length,
    propTypesAdded: newPropTypes.length - currentLearnedPropTypes.length
  };
};

/**
 * Applies filters to a list of parlays
 * @param {Object[]} parlaysList - Array of parlay objects
 * @param {Object} filters - Filter criteria
 * @param {string} editingParlayId - ID of parlay being edited (to exclude)
 * @returns {Object[]} Filtered array of parlays
 */
export const applyFilters = (parlaysList, filters, editingParlayId = null) => {
  return parlaysList.filter(parlay => {
    // Skip the parlay being edited - it's in draft state
    if (editingParlayId && parlay.id === editingParlayId) return false;

    // Date range filter
    if (filters.dateFrom && parlay.date < filters.dateFrom) return false;
    if (filters.dateTo && parlay.date > filters.dateTo) return false;

    // Placed By filter
    if (filters.placedBy && parlay.placedBy !== filters.placedBy) return false;

    // Total Payout range filter
    const payout = parlay.totalPayout || 0;
    if (filters.minPayout && payout < Number(filters.minPayout)) return false;
    if (filters.maxPayout && payout > Number(filters.maxPayout)) return false;

    // Player filter (check if any participant matches)
    if (filters.player) {
      const hasPlayer = Object.values(parlay.participants || {}).some(p => p.player === filters.player);
      if (!hasPlayer) return false;
    }

    // Sport filter (check if any participant matches)
    if (filters.sport) {
      const hasSport = Object.values(parlay.participants || {}).some(p => p.sport === filters.sport);
      if (!hasSport) return false;
    }

    // Result filter (check if any participant matches)
    if (filters.result) {
      const hasResult = Object.values(parlay.participants || {}).some(p => p.result === filters.result);
      if (!hasResult) return false;
    }

    if (filters.teamPlayer) {
      const hasTeamPlayer = Object.values(parlay.participants || {}).some(p => {
        const normalizedFilter = filters.teamPlayer.toLowerCase();
        return (p.team && p.team.toLowerCase().includes(normalizedFilter)) ||
               (p.awayTeam && p.awayTeam.toLowerCase().includes(normalizedFilter)) ||
               (p.homeTeam && p.homeTeam.toLowerCase().includes(normalizedFilter));
      });
      if (!hasTeamPlayer) return false;
    }
    return true;
  });
};

/**
 * Creates a default participant object with all fields
 * @returns {Object} Default participant structure
 */
export const createDefaultParticipant = () => ({
  player: '',
  sport: 'NFL',
  team: '',
  awayTeam: '',
  homeTeam: '',
  betType: 'Spread',
  favorite: 'Favorite',
  spread: '',
  total: '',
  overUnder: 'Over',
  propType: '',
  line: '',
  odds: '',
  yesNoRuns: '',
  quarter: '',
  result: 'pending',
  // Multi-entity prop fields
  player1: '',              // For H2H Prop
  player1PropType: '',      // For H2H Prop
  player2: '',              // For H2H Prop
  player2PropType: '',      // For H2H Prop
  selectedPlayer: '',       // For H2H Prop - who you're betting on
  h2hLine: '',              // For H2H Prop - optional spread
  h2hLineType: ''          // For H2H Prop - 'Favorite' or 'Dog'
});
