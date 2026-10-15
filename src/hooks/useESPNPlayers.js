import { normalizePlayerName } from '../utils/formatters';
import { INDIVIDUAL_SPORTS, ESPN_SITE_API_PROXY } from '../constants/sports';

// ESPN occasionally leaves a request hanging with no response. Without a timeout,
// one stuck roster blocks the whole lookup forever, so cap each request
// (rosters normally return in well under 500ms).
const ESPN_REQUEST_TIMEOUT_MS = 3000;

// Rosters rarely change within a session - cache them per sport so repeat lookups
// are instant and don't re-fire ~30 roster requests on every blur.
const ROSTER_CACHE_TTL_MS = 30 * 60 * 1000;
const rosterCache = new Map(); // espnSport -> { fetchedAt, promise }

const fetchWithTimeout = async (url) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ESPN_REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Fetch every team roster for a sport (cached).
 * Teams whose roster fails or times out are skipped rather than failing the lookup.
 * @returns {Promise<Array<{ team, athletes }>>}
 */
const loadRosters = async (espnSport) => {
  const teamsUrl = `${ESPN_SITE_API_PROXY}/site/v2/sports/${espnSport}/teams`;
  const teamsResponse = await fetchWithTimeout(teamsUrl);

  if (!teamsResponse.ok) {
    throw new Error(`Failed to fetch teams: ${teamsResponse.status}`);
  }

  const teamsData = await teamsResponse.json();
  const teams = teamsData.sports?.[0]?.leagues?.[0]?.teams;
  if (!teams) {
    throw new Error('Invalid teams data structure');
  }

  const rosters = await Promise.all(teams.map(async ({ team }) => {
    try {
      const rosterUrl = `${ESPN_SITE_API_PROXY}/site/v2/sports/${espnSport}/teams/${team.id}/roster`;
      const rosterResponse = await fetchWithTimeout(rosterUrl);

      if (!rosterResponse.ok) {
        console.warn(`Failed to fetch roster for ${team.displayName}`);
        return null;
      }

      const rosterData = await rosterResponse.json();

      // ESPN roster API has two formats:
      // 1. Grouped by position (NFL): athletes is array of { items: [athlete, ...] }
      // 2. Flat list (NBA, MLB, NHL, etc.): athletes is array of athlete objects directly
      const athletes = [];
      if (rosterData.athletes && Array.isArray(rosterData.athletes)) {
        for (const entry of rosterData.athletes) {
          if (entry.items && Array.isArray(entry.items)) {
            athletes.push(...entry.items);
          } else if (entry.fullName || entry.displayName || entry.id) {
            athletes.push(entry);
          }
        }
      }

      return { team, athletes };
    } catch (error) {
      console.warn(`Error fetching roster for ${team.displayName}:`, error.name === 'AbortError' ? 'timed out' : error);
      return null;
    }
  }));

  return rosters;
};

const getRosters = (espnSport) => {
  const cached = rosterCache.get(espnSport);
  if (cached && Date.now() - cached.fetchedAt < ROSTER_CACHE_TTL_MS) {
    return cached.promise;
  }

  const promise = loadRosters(espnSport).then((rosters) => {
    // Use a partial result now (some rosters failed/timed out), but don't cache it
    if (rosters.some(r => !r)) rosterCache.delete(espnSport);
    return rosters.filter(Boolean);
  }).catch((error) => {
    rosterCache.delete(espnSport);
    throw error;
  });

  rosterCache.set(espnSport, { fetchedAt: Date.now(), promise });
  return promise;
};

/**
 * Custom hook for ESPN player roster lookups
 * Fetches player team and position data from ESPN API
 */
export const useESPNPlayers = () => {

  /**
   * Get ESPN sport identifier from our sport name
   */
  const getESPNSport = (sport) => {
    const sportMap = {
      'NFL': 'football/nfl',
      'NBA': 'basketball/nba',
      'MLB': 'baseball/mlb',
      'NHL': 'hockey/nhl',
      'College Football': 'football/college-football',
      'College Basketball': 'basketball/mens-college-basketball',
      'College Basketball (Women\'s)': 'basketball/womens-college-basketball',
      'WNBA': 'basketball/wnba',
      'Soccer': 'soccer/usa.1',
      'Soccer (Women\'s)': 'soccer/usa.nwsl'
    };
    return sportMap[sport] || null;
  };

  /**
   * Search for a player by name in ESPN roster data
   * @param {string} playerName - Player name to search
   * @param {string} sport - Sport (NFL, NBA, MLB, NHL, etc.)
   * @returns {Object|null} { team, position, fullName, suggestions[] } or null
   */
  const lookupPlayer = async (playerName, sport) => {
    if (!playerName || playerName.length < 3) return null;

    // Individual sports - skip team lookup
    if (INDIVIDUAL_SPORTS.includes(sport)) {
      return null;
    }

    try {
      const espnSport = getESPNSport(sport);
      if (!espnSport) {
        console.log(`Sport ${sport} not supported for player lookup`);
        return null;
      }

      console.log(`Loading ${sport} rosters for player lookup`);
      const rosters = await getRosters(espnSport);
      const suggestions = [];

      const totalAthletes = rosters.reduce((sum, r) => sum + (r?.athletes?.length || 0), 0);
      console.log(`Searching for "${playerName}" across ${rosters.filter(r => r).length} team rosters (${totalAthletes} total players)`);

      // Search through all rosters
      for (const roster of rosters) {
        if (!roster || !Array.isArray(roster.athletes)) continue;

        const team = roster.team;

        // Search athletes
        for (const entry of roster.athletes) {
          // Handle both nested (entry.athlete) and flat (entry) structures
          const athlete = entry.athlete || entry;
          const fullName = athlete.fullName || athlete.displayName;
          if (!fullName) continue;

          const normalizedFullName = normalizePlayerName(fullName);
          const normalizedSearch = normalizePlayerName(playerName);

          // Exact match
          if (normalizedFullName === normalizedSearch) {
            const position = athlete.position?.abbreviation || athlete.position?.name || 'N/A';
            console.log(`✅ Found exact match: ${fullName} - ${team.displayName} (${position})`);
            console.log('Player data:', { fullName, team: team.displayName, position, positionObj: athlete.position });
            return {
              team: team.displayName,
              position: position,
              fullName: fullName,
              suggestions: []
            };
          }

          // Fuzzy match for suggestions
          const fullNameLower = fullName.toLowerCase();
          const searchLower = playerName.toLowerCase();

          // Check if names match when split by words (helps with partial names)
          const fullNameWords = fullNameLower.split(/\s+/);
          const searchWords = searchLower.split(/\s+/);

          // Match if search contains any part of the full name, or vice versa
          const hasWordMatch = searchWords.some(searchWord =>
            fullNameWords.some(nameWord =>
              nameWord.includes(searchWord) || searchWord.includes(nameWord)
            )
          );

          if (fullNameLower.includes(searchLower) ||
              searchLower.includes(fullNameLower) ||
              hasWordMatch) {
            suggestions.push({
              name: fullName,
              team: team.displayName,
              position: athlete.position?.abbreviation || 'N/A'
            });
          }
        }
      }

      console.log(`Searched ${playerName}, normalized: ${normalizePlayerName(playerName)}, found ${suggestions.length} suggestions`);

      // No exact match - return suggestions
      if (suggestions.length > 0) {
        console.log(`Found ${suggestions.length} suggestions for "${playerName}"`);
        return {
          team: null,
          position: null,
          fullName: null,
          suggestions: suggestions.slice(0, 5) // Top 5 suggestions
        };
      }

      console.log(`No matches found for "${playerName}"`);
      return null;

    } catch (error) {
      console.error('Error fetching player data from ESPN:', error);
      return null;
    }
  };

  /**
   * Warm the roster cache in the background (e.g. as soon as a Player Prop
   * and sport are chosen) so the lookup on blur is instant.
   */
  const prefetchRosters = (sport) => {
    if (!sport || INDIVIDUAL_SPORTS.includes(sport)) return;
    const espnSport = getESPNSport(sport);
    if (!espnSport) return;
    getRosters(espnSport).catch(() => {}); // lookupPlayer retries and logs on failure
  };

  return { lookupPlayer, prefetchRosters };
};
