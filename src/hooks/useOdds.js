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
   * Fetch odds from The Odds API for a specific participant/pick
   *
   * @param {Object} participant - Pick data (sport, betType, team, etc.)
   * @param {string} gameDate - Date of the game
   * @param {Array} eventsData - Pre-fetched events data (optional)
   * @returns {Object|null} Odds data with price and bookmaker, or null if not found
   */
  const fetchOddsFromTheOddsAPI = async (participant, gameDate, eventsData = null) => {
    const { sport, betType, team, awayTeam, homeTeam, propType, overUnder, line, favorite } = participant;

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
        const commenceTimeFrom = gameDateObj.toISOString();
        const gameDateNext = new Date(gameDateObj);
        gameDateNext.setDate(gameDateNext.getDate() + 1);
        const commenceTimeTo = gameDateNext.toISOString();

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
        if (betType === 'Total' || betType === 'First Half Total' || betType === 'First Inning Runs' || betType === 'Quarter Total') {
          // Match by both teams
          if (matchTeamName(awayTeam, event.away_team) && matchTeamName(homeTeam, event.home_team)) {
            matchingEvent = event;
            break;
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
      } else if (betType === 'Prop Bet') {
        // Comprehensive prop type mapping
        const propTypeMapping = ODDS_API_PROP_MAPPINGS;

        const normalizedPropType = normalizePropType(propType);
        const oddsApiMarket = propTypeMapping[normalizedPropType];

        if (!oddsApiMarket) {
          console.log(`Prop type "${propType}" (normalized: "${normalizedPropType}") not available in The Odds API`);
          return null;
        }

        markets = [oddsApiMarket];
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

      } else if (betType === 'Prop Bet') {
        const market = bookmaker.markets[0]; // We only requested one market
        if (!market || !market.outcomes) return null;

        const playerName = participant.team; // For props, player name is in 'team' field

        // Search for matching player
        for (const outcome of market.outcomes) {
          if (!outcome.description) continue;

          // Fuzzy match player name
          const outcomePlayerName = outcome.description.toLowerCase();
          const searchPlayerName = playerName.toLowerCase();

          if (outcomePlayerName.includes(searchPlayerName) || searchPlayerName.includes(outcomePlayerName)) {
            // Check if line matches
            const outcomeLine = parseFloat(outcome.point);
            const pickLine = parseFloat(line);

            if (Math.abs(outcomeLine - pickLine) <= 0.5) {
              // Match over/under direction
              if ((overUnder === 'Over' && outcome.name === 'Over') ||
                  (overUnder === 'Under' && outcome.name === 'Under')) {
                console.log(`Found prop odds: ${outcome.price} for ${playerName} ${propType} from ${bookmakerName}`);
                return { odds: outcome.price, bookmaker: bookmakerName };
              }
            }
          }
        }
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

  return {
    fetchOddsFromTheOddsAPI
  };
};
