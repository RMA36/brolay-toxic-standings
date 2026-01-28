/**
 * Transform Pick - Core transformation function for Track 2 migration
 *
 * Transforms old pick structure to new unified entity-based structure.
 *
 * Old structure has confusing field names:
 *   - `player` = Big Guy (Management, CD, etc.)
 *   - `team` = sometimes team name, sometimes player name for props
 *   - `playerTeam` = actual team for player props
 *
 * New structure uses:
 *   - `bigGuy` = who made the pick
 *   - `entities[]` = array of teams/players involved
 *   - `game` = game identification info
 *   - `line` = structured line data
 *   - `outcome` = result with margin tracking
 */

const { buildEntities } = require('./entity-builder');
const { buildGame } = require('./game-builder');

/**
 * Generate a unique pick ID
 * Format: pick_[timestamp]_[random4chars]
 */
function generatePickId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 6);
  return `pick_${timestamp}_${random}`;
}

/**
 * Determine bet category from bet type
 * Categories help group related bet types for processing
 */
function determineBetCategory(betType) {
  const categoryMap = {
    // Standard game bets
    'Spread': 'standard',
    'Moneyline': 'standard',
    'Total': 'standard',
    'Team Total': 'teamTotal',

    // Player props
    'Player Prop': 'playerProp',
    'Prop Bet': 'playerProp',  // Legacy name, same as Player Prop

    // Multi-player props
    'H2H Prop': 'h2hProp',
    'Either Prop': 'eitherProp',
    'Combined Prop': 'combinedProp',

    // Team props
    'Team Prop': 'teamProp',
    'Game Prop': 'gameProp',

    // Period-specific
    'First Half Spread': 'firstHalf',
    'First Half Moneyline': 'firstHalf',
    'First Half Total': 'firstHalf',
    'First Half Team Total': 'firstHalfTeamTotal',
    'Quarter Moneyline': 'quarter',
    'Quarter Total': 'quarter',
    'Quarter Team Total': 'quarterTeamTotal',

    // Sport-specific
    'First Inning Runs': 'firstInningRuns'
  };

  return categoryMap[betType] || 'unknown';
}

/**
 * Build the line object from old pick data
 * Ensures value is always positive, direction indicates polarity
 */
function buildLine(oldPick) {
  const betType = oldPick.betType;
  const category = determineBetCategory(betType);

  const line = {
    type: determineLineType(betType, category),
    odds: oldPick.odds || null
  };

  // Handle spread bets
  if (betType.includes('Spread')) {
    const spreadValue = parseFloat(oldPick.spread) || 0;
    line.value = Math.abs(spreadValue);
    line.direction = oldPick.favorite === 'Dog' ? 'underdog' : 'favorite';
  }
  // Handle totals
  else if (betType.includes('Total') && !betType.includes('Team Total')) {
    line.value = parseFloat(oldPick.total) || parseFloat(oldPick.line) || 0;
    line.direction = oldPick.overUnder?.toLowerCase() || null;
  }
  // Handle team totals
  else if (betType.includes('Team Total')) {
    line.value = parseFloat(oldPick.total) || parseFloat(oldPick.line) || 0;
    line.direction = oldPick.overUnder?.toLowerCase() || null;
  }
  // Handle player props (including legacy "Prop Bet")
  else if (category === 'playerProp' || category === 'h2hProp' || category === 'combinedProp' || category === 'eitherProp') {
    line.value = parseFloat(oldPick.line) || 0;
    line.direction = oldPick.overUnder?.toLowerCase() || null;
    line.statType = oldPick.propType || null;
  }
  // Handle moneylines
  else if (betType.includes('Moneyline')) {
    line.value = null;  // Moneylines don't have a line value
    line.direction = oldPick.favorite === 'Dog' ? 'underdog' : 'favorite';
  }
  // Handle First Inning Runs
  else if (betType === 'First Inning Runs') {
    line.value = parseFloat(oldPick.line) || 0.5;
    line.direction = oldPick.yesNoRuns?.toLowerCase() || oldPick.overUnder?.toLowerCase() || null;
  }

  // Clean up null/undefined values
  Object.keys(line).forEach(key => {
    if (line[key] === undefined || line[key] === '') {
      line[key] = null;
    }
  });

  return line;
}

/**
 * Determine line type from bet type
 */
function determineLineType(betType, category) {
  if (betType.includes('Spread')) return 'spread';
  if (betType.includes('Total')) return 'total';
  if (betType.includes('Moneyline')) return 'moneyline';
  if (category === 'playerProp') return 'prop';
  if (category === 'h2hProp') return 'h2h';
  if (category === 'combinedProp') return 'combined';
  if (category === 'eitherProp') return 'either';
  if (betType === 'First Inning Runs') return 'firstInningRuns';
  return 'other';
}

/**
 * Build the outcome object from old pick data
 */
function buildOutcome(oldPick) {
  const outcome = {
    status: normalizeResult(oldPick.result),
    autoUpdated: oldPick.autoUpdated || false
  };

  // Add settled timestamp if auto-updated
  if (oldPick.autoUpdatedAt) {
    outcome.settledAt = oldPick.autoUpdatedAt;
  }

  // Parse actual stats if available
  if (oldPick.actualStats) {
    outcome.actualStats = oldPick.actualStats;

    // Try to calculate margin from actual stats
    const margin = calculateMargin(oldPick);
    if (margin !== null) {
      outcome.margin = margin;
    }
  }

  return outcome;
}

/**
 * Normalize result to standard status values
 */
function normalizeResult(result) {
  if (!result) return 'pending';

  const normalized = result.toLowerCase().trim();

  if (normalized === 'win' || normalized === 'won') return 'win';
  if (normalized === 'loss' || normalized === 'lost' || normalized === 'lose') return 'loss';
  if (normalized === 'push' || normalized === 'tie') return 'push';
  if (normalized === 'pending' || normalized === '') return 'pending';

  return 'pending';
}

/**
 * Calculate margin from actual stats
 * Returns positive number if won by X, negative if lost by X, null if can't calculate
 */
function calculateMargin(oldPick) {
  const betType = oldPick.betType;
  const actualStats = oldPick.actualStats;
  const result = oldPick.result?.toLowerCase();

  if (!actualStats) return null;

  // For moneylines, margin is null (no spread to beat)
  if (betType === 'Moneyline' || betType.includes('Moneyline')) {
    return null;
  }

  // Try to parse spread bets - format like "Team1 Score @ Team2 Score"
  if (betType.includes('Spread')) {
    const scoreMatch = actualStats.match(/(\d+)\s*[@vs]\s*.*?(\d+)/i);
    if (scoreMatch) {
      const score1 = parseInt(scoreMatch[1]);
      const score2 = parseInt(scoreMatch[2]);
      const spread = parseFloat(oldPick.spread) || 0;
      const isFavorite = oldPick.favorite !== 'Dog';

      // Determine which team was picked based on the team name in actualStats
      const pickedTeam = oldPick.team;
      const statsLower = actualStats.toLowerCase();
      const teamLower = pickedTeam?.toLowerCase() || '';

      // Check if picked team appears before @ (away team) or after
      const atIndex = statsLower.indexOf('@');
      const teamIndex = statsLower.indexOf(teamLower);

      let pickedScore, opponentScore;
      if (teamIndex < atIndex || atIndex === -1) {
        pickedScore = score1;
        opponentScore = score2;
      } else {
        pickedScore = score2;
        opponentScore = score1;
      }

      // Calculate margin: how much did they beat the spread by?
      const actualDiff = pickedScore - opponentScore;
      const spreadTocover = isFavorite ? -spread : spread;
      const margin = actualDiff - spreadTocover;

      return Math.round(margin * 10) / 10;  // Round to 1 decimal
    }
  }

  // Try to parse prop bets - format like "Stat Type: Value"
  if (betType === 'Prop Bet' || betType === 'Player Prop') {
    const statMatch = actualStats.match(/:\s*(-?\d+\.?\d*)/);
    if (statMatch) {
      const actualValue = parseFloat(statMatch[1]);
      const line = parseFloat(oldPick.line) || 0;
      const isOver = oldPick.overUnder?.toLowerCase() === 'over';

      if (isOver) {
        return Math.round((actualValue - line) * 10) / 10;
      } else {
        return Math.round((line - actualValue) * 10) / 10;
      }
    }
  }

  // Try to parse total bets
  if (betType === 'Total' || betType.includes('Total')) {
    const totalMatch = actualStats.match(/(\d+)\s*[@vs]\s*.*?(\d+)/i);
    if (totalMatch) {
      const combinedScore = parseInt(totalMatch[1]) + parseInt(totalMatch[2]);
      const line = parseFloat(oldPick.total) || parseFloat(oldPick.line) || 0;
      const isOver = oldPick.overUnder?.toLowerCase() === 'over';

      if (isOver) {
        return Math.round((combinedScore - line) * 10) / 10;
      } else {
        return Math.round((line - combinedScore) * 10) / 10;
      }
    }
  }

  return null;
}

/**
 * Main transformation function
 * Transforms an old pick structure to the new unified structure
 *
 * @param {Object} oldPick - The old pick data from participants
 * @param {string} brolayDate - The date of the brolay (YYYY-MM-DD)
 * @param {string} pickIndex - The original index in participants object
 * @returns {Object} The transformed pick with new structure
 */
function transformPick(oldPick, brolayDate, pickIndex) {
  const betCategory = determineBetCategory(oldPick.betType);

  const newPick = {
    // Core identification
    bigGuy: oldPick.player,  // Rename player -> bigGuy
    sport: oldPick.sport,
    betCategory: betCategory,
    betType: oldPick.betType,

    // Game identification
    game: buildGame(oldPick, brolayDate),

    // Entities involved (teams/players)
    entities: buildEntities(oldPick, betCategory),

    // Line information
    line: buildLine(oldPick),

    // Outcome tracking
    outcome: buildOutcome(oldPick),

    // Preserve original index for debugging
    _originalIndex: pickIndex
  };

  // Add odds source if present
  if (oldPick.oddsSource) {
    newPick.line.source = oldPick.oddsSource;
  }

  return newPick;
}

/**
 * Transform an entire brolay document
 *
 * @param {Object} oldBrolay - The old brolay document
 * @returns {Object} The transformed brolay with new structure
 */
function transformBrolay(oldBrolay) {
  const newBrolay = {
    // Keep the same ID
    id: oldBrolay.id,

    // Rename placedBy -> submittedBy
    submittedBy: oldBrolay.placedBy || '',

    // Keep date fields
    date: oldBrolay.date,
    dayOfWeek: oldBrolay.dayOfWeek,

    // Keep financial fields
    betAmount: oldBrolay.betAmount,
    totalPayout: oldBrolay.totalPayout,

    // Keep settlement status
    settled: oldBrolay.settled || false,
    settledAt: oldBrolay.settledAt || null,

    // Transform participants -> picks
    picks: {}
  };

  // Transform each participant/pick
  if (oldBrolay.participants) {
    Object.entries(oldBrolay.participants).forEach(([index, oldPick]) => {
      const pickId = generatePickId();
      newBrolay.picks[pickId] = transformPick(oldPick, oldBrolay.date, index);
    });
  }

  // Keep total participants count for validation
  newBrolay.totalPicks = Object.keys(newBrolay.picks).length;

  return newBrolay;
}

module.exports = {
  transformPick,
  transformBrolay,
  generatePickId,
  determineBetCategory,
  buildLine,
  buildOutcome,
  calculateMargin,
  normalizeResult
};
