/**
 * Game Builder - Extracts and builds game information for transformed picks
 *
 * The game object identifies which game the pick is for.
 * This is crucial for ESPN auto-update functionality.
 *
 * Game structure:
 * {
 *   date: string (YYYY-MM-DD),
 *   league: string,
 *   awayTeam: string | null,
 *   homeTeam: string | null,
 *   espnGameId: string | null
 * }
 *
 * For individual sports (UFC, Tennis, Golf):
 * {
 *   date: string,
 *   league: string,
 *   participant1: string,
 *   participant2: string | null,
 *   espnGameId: string | null
 * }
 */

/**
 * Map sport names to league identifiers
 */
const SPORT_TO_LEAGUE = {
  'NFL': 'NFL',
  'NBA': 'NBA',
  'MLB': 'MLB',
  'NHL': 'NHL',
  'College Football': 'NCAAF',
  'College Basketball': 'NCAAB',
  "College Basketball (Women's)": 'NCAAW',
  'WNBA': 'WNBA',
  'Soccer': 'SOCCER',
  "Soccer (Women's)": 'NWSL',
  'Tennis': 'ATP',
  "Tennis (Women's)": 'WTA',
  'Golf': 'PGA',
  'Rugby': 'RUGBY',
  'UFC': 'UFC',
  'AHL': 'AHL',
  'College Baseball': 'NCAABB'
};

/**
 * Sports that are individual (not team vs team)
 */
const INDIVIDUAL_SPORTS = ['UFC', 'Tennis', "Tennis (Women's)", 'Golf'];

/**
 * Build game object from old pick data
 *
 * @param {Object} oldPick - The old pick data
 * @param {string} brolayDate - The date of the brolay
 * @returns {Object} Game identification object
 */
function buildGame(oldPick, brolayDate) {
  const sport = oldPick.sport;
  const league = SPORT_TO_LEAGUE[sport] || sport;
  const isIndividualSport = INDIVIDUAL_SPORTS.includes(sport);

  const game = {
    date: brolayDate,
    league: league
  };

  if (isIndividualSport) {
    // For individual sports, use participant fields
    const participants = extractIndividualParticipants(oldPick);
    if (participants.participant1) {
      game.participant1 = participants.participant1;
    }
    if (participants.participant2) {
      game.participant2 = participants.participant2;
    }
  } else {
    // For team sports, extract home/away teams
    const teams = extractTeams(oldPick);
    if (teams.awayTeam) {
      game.awayTeam = teams.awayTeam;
    }
    if (teams.homeTeam) {
      game.homeTeam = teams.homeTeam;
    }
  }

  // ESPN ID would be populated during auto-update, not during migration
  game.espnGameId = null;

  return game;
}

/**
 * Extract team information from old pick
 */
function extractTeams(oldPick) {
  const result = {
    awayTeam: null,
    homeTeam: null
  };

  // Check explicit home/away fields first
  if (oldPick.homeTeam && oldPick.homeTeam !== '') {
    result.homeTeam = oldPick.homeTeam;
  }
  if (oldPick.awayTeam && oldPick.awayTeam !== '') {
    result.awayTeam = oldPick.awayTeam;
  }

  // If we have both, we're done
  if (result.homeTeam && result.awayTeam) {
    return result;
  }

  // Try to extract from actualStats
  if (oldPick.actualStats) {
    const statsTeams = extractTeamsFromActualStats(oldPick.actualStats);
    if (statsTeams.awayTeam && !result.awayTeam) {
      result.awayTeam = statsTeams.awayTeam;
    }
    if (statsTeams.homeTeam && !result.homeTeam) {
      result.homeTeam = statsTeams.homeTeam;
    }
  }

  // If we still only have the picked team, try to fill in
  if (!result.awayTeam && !result.homeTeam && oldPick.team) {
    // We at least know one team (the picked one)
    // Can't determine home/away, so just set as one of them
    result.awayTeam = normalizeTeamName(oldPick.team);
  }

  return result;
}

/**
 * Extract teams from actualStats string
 * Format: "Team1 Score @ Team2 Score"
 */
function extractTeamsFromActualStats(actualStats) {
  const result = {
    awayTeam: null,
    homeTeam: null
  };

  if (!actualStats) return result;

  // Match pattern: "Team Name Score @ Other Team Score"
  // The @ symbol typically separates away @ home
  const match = actualStats.match(/^(.+?)\s+\d+\s*@\s*(.+?)\s+\d+/i);
  if (match) {
    result.awayTeam = normalizeTeamName(match[1].trim());
    result.homeTeam = normalizeTeamName(match[2].trim());
  }

  return result;
}

/**
 * Extract participants for individual sports (UFC, Tennis, Golf)
 */
function extractIndividualParticipants(oldPick) {
  const result = {
    participant1: null,
    participant2: null
  };

  // For UFC, the "team" field often contains the fighter name
  if (oldPick.team && oldPick.team !== '') {
    result.participant1 = oldPick.team;
  }

  // Check player fields
  if (oldPick.player1 && oldPick.player1 !== '') {
    result.participant1 = oldPick.player1;
  }
  if (oldPick.player2 && oldPick.player2 !== '') {
    result.participant2 = oldPick.player2;
  }

  // Try to extract from actualStats for UFC
  if (oldPick.actualStats && oldPick.sport === 'UFC') {
    const fighters = extractFightersFromStats(oldPick.actualStats);
    if (fighters.fighter1 && !result.participant1) {
      result.participant1 = fighters.fighter1;
    }
    if (fighters.fighter2 && !result.participant2) {
      result.participant2 = fighters.fighter2;
    }
  }

  return result;
}

/**
 * Extract fighter names from UFC actual stats
 * Format might be: "Fighter1 def. Fighter2" or "Fighter1 vs Fighter2"
 */
function extractFightersFromStats(actualStats) {
  const result = {
    fighter1: null,
    fighter2: null
  };

  if (!actualStats) return result;

  // Try "def." pattern
  const defMatch = actualStats.match(/^(.+?)\s+def\.\s*(.+?)$/i);
  if (defMatch) {
    result.fighter1 = defMatch[1].trim();
    result.fighter2 = defMatch[2].trim();
    return result;
  }

  // Try "vs" pattern
  const vsMatch = actualStats.match(/^(.+?)\s+vs\.?\s*(.+?)$/i);
  if (vsMatch) {
    result.fighter1 = vsMatch[1].trim();
    result.fighter2 = vsMatch[2].trim();
  }

  return result;
}

/**
 * Normalize team name
 * Handles cases like "Illinois" -> could be full name
 */
function normalizeTeamName(name) {
  if (!name) return null;

  // Trim whitespace
  let normalized = name.trim();

  // Common team name normalizations could go here
  // For now, just return the trimmed name

  return normalized;
}

/**
 * Get league from sport
 */
function getLeague(sport) {
  return SPORT_TO_LEAGUE[sport] || sport;
}

/**
 * Check if sport is individual (not team-based)
 */
function isIndividualSport(sport) {
  return INDIVIDUAL_SPORTS.includes(sport);
}

module.exports = {
  buildGame,
  extractTeams,
  extractTeamsFromActualStats,
  extractIndividualParticipants,
  extractFightersFromStats,
  normalizeTeamName,
  getLeague,
  isIndividualSport,
  SPORT_TO_LEAGUE,
  INDIVIDUAL_SPORTS
};
