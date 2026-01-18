import { normalizePlayerName } from '../utils/formatters';

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
    if (['Tennis', 'Tennis (Women\'s)', 'Golf', 'UFC'].includes(sport)) {
      return null;
    }

    try {
      const espnSport = getESPNSport(sport);
      if (!espnSport) {
        console.log(`Sport ${sport} not supported for player lookup`);
        return null;
      }

      // ESPN teams endpoint
      const teamsUrl = `https://site.api.espn.com/apis/site/v2/sports/${espnSport}/teams`;
      console.log(`Fetching teams for ${sport} player lookup`);
      const teamsResponse = await fetch(teamsUrl);

      if (!teamsResponse.ok) {
        console.error(`Failed to fetch teams: ${teamsResponse.status}`);
        return null;
      }

      const teamsData = await teamsResponse.json();

      if (!teamsData.sports || !teamsData.sports[0] || !teamsData.sports[0].leagues || !teamsData.sports[0].leagues[0]) {
        console.error('Invalid teams data structure');
        return null;
      }

      const suggestions = [];
      const teams = teamsData.sports[0].leagues[0].teams;

      // Fetch all team rosters in parallel for much faster lookups
      const rosterPromises = teams.map(async (teamObj) => {
        const team = teamObj.team;
        try {
          const rosterUrl = `https://site.api.espn.com/apis/site/v2/sports/${espnSport}/teams/${team.id}/roster`;
          const rosterResponse = await fetch(rosterUrl);

          if (!rosterResponse.ok) {
            console.warn(`Failed to fetch roster for ${team.displayName}`);
            return null;
          }

          const rosterData = await rosterResponse.json();
          return { team, athletes: rosterData.athletes || [] };
        } catch (error) {
          console.warn(`Error fetching roster for ${team.displayName}:`, error);
          return null;
        }
      });

      // Wait for all roster fetches to complete
      const rosters = await Promise.all(rosterPromises);

      // Search through all rosters
      for (const roster of rosters) {
        if (!roster || !Array.isArray(roster.athletes)) continue;

        const team = roster.team;

        // Search athletes
        for (const athlete of roster.athletes) {
          const fullName = athlete.displayName || athlete.fullName;
          if (!fullName) continue;

          const normalizedFullName = normalizePlayerName(fullName);
          const normalizedSearch = normalizePlayerName(playerName);

          // Exact match
          if (normalizedFullName === normalizedSearch) {
            console.log(`Found exact match: ${fullName} - ${team.displayName}`);
            return {
              team: team.displayName,
              position: athlete.position?.abbreviation || athlete.position?.name || 'N/A',
              fullName: fullName,
              suggestions: []
            };
          }

          // Fuzzy match for suggestions (if name contains search or vice versa)
          const fullNameLower = fullName.toLowerCase();
          const searchLower = playerName.toLowerCase();

          if (fullNameLower.includes(searchLower) || searchLower.includes(fullNameLower)) {
            suggestions.push({
              name: fullName,
              team: team.displayName,
              position: athlete.position?.abbreviation || 'N/A'
            });
          }
        }
      }

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

  return { lookupPlayer };
};
