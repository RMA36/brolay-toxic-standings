import { useState } from 'react';

/**
 * Custom hook for ESPN Team lookup and autocomplete
 * Fetches team data from ESPN API based on sport
 */
export const useESPNTeams = () => {
  const [loading, setLoading] = useState(false);

  // Map sport to ESPN API endpoint
  const getESPNSport = (sport) => {
    const sportMap = {
      'NFL': 'football/nfl',
      'NBA': 'basketball/nba',
      'MLB': 'baseball/mlb',
      'NHL': 'hockey/nhl',
      'College Football': 'football/college-football',
      'College Basketball': 'basketball/mens-college-basketball',
      'College Basketball (Women\'s)': 'basketball/womens-college-basketball',
      'Soccer': 'soccer/usa.1',
      'Soccer (Women\'s)': 'soccer/usa.nwsl',
      'WNBA': 'basketball/wnba',
      'College Baseball': 'baseball/college-baseball',
    };

    return sportMap[sport] || null;
  };

  /**
   * Fetch teams for a given sport and return matching suggestions
   * @param {string} query - User's search query
   * @param {string} sport - Sport type
   * @returns {Promise<Array>} - Array of team suggestions
   */
  const lookupTeams = async (query, sport) => {
    if (!query || query.length < 2) return [];
    if (!sport) return [];

    const espnSport = getESPNSport(sport);
    if (!espnSport) return [];

    setLoading(true);

    try {
      // Fetch teams from ESPN API
      const url = `https://site.api.espn.com/apis/site/v2/sports/${espnSport}/teams`;
      const response = await fetch(url);
      const data = await response.json();

      if (!data.sports?.[0]?.leagues?.[0]?.teams) {
        setLoading(false);
        return [];
      }

      // Extract team names
      const teams = data.sports[0].leagues[0].teams.map(teamWrapper => {
        const team = teamWrapper.team;
        return {
          id: team.id,
          name: team.displayName, // Full name like "Michigan Wolverines"
          shortName: team.shortDisplayName, // Short name like "Michigan"
          abbreviation: team.abbreviation, // Abbreviation like "MICH"
          logo: team.logos?.[0]?.href,
          location: team.location, // "Michigan"
          nickname: team.name // "Wolverines"
        };
      });

      // Filter teams based on query
      const normalizedQuery = query.toLowerCase();
      const matches = teams.filter(team => {
        const searchFields = [
          team.name,
          team.shortName,
          team.location,
          team.nickname,
          team.abbreviation
        ].map(field => field?.toLowerCase() || '');

        return searchFields.some(field => field.includes(normalizedQuery));
      });

      // Sort matches: exact matches first, then starts-with, then contains
      matches.sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();

        if (aName === normalizedQuery) return -1;
        if (bName === normalizedQuery) return 1;

        if (aName.startsWith(normalizedQuery) && !bName.startsWith(normalizedQuery)) return -1;
        if (!aName.startsWith(normalizedQuery) && bName.startsWith(normalizedQuery)) return 1;

        return aName.localeCompare(bName);
      });

      setLoading(false);
      return matches.slice(0, 10); // Return top 10 matches

    } catch (error) {
      console.error('Error fetching teams:', error);
      setLoading(false);
      return [];
    }
  };

  return {
    lookupTeams,
    loading
  };
};
