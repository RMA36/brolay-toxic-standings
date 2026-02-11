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

  // Split by underscore since normalizePlayerName replaces spaces with underscores
  const pickParts = normalizedPick.split('_').filter(part =>
    !['jr', 'sr', 'ii', 'iii', 'iv'].includes(part)
  );
  const apiParts = normalizedApi.split('_').filter(part =>
    !['jr', 'sr', 'ii', 'iii', 'iv'].includes(part)
  );

  const pickLastName = pickParts[pickParts.length - 1];
  const apiLastName = apiParts[apiParts.length - 1];

  if (pickLastName === apiLastName && pickLastName.length > 3) {
    return true;
  }

  return false;
};

/**
 * Saves learned teams, prop types, and players to localStorage
 * @param {string[]} teams - Array of team names
 * @param {string[]} propTypes - Array of prop types
 * @param {string[]} players - Array of player names
 */
export const saveLearnedData = (teams, propTypes, players = []) => {
  localStorage.setItem('brolay-learned-data', JSON.stringify({
    teams: teams,
    propTypes: propTypes,
    players: players
  }));
};

/**
 * Helper to get picks from parlay (new schema)
 */
const getPicksArray = (parlay) => {
  if (!parlay.picks) return [];
  return Object.values(parlay.picks);
};

/**
 * Helper to get Big Guy from pick (new schema)
 */
const getPickBigGuy = (pick) => pick.bigGuy || '';

/**
 * Helper to get result from pick (new schema)
 */
const getPickResult = (pick) => pick.outcome?.status || '';

/**
 * Extract team/player info from a pick (new schema)
 */
const extractPickInfo = (pick) => {
  const info = {
    team: '',
    awayTeam: '',
    homeTeam: '',
    propType: '',
    player1: '',
    player2: '',
    selectedPlayer: ''
  };

  // Extract from entities
  if (pick.entities && pick.entities.length > 0) {
    const primary = pick.entities.find(e => e.role === 'primary') || pick.entities[0];
    if (primary) {
      info.team = primary.name || '';
      if (primary.entityType === 'player') {
        info.player1 = primary.name || '';
      }
    }
    pick.entities.forEach(entity => {
      if (entity.entityType === 'player' && entity.name !== info.player1) {
        if (!info.player2) info.player2 = entity.name;
      }
      if (entity.entityType === 'team') {
        if (entity.role === 'home') info.homeTeam = entity.name || '';
        else if (entity.role === 'away') info.awayTeam = entity.name || '';
      }
    });
  }

  // Extract from game object
  if (pick.game) {
    info.awayTeam = info.awayTeam || pick.game.awayTeam || '';
    info.homeTeam = info.homeTeam || pick.game.homeTeam || '';
  }

  // Extract propType from line.statType
  if (pick.line && typeof pick.line === 'object') {
    info.propType = pick.line.statType || '';
  }

  // Selected player from outcome
  if (pick.outcome?.selectedPlayer) {
    info.selectedPlayer = pick.outcome.selectedPlayer;
  }

  return info;
};

/**
 * Extracts teams, prop types, and players from existing parlays
 * Supports both old and new schema formats
 * @param {Object[]} parlays - Array of parlay objects
 * @param {string[]} currentLearnedTeams - Current learned teams
 * @param {string[]} currentLearnedPropTypes - Current learned prop types
 * @param {string[]} currentLearnedPlayers - Current learned players
 * @returns {Object} Object with newTeams, newPropTypes, and newPlayers arrays
 */
export const extractTeamsFromParlays = (parlays, currentLearnedTeams = [], currentLearnedPropTypes = [], currentLearnedPlayers = []) => {
  const newTeams = [...currentLearnedTeams];
  const newPropTypes = [...currentLearnedPropTypes];
  const newPlayers = [...currentLearnedPlayers];

  parlays.forEach(parlay => {
    const picks = getPicksArray(parlay);
    picks.forEach(pick => {
      const info = extractPickInfo(pick);

      if (info.team && !newTeams.includes(info.team)) {
        newTeams.push(info.team);
      }
      if (info.awayTeam && !newTeams.includes(info.awayTeam)) {
        newTeams.push(info.awayTeam);
      }
      if (info.homeTeam && !newTeams.includes(info.homeTeam)) {
        newTeams.push(info.homeTeam);
      }
      if (info.propType && !newPropTypes.includes(info.propType)) {
        newPropTypes.push(info.propType);
      }
      // Extract player names from multi-entity props
      if (info.player1 && !newPlayers.includes(info.player1)) {
        newPlayers.push(info.player1);
      }
      if (info.player2 && !newPlayers.includes(info.player2)) {
        newPlayers.push(info.player2);
      }
      if (info.selectedPlayer && !newPlayers.includes(info.selectedPlayer)) {
        newPlayers.push(info.selectedPlayer);
      }
    });
  });

  return {
    newTeams,
    newPropTypes,
    newPlayers,
    teamsAdded: newTeams.length - currentLearnedTeams.length,
    propTypesAdded: newPropTypes.length - currentLearnedPropTypes.length,
    playersAdded: newPlayers.length - currentLearnedPlayers.length
  };
};

/**
 * Applies filters to a list of parlays (supports both old and new schema)
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

    // Submitted By filter
    const filterSubmittedBy = filters.submittedBy;
    if (filterSubmittedBy) {
      if (parlay.submittedBy !== filterSubmittedBy) return false;
    }

    // Total Payout range filter
    const payout = parlay.totalPayout || 0;
    if (filters.minPayout && payout < Number(filters.minPayout)) return false;
    if (filters.maxPayout && payout > Number(filters.maxPayout)) return false;

    // Get picks array (supports both schemas)
    const picks = getPicksArray(parlay);

    // Big Guy filter (check if any pick matches)
    if (filters.player) {
      const hasPlayer = picks.some(p => getPickBigGuy(p) === filters.player);
      if (!hasPlayer) return false;
    }

    // Sport filter (check if any pick matches)
    if (filters.sport) {
      const hasSport = picks.some(p => p.sport === filters.sport);
      if (!hasSport) return false;
    }

    // Result filter (check if any pick matches)
    if (filters.result) {
      const hasResult = picks.some(p => getPickResult(p) === filters.result);
      if (!hasResult) return false;
    }

    // Team/Player search filter
    if (filters.teamPlayer) {
      const normalizedFilter = filters.teamPlayer.toLowerCase();
      const hasTeamPlayer = picks.some(pick => {
        const info = extractPickInfo(pick);
        return (info.team && info.team.toLowerCase().includes(normalizedFilter)) ||
               (info.awayTeam && info.awayTeam.toLowerCase().includes(normalizedFilter)) ||
               (info.homeTeam && info.homeTeam.toLowerCase().includes(normalizedFilter)) ||
               (info.player1 && info.player1.toLowerCase().includes(normalizedFilter)) ||
               (info.player2 && info.player2.toLowerCase().includes(normalizedFilter));
      });
      if (!hasTeamPlayer) return false;
    }

    return true;
  });
};

/**
 * Creates a default participant/pick object with all fields
 * Includes both old and new schema field names for compatibility during transition
 * @returns {Object} Default participant/pick structure
 */
export const createDefaultParticipant = () => ({
  // Big Guy - both old (player) and new (bigGuy) field names
  player: '',
  bigGuy: '',
  sport: 'NFL',
  team: '',
  playerTeam: '',           // Auto-filled from ESPN for Player Props
  playerPosition: '',       // Auto-filled from ESPN for Player Props
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
  h2hLineType: '',          // For H2H Prop - 'Favorite' or 'Dog'
  // Player team/position fields for multi-player props
  player1Team: '',          // Auto-filled from ESPN for H2H/Either/Combined
  player1Position: '',      // Auto-filled from ESPN for H2H/Either/Combined
  player2Team: '',          // Auto-filled from ESPN for H2H/Either/Combined
  player2Position: ''       // Auto-filled from ESPN for H2H/Either/Combined
});
