import { PROP_TYPE_VARIATIONS, ESPN_STAT_MAPPINGS } from '../constants/sports';

/**
 * Format date from yyyy-mm-dd to mm/dd/yyyy for display
 */
export const formatDateForDisplay = (dateStr) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${month}/${day}/${year}`;
};

/**
 * Convert mm/dd/yyyy to yyyy-mm-dd for storage
 */
export const formatDateForStorage = (dateStr) => {
  if (!dateStr) return '';
  if (dateStr.includes('-')) return dateStr; // Already in storage format
  const [month, day, year] = dateStr.split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

/**
 * Format calendar date to yyyy-mm-dd string
 */
export const formatCalendarDate = (year, month, day) => {
  const monthStr = String(month + 1).padStart(2, '0');
  const dayStr = String(day).padStart(2, '0');
  return `${year}-${monthStr}-${dayStr}`;
};

/**
 * Extract pick info supporting both old and new schema
 * @param {Object} pick - Pick object (old or new schema)
 * @returns {Object} Normalized pick info
 */
const extractPickInfo = (pick) => {
  // Start with direct field access (works for old schema)
  const info = {
    betType: pick.betType,
    team: pick.team,
    line: pick.line,
    spread: pick.spread,
    overUnder: pick.overUnder,
    awayTeam: pick.awayTeam,
    homeTeam: pick.homeTeam,
    propType: pick.propType,
    player1: pick.player1,
    player2: pick.player2,
    player1PropType: pick.player1PropType,
    player2PropType: pick.player2PropType,
    playerTeam: pick.playerTeam,
    playerPosition: pick.playerPosition,
    favorite: pick.favorite,
    total: pick.total
  };

  // New schema: extract from entities array
  if (pick.entities && pick.entities.length > 0) {
    const primary = pick.entities.find(e => e.role === 'primary') || pick.entities[0];
    if (primary) {
      if (primary.entityType === 'player') {
        info.team = info.team || primary.name; // Player name in old schema 'team' field
        info.playerTeam = info.playerTeam || primary.team;
        info.playerPosition = info.playerPosition || primary.position;
        info.player1 = info.player1 || primary.name;
        info.player1PropType = info.player1PropType || primary.statType;
      } else {
        info.team = info.team || primary.name;
      }
    }

    // For H2H/Either/Combined props with second entity
    if (pick.entities.length > 1) {
      const secondary = pick.entities.find(e => e.role === 'opponent' || e.role === 'secondary');
      if (secondary) {
        info.player2 = info.player2 || secondary.name;
        info.player2PropType = info.player2PropType || secondary.statType;
      }
    }

    // Home/away team roles for totals
    const homeTeam = pick.entities.find(e => e.role === 'home');
    const awayTeam = pick.entities.find(e => e.role === 'away');
    if (homeTeam) info.homeTeam = info.homeTeam || homeTeam.name;
    if (awayTeam) info.awayTeam = info.awayTeam || awayTeam.name;
  }

  // New schema: extract from game object
  if (pick.game) {
    info.awayTeam = info.awayTeam || pick.game.awayTeam;
    info.homeTeam = info.homeTeam || pick.game.homeTeam;
  }

  // New schema: extract from line object
  if (pick.line && typeof pick.line === 'object') {
    info.propType = info.propType || pick.line.statType;
    info.player1PropType = info.player1PropType || pick.line.statType;
    info.player2PropType = info.player2PropType || pick.line.statType;
    info.overUnder = info.overUnder || (pick.line.direction === 'over' ? 'Over' : pick.line.direction === 'under' ? 'Under' : info.overUnder);
    // For spreads, direction is 'favorite' or 'underdog'
    info.favorite = info.favorite || (pick.line.direction === 'underdog' ? 'Dog' : pick.line.direction === 'favorite' ? 'Favorite' : info.favorite);
    // Line value
    const lineValue = pick.line.value;
    if (lineValue !== undefined) {
      if (pick.betType?.includes('Spread')) {
        info.spread = info.spread !== undefined ? info.spread : lineValue;
      } else if (pick.betType?.includes('Total')) {
        info.total = info.total !== undefined ? info.total : lineValue;
      } else {
        info.line = lineValue;
      }
    }
  }

  return info;
};

/**
 * Format bet description for display (supports both old and new schema)
 */
export const formatBetDescription = (participant) => {
  // Extract info supporting both schemas
  const { betType, team, line, spread, overUnder, awayTeam, homeTeam, propType, player1, player2, player1PropType, player2PropType, playerTeam, playerPosition, favorite, total } = extractPickInfo(participant);

  if (betType === 'Spread') {
    // Use spread field if available, otherwise fall back to line
    const spreadValue = spread !== undefined && spread !== '' ? spread : line;
    if (spreadValue === '' || spreadValue === undefined || spreadValue === null) {
      return `(No Spread)`;
    }
    const numSpread = parseFloat(spreadValue);
    // Favorites get negative spreads, Dogs get positive spreads
    const isFavorite = favorite === 'Favorite';
    const displaySpread = isFavorite ? -Math.abs(numSpread) : Math.abs(numSpread);
    return `${displaySpread > 0 ? '+' : ''}${displaySpread}`;
  } else if (betType === 'Moneyline' || betType === 'First Half Moneyline' || betType === 'Quarter Moneyline') {
    return `ML`;
  } else if (betType === 'Total' || betType === 'First Half Total' || betType === 'First Inning Runs' || betType === 'Quarter Total') {
    // Don't duplicate team names - they're displayed separately
    // Use total field for totals, line field for other bet types
    const totalValue = total !== undefined && total !== '' ? total : line;
    return `${overUnder} ${totalValue}`;
  } else if (betType === 'Player Prop') {
    // Don't include player name (team field) since it's displayed separately as teamDisplay
    // Only show team/position context and prop details
    const teamInfo = playerTeam ? `(${playerTeam}${playerPosition ? ' ' + playerPosition : ''}) ` : '';
    return `${teamInfo}${propType} ${overUnder} ${line}`;
  } else if (betType === 'Team Prop') {
    // Team-based prop (team is already displayed separately)
    return `${propType} ${overUnder} ${line}`;
  } else if (betType === 'Game Prop') {
    // Game total/combined prop
    return `${awayTeam} @ ${homeTeam} ${propType} ${overUnder} ${line}`;
  } else if (betType === 'Prop Bet') {
    // Legacy prop bet format
    // Check if this is a player prop or team prop based on whether it has a propType
    // If team field is already displayed separately, don't duplicate it
    return `${propType} ${overUnder} ${line}`;
  } else if (betType === 'H2H Prop') {
    if (player1PropType === player2PropType) {
      return `${player1} vs ${player2} ${player1PropType}`;
    }
    return `${player1} ${player1PropType} vs ${player2} ${player2PropType}`;
  } else if (betType === 'Either Prop') {
    return `${player1} or ${player2} ${propType} ${overUnder} ${line}`;
  } else if (betType === 'Combined Prop') {
    return `${player1} + ${player2} ${propType} ${overUnder} ${line}`;
  }
  return 'Unknown Bet Type';
};

/**
 * Get Big Guy from pick (supports both schemas)
 */
export const getPickBigGuy = (pick) => pick.bigGuy || pick.player;

/**
 * Get result from pick (supports both schemas)
 */
export const getPickResult = (pick) => pick.outcome?.status || pick.result;

/**
 * Get actual stats from pick (supports both schemas)
 */
export const getPickActualStats = (pick) => pick.outcome?.actualStats || pick.actualStats;

/**
 * Get picks array from parlay (supports both schemas)
 * New schema: parlay.picks is an array
 * Old schema: parlay.participants is an object with keys
 */
export const getPicksArray = (parlay) => {
  // New schema: picks is already an array
  if (Array.isArray(parlay.picks)) {
    return parlay.picks;
  }
  // Old schema: participants is an object, convert to array
  if (parlay.participants && typeof parlay.participants === 'object') {
    return Object.values(parlay.participants);
  }
  // Fallback: check if picks is an object (shouldn't happen but be safe)
  if (parlay.picks && typeof parlay.picks === 'object') {
    return Object.values(parlay.picks);
  }
  return [];
};

/**
 * Get submittedBy from parlay (supports both schemas)
 */
export const getSubmittedBy = (parlay) => parlay.submittedBy || parlay.placedBy;

/**
 * Normalize player name for consistent matching
 */
export const normalizePlayerName = (name) => {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
};

/**
 * Normalize prop type for consistent matching
 */
export const normalizePropType = (propType) => {
  if (!propType) return '';
  const normalized = propType.toLowerCase().trim();

  const mappings = PROP_TYPE_VARIATIONS;

  // Check if input is already a canonical form
  if (mappings[normalized]) {
    return normalized;
  }

  // Check if input is a variation - find its canonical form
  for (const [canonical, variations] of Object.entries(mappings)) {
    if (variations.includes(normalized)) {
      return canonical;
    }
  }

  // Return as-is if no match found
  return normalized;
};

/**
 * Get stat value from ESPN stats array
 */
export const getStatValue = (stats, propType, sport, labels) => {
  if (!stats || !labels || !propType) return null;

  const statMappings = ESPN_STAT_MAPPINGS;

  const sportMappings = statMappings[sport] || {};
  const possibleLabels = sportMappings[propType] || [];

  if (propType === 'passing completions') {
    const index = labels.findIndex(label =>
      label === 'C/ATT' || label.toUpperCase() === 'COMP'
    );

    if (index !== -1 && stats[index] !== undefined) {
      const value = stats[index].toString().split('/')[0];
      const parsed = parseFloat(value);
      if (!isNaN(parsed)) return parsed;
    }
  }

  for (const possibleLabel of possibleLabels) {
    const index = labels.findIndex(label =>
      label.toUpperCase() === possibleLabel.toUpperCase() ||
      label.toUpperCase().includes(possibleLabel.toUpperCase())
    );

    if (index !== -1 && stats[index] !== undefined) {
      const value = parseFloat(stats[index]);
      if (!isNaN(value)) return value;
    }
  }

  return null;
};

/**
 * Get current Eastern Time date formatted as yyyy-mm-dd
 */
export const getCurrentETDate = () => {
  const etDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const year = etDate.getFullYear();
  const month = String(etDate.getMonth() + 1).padStart(2, '0');
  const day = String(etDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
