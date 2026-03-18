import { useState, useEffect, useCallback } from 'react';
import { collection, doc, getDoc, setDoc } from 'firebase/firestore';
import { getCurrentSportsInSeason } from '../insightsHelper';

/**
 * Sport key mapping for The Odds API
 * Only includes the 6 sports we fetch recommendations for
 */
const RECOMMENDATION_SPORT_MAP = {
  'NFL': 'americanfootball_nfl',
  'NBA': 'basketball_nba',
  'MLB': 'baseball_mlb',
  'NHL': 'icehockey_nhl',
  'College Football': 'americanfootball_ncaaf',
  'College Basketball': 'basketball_ncaab'
};

/**
 * The 6 sports we support for recommendations
 */
const SUPPORTED_RECOMMENDATION_SPORTS = Object.keys(RECOMMENDATION_SPORT_MAP);

/**
 * Bookmaker priority — prefer FanDuel, then DraftKings, then any US book
 */
const PREFERRED_BOOKMAKERS = ['fanduel', 'draftkings'];

/**
 * Select the best bookmaker from the response
 */
const selectBookmaker = (bookmakers) => {
  if (!bookmakers || bookmakers.length === 0) return null;

  // Try preferred bookmakers first
  for (const preferred of PREFERRED_BOOKMAKERS) {
    const bk = bookmakers.find(b => b.key === preferred);
    if (bk && bk.markets && bk.markets.length > 0) {
      return { bookmaker: bk, bookmakerName: bk.title || bk.key };
    }
  }

  // Fall back to any bookmaker with data
  const anyValid = bookmakers.find(b => b.markets && b.markets.length > 0);
  if (anyValid) {
    return { bookmaker: anyValid, bookmakerName: anyValid.title || anyValid.key };
  }

  return null;
};

/**
 * Extract all betting lines from a bookmaker's market data for a game
 * Returns structured odds within the -150 to +150 range
 */
const extractMarketOdds = (bookmaker, bookmakerName, event) => {
  const markets = {};

  if (!bookmaker.markets) return markets;

  for (const market of bookmaker.markets) {
    if (market.key === 'spreads') {
      const homeOutcome = market.outcomes.find(o => o.name === event.home_team);
      const awayOutcome = market.outcomes.find(o => o.name === event.away_team);

      markets.spreads = {
        home: homeOutcome ? { line: homeOutcome.point, odds: homeOutcome.price, team: event.home_team } : null,
        away: awayOutcome ? { line: awayOutcome.point, odds: awayOutcome.price, team: event.away_team } : null
      };
    } else if (market.key === 'h2h') {
      const homeOutcome = market.outcomes.find(o => o.name === event.home_team);
      const awayOutcome = market.outcomes.find(o => o.name === event.away_team);

      markets.moneyline = {
        home: homeOutcome ? { odds: homeOutcome.price, team: event.home_team } : null,
        away: awayOutcome ? { odds: awayOutcome.price, team: event.away_team } : null
      };
    } else if (market.key === 'totals') {
      const overOutcome = market.outcomes.find(o => o.name === 'Over');
      const underOutcome = market.outcomes.find(o => o.name === 'Under');

      markets.totals = {
        over: overOutcome ? { line: overOutcome.point, odds: overOutcome.price } : null,
        under: underOutcome ? { line: underOutcome.point, odds: underOutcome.price } : null
      };
    }
  }

  return markets;
};

/**
 * Format today's date as YYYY-MM-DD
 */
const getTodayString = () => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};

/**
 * Custom hook for fetching and caching daily odds in Firestore
 *
 * Fetches bulk odds for in-season sports (spreads, moneylines, totals)
 * and stores them in a `dailyOdds` Firestore collection for:
 *   1. Powering the Recommendations tab
 *   2. Building a historical odds archive
 *   3. Attaching odds to picks when used
 *
 * Firestore doc structure: dailyOdds/{YYYY-MM-DD}_{sport}
 *
 * @param {Object} db - Firestore database instance
 * @param {string} apiKey - The Odds API key
 * @returns {Object} Daily odds state and fetch functions
 */
export const useDailyOdds = (db, apiKey) => {
  const [dailyOdds, setDailyOdds] = useState({});       // { sport: { games: [...], fetchedAt, ... } }
  const [loading, setLoading] = useState(true);          // Start true — loading on mount
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);  // Timestamp of last fetch
  const [apiUsage, setApiUsage] = useState(null);        // { used, remaining } from API headers
  const [oddsDate, setOddsDate] = useState(null);        // Which date's odds are being displayed (YYYY-MM-DD)
  const [isStale, setIsStale] = useState(false);         // True if showing yesterday's odds

  /**
   * Get the Firestore document ID for a sport on a given date
   */
  const getDocId = (date, sport) => `${date}_${sport.replace(/\s+/g, '-')}`;

  /**
   * Load cached odds from Firestore for today
   * Returns which sports already have cached data
   */
  const loadCachedOdds = useCallback(async (date = getTodayString()) => {
    if (!db) return {};

    const cached = {};
    const sportsInSeason = getCurrentSportsInSeason().filter(s =>
      SUPPORTED_RECOMMENDATION_SPORTS.includes(s)
    );

    for (const sport of sportsInSeason) {
      try {
        const docRef = doc(db, 'dailyOdds', getDocId(date, sport));
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          cached[sport] = docSnap.data();
        }
      } catch (err) {
        console.error(`Error loading cached odds for ${sport}:`, err);
      }
    }

    return cached;
  }, [db]);

  /**
   * Fetch bulk odds from The Odds API for a single sport
   * Uses the /v4/sports/{sport}/odds endpoint (3 credits: 3 markets x 1 region)
   */
  const fetchBulkOddsForSport = async (sport, date) => {
    const oddsApiSport = RECOMMENDATION_SPORT_MAP[sport];
    if (!oddsApiSport) return null;

    // Build date range for today's games
    const gameDateObj = new Date(date + 'T00:00:00');
    const commenceTimeFrom = gameDateObj.toISOString().replace(/\.\d{3}Z$/, 'Z');
    const gameDateNext = new Date(gameDateObj);
    gameDateNext.setDate(gameDateNext.getDate() + 1);
    const commenceTimeTo = gameDateNext.toISOString().replace(/\.\d{3}Z$/, 'Z');

    // Bulk odds fetch: all games for this sport with spreads, h2h, totals
    // Cost: 3 credits (3 markets x 1 region)
    const url = `https://api.the-odds-api.com/v4/sports/${oddsApiSport}/odds` +
      `?apiKey=${apiKey}` +
      `&regions=us` +
      `&markets=spreads,h2h,totals` +
      `&oddsFormat=american` +
      `&commenceTimeFrom=${commenceTimeFrom}` +
      `&commenceTimeTo=${commenceTimeTo}`;

    console.log(`📡 Fetching bulk odds for ${sport} (${oddsApiSport})`);

    const response = await fetch(url);

    // Track API usage from response headers
    const requestsUsed = response.headers.get('x-requests-used');
    const requestsRemaining = response.headers.get('x-requests-remaining');
    const lastRequestCost = response.headers.get('x-requests-last');

    if (requestsUsed || requestsRemaining) {
      setApiUsage({
        used: parseInt(requestsUsed) || 0,
        remaining: parseInt(requestsRemaining) || 0,
        lastCost: parseInt(lastRequestCost) || 0
      });
      console.log(`📊 API Usage — Used: ${requestsUsed}, Remaining: ${requestsRemaining}, Last cost: ${lastRequestCost}`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to fetch odds for ${sport}: ${response.status} - ${errorText}`);
      return null;
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      console.log(`No games found for ${sport} on ${date}`);
      return { sport, date, fetchedAt: new Date().toISOString(), games: [] };
    }

    // Process each game
    const games = data.map(event => {
      const selected = selectBookmaker(event.bookmakers);
      if (!selected) return null;

      const { bookmaker, bookmakerName } = selected;
      const markets = extractMarketOdds(bookmaker, bookmakerName, event);

      return {
        eventId: event.id,
        homeTeam: event.home_team,
        awayTeam: event.away_team,
        commenceTime: event.commence_time,
        bookmaker: bookmakerName,
        markets
      };
    }).filter(Boolean);

    console.log(`✅ Found ${games.length} games with odds for ${sport}`);

    return {
      sport,
      date,
      fetchedAt: new Date().toISOString(),
      games
    };
  };

  /**
   * Save odds data to Firestore for a sport/date
   */
  const saveOddsToFirestore = async (oddsData) => {
    if (!db || !oddsData) return;

    try {
      const docRef = doc(db, 'dailyOdds', getDocId(oddsData.date, oddsData.sport));
      await setDoc(docRef, oddsData);
      console.log(`💾 Saved ${oddsData.sport} odds to Firestore (${oddsData.games.length} games)`);
    } catch (err) {
      console.error(`Error saving odds for ${oddsData.sport}:`, err);
    }
  };

  /**
   * Fetch all odds for today
   * Checks cache first, only fetches from API for missing/stale sports
   *
   * @param {boolean} forceRefresh - Skip cache and re-fetch everything
   * @returns {Object} Odds data keyed by sport
   */
  const fetchTodaysOdds = useCallback(async (forceRefresh = false) => {
    if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
      setError('The Odds API key not configured');
      return {};
    }

    setLoading(true);
    setError(null);

    const today = getTodayString();
    const sportsInSeason = getCurrentSportsInSeason().filter(s =>
      SUPPORTED_RECOMMENDATION_SPORTS.includes(s)
    );

    console.log(`🏟️ Sports in season for recommendations: ${sportsInSeason.join(', ')}`);

    try {
      // Check what we already have cached
      let allOdds = {};

      if (!forceRefresh) {
        allOdds = await loadCachedOdds(today);
        const cachedSports = Object.keys(allOdds);
        if (cachedSports.length > 0) {
          console.log(`📦 Found cached odds for: ${cachedSports.join(', ')}`);
        }
      }

      // Determine which sports still need fetching
      const sportsToFetch = forceRefresh
        ? sportsInSeason
        : sportsInSeason.filter(s => !allOdds[s]);

      if (sportsToFetch.length === 0) {
        console.log('✅ All odds already cached for today');
        setDailyOdds(allOdds);
        setLastFetched(Object.values(allOdds)[0]?.fetchedAt || null);
        setOddsDate(today);
        setIsStale(false);
        setLoading(false);
        return allOdds;
      }

      console.log(`📡 Fetching odds for: ${sportsToFetch.join(', ')} (${sportsToFetch.length * 3} credits)`);

      // Fetch each sport sequentially to be respectful of rate limits
      for (const sport of sportsToFetch) {
        const oddsData = await fetchBulkOddsForSport(sport, today);
        if (oddsData) {
          allOdds[sport] = oddsData;
          // Save to Firestore for caching and historical archive
          await saveOddsToFirestore(oddsData);
        }
      }

      setDailyOdds(allOdds);
      setLastFetched(new Date().toISOString());
      setOddsDate(today);
      setIsStale(false);
      setLoading(false);
      return allOdds;
    } catch (err) {
      console.error('Error fetching daily odds:', err);
      setError(err.message || 'Failed to fetch odds');
      setLoading(false);
      return {};
    }
  }, [apiKey, db, loadCachedOdds]);

  /**
   * Get all available picks from today's odds, filtered to -150 to +150 odds range
   * Flattens the nested structure into individual pick candidates
   *
   * @returns {Array} Array of pick candidates with odds in range
   */
  const getFilteredPicks = useCallback((oddsRange = { min: -150, max: 150 }) => {
    const picks = [];

    Object.entries(dailyOdds).forEach(([sport, data]) => {
      if (!data.games) return;

      data.games.forEach(game => {
        const { markets, homeTeam, awayTeam, commenceTime, eventId } = game;
        const gameInfo = { sport, homeTeam, awayTeam, commenceTime, eventId, bookmaker: game.bookmaker };

        // Spread picks
        if (markets.spreads) {
          if (markets.spreads.home && isInOddsRange(markets.spreads.home.odds, oddsRange)) {
            picks.push({
              ...gameInfo,
              betType: 'Spread',
              team: homeTeam,
              line: markets.spreads.home.line,
              odds: markets.spreads.home.odds,
              direction: markets.spreads.home.line < 0 ? 'favorite' : 'underdog'
            });
          }
          if (markets.spreads.away && isInOddsRange(markets.spreads.away.odds, oddsRange)) {
            picks.push({
              ...gameInfo,
              betType: 'Spread',
              team: awayTeam,
              line: markets.spreads.away.line,
              odds: markets.spreads.away.odds,
              direction: markets.spreads.away.line < 0 ? 'favorite' : 'underdog'
            });
          }
        }

        // Moneyline picks
        if (markets.moneyline) {
          if (markets.moneyline.home && isInOddsRange(markets.moneyline.home.odds, oddsRange)) {
            picks.push({
              ...gameInfo,
              betType: 'Moneyline',
              team: homeTeam,
              odds: markets.moneyline.home.odds,
              direction: markets.moneyline.home.odds < 0 ? 'favorite' : 'underdog'
            });
          }
          if (markets.moneyline.away && isInOddsRange(markets.moneyline.away.odds, oddsRange)) {
            picks.push({
              ...gameInfo,
              betType: 'Moneyline',
              team: awayTeam,
              odds: markets.moneyline.away.odds,
              direction: markets.moneyline.away.odds < 0 ? 'favorite' : 'underdog'
            });
          }
        }

        // Total picks
        if (markets.totals) {
          if (markets.totals.over && isInOddsRange(markets.totals.over.odds, oddsRange)) {
            picks.push({
              ...gameInfo,
              betType: 'Total',
              team: `${awayTeam} @ ${homeTeam}`,
              line: markets.totals.over.line,
              odds: markets.totals.over.odds,
              direction: 'over'
            });
          }
          if (markets.totals.under && isInOddsRange(markets.totals.under.odds, oddsRange)) {
            picks.push({
              ...gameInfo,
              betType: 'Total',
              team: `${awayTeam} @ ${homeTeam}`,
              line: markets.totals.under.line,
              odds: markets.totals.under.odds,
              direction: 'under'
            });
          }
        }
      });
    });

    return picks;
  }, [dailyOdds]);

  /**
   * Get the odds snapshot for a specific game (for attaching to picks)
   *
   * @param {string} sport - Sport name
   * @param {string} homeTeam - Home team name
   * @param {string} awayTeam - Away team name
   * @returns {Object|null} The game's market data from cached odds
   */
  const getOddsForGame = useCallback((sport, homeTeam, awayTeam) => {
    const sportOdds = dailyOdds[sport];
    if (!sportOdds || !sportOdds.games) return null;

    const game = sportOdds.games.find(g =>
      g.homeTeam === homeTeam && g.awayTeam === awayTeam
    );

    return game || null;
  }, [dailyOdds]);

  /**
   * Load cached odds on mount
   * Tries today first. If nothing cached for today, falls back to yesterday.
   * If it's after 9am ET and today has no data, auto-fetches today's odds.
   */
  useEffect(() => {
    if (!db) return;

    const loadOnMount = async () => {
      const today = getTodayString();

      // Try loading today's cached odds
      const todayCached = await loadCachedOdds(today);

      if (Object.keys(todayCached).length > 0) {
        // We have today's data
        setDailyOdds(todayCached);
        setOddsDate(today);
        setIsStale(false);
        const mostRecent = Object.values(todayCached)
          .map(d => d.fetchedAt)
          .filter(Boolean)
          .sort()
          .pop();
        setLastFetched(mostRecent || null);
        setLoading(false);
        return;
      }

      // No today data — try yesterday as fallback
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const yesterdayCached = await loadCachedOdds(yesterdayStr);

      if (Object.keys(yesterdayCached).length > 0) {
        console.log(`📦 No odds for today — showing yesterday's odds (${yesterdayStr})`);
        setDailyOdds(yesterdayCached);
        setOddsDate(yesterdayStr);
        setIsStale(true);
        const mostRecent = Object.values(yesterdayCached)
          .map(d => d.fetchedAt)
          .filter(Boolean)
          .sort()
          .pop();
        setLastFetched(mostRecent || null);
      }

      // Check if we should auto-fetch today's odds (after 9am ET)
      const nowET = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
      if (nowET.getHours() >= 9 && apiKey && apiKey !== 'YOUR_API_KEY_HERE') {
        console.log('⏰ After 9am ET — auto-fetching today\'s odds');
        setLoading(true);
        // fetchTodaysOdds will update all state including oddsDate
        await fetchTodaysOdds(false);
      } else {
        setLoading(false);
      }
    };

    loadOnMount();
  }, [db, apiKey, loadCachedOdds, fetchTodaysOdds]);

  return {
    dailyOdds,
    loading,
    error,
    lastFetched,
    apiUsage,
    oddsDate,         // Which date's odds are loaded (YYYY-MM-DD)
    isStale,          // True if showing a previous day's odds (not today)
    fetchTodaysOdds,  // Used internally by auto-fetch; not exposed as a UI action
    getFilteredPicks,
    getOddsForGame
  };
};

/**
 * Check if odds value falls within the specified range
 */
const isInOddsRange = (odds, range) => {
  if (odds === undefined || odds === null) return false;
  return odds >= range.min && odds <= range.max;
};
