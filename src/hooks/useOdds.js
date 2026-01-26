import { ODDS_API_PROP_MAPPINGS } from '../constants/sports';

/**
 * Custom hook for integrating with The Odds API
 * Fetches live odds from FanDuel (primary) and DraftKings (fallback)
 *
 * @param {string} apiKey - The Odds API key
 * @param {function} matchTeamName - Function to match team names (from useESPN)
 * @returns {Object} Odds fetching functions
 */
export const useOdds = (apiKey, matchTeamName) => {

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
   * Fetch odds from The Odds API for a specific participant/pick
   *
   * @param {Object} participant - Pick data (sport, betType, team, etc.) - supports both old and new schema
   * @param {string} gameDate - Date of the game
   * @param {Array} eventsData - Pre-fetched events data (optional)
   * @returns {Object|null} Odds data with price and bookmaker, or null if not found
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
        'College Baseball': 'baseball_ncaa'
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
      for (const event of eventsData) {
        if (betType === 'Total' || betType === 'First Half Total' || betType === 'First Inning Runs' || betType === 'Quarter Total' || betType === 'Game Prop') {
          // Match by both teams
          if (matchTeamName(awayTeam, event.away_team) && matchTeamName(homeTeam, event.home_team)) {
            matchingEvent = event;
            break;
          }
        } else if (betType === 'Player Prop') {
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
          // Match by single team
          if (matchTeamName(team, event.home_team) || matchTeamName(team, event.away_team)) {
            matchingEvent = event;
            break;
          }
        }
      }

      if (!matchingEvent) {
        console.log('No matching game found');
        if (betType === 'Player Prop' && playerTeam) {
          console.log('Searched for player team:', playerTeam);
        } else {
          console.log('Searched for team:', team || `${awayTeam} @ ${homeTeam}`);
        }
        console.log('Available games:', eventsData.map(e => `${e.away_team} @ ${e.home_team}`));
        return null;
      }

      console.log(`Found matching event: ${matchingEvent.away_team} @ ${matchingEvent.home_team}`);

      // Determine which markets to fetch based on bet type
      let markets = [];
      if (betType === 'Spread') {
        markets = ['spreads'];
      } else if (betType === 'Moneyline' || betType === 'First Half Moneyline' || betType === 'Quarter Moneyline') {
        markets = ['h2h'];
      } else if (betType === 'Total' || betType === 'First Half Total' || betType === 'Quarter Total') {
        markets = ['totals'];
      } else if (betType === 'Prop Bet' || betType === 'Player Prop' || betType === 'H2H Prop' || betType === 'Either Prop' || betType === 'Combined Prop') {
        // Comprehensive prop type mapping
        const propTypeMapping = ODDS_API_PROP_MAPPINGS;

        const normalizedPropType = normalizePropType(propType);
        const oddsApiMarket = propTypeMapping[normalizedPropType];

        if (!oddsApiMarket) {
          console.log(`Prop type "${propType}" (normalized: "${normalizedPropType}") not available in The Odds API`);
          console.log(`Bet type: ${betType}`);
          return null;
        }

        markets = [oddsApiMarket];
      } else if (betType === 'Team Prop' || betType === 'Game Prop') {
        // Team/Game props - may need team-specific markets in the future
        console.log(`${betType} odds fetching not yet fully implemented`);
        return null;
      } else {
        console.log(`Bet type ${betType} not yet supported`);
        return null;
      }

      // Fetch odds for the specific event and markets (FanDuel primary, DraftKings secondary)
      const oddsUrl = `https://api.the-odds-api.com/v4/sports/${oddsApiSport}/events/${matchingEvent.id}/odds?apiKey=${apiKey}&regions=us&markets=${markets.join(',')}&oddsFormat=american&bookmakers=fanduel,draftkings`;

      console.log(`Fetching odds for markets: ${markets.join(', ')}`);
      const oddsResponse = await fetch(oddsUrl);
      const oddsData = await oddsResponse.json();

      if (!oddsData.bookmakers || oddsData.bookmakers.length === 0) {
        console.log('No bookmaker odds available');
        return null;
      }

      // Try FanDuel first, then DraftKings as fallback
      let bookmaker = oddsData.bookmakers.find(b => b.key === 'fanduel');
      let bookmakerName = 'FanDuel';

      if (!bookmaker || !bookmaker.markets) {
        console.log('FanDuel not available, trying DraftKings...');
        bookmaker = oddsData.bookmakers.find(b => b.key === 'draftkings');
        bookmakerName = 'DraftKings';

        if (!bookmaker || !bookmaker.markets) {
          console.log('Neither FanDuel nor DraftKings available');
          return null;
        }
      }

      console.log(`Using ${bookmakerName} odds`);

      // Process based on bet type
      if (betType === 'Spread') {
        const spreadMarket = bookmaker.markets.find(m => m.key === 'spreads');
        if (!spreadMarket) return null;

        const pickedTeamIsHome = matchTeamName(team, matchingEvent.home_team);
        const pickedTeamName = pickedTeamIsHome ? matchingEvent.home_team : matchingEvent.away_team;

        const outcome = spreadMarket.outcomes.find(o => o.name === pickedTeamName);
        if (!outcome) return null;

        // Verify spread matches (within 0.5 points)
        const pickSpread = parseFloat(line);
        const oddsSpread = Math.abs(parseFloat(outcome.point));

        if (Math.abs(pickSpread - oddsSpread) <= 0.5) {
          console.log(`Found spread odds: ${outcome.price} from ${bookmakerName}`);
          return { odds: outcome.price, bookmaker: bookmakerName };
        }

      } else if (betType === 'Moneyline' || betType === 'First Half Moneyline' || betType === 'Quarter Moneyline') {
        const moneylineMarket = bookmaker.markets.find(m => m.key === 'h2h');
        if (!moneylineMarket) return null;

        const pickedTeamIsHome = matchTeamName(team, matchingEvent.home_team);
        const pickedTeamName = pickedTeamIsHome ? matchingEvent.home_team : matchingEvent.away_team;

        const outcome = moneylineMarket.outcomes.find(o => o.name === pickedTeamName);
        if (outcome) {
          console.log(`Found moneyline odds: ${outcome.price} from ${bookmakerName}`);
          return { odds: outcome.price, bookmaker: bookmakerName };
        }

      } else if (betType === 'Total' || betType === 'First Half Total' || betType === 'Quarter Total') {
        const totalsMarket = bookmaker.markets.find(m => m.key === 'totals');
        if (!totalsMarket) return null;

        const outcome = totalsMarket.outcomes.find(o => o.name === overUnder);
        if (!outcome) return null;

        // Verify total matches (within 0.5 points)
        const pickTotal = parseFloat(line);
        const oddsTotal = parseFloat(outcome.point);

        if (Math.abs(pickTotal - oddsTotal) <= 0.5) {
          console.log(`Found total odds: ${outcome.price} from ${bookmakerName}`);
          return { odds: outcome.price, bookmaker: bookmakerName };
        }

      } else if (betType === 'Prop Bet' || betType === 'Player Prop' || betType === 'H2H Prop' || betType === 'Either Prop' || betType === 'Combined Prop') {
        const market = bookmaker.markets[0]; // We only requested one market
        if (!market || !market.outcomes) {
          console.log(`No market data available for ${betType}`);
          return null;
        }

        console.log(`Searching for ${betType}: ${propType}`);
        const playerName = participant.team; // For props, player name is in 'team' field
        if (betType === 'Player Prop' && playerTeam) {
          console.log(`Player: ${playerName} (${playerTeam} ${participant.playerPosition || ''}), Line: ${line}, ${overUnder}`);
        } else {
          console.log(`Player: ${playerName}, Line: ${line}, ${overUnder}`);
        }
        console.log(`Available outcomes in market:`, market.outcomes.map(o => ({
          player: o.description,
          name: o.name,
          point: o.point,
          price: o.price
        })));

        // Search for matching player
        for (const outcome of market.outcomes) {
          if (!outcome.description) continue;

          // Fuzzy match player name
          const outcomePlayerName = outcome.description.toLowerCase();
          const searchPlayerName = playerName.toLowerCase();

          if (outcomePlayerName.includes(searchPlayerName) || searchPlayerName.includes(outcomePlayerName)) {
            console.log(`Found player match: ${outcome.description}`);

            // Check if line matches
            const outcomeLine = parseFloat(outcome.point);
            const pickLine = parseFloat(line);

            console.log(`Line comparison: API has ${outcomeLine}, pick has ${pickLine}`);

            if (Math.abs(outcomeLine - pickLine) <= 0.5) {
              // Match over/under direction
              if ((overUnder === 'Over' && outcome.name === 'Over') ||
                  (overUnder === 'Under' && outcome.name === 'Under')) {
                console.log(`Found prop odds: ${outcome.price} for ${playerName} ${propType} from ${bookmakerName}`);
                return { odds: outcome.price, bookmaker: bookmakerName };
              } else {
                console.log(`Over/Under mismatch: API has ${outcome.name}, pick wants ${overUnder}`);
              }
            }
          }
        }
        console.log(`No matching prop found for ${playerName}`);
      }

      console.log('No matching odds found');
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
      'College Baseball': 'baseball_ncaa'
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
