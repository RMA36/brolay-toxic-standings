import { ODDS_API_PROP_MAPPINGS } from '../constants/sports';

/**
 * Custom hook for integrating with The Odds API
 * Fetches live odds with smart bookmaker fallback and flexible line matching
 *
 * Bookmaker priority: FanDuel > DraftKings > any available US bookmaker
 * Line matching: Prefers exact match, falls back to closest available line (within tolerance)
 *
 * @param {string} apiKey - The Odds API key
 * @param {function} matchTeamName - Function to match team names (from useESPN)
 * @returns {Object} Odds fetching functions
 */
export const useOdds = (apiKey, matchTeamName) => {

  // Bookmaker priority order - preferred books checked first, then fall back to any available
  const PREFERRED_BOOKMAKERS = ['fanduel', 'draftkings'];

  /**
   * Normalize prop type for consistent matching
   */
  const normalizePropType = (propType) => {
    if (!propType) return '';

    return propType
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[()]/g, '');
  };

  /**
   * Normalize a player name for fuzzy matching
   * Handles periods, suffixes, initials, and common variations
   */
  const normalizePlayerName = (name) => {
    if (!name) return '';
    return name
      .toLowerCase()
      .replace(/\./g, '')           // Remove periods: "D.J." -> "DJ", "Jr." -> "Jr"
      .replace(/'/g, "'")           // Normalize apostrophes
      .replace(/\s+(jr|sr|ii|iii|iv|v)$/i, '') // Remove suffixes
      .replace(/\s+/g, ' ')        // Collapse whitespace
      .trim();
  };

  /**
   * Check if two player names match using fuzzy logic
   * Handles: "D.J. Moore" vs "DJ Moore", "Mike Williams" vs "Michael Williams",
   * first-initial formats like "P. Mahomes" vs "Patrick Mahomes"
   */
  const playerNamesMatch = (pickName, apiName) => {
    const normPick = normalizePlayerName(pickName);
    const normApi = normalizePlayerName(apiName);

    // Exact match after normalization
    if (normPick === normApi) return true;

    // Contains match (either direction)
    if (normApi.includes(normPick) || normPick.includes(normApi)) return true;

    // Last name match with first initial check
    const pickParts = normPick.split(' ');
    const apiParts = normApi.split(' ');

    if (pickParts.length >= 2 && apiParts.length >= 2) {
      const pickLast = pickParts[pickParts.length - 1];
      const apiLast = apiParts[apiParts.length - 1];

      // Last names must match
      if (pickLast === apiLast) {
        const pickFirst = pickParts[0];
        const apiFirst = apiParts[0];

        // First initial match: "p" matches "patrick", "dj" matches "dj"
        if (pickFirst.length <= 2 && apiFirst.startsWith(pickFirst[0])) return true;
        if (apiFirst.length <= 2 && pickFirst.startsWith(apiFirst[0])) return true;

        // Both start with same letter (common name variations)
        if (pickFirst[0] === apiFirst[0]) return true;
      }
    }

    return false;
  };

  /**
   * Helper to extract team/player info from pick (supports both schemas)
   */
  const extractPickInfo = (pick) => {
    const info = {
      sport: pick.sport,
      betType: pick.betType,
      team: pick.team,
      awayTeam: pick.awayTeam,
      homeTeam: pick.homeTeam,
      propType: pick.propType,
      overUnder: pick.overUnder,
      line: pick.line,
      favorite: pick.favorite,
      playerTeam: pick.playerTeam
    };

    // New schema: extract from entities and line objects
    if (pick.entities && pick.entities.length > 0) {
      const primary = pick.entities.find(e => e.role === 'primary') || pick.entities[0];
      if (primary) {
        if (primary.entityType === 'player') {
          info.team = primary.name; // Player name goes in team for prop matching
          info.playerTeam = primary.team;
        } else {
          info.team = primary.name;
        }
      }
    }

    // New schema: extract from game object
    if (pick.game) {
      info.awayTeam = info.awayTeam || pick.game.awayTeam;
      info.homeTeam = info.homeTeam || pick.game.homeTeam;
    }

    // New schema: extract from line object
    if (pick.line && typeof pick.line === 'object') {
      info.propType = info.propType || pick.line.statType;
      info.overUnder = info.overUnder || (pick.line.direction === 'over' ? 'Over' : pick.line.direction === 'under' ? 'Under' : info.overUnder);
      info.line = pick.line.value !== undefined ? pick.line.value : info.line;
      info.favorite = info.favorite || (pick.line.direction === 'underdog' ? 'Dog' : pick.line.direction === 'favorite' ? 'Favorite' : info.favorite);
    }

    return info;
  };

  /**
   * Select the best bookmaker from available options
   * Priority: FanDuel > DraftKings > any other US bookmaker
   *
   * @param {Array} bookmakers - Array of bookmaker objects from API response
   * @returns {Object|null} { bookmaker, bookmakerName } or null
   */
  const selectBookmaker = (bookmakers) => {
    if (!bookmakers || bookmakers.length === 0) return null;

    // Try preferred bookmakers in order
    for (const preferredKey of PREFERRED_BOOKMAKERS) {
      const bk = bookmakers.find(b => b.key === preferredKey && b.markets && b.markets.length > 0);
      if (bk) {
        const displayName = preferredKey === 'fanduel' ? 'FanDuel'
          : preferredKey === 'draftkings' ? 'DraftKings'
          : bk.title || bk.key;
        return { bookmaker: bk, bookmakerName: displayName };
      }
    }

    // Fall back to ANY available bookmaker with market data
    const fallback = bookmakers.find(b => b.markets && b.markets.length > 0);
    if (fallback) {
      console.log(`FanDuel and DraftKings not available, falling back to ${fallback.title || fallback.key}`);
      return { bookmaker: fallback, bookmakerName: fallback.title || fallback.key };
    }

    return null;
  };

  /**
   * Find the best matching outcome for a spread bet
   * Prefers exact line match, falls back to closest available within tolerance
   *
   * @param {Object} market - The spreads market object
   * @param {string} team - The picked team name
   * @param {Object} matchingEvent - The matched event
   * @param {number} pickLine - The pick's spread value (e.g., 9.5 from "-9.5")
   * @param {string} favorite - 'Favorite' or 'Dog'
   * @returns {Object|null} { odds, point, lineMoved }
   */
  const findBestSpreadMatch = (market, team, matchingEvent, pickLine, favorite) => {
    const pickedTeamIsHome = matchTeamName(team, matchingEvent.home_team);
    const pickedTeamName = pickedTeamIsHome ? matchingEvent.home_team : matchingEvent.away_team;

    const outcome = market.outcomes.find(o => o.name === pickedTeamName);
    if (!outcome) return null;

    const apiPoint = parseFloat(outcome.point); // e.g., -10.5 (signed)
    const pickSpread = parseFloat(pickLine);

    // Determine the expected sign based on favorite/dog
    // Favorites have negative spreads, dogs have positive
    const expectedPickPoint = favorite === 'Favorite' || favorite === 'favorite'
      ? -Math.abs(pickSpread)
      : Math.abs(pickSpread);

    const diff = Math.abs(apiPoint - expectedPickPoint);

    // Exact or near-exact match (within 0.5)
    if (diff <= 0.5) {
      return { odds: outcome.price, point: apiPoint, lineMoved: false };
    }

    // Wider tolerance: line moved but we can still identify the bet (within 3 points)
    if (diff <= 3) {
      console.log(`Spread line moved: pick was ${expectedPickPoint}, book now has ${apiPoint} (moved ${diff} pts)`);
      return { odds: outcome.price, point: apiPoint, lineMoved: true };
    }

    console.log(`Spread too far off: pick was ${expectedPickPoint}, book has ${apiPoint} (diff: ${diff})`);
    return null;
  };

  /**
   * Find the best matching outcome for a totals bet
   * Prefers exact line match, falls back to closest available within tolerance
   */
  const findBestTotalMatch = (market, overUnder, pickLine) => {
    const pickTotal = parseFloat(pickLine);

    // Find all outcomes matching the over/under direction
    const matchingOutcomes = market.outcomes.filter(o => o.name === overUnder);
    if (matchingOutcomes.length === 0) return null;

    // Sort by distance from pick line
    const sorted = matchingOutcomes
      .map(o => ({ ...o, diff: Math.abs(parseFloat(o.point) - pickTotal) }))
      .sort((a, b) => a.diff - b.diff);

    const best = sorted[0];

    if (best.diff <= 0.5) {
      return { odds: best.price, point: best.point, lineMoved: false };
    }

    // Wider tolerance for totals (can move more than spreads)
    if (best.diff <= 4) {
      console.log(`Total line moved: pick was ${pickTotal}, book now has ${best.point} (moved ${best.diff} pts)`);
      return { odds: best.price, point: best.point, lineMoved: true };
    }

    console.log(`Total too far off: pick was ${pickTotal}, book has ${best.point} (diff: ${best.diff})`);
    return null;
  };

  /**
   * Find the best matching outcome for a player prop
   * Uses fuzzy player name matching and flexible line tolerance
   */
  const findBestPropMatch = (market, playerName, overUnder, pickLine) => {
    if (!market || !market.outcomes) return null;

    const pickLineNum = parseFloat(pickLine);
    let bestMatch = null;
    let bestDiff = Infinity;

    for (const outcome of market.outcomes) {
      if (!outcome.description) continue;

      // Use improved player name matching
      if (!playerNamesMatch(playerName, outcome.description)) continue;

      // Check over/under direction
      if (overUnder && outcome.name !== overUnder) continue;

      const outcomeLine = parseFloat(outcome.point);
      const diff = Math.abs(outcomeLine - pickLineNum);

      if (diff < bestDiff) {
        bestDiff = diff;
        bestMatch = {
          odds: outcome.price,
          point: outcomeLine,
          playerFound: outcome.description,
          lineMoved: diff > 0.5,
          diff
        };
      }
    }

    if (!bestMatch) {
      console.log(`No matching prop found for ${playerName}`);
      return null;
    }

    // Accept within 0.5 (exact or near-exact)
    if (bestMatch.diff <= 0.5) {
      return { odds: bestMatch.odds, point: bestMatch.point, lineMoved: false, playerFound: bestMatch.playerFound };
    }

    // Wider tolerance for props (within 3 units)
    if (bestMatch.diff <= 3) {
      console.log(`Prop line moved: pick was ${pickLineNum}, book now has ${bestMatch.point} for ${bestMatch.playerFound}`);
      return { odds: bestMatch.odds, point: bestMatch.point, lineMoved: true, playerFound: bestMatch.playerFound };
    }

    console.log(`Prop too far off for ${playerName}: pick was ${pickLineNum}, closest is ${bestMatch.point} (diff: ${bestMatch.diff})`);
    return null;
  };

  /**
   * Map bet types to their Odds API market keys
   * Supports all bet types including first half, quarter, team totals, etc.
   */
  const getMarketsForBetType = (betType, propType) => {
    // Standard markets
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

      'First Inning Runs': ['totals'],  // First inning runs map to totals for baseball

      '3-Way Moneyline': ['h2h_3_way'],
    };

    // Direct market lookup
    if (marketMap[betType]) {
      return marketMap[betType];
    }

    // Player prop types
    if (betType === 'Prop Bet' || betType === 'Player Prop' || betType === 'H2H Prop' || betType === 'Either Prop' || betType === 'Combined Prop') {
      const normalizedPropType = normalizePropType(propType);
      const oddsApiMarket = ODDS_API_PROP_MAPPINGS[normalizedPropType];

      if (!oddsApiMarket) {
        console.log(`Prop type "${propType}" (normalized: "${normalizedPropType}") not available in The Odds API`);
        console.log(`Bet type: ${betType}`);
        return null;
      }

      return [oddsApiMarket];
    }

    // Team/Game props - attempt totals as fallback
    if (betType === 'Team Prop' || betType === 'Game Prop') {
      console.log(`${betType} - attempting team_totals market`);
      return ['team_totals'];
    }

    console.log(`Bet type ${betType} not yet supported for odds fetching`);
    return null;
  };

  /**
   * Fetch odds from The Odds API for a specific participant/pick
   *
   * @param {Object} participant - Pick data (sport, betType, team, etc.) - supports both old and new schema
   * @param {string} gameDate - Date of the game
   * @param {Array} eventsData - Pre-fetched events data (optional)
   * @returns {Object|null} Odds data with price, bookmaker, and lineMoved flag, or null if not found
   */
  const fetchOddsFromTheOddsAPI = async (participant, gameDate, eventsData = null) => {
    // Extract info supporting both old and new schema
    const pickInfo = extractPickInfo(participant);
    const { sport, betType, team, awayTeam, homeTeam, propType, overUnder, line, favorite, playerTeam } = pickInfo;

    if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
      console.warn('The Odds API key not configured');
      return null;
    }

    try {
      // Comprehensive sport mapping
      const sportMap = {
        'NFL': 'americanfootball_nfl',
        'NBA': 'basketball_nba',
        'MLB': 'baseball_mlb',
        'NHL': 'icehockey_nhl',
        'College Football': 'americanfootball_ncaaf',
        'College Basketball': 'basketball_ncaab',
        'College Basketball (Women\'s)': 'basketball_wncaab',
        'WNBA': 'basketball_wnba',
        'Soccer': 'soccer_usa_mls',
        'Soccer (Women\'s)': 'soccer_usa_nwsl',
        'College Baseball': 'baseball_ncaa',
        "Women's Hockey": 'icehockey_pwhl'
      };

      const oddsApiSport = sportMap[sport];
      if (!oddsApiSport) {
        console.log(`Sport ${sport} not supported by The Odds API`);
        return null;
      }

      // Use pre-fetched events if available, otherwise fetch them
      if (!eventsData) {
        const gameDateObj = new Date(gameDate + 'T00:00:00');
        // Remove milliseconds from ISO string (API wants YYYY-MM-DDTHH:MM:SSZ format)
        const commenceTimeFrom = gameDateObj.toISOString().replace(/\.\d{3}Z$/, 'Z');
        const gameDateNext = new Date(gameDateObj);
        gameDateNext.setDate(gameDateNext.getDate() + 1);
        const commenceTimeTo = gameDateNext.toISOString().replace(/\.\d{3}Z$/, 'Z');

        const eventsUrl = `https://api.the-odds-api.com/v4/sports/${oddsApiSport}/events?apiKey=${apiKey}&commenceTimeFrom=${commenceTimeFrom}&commenceTimeTo=${commenceTimeTo}`;

        console.log(`Fetching events for ${sport} on ${gameDate}`);
        const eventsResponse = await fetch(eventsUrl);
        eventsData = await eventsResponse.json();
      }

      if (!eventsData || eventsData.length === 0) {
        console.log('No events found for this date');
        return null;
      }

      // Find the matching game
      let matchingEvent = null;
      const isTotalType = ['Total', 'First Half Total', 'Quarter Total', 'First Inning Runs',
                           'Game Prop', 'Team Total', 'First Half Team Total', 'Quarter Team Total'].includes(betType);
      const isPropType = ['Player Prop', 'Prop Bet', 'H2H Prop', 'Either Prop', 'Combined Prop'].includes(betType);

      for (const event of eventsData) {
        if (isTotalType) {
          // Match by both teams
          if (matchTeamName(awayTeam, event.away_team) && matchTeamName(homeTeam, event.home_team)) {
            matchingEvent = event;
            break;
          }
          // Also try matching by single team for Team Total
          if (['Team Total', 'First Half Team Total', 'Quarter Team Total'].includes(betType) && team) {
            if (matchTeamName(team, event.home_team) || matchTeamName(team, event.away_team)) {
              matchingEvent = event;
              break;
            }
          }
        } else if (isPropType) {
          // Match by player's team (if playerTeam is available)
          if (playerTeam) {
            if (matchTeamName(playerTeam, event.home_team) || matchTeamName(playerTeam, event.away_team)) {
              matchingEvent = event;
              break;
            }
          } else {
            // Fallback: try matching by team field (legacy behavior)
            console.warn('Player Prop missing playerTeam field, using team field as fallback');
            if (matchTeamName(team, event.home_team) || matchTeamName(team, event.away_team)) {
              matchingEvent = event;
              break;
            }
          }
        } else {
          // Match by single team (Spread, Moneyline, etc.)
          if (matchTeamName(team, event.home_team) || matchTeamName(team, event.away_team)) {
            matchingEvent = event;
            break;
          }
        }
      }

      if (!matchingEvent) {
        console.log('No matching game found');
        if (isPropType && playerTeam) {
          console.log('Searched for player team:', playerTeam);
        } else {
          console.log('Searched for team:', team || `${awayTeam} @ ${homeTeam}`);
        }
        console.log('Available games:', eventsData.map(e => `${e.away_team} @ ${e.home_team}`));
        return null;
      }

      console.log(`Found matching event: ${matchingEvent.away_team} @ ${matchingEvent.home_team}`);

      // Determine which markets to fetch
      const markets = getMarketsForBetType(betType, propType);
      if (!markets) return null;

      // Fetch odds - request ALL US bookmakers instead of just fanduel,draftkings
      const oddsUrl = `https://api.the-odds-api.com/v4/sports/${oddsApiSport}/events/${matchingEvent.id}/odds?apiKey=${apiKey}&regions=us&markets=${markets.join(',')}&oddsFormat=american`;

      console.log(`Fetching odds for markets: ${markets.join(', ')} (all US bookmakers)`);
      const oddsResponse = await fetch(oddsUrl);
      const oddsData = await oddsResponse.json();

      if (!oddsData.bookmakers || oddsData.bookmakers.length === 0) {
        console.log('No bookmaker odds available');
        return null;
      }

      console.log(`Available bookmakers: ${oddsData.bookmakers.map(b => b.title || b.key).join(', ')}`);

      // Select best bookmaker (FanDuel > DraftKings > any available)
      const selected = selectBookmaker(oddsData.bookmakers);
      if (!selected) {
        console.log('No bookmaker with valid market data found');
        return null;
      }

      const { bookmaker, bookmakerName } = selected;
      console.log(`Using ${bookmakerName} odds`);

      // Helper to try other bookmakers if primary doesn't have a match
      const tryAllBookmakers = (matchFn) => {
        // First try the selected (preferred) bookmaker
        const primaryResult = matchFn(bookmaker);
        if (primaryResult) {
          return { ...primaryResult, bookmaker: bookmakerName };
        }

        // Try remaining bookmakers in order
        for (const bk of oddsData.bookmakers) {
          if (bk.key === bookmaker.key) continue; // Skip already tried
          if (!bk.markets || bk.markets.length === 0) continue;

          const result = matchFn(bk);
          if (result) {
            const fallbackName = bk.title || bk.key;
            console.log(`Found match on fallback bookmaker: ${fallbackName}`);
            return { ...result, bookmaker: fallbackName };
          }
        }

        return null;
      };

      // Process based on bet type
      if (betType === 'Spread' || betType === 'First Half Spread' || betType === 'Quarter Spread') {
        const marketKey = markets[0];
        const result = tryAllBookmakers((bk) => {
          const spreadMarket = bk.markets.find(m => m.key === marketKey);
          if (!spreadMarket) return null;
          return findBestSpreadMatch(spreadMarket, team, matchingEvent, line, favorite);
        });

        if (result) {
          console.log(`Found spread odds: ${result.odds} from ${result.bookmaker}${result.lineMoved ? ' (LINE MOVED)' : ''}`);
          return result;
        }

      } else if (betType === 'Moneyline' || betType === 'First Half Moneyline' || betType === 'Quarter Moneyline' || betType === '3-Way Moneyline') {
        const marketKey = markets[0];
        const result = tryAllBookmakers((bk) => {
          const mlMarket = bk.markets.find(m => m.key === marketKey);
          if (!mlMarket) return null;

          const pickedTeamIsHome = matchTeamName(team, matchingEvent.home_team);
          const pickedTeamName = pickedTeamIsHome ? matchingEvent.home_team : matchingEvent.away_team;

          const outcome = mlMarket.outcomes.find(o => o.name === pickedTeamName);
          if (outcome) {
            return { odds: outcome.price, lineMoved: false };
          }
          return null;
        });

        if (result) {
          console.log(`Found moneyline odds: ${result.odds} from ${result.bookmaker}`);
          return result;
        }

      } else if (['Total', 'First Half Total', 'Quarter Total', 'First Inning Runs'].includes(betType)) {
        const marketKey = markets[0];
        const result = tryAllBookmakers((bk) => {
          const totalsMarket = bk.markets.find(m => m.key === marketKey);
          if (!totalsMarket) return null;
          return findBestTotalMatch(totalsMarket, overUnder, line);
        });

        if (result) {
          console.log(`Found total odds: ${result.odds} from ${result.bookmaker}${result.lineMoved ? ' (LINE MOVED)' : ''}`);
          return result;
        }

      } else if (['Team Total', 'First Half Team Total', 'Quarter Team Total'].includes(betType)) {
        const marketKey = markets[0];
        const result = tryAllBookmakers((bk) => {
          const teamTotalMarket = bk.markets.find(m => m.key === marketKey);
          if (!teamTotalMarket) return null;

          // Team totals have outcomes per team - find ours
          const teamOutcomes = teamTotalMarket.outcomes.filter(o => {
            if (!o.description) return false;
            return matchTeamName(team, o.description) ||
                   matchTeamName(awayTeam, o.description) ||
                   matchTeamName(homeTeam, o.description);
          });

          if (teamOutcomes.length === 0) {
            // Some APIs put team name in description, some don't - try matching by direction only
            return findBestTotalMatch(teamTotalMarket, overUnder, line);
          }

          // Filter to matching direction and find best line
          const directionOutcomes = teamOutcomes.filter(o => o.name === overUnder);
          if (directionOutcomes.length === 0) return null;

          const pickTotal = parseFloat(line);
          const sorted = directionOutcomes
            .map(o => ({ ...o, diff: Math.abs(parseFloat(o.point) - pickTotal) }))
            .sort((a, b) => a.diff - b.diff);

          const best = sorted[0];
          if (best.diff <= 0.5) {
            return { odds: best.price, point: best.point, lineMoved: false };
          }
          if (best.diff <= 4) {
            return { odds: best.price, point: best.point, lineMoved: true };
          }
          return null;
        });

        if (result) {
          console.log(`Found team total odds: ${result.odds} from ${result.bookmaker}${result.lineMoved ? ' (LINE MOVED)' : ''}`);
          return result;
        }

      } else if (['Team Prop', 'Game Prop'].includes(betType)) {
        // Try team_totals market for team/game props
        const marketKey = markets[0];
        const result = tryAllBookmakers((bk) => {
          const market = bk.markets.find(m => m.key === marketKey);
          if (!market) return null;
          return findBestTotalMatch(market, overUnder, line);
        });

        if (result) {
          console.log(`Found ${betType} odds: ${result.odds} from ${result.bookmaker}${result.lineMoved ? ' (LINE MOVED)' : ''}`);
          return result;
        }

      } else if (['Prop Bet', 'Player Prop', 'H2H Prop', 'Either Prop', 'Combined Prop'].includes(betType)) {
        const playerName = participant.team; // For props, player name is in 'team' field

        if (betType === 'Player Prop' && playerTeam) {
          console.log(`Searching for Player Prop: ${playerName} (${playerTeam}), ${propType}, Line: ${line}, ${overUnder}`);
        } else {
          console.log(`Searching for ${betType}: ${playerName}, ${propType}, Line: ${line}, ${overUnder}`);
        }

        const result = tryAllBookmakers((bk) => {
          const market = bk.markets[0]; // We only requested one market
          if (!market || !market.outcomes) return null;

          console.log(`Checking ${bk.title || bk.key} - ${market.outcomes.length} outcomes available`);

          return findBestPropMatch(market, playerName, overUnder, line);
        });

        if (result) {
          console.log(`Found prop odds: ${result.odds} for ${result.playerFound || playerName} from ${result.bookmaker}${result.lineMoved ? ' (LINE MOVED)' : ''}`);
          return result;
        }
      }

      console.log('No matching odds found across any bookmaker');
      return null;

    } catch (error) {
      console.error('Error fetching odds from The Odds API:', error);
      if (error.message && error.message.includes('401')) {
        console.error('API Key may be invalid or expired');
      }
      return null;
    }
  };

  /**
   * Pre-fetch events for multiple sports on a given date
   * This reduces API calls by fetching events once per sport instead of once per pick
   *
   * @param {Array<string>} sports - Array of sport names (e.g., ['NFL', 'NBA'])
   * @param {string} gameDate - Date of the games (YYYY-MM-DD)
   * @returns {Object} Object mapping sport names to their events data
   */
  const prefetchEventsBySport = async (sports, gameDate) => {
    const sportMap = {
      'NFL': 'americanfootball_nfl',
      'NBA': 'basketball_nba',
      'MLB': 'baseball_mlb',
      'NHL': 'icehockey_nhl',
      'College Football': 'americanfootball_ncaaf',
      'College Basketball': 'basketball_ncaab',
      'College Basketball (Women\'s)': 'basketball_wncaab',
      'WNBA': 'basketball_wnba',
      'Soccer': 'soccer_usa_mls',
      'Soccer (Women\'s)': 'soccer_usa_nwsl',
      'College Baseball': 'baseball_ncaa',
      "Women's Hockey": 'icehockey_pwhl'
    };

    const eventsBySport = {};

    if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
      console.warn('The Odds API key not configured');
      return eventsBySport;
    }

    for (const sport of sports) {
      const oddsApiSport = sportMap[sport];
      if (!oddsApiSport) {
        console.log(`Sport ${sport} not supported by The Odds API`);
        eventsBySport[sport] = [];
        continue;
      }

      try {
        const gameDateObj = new Date(gameDate + 'T00:00:00');
        // Remove milliseconds from ISO string (API wants YYYY-MM-DDTHH:MM:SSZ format)
        const commenceTimeFrom = gameDateObj.toISOString().replace(/\.\d{3}Z$/, 'Z');
        const gameDateNext = new Date(gameDateObj);
        gameDateNext.setDate(gameDateNext.getDate() + 1);
        const commenceTimeTo = gameDateNext.toISOString().replace(/\.\d{3}Z$/, 'Z');

        const eventsUrl = `https://api.the-odds-api.com/v4/sports/${oddsApiSport}/events?apiKey=${apiKey}&commenceTimeFrom=${commenceTimeFrom}&commenceTimeTo=${commenceTimeTo}`;

        console.log(`Pre-fetching events for ${sport} on ${gameDate}`);
        const eventsResponse = await fetch(eventsUrl);

        if (!eventsResponse.ok) {
          const errorText = await eventsResponse.text();
          console.error(`Failed to fetch events for ${sport}: ${eventsResponse.status} ${eventsResponse.statusText}`);
          console.error(`Error details:`, errorText);
          eventsBySport[sport] = [];
          continue;
        }

        const eventsData = await eventsResponse.json();

        // Check if response is an error object instead of an array
        if (!Array.isArray(eventsData)) {
          console.error(`Invalid events data for ${sport}:`, eventsData);
          eventsBySport[sport] = [];
          continue;
        }

        eventsBySport[sport] = eventsData;
        console.log(`Found ${eventsData.length} events for ${sport}`);
      } catch (error) {
        console.error(`Error fetching events for ${sport}:`, error);
        eventsBySport[sport] = [];
      }
    }

    return eventsBySport;
  };

  return {
    fetchOddsFromTheOddsAPI,
    prefetchEventsBySport
  };
};
