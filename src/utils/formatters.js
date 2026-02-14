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
 * Extract pick info from new schema into flat fields for display/logic
 * All data is now in the new schema (entities[], line{}, game{}, outcome{})
 * @param {Object} pick - Pick object (new schema)
 * @returns {Object} Flat pick info for display
 */
export const extractPickInfo = (pick) => {
  const info = {
    betType: pick.betType,
    team: '',
    line: '',
    spread: '',
    overUnder: '',
    awayTeam: '',
    homeTeam: '',
    propType: '',
    player1: '',
    player2: '',
    player1PropType: '',
    player2PropType: '',
    player1Team: '',
    player1Position: '',
    player2Team: '',
    player2Position: '',
    playerTeam: '',
    playerPosition: '',
    favorite: '',
    total: '',
    threeWayPick: pick.threeWayPick || ''
  };

  // Extract from entities array
  if (pick.entities && pick.entities.length > 0) {
    const primary = pick.entities.find(e => e.role === 'primary') || pick.entities[0];
    if (primary) {
      info.team = primary.name || '';
      if (primary.entityType === 'player') {
        info.playerTeam = primary.team || '';
        info.playerPosition = primary.position || '';
        info.player1 = primary.name || '';
        info.player1Team = primary.team || '';
        info.player1Position = primary.position || '';
        info.player1PropType = primary.statType || '';
      }
    }

    // For H2H/Either/Combined props with second entity
    if (pick.entities.length > 1) {
      const secondary = pick.entities.find(e => e.role === 'opponent' || e.role === 'secondary');
      if (secondary) {
        info.player2 = secondary.name || '';
        info.player2Team = secondary.team || '';
        info.player2Position = secondary.position || '';
        info.player2PropType = secondary.statType || '';
      }
    }

    // Home/away team roles for totals
    const homeEntity = pick.entities.find(e => e.role === 'home');
    const awayEntity = pick.entities.find(e => e.role === 'away');
    if (homeEntity) info.homeTeam = homeEntity.name;
    if (awayEntity) info.awayTeam = awayEntity.name;
  }

  // Extract from game object
  if (pick.game) {
    info.awayTeam = info.awayTeam || pick.game.awayTeam || '';
    info.homeTeam = info.homeTeam || pick.game.homeTeam || '';
  }

  // Extract from line object
  if (pick.line && typeof pick.line === 'object') {
    info.propType = pick.line.statType || '';
    info.player1PropType = info.player1PropType || pick.line.statType || '';
    info.player2PropType = info.player2PropType || pick.line.statType || '';

    const dir = (pick.line.direction || '').toLowerCase();
    if (dir === 'over' || dir === 'under') {
      info.overUnder = dir.charAt(0).toUpperCase() + dir.slice(1);
    } else if (dir === 'favorite' || dir === 'underdog') {
      info.favorite = dir === 'favorite' ? 'Favorite' : 'Dog';
    }

    const lineValue = pick.line.value;
    if (lineValue !== undefined) {
      if (pick.betType?.includes('Spread')) {
        info.spread = lineValue;
      } else if (pick.betType?.includes('Total')) {
        info.total = lineValue;
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
  } else if (betType === '3-Way Moneyline') {
    const pick = participant.threeWayPick || 'Home';
    return `3-Way ML (${pick})`;
  } else if (betType === 'Moneyline' || betType === 'First Half Moneyline' || betType === 'Quarter Moneyline') {
    return `ML`;
  } else if (betType === 'First Half Spread') {
    const spreadValue = spread !== undefined && spread !== '' ? spread : line;
    if (spreadValue === '' || spreadValue === undefined || spreadValue === null) {
      return `(No Spread)`;
    }
    const numSpread = parseFloat(spreadValue);
    const isFavorite = favorite === 'Favorite';
    const displaySpread = isFavorite ? -Math.abs(numSpread) : Math.abs(numSpread);
    return `1H ${displaySpread > 0 ? '+' : ''}${displaySpread}`;
  } else if (betType === 'Quarter Spread') {
    const spreadValue = spread !== undefined && spread !== '' ? spread : line;
    if (spreadValue === '' || spreadValue === undefined || spreadValue === null) {
      return `(No Spread)`;
    }
    const numSpread = parseFloat(spreadValue);
    const isFavorite = favorite === 'Favorite';
    const displaySpread = isFavorite ? -Math.abs(numSpread) : Math.abs(numSpread);
    return `Q ${displaySpread > 0 ? '+' : ''}${displaySpread}`;
  } else if (betType === 'Total' || betType === 'First Half Total' || betType === 'First Inning Runs' || betType === 'Quarter Total' || betType === 'Team Total' || betType === 'First Half Team Total' || betType === 'Quarter Team Total') {
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
 * Get Big Guy from pick (new schema: pick.bigGuy)
 */
export const getPickBigGuy = (pick) => pick.bigGuy || '';

/**
 * Get result from pick (new schema: pick.outcome.status)
 */
export const getPickResult = (pick) => pick.outcome?.status || '';

/**
 * Get actual stats from pick (new schema: pick.outcome.actualStats)
 */
export const getPickActualStats = (pick) => pick.outcome?.actualStats || '';

/**
 * Get picks array from parlay (new schema: parlay.picks is an object keyed by pickId)
 */
export const getPicksArray = (parlay) => {
  if (!parlay.picks) return [];
  if (typeof parlay.picks === 'object') {
    return Object.values(parlay.picks);
  }
  return [];
};

/**
 * Get submittedBy from parlay (new schema: parlay.submittedBy)
 */
export const getSubmittedBy = (parlay) => parlay.submittedBy || '';

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

/**
 * Get player position from pick (new schema: entities[].position)
 */
export const getPickPlayerPosition = (pick) => {
  if (pick.entities && pick.entities.length > 0) {
    const primary = pick.entities.find(e => e.role === 'primary' && e.entityType === 'player') ||
                    pick.entities.find(e => e.entityType === 'player');
    if (primary && primary.position) return primary.position;
  }
  return null;
};

/**
 * Get player team from pick (new schema: entities[].team)
 */
export const getPickPlayerTeam = (pick) => {
  if (pick.entities && pick.entities.length > 0) {
    const primary = pick.entities.find(e => e.role === 'primary' && e.entityType === 'player') ||
                    pick.entities.find(e => e.entityType === 'player');
    if (primary && primary.team) return primary.team;
  }
  return null;
};

/**
 * Get prop type from pick (new schema: line.statType)
 */
export const getPickPropType = (pick) => {
  if (pick.line && typeof pick.line === 'object' && pick.line.statType) return pick.line.statType;
  return null;
};

// ============================================================
// Schema Transformation — flat pick → new schema
// Used by Entry.jsx to write new schema to Firebase
//
// TODO: This is a bridge solution. The proper long-term fix is to
// refactor PickEntry.jsx to natively construct new schema objects
// (entities[], line{}, outcome{}, game{}) instead of flat fields.
// That would eliminate this transformation entirely. See:
// - PickEntry.jsx: build structured picks directly in form state
// - Entry.jsx: remove transformBrolayToNewSchema call
// - EditParlayModal: ensure edits write new schema fields
// ============================================================

/**
 * Determine bet category from betType string
 */
function determineBetCategory(betType) {
  const map = {
    'Spread': 'standard', 'Moneyline': 'standard', 'Total': 'standard',
    'Player Prop': 'playerProp', 'Prop Bet': 'playerProp',
    'Team Total': 'teamTotal',
    'First Half Spread': 'firstHalf', 'First Half Moneyline': 'firstHalf', 'First Half Total': 'firstHalf',
    'First Half Team Total': 'firstHalfTeamTotal',
    'Quarter Spread': 'quarter', 'Quarter Moneyline': 'quarter', 'Quarter Total': 'quarter',
    'Quarter Team Total': 'quarterTeamTotal',
    'First Inning Runs': 'firstInningRuns',
    'H2H Prop': 'h2hProp', 'Combined Prop': 'combinedProp', 'Either Prop': 'eitherProp',
    'Team Prop': 'teamProp', 'Game Prop': 'gameProp', '3-Way Moneyline': 'standard',
  };
  return map[betType] || 'unknown';
}

/**
 * Transform a flat-schema pick (from the entry form) to new structured schema.
 */
export function transformPickToNewSchema(flatPick, pickIndex) {
  const betCategory = determineBetCategory(flatPick.betType);

  // Build entities
  const entities = [];
  const isPropType = ['playerProp', 'h2hProp', 'combinedProp', 'eitherProp'].includes(betCategory)
    || flatPick.betType === 'Prop Bet' || flatPick.betType === 'Player Prop';

  if (isPropType && betCategory !== 'h2hProp' && betCategory !== 'combinedProp' && betCategory !== 'eitherProp') {
    entities.push({
      entityType: 'player',
      name: flatPick.team || flatPick.selectedPlayer || '',
      team: flatPick.playerTeam || '',
      position: flatPick.playerPosition || '',
      role: 'primary'
    });
  } else if (betCategory === 'h2hProp') {
    entities.push({
      entityType: 'player',
      name: flatPick.player1 || '',
      team: flatPick.player1Team || '',
      position: flatPick.player1Position || '',
      role: 'primary',
      statType: flatPick.player1PropType || ''
    });
    entities.push({
      entityType: 'player',
      name: flatPick.player2 || '',
      team: flatPick.player2Team || '',
      position: flatPick.player2Position || '',
      role: 'opponent',
      statType: flatPick.player2PropType || ''
    });
  } else if (betCategory === 'combinedProp' || betCategory === 'eitherProp') {
    entities.push({
      entityType: 'player',
      name: flatPick.player1 || '',
      team: flatPick.player1Team || '',
      position: flatPick.player1Position || '',
      role: 'primary'
    });
    entities.push({
      entityType: 'player',
      name: flatPick.player2 || '',
      team: flatPick.player2Team || '',
      position: flatPick.player2Position || '',
      role: 'secondary'
    });
  } else if (flatPick.betType === '3-Way Moneyline') {
    // 3-Way Moneyline: away/home teams go in game{}, entity stores the pick
    const pickLabel = flatPick.threeWayPick || 'Home';
    let entityName = pickLabel;
    if (pickLabel === 'Away' && flatPick.awayTeam) entityName = flatPick.awayTeam;
    else if (pickLabel === 'Home' && flatPick.homeTeam) entityName = flatPick.homeTeam;
    entities.push({
      entityType: 'team',
      name: entityName,
      role: 'primary'
    });
  } else {
    // Standard, Team Total, First Half, Quarter, etc.
    entities.push({
      entityType: 'team',
      name: flatPick.team || '',
      role: 'primary'
    });
  }

  // Determine line type
  let lineType = 'spread';
  if (['Total', 'First Half Total', 'Quarter Total'].includes(flatPick.betType)) lineType = 'total';
  else if (['Moneyline', 'First Half Moneyline', 'Quarter Moneyline', '3-Way Moneyline'].includes(flatPick.betType)) lineType = 'moneyline';
  else if (['Team Total', 'First Half Team Total', 'Quarter Team Total'].includes(flatPick.betType)) lineType = 'teamTotal';
  else if (isPropType) lineType = 'prop';
  else if (flatPick.betType === 'First Inning Runs') lineType = 'total';

  // Get line value
  const rawLine = parseFloat(flatPick.spread || flatPick.total || flatPick.line || flatPick.h2hLine || '0');

  // Determine direction
  let direction = '';
  if (flatPick.favorite) {
    direction = flatPick.favorite === 'Dog' ? 'underdog' : 'favorite';
  }
  if (flatPick.overUnder) direction = flatPick.overUnder.toLowerCase();

  // Build line object
  const line = {
    type: lineType,
    value: Math.abs(rawLine) || 0,
    direction: direction,
    odds: flatPick.odds || '',
    source: flatPick.oddsSource || '',
  };
  if (flatPick.propType) line.statType = flatPick.propType;

  // Build outcome
  const outcome = {
    status: (flatPick.result || 'pending').toLowerCase(),
    actualStats: flatPick.actualStats || '',
    autoUpdated: flatPick.autoUpdated || false,
    settledAt: flatPick.autoUpdatedAt || '',
  };

  // Build game
  const game = {
    date: flatPick.gameDate || '',
    awayTeam: flatPick.awayTeam || '',
    homeTeam: flatPick.homeTeam || '',
    espnGameId: flatPick.espnGameId || null,
    league: flatPick.sport || '',
  };

  const result = {
    bigGuy: flatPick.bigGuy || flatPick.player || '',
    sport: flatPick.sport || '',
    betCategory,
    betType: flatPick.betType,
    entities,
    line,
    outcome,
    game,
    _originalIndex: pickIndex,
  };

  // Preserve 3-Way Moneyline pick selection
  if (flatPick.threeWayPick) {
    result.threeWayPick = flatPick.threeWayPick;
  }

  // Preserve H2H-specific fields
  if (flatPick.selectedPlayer) {
    result.selectedPlayer = flatPick.selectedPlayer;
  }
  if (flatPick.h2hLineType) {
    result.h2hLineType = flatPick.h2hLineType;
  }

  // Preserve YRFI/NRFI selection
  if (flatPick.yesNoRuns) {
    result.yesNoRuns = flatPick.yesNoRuns;
  }

  // Preserve quarter/period selection
  if (flatPick.quarter) {
    result.quarter = flatPick.quarter;
  }

  return result;
}

/**
 * Flatten a new-schema pick into flat fields for PickEntry form editing.
 * Reverses transformPickToNewSchema — used by the edit modal.
 */
export const flattenPickForForm = (pick) => {
  const info = extractPickInfo(pick);

  // Reconstruct h2hLine from line.value for H2H props
  let h2hLine = '';
  if (pick.betType === 'H2H Prop' && pick.line && pick.line.value) {
    h2hLine = String(pick.line.value);
  }

  return {
    sport: pick.sport || '',
    betType: pick.betType || '',
    bigGuy: pick.bigGuy || '',
    betCategory: pick.betCategory || '',
    team: info.team || '',
    spread: info.spread !== undefined ? String(info.spread) : '',
    total: info.total !== undefined ? String(info.total) : '',
    line: info.line !== undefined ? String(info.line) : '',
    favorite: info.favorite || '',
    overUnder: info.overUnder || '',
    awayTeam: info.awayTeam || '',
    homeTeam: info.homeTeam || '',
    propType: info.propType || '',
    playerTeam: info.playerTeam || '',
    playerPosition: info.playerPosition || '',
    player1: info.player1 || '',
    player2: info.player2 || '',
    player1Team: info.player1Team || '',
    player2Team: info.player2Team || '',
    player1Position: info.player1Position || '',
    player2Position: info.player2Position || '',
    player1PropType: info.player1PropType || '',
    player2PropType: info.player2PropType || '',
    threeWayPick: pick.threeWayPick || '',
    odds: (pick.line && pick.line.odds) || '',
    oddsSource: (pick.line && pick.line.source) || '',
    // H2H-specific fields
    selectedPlayer: pick.selectedPlayer || '',
    h2hLine: h2hLine,
    h2hLineType: pick.h2hLineType || '',
    // YRFI/NRFI
    yesNoRuns: pick.yesNoRuns || '',
    // Quarter/Period
    quarter: pick.quarter || '',
    // Outcome fields flattened for PickEntry compatibility
    result: pick.outcome?.status || 'pending',
    actualStats: pick.outcome?.actualStats || '',
    autoUpdated: pick.outcome?.autoUpdated || false,
    manuallyOverridden: pick.outcome?.manuallyOverridden || false,
    // Preserve full outcome object for save handler
    outcome: pick.outcome || {},
  };
};

/**
 * Transform a full flat-schema brolay (from the entry form) to new structured schema.
 * Call this before addBrolay() to ensure data is written in the new format.
 */
export function transformBrolayToNewSchema(flatBrolay) {
  const participants = flatBrolay.participants || {};
  const entries = Object.entries(participants);
  const picks = {};

  entries.forEach(([key, pick], index) => {
    const pickId = `pick_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    picks[pickId] = transformPickToNewSchema(pick, index);
  });

  return {
    date: flatBrolay.date || '',
    dayOfWeek: flatBrolay.dayOfWeek || '',
    submittedBy: flatBrolay.submittedBy || flatBrolay.placedBy || '',
    betAmount: flatBrolay.betAmount || 0,
    totalPayout: flatBrolay.totalPayout || 0,
    totalPicks: entries.length,
    settled: flatBrolay.settled || false,
    settledAt: flatBrolay.settledAt || '',
    picks,
  };
}
