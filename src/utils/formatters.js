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
 * Format bet description for display
 */
export const formatBetDescription = (participant) => {
  const { betType, team, line, spread, overUnder, awayTeam, homeTeam, propType, player1, player2, player1PropType, player2PropType, playerTeam, playerPosition, favorite } = participant;

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
    const totalValue = participant.total !== undefined && participant.total !== '' ? participant.total : line;
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
