import { normalizePlayerName } from '../utils/formatters';
import { INDIVIDUAL_SPORTS } from '../constants/sports';

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

          // ESPN returns athletes grouped by position (offense, defense, special teams)
          // We need to flatten all the groups' items arrays into one athlete list
          const athletes = [];
          if (rosterData.athletes && Array.isArray(rosterData.athletes)) {
            for (const group of rosterData.athletes) {
              if (group.items && Array.isArray(group.items)) {
                athletes.push(...group.items);
              }
            }
          }

          return { team, athletes };
        } catch (error) {
          console.warn(`Error fetching roster for ${team.displayName}:`, error);
          return null;
        }
      });

      // Wait for all roster fetches to complete
      const rosters = await Promise.all(rosterPromises);

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

  return { lookupPlayer };
};
