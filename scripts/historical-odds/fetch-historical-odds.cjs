/**
 * Historical Odds Backfill Script
 *
 * Fetches historical odds from The Odds API for all 2026 picks
 * Uses a SEPARATE paid API key (not the free tier key used for live Brolay submissions)
 *
 * Usage:
 *   node scripts/historical-odds/fetch-historical-odds.js                  # Dry run (no Firebase writes)
 *   node scripts/historical-odds/fetch-historical-odds.js --write          # Write results to Firebase
 *   node scripts/historical-odds/fetch-historical-odds.js --date 2026-01-18  # Single date only
 *
 * Reads picks from the local backup file, queries The Odds API historical endpoint,
 * and optionally updates Firebase with the found odds.
 */

const fs = require('fs');
const path = require('path');

// ============================================================
// Configuration
// ============================================================

const HISTORICAL_API_KEY = 'c518b9e36d186dc2a45bf3bf5e73eaed';
const BASE_URL = 'https://api.the-odds-api.com/v4';
const BACKUP_PATH = path.join(__dirname, '..', '..', 'backups', 'enriched-data.json');
const OUTPUT_PATH = path.join(__dirname, 'historical-odds-results.json');

// Bookmaker priority order
const PREFERRED_BOOKMAKERS = ['fanduel', 'draftkings'];

// Rate limiting: The Odds API allows ~30 requests/minute on paid plans
const DELAY_BETWEEN_REQUESTS_MS = 2500;
// Delay between date batches (to be safe)
const DELAY_BETWEEN_DATES_MS = 3000;

// Sport mapping (app name → Odds API key)
const SPORT_MAP = {
  'NFL': 'americanfootball_nfl',
  'NBA': 'basketball_nba',
  'MLB': 'baseball_mlb',
  'NHL': 'icehockey_nhl',
  'College Football': 'americanfootball_ncaaf',
  'College Basketball': 'basketball_ncaab',
  "College Basketball (Women's)": 'basketball_wncaab',
  'WNBA': 'basketball_wnba',
  'Soccer': 'soccer_usa_mls',
  "Soccer (Women's)": 'soccer_usa_nwsl',
  'College Baseball': 'baseball_ncaa'
};

// Prop type → Odds API market mapping (mirrors src/constants/sports.js)
const PROP_MAPPINGS = {
  // NFL
  'passing_yards': 'player_pass_yds',
  'passing_attempts': 'player_pass_attempts',
  'passing_completions': 'player_pass_completions',
  'passing_touchdowns': 'player_pass_tds',
  'interceptions_thrown': 'player_pass_interceptions',
  'rushing_yards': 'player_rush_yds',
  'rushing_attempts': 'player_rush_attempts',
  'rushing_touchdowns': 'player_rush_tds',
  'receiving_yards': 'player_reception_yds',
  'receptions': 'player_receptions',
  'receiving_touchdowns': 'player_reception_tds',
  'rushing_&_receiving_yards': 'player_rush_reception_yds',
  'anytime_touchdown_scorer': 'player_anytime_td',
  'first_touchdown_scorer': 'player_1st_td',
  'last_touchdown_scorer': 'player_last_td',
  'sacks': 'player_sacks',
  'tackles': 'player_solo_tackles',
  'field_goals': 'player_field_goals',
  'kicking_points': 'player_kicking_points',
  // NBA
  'points': 'player_points',
  'rebounds': 'player_rebounds',
  'assists': 'player_assists',
  'three_pointers_made': 'player_threes',
  'steals': 'player_steals',
  'blocks': 'player_blocks',
  'turnovers': 'player_turnovers',
  'points_+_rebounds': 'player_points_rebounds',
  'points_+_assists': 'player_points_assists',
  'rebounds_+_assists': 'player_rebounds_assists',
  'points_+_rebounds_+_assists': 'player_points_rebounds_assists',
  'blocks_+_steals': 'player_blocks_steals',
  'double_double': 'player_double_double',
  'triple_double': 'player_triple_double',
  // MLB
  'strikeouts': 'batter_strikeouts',
  'pitcher_strikeouts': 'pitcher_strikeouts',
  'hits': 'batter_hits',
  'total_bases': 'batter_total_bases',
  'home_runs': 'batter_home_runs',
  'rbis': 'batter_rbis',
  'runs': 'batter_runs_scored',
  'stolen_bases': 'batter_stolen_bases',
  'hits_allowed': 'pitcher_hits_allowed',
  'walks_allowed': 'pitcher_walks',
  'earned_runs_allowed': 'pitcher_earned_runs',
  'singles': 'batter_singles',
  'doubles': 'batter_doubles',
  'triples': 'batter_triples',
  'walks': 'batter_walks',
  'hits_runs_rbis': 'batter_hits_runs_rbis',
  // NHL
  'goals': 'player_goals',
  'shots_on_goal': 'player_shots_on_goal',
  'saves': 'player_total_saves',
  'power_play_points': 'player_power_play_points',
  'blocked_shots': 'player_blocked_shots',
  'anytime_goal_scorer': 'player_goal_scorer_anytime',
  'first_goal_scorer': 'player_goal_scorer_first',
  'last_goal_scorer': 'player_goal_scorer_last'
};

// Player-to-team lookup for Prop Bet picks that lack playerTeam
// Built from the actual 2026 picks in the backup data
// This covers NFL players from Jan 2026 playoff/regular season games
const PLAYER_TEAM_LOOKUP = {
  // NFL - NFC West
  'George Kittle': 'San Francisco 49ers',
  'Christian McCaffrey': 'San Francisco 49ers',
  'Sam Darnold': 'San Francisco 49ers',
  'Brock Purdy': 'San Francisco 49ers',
  'Cooper Kupp': 'Los Angeles Rams',
  'Kyren Williams': 'Los Angeles Rams',
  'Colston Loveland': 'Los Angeles Rams',
  'Jaxon Smith-Njigba': 'Seattle Seahawks',
  'Tetairoa McMillan': 'Arizona Cardinals',
  // NFL - NFC South
  'Baker Mayfield': 'Tampa Bay Buccaneers',
  'Cade Otton': 'Tampa Bay Buccaneers',
  'Bryce Young': 'Carolina Panthers',
  'Chuba Hubbard': 'Carolina Panthers',
  'Adam Thielen': 'Carolina Panthers',
  // NFL - NFC North
  'Caleb Williams': 'Chicago Bears',
  'Jordan Love': 'Green Bay Packers',
  // NFL - NFC East
  'Jalen Hurts': 'Philadelphia Eagles',
  'DeVonta Smith': 'Philadelphia Eagles',
  'Kenneth Gainwell': 'Philadelphia Eagles',
  // NFL - AFC West
  'Justin Herbert': 'Los Angeles Chargers',
  'Bo Nix': 'Denver Broncos',
  'Courtland Sutton': 'Denver Broncos',
  // NFL - AFC East
  'Josh Allen': 'Buffalo Bills',
  'Dalton Kincaid': 'Buffalo Bills',
  'Khalil Shakir': 'Buffalo Bills',
  'Nico Collins': 'Houston Texans',
  'Cade Stover': 'Houston Texans',
  'Hunter Henry': 'New England Patriots',
  'Kayshon Boutte': 'New England Patriots',
  // NFL - AFC South
  'Derrick Henry': 'Baltimore Ravens',
  'Lamar Jackson': 'Baltimore Ravens',
  'Zay Flowers': 'Baltimore Ravens',
  'Marquez Valdes-Scantling': 'Baltimore Ravens',
  'Tony Pollard': 'Tennessee Titans',
  'TreVeyon Henderson': 'Cincinnati Bengals',
  'Tyler Higbee': 'Los Angeles Chargers',
  'Parker Washington': 'Jacksonville Jaguars',
  'Jayden Higgins': 'Houston Texans',
  'Brian Robinson Jr.': 'Washington Commanders',
  'Kyle Juszczyk': 'San Francisco 49ers',
  // NFL - AFC North
  'Kyle Monangai': 'New York Giants',
  'Ladd McConkey': 'Los Angeles Chargers',
  'Stefon Diggs': 'Houston Texans',
  'Trevor Lawrence': 'Jacksonville Jaguars',
  // College Football
  'Carson Beck': 'Georgia',
  'Fernando Mendoza': 'California',
  'Jeremiah McClellan': 'SMU',
  'Gary Bryant': 'Ohio State',
};

// ============================================================
// Utility Functions
// ============================================================

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const normalizePropType = (propType) => {
  if (!propType) return '';
  return propType.toLowerCase().replace(/\s+/g, '_').replace(/[()]/g, '');
};

const normalizePlayerName = (name) => {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/'/g, "'")
    .replace(/\s+(jr|sr|ii|iii|iv|v)$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const playerNamesMatch = (pickName, apiName) => {
  const normPick = normalizePlayerName(pickName);
  const normApi = normalizePlayerName(apiName);

  if (normPick === normApi) return true;
  if (normApi.includes(normPick) || normPick.includes(normApi)) return true;

  const pickParts = normPick.split(' ');
  const apiParts = normApi.split(' ');

  if (pickParts.length >= 2 && apiParts.length >= 2) {
    const pickLast = pickParts[pickParts.length - 1];
    const apiLast = apiParts[apiParts.length - 1];

    if (pickLast === apiLast) {
      const pickFirst = pickParts[0];
      const apiFirst = apiParts[0];
      if (pickFirst.length <= 2 && apiFirst.startsWith(pickFirst[0])) return true;
      if (apiFirst.length <= 2 && pickFirst.startsWith(apiFirst[0])) return true;
      if (pickFirst[0] === apiFirst[0]) return true;
    }
  }

  return false;
};

/**
 * Team name matching (mirrors useESPN.js matchTeamName)
 */
const matchTeamName = (betTeam, apiTeam) => {
  if (!betTeam || !apiTeam) return false;

  const normalize = (name) => name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const normalizedBet = normalize(betTeam);
  const normalizedApi = normalize(apiTeam);

  if (normalizedBet === normalizedApi) return true;

  // Filter out common filler words AND single-character fragments (e.g. "a" from "A&M")
  const commonWords = ['university', 'college', 'of', 'the'];
  const filterWords = (str) => str.split(' ').filter(word => word.length > 1 && !commonWords.includes(word));

  const betWords = filterWords(normalizedBet);
  const apiWords = filterWords(normalizedApi);

  // If either side has no meaningful words after filtering, can't match
  if (betWords.length === 0 || apiWords.length === 0) return false;

  // For single-word bet names (common in college sports), apply strict disambiguation
  const apiAllWords = normalizedApi.split(' ').filter(w => w.length > 1);
  if (betWords.length === 1) {
    const betWord = betWords[0];
    const apiIdx = apiAllWords.indexOf(betWord);

    // Prevent "Michigan" matching "Michigan State"
    if (apiIdx >= 0 && apiIdx + 1 < apiAllWords.length && apiAllWords[apiIdx + 1] === 'state') {
      return false;
    }

    // Prevent "Alabama" matching "Alabama A&M" (normalized: "alabama am")
    // Prevent "Illinois" matching "Eastern Illinois"
    const locationModifiers = ['am', 'state', 'tech'];
    const qualifiers = ['eastern', 'western', 'northern', 'southern', 'central', 'north', 'south', 'southeast', 'southwest'];

    if (apiIdx === 0 && apiAllWords.length > 1 && locationModifiers.includes(apiAllWords[1])) {
      return false;
    }
    if (apiIdx > 0 && qualifiers.includes(apiAllWords[apiIdx - 1])) {
      return false;
    }
  }

  // All bet words must match at least one API word
  // Use minimum length of 3 for substring matching to avoid false positives
  return betWords.every(word =>
    apiWords.some(apiWord => {
      if (apiWord === word) return true; // Exact word match
      // Substring match only for words >= 3 characters
      if (word.length >= 3 && apiWord.length >= 3) {
        return apiWord.includes(word) || word.includes(apiWord);
      }
      return false;
    })
  );
};

// ============================================================
// API Functions
// ============================================================

let apiCallCount = 0;
let remainingRequests = null;

/**
 * Fetch from The Odds API with rate limiting and quota tracking
 */
const apiFetch = async (url) => {
  apiCallCount++;
  const response = await fetch(url);

  // Track remaining quota from response headers
  const remaining = response.headers.get('x-requests-remaining');
  const used = response.headers.get('x-requests-used');
  if (remaining) remainingRequests = parseInt(remaining);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API ${response.status}: ${text}`);
  }

  return response.json();
};

/**
 * Fetch historical events for a sport on a given date
 * Uses the historical events endpoint with a timestamp near game time
 */
const fetchHistoricalEvents = async (sport, gameDate) => {
  const oddsApiSport = SPORT_MAP[sport];
  if (!oddsApiSport) return null;

  // Use noon on the game day as our snapshot time
  const snapshotDate = `${gameDate}T12:00:00Z`;

  const url = `${BASE_URL}/historical/sports/${oddsApiSport}/events?apiKey=${HISTORICAL_API_KEY}&date=${snapshotDate}`;

  try {
    const result = await apiFetch(url);
    return result.data || [];
  } catch (err) {
    console.error(`  ❌ Events fetch failed for ${sport} on ${gameDate}: ${err.message}`);
    return null;
  }
};

/**
 * Fetch historical odds for a specific event
 */
const fetchHistoricalEventOdds = async (sport, eventId, markets, gameDate) => {
  const oddsApiSport = SPORT_MAP[sport];
  if (!oddsApiSport) return null;

  // Snapshot a few hours before typical game times
  const snapshotDate = `${gameDate}T12:00:00Z`;

  const url = `${BASE_URL}/historical/sports/${oddsApiSport}/events/${eventId}/odds?apiKey=${HISTORICAL_API_KEY}&regions=us&markets=${markets.join(',')}&oddsFormat=american&date=${snapshotDate}`;

  try {
    const result = await apiFetch(url);
    return result.data || null;
  } catch (err) {
    console.error(`  ❌ Odds fetch failed for event ${eventId}: ${err.message}`);
    return null;
  }
};

// ============================================================
// Matching Logic (mirrors useOdds.js Phase 1 improvements)
// ============================================================

/**
 * Select best bookmaker from available options
 */
const selectBookmaker = (bookmakers) => {
  if (!bookmakers || bookmakers.length === 0) return null;

  for (const preferredKey of PREFERRED_BOOKMAKERS) {
    const bk = bookmakers.find(b => b.key === preferredKey && b.markets && b.markets.length > 0);
    if (bk) {
      const name = preferredKey === 'fanduel' ? 'FanDuel'
        : preferredKey === 'draftkings' ? 'DraftKings'
        : bk.title || bk.key;
      return { bookmaker: bk, bookmakerName: name };
    }
  }

  const fallback = bookmakers.find(b => b.markets && b.markets.length > 0);
  if (fallback) return { bookmaker: fallback, bookmakerName: fallback.title || fallback.key };

  return null;
};

/**
 * Try matching across all bookmakers, preferring FanDuel > DraftKings > others
 */
const tryAllBookmakers = (bookmakers, matchFn) => {
  const selected = selectBookmaker(bookmakers);
  if (!selected) return null;

  // Try preferred first
  const primaryResult = matchFn(selected.bookmaker);
  if (primaryResult) return { ...primaryResult, bookmaker: selected.bookmakerName };

  // Try all others
  for (const bk of bookmakers) {
    if (bk.key === selected.bookmaker.key) continue;
    if (!bk.markets || bk.markets.length === 0) continue;
    const result = matchFn(bk);
    if (result) return { ...result, bookmaker: bk.title || bk.key };
  }

  return null;
};

/**
 * Extract the line value from a pick (new schema: pick.line.value)
 */
const getPickLine = (pick) => {
  // New schema: line value is always in pick.line.value
  const lineVal = pick.line && pick.line.value;
  return parseFloat(lineVal || '0');
};

/**
 * Determine which Odds API markets to request for a bet type
 * New schema: statType is in pick.line.statType
 */
const getMarkets = (pick) => {
  const betType = pick.betType;
  // New schema: statType is in pick.line.statType
  const statType = (pick.line && pick.line.statType) || '';

  const marketMap = {
    'Spread': ['spreads'],
    'First Half Spread': ['spreads_first_half'],
    'Quarter Spread': ['spreads_quarter'],
    'Moneyline': ['h2h'],
    'First Half Moneyline': ['h2h_first_half'],
    'Quarter Moneyline': ['h2h_quarter'],
    'Total': ['totals'],
    'First Half Total': ['totals_first_half'],
    'Quarter Total': ['totals_quarter'],
    'Team Total': ['team_totals'],
    'First Half Team Total': ['team_totals_first_half'],
    'Quarter Team Total': ['team_totals_quarter'],
    'First Inning Runs': ['totals'],
    '3-Way Moneyline': ['h2h_3_way'],
  };

  if (marketMap[betType]) return marketMap[betType];

  // Player props (Prop Bet, Player Prop, H2H Prop, Combined Prop, Either Prop)
  if (['Prop Bet', 'Player Prop', 'H2H Prop', 'Combined Prop', 'Either Prop'].includes(betType)) {
    const normalized = normalizePropType(statType);
    const market = PROP_MAPPINGS[normalized];
    if (market) return [market];
    return null;
  }

  if (betType === 'Team Prop' || betType === 'Game Prop') {
    return ['team_totals'];
  }

  return null;
};

/**
 * Resolve a player name to their team using the lookup table
 */
const resolvePlayerTeam = (playerName) => {
  if (!playerName) return null;
  // Direct lookup
  if (PLAYER_TEAM_LOOKUP[playerName]) return PLAYER_TEAM_LOOKUP[playerName];
  // Case-insensitive lookup
  const lower = playerName.toLowerCase();
  for (const [name, team] of Object.entries(PLAYER_TEAM_LOOKUP)) {
    if (name.toLowerCase() === lower) return team;
  }
  return null;
};

/**
 * Helper: extract key fields from new schema pick for matching
 */
const getPickMatchInfo = (pick) => {
  const entities = pick.entities || [];
  const game = pick.game || {};
  const entity0 = entities[0] || {};
  const entity1 = entities[1] || {};

  return {
    // Primary entity name (team for standard, player for props)
    entityName: entity0.name || '',
    entityTeam: entity0.team || '',
    entityType: entity0.entityType || '',
    // Second entity (for H2H/Combined props)
    entity1Name: entity1.name || '',
    entity1Team: entity1.team || '',
    // Game info
    awayTeam: game.awayTeam || '',
    homeTeam: game.homeTeam || '',
    // Line info
    direction: (pick.line && pick.line.direction) || '',
  };
};

/**
 * Find the matching event from historical events list
 * Updated: reads from new schema (entities[], game{})
 */
const findMatchingEvent = (pick, events) => {
  const betType = pick.betType;
  const info = getPickMatchInfo(pick);

  const isTotalType = ['Total', 'First Half Total', 'Quarter Total', 'First Inning Runs',
    'Game Prop', 'Team Total', 'First Half Team Total', 'Quarter Team Total'].includes(betType);
  const isPropType = ['Player Prop', 'Prop Bet', 'H2H Prop', 'Either Prop', 'Combined Prop'].includes(betType);

  for (const event of events) {
    if (isTotalType) {
      // Try game.awayTeam / game.homeTeam first
      if (info.awayTeam && info.homeTeam && matchTeamName(info.awayTeam, event.away_team) && matchTeamName(info.homeTeam, event.home_team)) {
        return event;
      }
      // Try entity name (team name for standard picks)
      if (info.entityName && (matchTeamName(info.entityName, event.home_team) || matchTeamName(info.entityName, event.away_team))) {
        return event;
      }
    } else if (isPropType) {
      // Build a list of team names to try, in priority order
      const teamsToTry = [];

      // 1. Entity team (enriched player team)
      if (info.entityTeam) teamsToTry.push(info.entityTeam);

      // 2. Lookup from player-team mapping (fallback)
      if (info.entityName) {
        const resolved = resolvePlayerTeam(info.entityName);
        if (resolved && !teamsToTry.includes(resolved)) teamsToTry.push(resolved);
      }

      // 3. For H2H/Combined: try second entity team
      if (info.entity1Team) teamsToTry.push(info.entity1Team);
      if (info.entity1Name) {
        const resolved = resolvePlayerTeam(info.entity1Name);
        if (resolved && !teamsToTry.includes(resolved)) teamsToTry.push(resolved);
      }

      // Try each team against events
      for (const teamName of teamsToTry) {
        for (const event of events) {
          if (matchTeamName(teamName, event.home_team) || matchTeamName(teamName, event.away_team)) {
            return event;
          }
        }
      }

      return null; // Already iterated all events above
    } else {
      // Spread, Moneyline, etc. — entity name is the team
      if (info.entityName && (matchTeamName(info.entityName, event.home_team) || matchTeamName(info.entityName, event.away_team))) {
        return event;
      }
    }
  }

  return null;
};

/**
 * Extract odds from historical odds data for a given pick
 * Updated: reads from new schema (entities[], line{}, game{})
 */
const extractOdds = (pick, oddsData, matchingEvent) => {
  const betType = pick.betType;
  const info = getPickMatchInfo(pick);
  // Capitalize first letter for matching Odds API outcome names ("Over"/"Under")
  const rawDirection = info.direction || '';
  const direction = rawDirection.charAt(0).toUpperCase() + rawDirection.slice(1).toLowerCase();
  const pickLine = getPickLine(pick);

  if (!oddsData || !oddsData.bookmakers) return null;

  // --- SPREAD ---
  if (['Spread', 'First Half Spread', 'Quarter Spread'].includes(betType)) {
    const marketKey = betType === 'Spread' ? 'spreads'
      : betType === 'First Half Spread' ? 'spreads_first_half' : 'spreads_quarter';

    return tryAllBookmakers(oddsData.bookmakers, (bk) => {
      const market = bk.markets.find(m => m.key === marketKey);
      if (!market) return null;

      const pickedTeamIsHome = matchTeamName(info.entityName, matchingEvent.home_team);
      const pickedTeamName = pickedTeamIsHome ? matchingEvent.home_team : matchingEvent.away_team;
      const outcome = market.outcomes.find(o => o.name === pickedTeamName);
      if (!outcome) return null;

      const apiPoint = parseFloat(outcome.point);
      const expectedPoint = direction === 'Favorite'
        ? -Math.abs(pickLine) : Math.abs(pickLine);
      const diff = Math.abs(apiPoint - expectedPoint);

      if (diff <= 3) {
        return { odds: outcome.price, point: apiPoint, lineMoved: diff > 0.5 };
      }
      return null;
    });
  }

  // --- MONEYLINE ---
  if (['Moneyline', 'First Half Moneyline', 'Quarter Moneyline', '3-Way Moneyline'].includes(betType)) {
    const marketKey = betType === 'Moneyline' ? 'h2h'
      : betType === '3-Way Moneyline' ? 'h2h_3_way'
      : betType === 'First Half Moneyline' ? 'h2h_first_half' : 'h2h_quarter';

    return tryAllBookmakers(oddsData.bookmakers, (bk) => {
      const market = bk.markets.find(m => m.key === marketKey);
      if (!market) return null;

      const pickedTeamIsHome = matchTeamName(info.entityName, matchingEvent.home_team);
      const pickedTeamName = pickedTeamIsHome ? matchingEvent.home_team : matchingEvent.away_team;
      const outcome = market.outcomes.find(o => o.name === pickedTeamName);

      if (outcome) return { odds: outcome.price, lineMoved: false };
      return null;
    });
  }

  // --- TOTAL ---
  if (['Total', 'First Half Total', 'Quarter Total', 'First Inning Runs'].includes(betType)) {
    const marketKey = betType === 'Total' || betType === 'First Inning Runs' ? 'totals'
      : betType === 'First Half Total' ? 'totals_first_half' : 'totals_quarter';

    return tryAllBookmakers(oddsData.bookmakers, (bk) => {
      const market = bk.markets.find(m => m.key === marketKey);
      if (!market) return null;

      // direction is "Over" or "Under" for totals
      const matching = market.outcomes.filter(o => o.name === direction);
      if (matching.length === 0) return null;

      const sorted = matching
        .map(o => ({ ...o, diff: Math.abs(parseFloat(o.point) - pickLine) }))
        .sort((a, b) => a.diff - b.diff);

      if (sorted[0].diff <= 4) {
        return { odds: sorted[0].price, point: sorted[0].point, lineMoved: sorted[0].diff > 0.5 };
      }
      return null;
    });
  }

  // --- TEAM TOTAL ---
  if (['Team Total', 'First Half Team Total', 'Quarter Team Total', 'Team Prop', 'Game Prop'].includes(betType)) {
    const marketKey = betType.includes('First Half') ? 'team_totals_first_half'
      : betType.includes('Quarter') ? 'team_totals_quarter' : 'team_totals';

    return tryAllBookmakers(oddsData.bookmakers, (bk) => {
      const market = bk.markets.find(m => m.key === marketKey);
      if (!market) return null;

      // direction is "Over" or "Under" for team totals
      const matching = market.outcomes.filter(o => o.name === direction);
      if (matching.length === 0) return null;

      const sorted = matching
        .map(o => ({ ...o, diff: Math.abs(parseFloat(o.point) - pickLine) }))
        .sort((a, b) => a.diff - b.diff);

      if (sorted[0].diff <= 4) {
        return { odds: sorted[0].price, point: sorted[0].point, lineMoved: sorted[0].diff > 0.5 };
      }
      return null;
    });
  }

  // --- PLAYER PROPS (Prop Bet, Player Prop) ---
  if (['Prop Bet', 'Player Prop'].includes(betType)) {
    // New schema: player name is in entities[0].name
    const playerName = info.entityName;

    return tryAllBookmakers(oddsData.bookmakers, (bk) => {
      const market = bk.markets[0];
      if (!market || !market.outcomes) return null;

      let bestMatch = null;
      let bestDiff = Infinity;

      for (const outcome of market.outcomes) {
        if (!outcome.description) continue;
        if (!playerNamesMatch(playerName, outcome.description)) continue;
        // direction is "Over" or "Under" for props
        if (direction && outcome.name !== direction) continue;

        const diff = Math.abs(parseFloat(outcome.point) - pickLine);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestMatch = { odds: outcome.price, point: outcome.point, playerFound: outcome.description, lineMoved: diff > 0.5, diff };
        }
      }

      if (bestMatch && bestMatch.diff <= 3) return bestMatch;
      return null;
    });
  }

  // --- H2H PROP ---
  if (betType === 'H2H Prop') {
    // H2H props — use selectedPlayer from outcome or first entity
    const entities = pick.entities || [];
    const playerName = (pick.outcome && pick.outcome.selectedPlayer) || (entities[0] && entities[0].name) || '';
    const statType = (pick.line && pick.line.statType) || '';

    if (!playerName || !statType) return null;

    return tryAllBookmakers(oddsData.bookmakers, (bk) => {
      const market = bk.markets[0];
      if (!market || !market.outcomes) return null;

      for (const outcome of market.outcomes) {
        if (!outcome.description) continue;
        if (!playerNamesMatch(playerName, outcome.description)) continue;

        return { odds: outcome.price, point: outcome.point, playerFound: outcome.description, lineMoved: true, isH2H: true };
      }
      return null;
    });
  }

  // --- COMBINED PROP ---
  if (betType === 'Combined Prop') {
    // Combined props sum two players - fetch individual odds for first entity
    const playerName = info.entityName;

    if (!playerName) return null;

    return tryAllBookmakers(oddsData.bookmakers, (bk) => {
      const market = bk.markets[0];
      if (!market || !market.outcomes) return null;

      for (const outcome of market.outcomes) {
        if (!outcome.description) continue;
        if (!playerNamesMatch(playerName, outcome.description)) continue;

        return { odds: outcome.price, point: outcome.point, playerFound: outcome.description, lineMoved: true, isCombined: true };
      }
      return null;
    });
  }

  return null;
};

// ============================================================
// Main Execution
// ============================================================

async function main() {
  const args = process.argv.slice(2);
  const writeMode = args.includes('--write');
  const dateFilter = args.includes('--date') ? args[args.indexOf('--date') + 1] : null;

  console.log('='.repeat(70));
  console.log('  Historical Odds Backfill - Brolay Toxic Standings');
  console.log('='.repeat(70));
  console.log(`  Mode: ${writeMode ? '🔥 WRITE (will update Firebase)' : '👀 DRY RUN (read only)'}`);
  if (dateFilter) console.log(`  Date filter: ${dateFilter}`);
  console.log('');

  // Load backup data
  console.log('📂 Loading backup data...');
  const raw = JSON.parse(fs.readFileSync(BACKUP_PATH, 'utf8'));
  const allParlays = raw.data;

  // Filter to 2026 picks
  let parlays2026 = allParlays.filter(p => p.date && p.date.startsWith('2026'));
  if (dateFilter) {
    parlays2026 = parlays2026.filter(p => p.date === dateFilter);
  }

  console.log(`  Found ${parlays2026.length} parlays in 2026`);

  // Group parlays by date + sport for efficient API batching
  // New schema: picks are in parlay.picks (object keyed by pickId)
  const dateSprtGroups = {};
  const allPicks = [];

  parlays2026.forEach(parlay => {
    const picks = parlay.picks || {};
    Object.entries(picks).forEach(([pickId, pick]) => {
      const key = `${parlay.date}|${pick.sport}`;
      if (!dateSprtGroups[key]) dateSprtGroups[key] = { date: parlay.date, sport: pick.sport, picks: [] };
      dateSprtGroups[key].picks.push({ ...pick, _parlayId: parlay.id, _pickId: pickId, _parlayDate: parlay.date });
      allPicks.push({ ...pick, _parlayId: parlay.id, _pickId: pickId });
    });
  });

  const totalPicks = allPicks.length;
  // New schema: odds are in pick.line.odds
  const alreadyHaveOdds = allPicks.filter(p => p.line && p.line.odds).length;
  const needOdds = totalPicks - alreadyHaveOdds;

  console.log(`  Total picks: ${totalPicks}`);
  console.log(`  Already have odds: ${alreadyHaveOdds}`);
  console.log(`  Need odds: ${needOdds}`);
  console.log(`  Date+Sport groups: ${Object.keys(dateSprtGroups).length}`);
  console.log('');

  // Process each date+sport group
  const results = {
    found: [],
    notFound: [],
    alreadyHad: [],
    unsupportedSport: [],
    unsupportedBetType: [],
    errors: []
  };

  const groupKeys = Object.keys(dateSprtGroups).sort();

  for (let gi = 0; gi < groupKeys.length; gi++) {
    const groupKey = groupKeys[gi];
    const group = dateSprtGroups[groupKey];
    const { date, sport, picks } = group;

    console.log(`\n[${ gi + 1}/${groupKeys.length}] 📅 ${date} - ${sport} (${picks.length} picks)`);

    // Check if sport is supported
    if (!SPORT_MAP[sport]) {
      console.log(`  ⚠️  Sport "${sport}" not supported by The Odds API`);
      picks.forEach(p => {
        const pInfo = getPickMatchInfo(p);
        results.unsupportedSport.push({
          parlayId: p._parlayId, pickId: p._pickId, sport, betType: p.betType, entity: pInfo.entityName
        });
      });
      continue;
    }

    // Skip picks that already have odds (new schema: pick.line.odds)
    const picksNeedingOdds = picks.filter(p => !(p.line && p.line.odds));
    if (picksNeedingOdds.length === 0) {
      console.log(`  ✅ All ${picks.length} picks already have odds`);
      picks.forEach(p => results.alreadyHad.push({ parlayId: p._parlayId, pickId: p._pickId }));
      continue;
    }

    // Step 1: Fetch historical events for this date+sport
    console.log(`  📡 Fetching historical events...`);
    const events = await fetchHistoricalEvents(sport, date);
    await sleep(DELAY_BETWEEN_REQUESTS_MS);

    if (!events || events.length === 0) {
      console.log(`  ❌ No events found`);
      picksNeedingOdds.forEach(p => {
        const pInfo = getPickMatchInfo(p);
        results.notFound.push({
          parlayId: p._parlayId, pickId: p._pickId, reason: 'no_events', sport, betType: p.betType,
          entity: pInfo.entityName || (pInfo.awayTeam + ' @ ' + pInfo.homeTeam)
        });
      });
      continue;
    }

    console.log(`  Found ${events.length} events`);

    // Step 2: For each pick, find its event and fetch odds
    for (const pick of picksNeedingOdds) {
      const pickInfo = getPickMatchInfo(pick);
      const pickDesc = `${pick.betType}: ${pickInfo.entityName || (pickInfo.awayTeam + ' @ ' + pickInfo.homeTeam) || '???'}`;

      // Determine markets needed
      const markets = getMarkets(pick);
      if (!markets) {
        console.log(`  ⚠️  ${pickDesc} - unsupported bet type for odds lookup`);
        results.unsupportedBetType.push({
          parlayId: pick._parlayId, pickId: pick._pickId, betType: pick.betType,
          statType: (pick.line && pick.line.statType) || ''
        });
        continue;
      }

      // Find matching event
      const matchingEvent = findMatchingEvent(pick, events);
      if (!matchingEvent) {
        console.log(`  ❌ ${pickDesc} - no matching event`);
        results.notFound.push({
          parlayId: pick._parlayId, pickId: pick._pickId, reason: 'no_matching_event',
          sport, betType: pick.betType,
          entity: pickInfo.entityName || `${pickInfo.awayTeam} @ ${pickInfo.homeTeam}`,
          entityTeam: pickInfo.entityTeam,
          availableEvents: events.map(e => `${e.away_team} @ ${e.home_team}`)
        });
        continue;
      }

      // Fetch historical odds for this event
      console.log(`  📡 Fetching odds for ${matchingEvent.away_team} @ ${matchingEvent.home_team} [${markets.join(',')}]...`);
      const oddsData = await fetchHistoricalEventOdds(sport, matchingEvent.id, markets, date);
      await sleep(DELAY_BETWEEN_REQUESTS_MS);

      if (!oddsData) {
        console.log(`  ❌ ${pickDesc} - no odds data returned`);
        results.notFound.push({
          parlayId: pick._parlayId, pickId: pick._pickId, reason: 'no_odds_data',
          sport, betType: pick.betType, entity: pickInfo.entityName
        });
        continue;
      }

      // Extract odds
      const oddsResult = extractOdds(pick, oddsData, matchingEvent);

      if (oddsResult) {
        const oddsStr = typeof oddsResult.odds === 'string' ? oddsResult.odds
          : (oddsResult.odds > 0 ? `+${oddsResult.odds}` : `${oddsResult.odds}`);

        console.log(`  ✅ ${pickDesc} → ${oddsStr} (${oddsResult.bookmaker})${oddsResult.lineMoved ? ' [LINE MOVED]' : ''}`);

        results.found.push({
          parlayId: pick._parlayId,
          pickId: pick._pickId,
          betType: pick.betType,
          entity: pickInfo.entityName || `${pickInfo.awayTeam} @ ${pickInfo.homeTeam}`,
          odds: oddsStr,
          bookmaker: oddsResult.bookmaker,
          lineMoved: oddsResult.lineMoved || false,
          apiPoint: oddsResult.point,
          pickLine: getPickLine(pick),
          playerFound: oddsResult.playerFound
        });
      } else {
        console.log(`  ❌ ${pickDesc} - no matching odds in any bookmaker`);
        results.notFound.push({
          parlayId: pick._parlayId, pickId: pick._pickId, reason: 'no_matching_odds',
          sport, betType: pick.betType, entity: pickInfo.entityName,
          line: getPickLine(pick), direction: pickInfo.direction,
          bookmakers: oddsData.bookmakers ? oddsData.bookmakers.map(b => b.title || b.key) : []
        });
      }
    }

    // Rate limit between date groups
    await sleep(DELAY_BETWEEN_DATES_MS);
  }

  // ============================================================
  // Summary Report
  // ============================================================

  console.log('\n' + '='.repeat(70));
  console.log('  RESULTS SUMMARY');
  console.log('='.repeat(70));
  console.log(`  ✅ Odds found:           ${results.found.length}/${needOdds} picks needing odds`);
  console.log(`  ⏭️  Already had odds:     ${results.alreadyHad.length}`);
  console.log(`  ❌ Not found:            ${results.notFound.length}`);
  console.log(`  ⚠️  Unsupported sport:    ${results.unsupportedSport.length}`);
  console.log(`  ⚠️  Unsupported bet type: ${results.unsupportedBetType.length}`);
  console.log(`  💥 Errors:               ${results.errors.length}`);
  console.log(`  📡 API calls made:       ${apiCallCount}`);
  if (remainingRequests !== null) {
    console.log(`  📊 API quota remaining:  ${remainingRequests}`);
  }

  // Capture rate
  const captureRate = needOdds > 0 ? ((results.found.length / needOdds) * 100).toFixed(1) : 'N/A';
  console.log(`\n  📈 Capture rate: ${captureRate}%`);

  // Breakdown of not-found reasons
  if (results.notFound.length > 0) {
    const reasons = {};
    results.notFound.forEach(r => { reasons[r.reason] = (reasons[r.reason] || 0) + 1; });
    console.log(`\n  Not-found breakdown:`);
    Object.entries(reasons).forEach(([reason, count]) => {
      console.log(`    ${reason}: ${count}`);
    });
  }

  // Breakdown of found by bookmaker
  if (results.found.length > 0) {
    const bookmakers = {};
    results.found.forEach(r => { bookmakers[r.bookmaker] = (bookmakers[r.bookmaker] || 0) + 1; });
    console.log(`\n  Found by bookmaker:`);
    Object.entries(bookmakers).sort((a, b) => b[1] - a[1]).forEach(([bk, count]) => {
      console.log(`    ${bk}: ${count}`);
    });

    const lineMovedCount = results.found.filter(r => r.lineMoved).length;
    console.log(`\n  Line moved matches: ${lineMovedCount}/${results.found.length}`);
  }

  // Save results to JSON
  console.log(`\n💾 Saving detailed results to: ${OUTPUT_PATH}`);
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2));

  // ============================================================
  // Firebase Write (if --write flag)
  // ============================================================

  if (writeMode && results.found.length > 0) {
    console.log('\n🔥 Writing to Firebase...');

    try {
      // Use client Firebase SDK (same as write-enrichment.cjs)
      const { initializeApp } = require('firebase/app');
      const { getFirestore, doc, updateDoc } = require('firebase/firestore');

      const firebaseConfig = {
        apiKey: "AIzaSyDWhm77FUPJUHt7Bdb9R1NHH9PoAorkxlc",
        authDomain: "brolay-toxic-standings.firebaseapp.com",
        projectId: "brolay-toxic-standings",
        storageBucket: "brolay-toxic-standings.firebasestorage.app",
        messagingSenderId: "466981190192",
        appId: "1:466981190192:web:f03423a047f8ce554a8bf5"
      };

      const app = initializeApp(firebaseConfig);
      const db = getFirestore(app);
      let writeSuccess = 0;
      let writeFail = 0;

      const WRITE_BATCH_SIZE = 25;
      const WRITE_DELAY_MS = 500;

      for (let i = 0; i < results.found.length; i += WRITE_BATCH_SIZE) {
        const batch = results.found.slice(i, i + WRITE_BATCH_SIZE);
        console.log(`   Writing batch ${Math.floor(i/WRITE_BATCH_SIZE) + 1} (${batch.length} picks)...`);

        for (const result of batch) {
          try {
            const docRef = doc(db, 'parlays', String(result.parlayId));
            // New schema: write to picks.{pickId}.line.odds and picks.{pickId}.line.source
            await updateDoc(docRef, {
              [`picks.${result.pickId}.line.odds`]: result.odds,
              [`picks.${result.pickId}.line.source`]: result.bookmaker
            });
            writeSuccess++;
          } catch (err) {
            console.log(`   ❌ Failed to write ${result.parlayId}/${result.pickId}: ${err.message}`);
            writeFail++;
          }
        }

        if (i + WRITE_BATCH_SIZE < results.found.length) {
          await new Promise(r => setTimeout(r, WRITE_DELAY_MS));
        }
      }

      console.log(`   ✅ Wrote ${writeSuccess} picks to Firebase`);
      if (writeFail > 0) console.log(`   ❌ Failed: ${writeFail}`);
    } catch (err) {
      console.log(`   ❌ Firebase write error: ${err.message}`);
    }
  }

  console.log('\n✨ Done!\n');
}

main().catch(err => {
  console.error('\n💥 Fatal error:', err);
  process.exit(1);
});
