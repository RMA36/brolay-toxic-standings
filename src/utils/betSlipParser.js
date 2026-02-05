/**
 * Bet Slip Parser
 * Parses OCR text from bet slip images into structured pick objects
 * Supports FanDuel, DraftKings, and other major sportsbook formats
 */

import { SPORTS, PICK_TYPES, PRELOADED_TEAMS, PRELOADED_PLAYERS, COMMON_PROP_TYPES } from '../constants/sports';

// Common sport keywords for detection
const SPORT_KEYWORDS = {
  NFL: ['nfl', 'football', 'chiefs', 'cowboys', 'eagles', 'bills', 'ravens', 'dolphins', 'lions', '49ers', 'packers', 'bears', 'steelers', 'patriots', 'jets', 'giants', 'broncos', 'raiders', 'chargers', 'rams', 'seahawks', 'cardinals', 'falcons', 'saints', 'panthers', 'bucs', 'buccaneers', 'titans', 'texans', 'colts', 'jaguars', 'bengals', 'browns', 'vikings', 'commanders'],
  NBA: ['nba', 'basketball', 'lakers', 'celtics', 'warriors', 'bulls', 'heat', 'knicks', 'nets', 'bucks', '76ers', 'sixers', 'suns', 'nuggets', 'mavs', 'mavericks', 'grizzlies', 'thunder', 'clippers', 'timberwolves', 'pelicans', 'rockets', 'spurs', 'jazz', 'kings', 'magic', 'pistons', 'pacers', 'hornets', 'hawks', 'blazers', 'raptors', 'wizards', 'cavaliers'],
  MLB: ['mlb', 'baseball', 'yankees', 'dodgers', 'astros', 'braves', 'mets', 'phillies', 'padres', 'cubs', 'red sox', 'cardinals', 'mariners', 'orioles', 'rangers', 'twins', 'guardians', 'rays', 'brewers', 'marlins', 'giants', 'athletics', 'angels', 'reds', 'royals', 'tigers', 'rockies', 'pirates', 'nationals', 'diamondbacks', 'white sox', 'blue jays'],
  NHL: ['nhl', 'hockey', 'bruins', 'oilers', 'panthers', 'avalanche', 'maple leafs', 'lightning', 'rangers', 'devils', 'hurricanes', 'penguins', 'stars', 'wild', 'jets', 'flames', 'predators', 'golden knights', 'kraken', 'canucks', 'sabres', 'senators', 'red wings', 'blackhawks', 'ducks', 'coyotes', 'kings', 'sharks', 'blues', 'canadiens', 'islanders', 'flyers', 'blue jackets'],
  'College Football': ['college football', 'ncaa football', 'cfb', 'ncaaf', 'alabama', 'georgia', 'ohio state', 'michigan', 'clemson', 'texas', 'usc', 'notre dame', 'lsu', 'florida', 'tennessee', 'oklahoma', 'penn state', 'oregon', 'washington'],
  'College Basketball': ['college basketball', 'ncaa basketball', 'cbb', 'ncaab', 'march madness', 'duke', 'north carolina', 'kansas', 'kentucky', 'villanova', 'gonzaga', 'ucla', 'purdue', 'arizona', 'houston', 'baylor', 'uconn'],
  Soccer: ['soccer', 'premier league', 'la liga', 'bundesliga', 'serie a', 'ligue 1', 'mls', 'arsenal', 'chelsea', 'liverpool', 'manchester', 'barcelona', 'real madrid', 'bayern', 'psg', 'juventus', 'inter milan'],
  UFC: ['ufc', 'mma', 'fight night', 'octagon']
};

// Bet type patterns
const BET_TYPE_PATTERNS = {
  spread: /spread|point spread|handicap|pts?\.?\s*spread/i,
  moneyline: /money\s*line|moneyline|ml|to win|match winner/i,
  total: /total|over\/under|o\/u|game total/i,
  playerProp: /player prop|player|passing|rushing|receiving|points|rebounds|assists|strikeouts|goals|saves|yards|touchdowns?|tds?|receptions|completions|attempts|interceptions|home runs?|hits|rbis?|threes|three pointers|blocks|steals/i,
  teamProp: /team prop|team total|team to score/i,
  firstHalf: /first half|1st half|1h|first-half/i,
  firstInning: /first inning|1st inning|yrfi|nrfi/i,
  quarter: /quarter|1q|2q|3q|4q|1st quarter|2nd quarter|3rd quarter|4th quarter/i
};

// Common team abbreviations to full names
const TEAM_ABBREVIATIONS = {
  // NFL
  'ARI': 'Arizona Cardinals', 'ATL': 'Atlanta Falcons', 'BAL': 'Baltimore Ravens',
  'BUF': 'Buffalo Bills', 'CAR': 'Carolina Panthers', 'CHI': 'Chicago Bears',
  'CIN': 'Cincinnati Bengals', 'CLE': 'Cleveland Browns', 'DAL': 'Dallas Cowboys',
  'DEN': 'Denver Broncos', 'DET': 'Detroit Lions', 'GB': 'Green Bay Packers',
  'HOU': 'Houston Texans', 'IND': 'Indianapolis Colts', 'JAX': 'Jacksonville Jaguars',
  'KC': 'Kansas City Chiefs', 'LV': 'Las Vegas Raiders', 'LAC': 'Los Angeles Chargers',
  'LAR': 'Los Angeles Rams', 'MIA': 'Miami Dolphins', 'MIN': 'Minnesota Vikings',
  'NE': 'New England Patriots', 'NO': 'New Orleans Saints', 'NYG': 'New York Giants',
  'NYJ': 'New York Jets', 'PHI': 'Philadelphia Eagles', 'PIT': 'Pittsburgh Steelers',
  'SF': 'San Francisco 49ers', 'SEA': 'Seattle Seahawks', 'TB': 'Tampa Bay Buccaneers',
  'TEN': 'Tennessee Titans', 'WAS': 'Washington Commanders',
  // NBA
  'BOS': 'Boston Celtics', 'BKN': 'Brooklyn Nets', 'CHA': 'Charlotte Hornets',
  'GSW': 'Golden State Warriors', 'LAL': 'Los Angeles Lakers', 'LAC': 'LA Clippers',
  'MEM': 'Memphis Grizzlies', 'MIL': 'Milwaukee Bucks', 'NYK': 'New York Knicks',
  'OKC': 'Oklahoma City Thunder', 'ORL': 'Orlando Magic', 'PHX': 'Phoenix Suns',
  'POR': 'Portland Trail Blazers', 'SAC': 'Sacramento Kings', 'SAS': 'San Antonio Spurs',
  'TOR': 'Toronto Raptors', 'UTA': 'Utah Jazz', 'WAS': 'Washington Wizards',
  // MLB (common ones)
  'NYY': 'New York Yankees', 'NYM': 'New York Mets', 'LAD': 'Los Angeles Dodgers',
  'LAA': 'Los Angeles Angels', 'STL': 'St. Louis Cardinals', 'CWS': 'Chicago White Sox',
  'TB': 'Tampa Bay Rays', 'TEX': 'Texas Rangers', 'SD': 'San Diego Padres',
};

/**
 * Parse OCR text into structured pick objects
 * @param {string} ocrText - Raw OCR text from bet slip
 * @param {Object} options - Parsing options
 * @returns {Array} Array of parsed pick objects
 */
export const parseBetSlipText = (ocrText, options = {}) => {
  const { learnedTeams = [], learnedPlayers = [] } = options;

  if (!ocrText || typeof ocrText !== 'string') {
    return [];
  }

  // Clean and normalize text
  const cleanedText = cleanOCRText(ocrText);
  const lines = cleanedText.split('\n').filter(line => line.trim());

  console.log('[BetSlipParser] Cleaned text lines:', lines);

  // Detect sportsbook format
  const format = detectSportsbookFormat(cleanedText);
  console.log('[BetSlipParser] Detected format:', format);

  // Parse based on detected format
  let picks = [];

  if (format === 'fanduel') {
    picks = parseFanDuelFormat(lines, { learnedTeams, learnedPlayers });
  } else if (format === 'draftkings') {
    picks = parseDraftKingsFormat(lines, { learnedTeams, learnedPlayers });
  } else {
    // Generic parsing
    picks = parseGenericFormat(lines, { learnedTeams, learnedPlayers });
  }

  // Post-process picks
  picks = picks.map(pick => ({
    ...pick,
    confidence: calculateConfidence(pick)
  }));

  console.log('[BetSlipParser] Parsed picks:', picks);
  return picks;
};

/**
 * Clean OCR text for better parsing
 */
const cleanOCRText = (text) => {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[^\S\n]+/g, ' ')  // Collapse spaces/tabs but PRESERVE newlines
    .replace(/\n{3,}/g, '\n\n') // Collapse excessive blank lines to max 2
    .replace(/[^\x00-\x7F\n]/g, '') // Remove non-ASCII but keep newlines
    // OCR corrections
    .replace(/([a-zA-Z])(-?\d)/g, '$1 $2') // Add space between letters and numbers (e.g., "lowa-25" → "lowa -25")
    .replace(/\b([+-]?)(\d{1,2})(5)\b/g, (match, sign, whole, five, offset, str) => {
      // Fix missing decimal in common spread values (e.g., "-25" → "-2.5", "35" → "3.5")
      // Only apply when the number looks like a spread (1-2 digits ending in 5)
      const prevContext = str.slice(Math.max(0, offset - 20), offset).toLowerCase();
      if (prevContext.match(/spread|[+-]/) || sign) {
        return `${sign}${whole}.${five}`;
      }
      return match;
    })
    .replace(/\blowa\b/gi, 'Iowa') // Common OCR: lowercase L misread for uppercase I
    .replace(/\blllinois\b/gi, 'Illinois') // Common OCR: lowercase L misread
    .replace(/\blndiana\b/gi, 'Indiana') // Common OCR: lowercase L misread
    .trim();
};

/**
 * Detect which sportsbook format the bet slip is from
 */
const detectSportsbookFormat = (text) => {
  const lowerText = text.toLowerCase();

  if (lowerText.includes('fanduel') || lowerText.includes('fan duel')) {
    return 'fanduel';
  }
  if (lowerText.includes('draftkings') || lowerText.includes('draft kings')) {
    return 'draftkings';
  }
  if (lowerText.includes('betmgm') || lowerText.includes('bet mgm')) {
    return 'betmgm';
  }
  if (lowerText.includes('caesars')) {
    return 'caesars';
  }

  return 'generic';
};

/**
 * Parse FanDuel format bet slips
 * FanDuel typically shows: "Sport | Bet Type" then "Team/Player Line" then "Odds"
 */
const parseFanDuelFormat = (lines, options) => {
  const picks = [];
  let currentPick = null;
  let currentSport = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lowerLine = line.toLowerCase();

    // Check for sport/bet type header (e.g., "NFL | Spread")
    const sportMatch = detectSportFromText(line);
    if (sportMatch) {
      currentSport = sportMatch;
    }

    // Check for bet type in line
    const betType = detectBetType(line);

    // Check for spread pattern: "Team Name -3.5" or "Team Name +7"
    const spreadMatch = line.match(/^(.+?)\s+([+-]?\d+\.?\d*)\s*$/);
    if (spreadMatch && !lowerLine.includes('over') && !lowerLine.includes('under')) {
      const teamName = spreadMatch[1].trim();
      const spreadValue = spreadMatch[2];

      currentPick = createBasePick();
      currentPick.sport = currentSport || detectSportFromTeam(teamName, options);
      currentPick.betType = 'Spread';
      currentPick.team = resolveTeamName(teamName, currentPick.sport, options);
      currentPick.spread = spreadValue.replace('+', '');
      currentPick.favorite = spreadValue.startsWith('-') ? 'Favorite' : 'Dog';

      // Look ahead for odds
      if (i + 1 < lines.length) {
        const oddsMatch = lines[i + 1].match(/\(?\s*([+-]\d+)\s*\)?/);
        if (oddsMatch) {
          currentPick.odds = oddsMatch[1];
          i++; // Skip odds line
        }
      }

      picks.push(currentPick);
      currentPick = null;
      continue;
    }

    // Check for total pattern: "Over 45.5" or "Under 220"
    const totalMatch = line.match(/(over|under)\s+(\d+\.?\d*)/i);
    if (totalMatch) {
      currentPick = createBasePick();
      currentPick.sport = currentSport || 'NFL';
      currentPick.betType = betType || 'Total';
      currentPick.overUnder = totalMatch[1].charAt(0).toUpperCase() + totalMatch[1].slice(1).toLowerCase();
      currentPick.total = totalMatch[2];

      // Look ahead for odds
      if (i + 1 < lines.length) {
        const oddsMatch = lines[i + 1].match(/\(?\s*([+-]\d+)\s*\)?/);
        if (oddsMatch) {
          currentPick.odds = oddsMatch[1];
          i++;
        }
      }

      picks.push(currentPick);
      currentPick = null;
      continue;
    }

    // Check for moneyline pattern: "Team Name" followed by odds
    const moneylineMatch = line.match(/^([A-Za-z\s.']+)$/);
    if (moneylineMatch && i + 1 < lines.length) {
      const nextLine = lines[i + 1];
      const oddsMatch = nextLine.match(/\(?\s*([+-]\d+)\s*\)?/);

      if (oddsMatch && !nextLine.match(/[+-]?\d+\.?\d+/)) {
        const teamName = moneylineMatch[1].trim();

        currentPick = createBasePick();
        currentPick.sport = currentSport || detectSportFromTeam(teamName, options);
        currentPick.betType = 'Moneyline';
        currentPick.team = resolveTeamName(teamName, currentPick.sport, options);
        currentPick.odds = oddsMatch[1];
        i++; // Skip odds line

        picks.push(currentPick);
        currentPick = null;
        continue;
      }
    }

    // Check for player prop pattern: "Player Name Over/Under X.X Stat Type"
    const propMatch = parsePlayerPropLine(line, currentSport, options);
    if (propMatch) {
      currentPick = propMatch;

      // Look ahead for odds
      if (i + 1 < lines.length) {
        const oddsMatch = lines[i + 1].match(/\(?\s*([+-]\d+)\s*\)?/);
        if (oddsMatch) {
          currentPick.odds = oddsMatch[1];
          i++;
        }
      }

      picks.push(currentPick);
      currentPick = null;
    }
  }

  return picks;
};

/**
 * Parse DraftKings format bet slips
 * DraftKings often shows bet info on single lines: "KC CHIEFS -3.5 (-110)"
 */
const parseDraftKingsFormat = (lines, options) => {
  const picks = [];
  let currentSport = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check for sport indicator
    const sportMatch = detectSportFromText(line);
    if (sportMatch) {
      currentSport = sportMatch;
    }

    // All-in-one spread pattern: "TEAM -3.5 (-110)"
    const allInOneSpread = line.match(/^(.+?)\s+([+-]?\d+\.?\d*)\s+\(([+-]\d+)\)/);
    if (allInOneSpread) {
      const teamName = allInOneSpread[1].trim();
      const spreadValue = allInOneSpread[2];
      const odds = allInOneSpread[3];

      const pick = createBasePick();
      pick.sport = currentSport || detectSportFromTeam(teamName, options);
      pick.betType = 'Spread';
      pick.team = resolveTeamName(teamName, pick.sport, options);
      pick.spread = spreadValue.replace('+', '');
      pick.favorite = spreadValue.startsWith('-') ? 'Favorite' : 'Dog';
      pick.odds = odds;

      picks.push(pick);
      continue;
    }

    // All-in-one total pattern: "Over 45.5 (-110)"
    const allInOneTotal = line.match(/(over|under)\s+(\d+\.?\d*)\s+\(([+-]\d+)\)/i);
    if (allInOneTotal) {
      const pick = createBasePick();
      pick.sport = currentSport || 'NFL';
      pick.betType = 'Total';
      pick.overUnder = allInOneTotal[1].charAt(0).toUpperCase() + allInOneTotal[1].slice(1).toLowerCase();
      pick.total = allInOneTotal[2];
      pick.odds = allInOneTotal[3];

      picks.push(pick);
      continue;
    }

    // All-in-one moneyline pattern: "TEAM (+150)"
    const allInOneMl = line.match(/^(.+?)\s+\(([+-]\d+)\)$/);
    if (allInOneMl && !allInOneMl[1].match(/[+-]?\d+\.?\d+/)) {
      const teamName = allInOneMl[1].trim();
      const odds = allInOneMl[2];

      const pick = createBasePick();
      pick.sport = currentSport || detectSportFromTeam(teamName, options);
      pick.betType = 'Moneyline';
      pick.team = resolveTeamName(teamName, pick.sport, options);
      pick.odds = odds;

      picks.push(pick);
      continue;
    }

    // Player prop pattern
    const propMatch = parsePlayerPropLine(line, currentSport, options);
    if (propMatch) {
      picks.push(propMatch);
    }
  }

  return picks;
};

/**
 * Parse generic/unknown format bet slips
 */
const parseGenericFormat = (lines, options) => {
  const picks = [];
  let currentSport = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Detect sport from line
    const sportMatch = detectSportFromText(line);
    if (sportMatch) {
      currentSport = sportMatch;
    }

    // Try spread pattern with or without odds
    const spreadWithOdds = line.match(/^(.+?)\s+([+-]?\d+\.?\d*)\s*(?:\(([+-]\d+)\))?$/);
    if (spreadWithOdds && !line.toLowerCase().includes('over') && !line.toLowerCase().includes('under')) {
      const teamName = spreadWithOdds[1].trim();

      // Skip if team name looks like odds or numbers only
      if (teamName.match(/^[+-]?\d+$/) || teamName.length < 2) continue;

      const pick = createBasePick();
      pick.sport = currentSport || detectSportFromTeam(teamName, options);
      pick.betType = 'Spread';
      pick.team = resolveTeamName(teamName, pick.sport, options);
      pick.spread = spreadWithOdds[2].replace('+', '');
      pick.favorite = spreadWithOdds[2].startsWith('-') ? 'Favorite' : 'Dog';
      if (spreadWithOdds[3]) {
        pick.odds = spreadWithOdds[3];
      }

      picks.push(pick);
      continue;
    }

    // Try total pattern
    const totalMatch = line.match(/(over|under)\s+(\d+\.?\d*)\s*(?:\(([+-]\d+)\))?/i);
    if (totalMatch) {
      const pick = createBasePick();
      pick.sport = currentSport || 'NFL';
      pick.betType = 'Total';
      pick.overUnder = totalMatch[1].charAt(0).toUpperCase() + totalMatch[1].slice(1).toLowerCase();
      pick.total = totalMatch[2];
      if (totalMatch[3]) {
        pick.odds = totalMatch[3];
      }

      picks.push(pick);
      continue;
    }

    // Try player prop pattern
    const propMatch = parsePlayerPropLine(line, currentSport, options);
    if (propMatch) {
      picks.push(propMatch);
    }
  }

  return picks;
};

/**
 * Parse a line for player prop information
 */
const parsePlayerPropLine = (line, sport, options) => {
  // Pattern: "Player Name Over/Under X.X Stat Type"
  const propPattern = /^(.+?)\s+(over|under)\s+(\d+\.?\d*)\s+(.+?)(?:\s*\(([+-]\d+)\))?$/i;
  const match = line.match(propPattern);

  if (match) {
    const playerName = match[1].trim();
    const overUnder = match[2];
    const lineValue = match[3];
    const propType = match[4].trim();
    const odds = match[5];

    // Skip if player name looks like a team or is too short
    if (playerName.length < 3) return null;

    const pick = createBasePick();
    pick.sport = sport || detectSportFromPropType(propType);
    pick.betType = 'Player Prop';
    pick.team = resolvePlayerName(playerName, pick.sport, options);
    pick.overUnder = overUnder.charAt(0).toUpperCase() + overUnder.slice(1).toLowerCase();
    pick.line = lineValue;
    pick.propType = normalizePropType(propType);
    if (odds) {
      pick.odds = odds;
    }

    return pick;
  }

  return null;
};

/**
 * Detect sport from text content
 */
const detectSportFromText = (text) => {
  const lowerText = text.toLowerCase();

  for (const [sport, keywords] of Object.entries(SPORT_KEYWORDS)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      return sport;
    }
  }

  return null;
};

/**
 * Detect sport from team name
 */
const detectSportFromTeam = (teamName, options) => {
  const normalizedTeam = teamName.toLowerCase();
  const allTeams = { ...PRELOADED_TEAMS };

  // Add learned teams
  if (options.learnedTeams) {
    allTeams.Learned = options.learnedTeams;
  }

  for (const [sport, teams] of Object.entries(allTeams)) {
    if (sport === 'Learned') continue;
    if (teams.some(team => {
      const normalizedKnown = team.toLowerCase();
      return normalizedKnown.includes(normalizedTeam) ||
             normalizedTeam.includes(normalizedKnown) ||
             normalizedTeam.includes(normalizedKnown.split(' ').pop()); // Match by last word (nickname)
    })) {
      return sport;
    }
  }

  return 'NFL'; // Default to NFL if unknown
};

/**
 * Detect sport from prop type
 */
const detectSportFromPropType = (propType) => {
  const lowerProp = propType.toLowerCase();

  if (lowerProp.includes('passing') || lowerProp.includes('rushing') ||
      lowerProp.includes('receiving') || lowerProp.includes('touchdown')) {
    return 'NFL';
  }
  if (lowerProp.includes('points') || lowerProp.includes('rebounds') ||
      lowerProp.includes('assists') || lowerProp.includes('three')) {
    return 'NBA';
  }
  if (lowerProp.includes('strikeout') || lowerProp.includes('hit') ||
      lowerProp.includes('home run') || lowerProp.includes('rbi')) {
    return 'MLB';
  }
  if (lowerProp.includes('goal') || lowerProp.includes('save') || lowerProp.includes('shot')) {
    return 'NHL';
  }

  return 'NFL';
};

/**
 * Detect bet type from text
 */
const detectBetType = (text) => {
  const lowerText = text.toLowerCase();

  for (const [type, pattern] of Object.entries(BET_TYPE_PATTERNS)) {
    if (pattern.test(lowerText)) {
      switch (type) {
        case 'spread': return 'Spread';
        case 'moneyline': return 'Moneyline';
        case 'total': return 'Total';
        case 'playerProp': return 'Player Prop';
        case 'teamProp': return 'Team Prop';
        case 'firstHalf': return 'First Half Spread'; // Will be refined
        case 'firstInning': return 'First Inning Runs';
        case 'quarter': return 'Quarter Moneyline'; // Will be refined
        default: return null;
      }
    }
  }

  return null;
};

/**
 * Resolve team name using abbreviations and fuzzy matching
 */
const resolveTeamName = (rawName, sport, options) => {
  const upperName = rawName.toUpperCase().trim();

  // Check abbreviations first
  if (TEAM_ABBREVIATIONS[upperName]) {
    return TEAM_ABBREVIATIONS[upperName];
  }

  // Try to find best match in preloaded teams
  const teamsForSport = PRELOADED_TEAMS[sport] || [];
  const allTeams = [...teamsForSport, ...(options.learnedTeams || [])];

  const match = fuzzyMatchTeam(rawName, allTeams);
  if (match) {
    return match;
  }

  // Return cleaned up original if no match found
  return rawName.trim();
};

/**
 * Resolve player name using fuzzy matching
 */
const resolvePlayerName = (rawName, sport, options) => {
  const playersForSport = PRELOADED_PLAYERS[sport] || [];
  const allPlayers = [...playersForSport, ...(options.learnedPlayers || [])];

  const match = fuzzyMatchPlayer(rawName, allPlayers);
  if (match) {
    return match;
  }

  // Return cleaned up original
  return rawName.trim();
};

/**
 * Fuzzy match team name
 */
const fuzzyMatchTeam = (search, teams) => {
  const normalizedSearch = search.toLowerCase().trim();

  // Exact match
  const exactMatch = teams.find(t => t.toLowerCase() === normalizedSearch);
  if (exactMatch) return exactMatch;

  // Starts with match
  const startsWithMatch = teams.find(t => t.toLowerCase().startsWith(normalizedSearch));
  if (startsWithMatch) return startsWithMatch;

  // Contains match
  const containsMatch = teams.find(t => t.toLowerCase().includes(normalizedSearch));
  if (containsMatch) return containsMatch;

  // Match by last word (team nickname)
  const searchWords = normalizedSearch.split(/\s+/);
  const lastWord = searchWords[searchWords.length - 1];
  if (lastWord.length > 3) {
    const nicknameMatch = teams.find(t => {
      const teamWords = t.toLowerCase().split(/\s+/);
      return teamWords[teamWords.length - 1] === lastWord;
    });
    if (nicknameMatch) return nicknameMatch;
  }

  return null;
};

/**
 * Fuzzy match player name
 */
const fuzzyMatchPlayer = (search, players) => {
  const normalizedSearch = search.toLowerCase().trim();

  // Exact match
  const exactMatch = players.find(p => p.toLowerCase() === normalizedSearch);
  if (exactMatch) return exactMatch;

  // Last name match
  const searchWords = normalizedSearch.split(/\s+/);
  const searchLastName = searchWords[searchWords.length - 1];

  const lastNameMatch = players.find(p => {
    const playerWords = p.toLowerCase().split(/\s+/);
    const playerLastName = playerWords[playerWords.length - 1];
    return playerLastName === searchLastName;
  });
  if (lastNameMatch) return lastNameMatch;

  // Contains match
  const containsMatch = players.find(p => p.toLowerCase().includes(normalizedSearch));
  if (containsMatch) return containsMatch;

  return null;
};

/**
 * Normalize prop type to standard format
 */
const normalizePropType = (propType) => {
  const lowerProp = propType.toLowerCase().trim();

  // Common mappings
  const mappings = {
    'pass yds': 'Passing Yards',
    'passing yds': 'Passing Yards',
    'rush yds': 'Rushing Yards',
    'rushing yds': 'Rushing Yards',
    'rec yds': 'Receiving Yards',
    'receiving yds': 'Receiving Yards',
    'pts': 'Points',
    'reb': 'Rebounds',
    'rebs': 'Rebounds',
    'ast': 'Assists',
    'asts': 'Assists',
    '3pm': 'Three Pointers Made',
    '3pt': 'Three Pointers Made',
    'so': 'Strikeouts',
    'k': 'Strikeouts',
    'hr': 'Home Runs'
  };

  if (mappings[lowerProp]) {
    return mappings[lowerProp];
  }

  // Check against common prop types
  const commonMatch = COMMON_PROP_TYPES.find(p => p.toLowerCase() === lowerProp);
  if (commonMatch) return commonMatch;

  // Title case the input
  return propType.split(' ').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
};

/**
 * Create a base pick object with default values
 */
const createBasePick = () => ({
  sport: 'NFL',
  betType: 'Spread',
  team: '',
  spread: '',
  favorite: 'Favorite',
  total: '',
  overUnder: 'Over',
  propType: '',
  line: '',
  odds: '',
  // These will be filled by user
  bigGuy: '',
  player: '',
  result: 'pending'
});

/**
 * Calculate confidence score for a parsed pick
 */
const calculateConfidence = (pick) => {
  let score = 0;

  // Has valid sport
  if (SPORTS.includes(pick.sport)) score += 20;

  // Has valid bet type
  if (PICK_TYPES.includes(pick.betType)) score += 20;

  // Has team/player name
  if (pick.team && pick.team.length > 2) score += 20;

  // Has appropriate fields for bet type
  if (pick.betType === 'Spread' && pick.spread) score += 20;
  if (pick.betType === 'Total' && pick.total) score += 20;
  if (pick.betType === 'Player Prop' && pick.propType && pick.line) score += 20;
  if (pick.betType === 'Moneyline') score += 20;

  // Has odds
  if (pick.odds) score += 20;

  // Determine confidence level
  if (score >= 80) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
};

/**
 * Format parsed pick for display
 */
export const formatParsedPick = (pick) => {
  let description = '';

  switch (pick.betType) {
    case 'Spread':
      description = `${pick.team} ${pick.favorite === 'Favorite' ? '-' : '+'}${pick.spread}`;
      break;
    case 'Moneyline':
      description = `${pick.team} ML`;
      break;
    case 'Total':
      description = `${pick.overUnder} ${pick.total}`;
      break;
    case 'Player Prop':
      description = `${pick.team} ${pick.overUnder} ${pick.line} ${pick.propType}`;
      break;
    default:
      description = `${pick.team} ${pick.betType}`;
  }

  if (pick.odds) {
    description += ` (${pick.odds})`;
  }

  return description;
};
