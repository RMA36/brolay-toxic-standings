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
    console.log('[lookupTeams] Called with query:', query, 'sport:', sport);

    if (!query || query.length < 2) {
      console.log('[lookupTeams] Query too short, returning empty');
      return [];
    }
    if (!sport) {
      console.log('[lookupTeams] No sport provided, returning empty');
      return [];
    }

    const espnSport = getESPNSport(sport);
    console.log('[lookupTeams] ESPN sport mapped to:', espnSport);

    if (!espnSport) {
      console.log('[lookupTeams] Sport not found in mapping, returning empty');
      return [];
    }

    setLoading(true);

    try {
      // Fetch teams from ESPN API
      const url = `https://site.api.espn.com/apis/site/v2/sports/${espnSport}/teams`;
      console.log('[lookupTeams] Fetching from URL:', url);

      const response = await fetch(url);
      const data = await response.json();

      console.log('[lookupTeams] API response data:', data);

      if (!data.sports?.[0]?.leagues?.[0]?.teams) {
        console.log('[lookupTeams] No teams found in response structure');
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

      console.log('[lookupTeams] Extracted teams count:', teams.length);

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

      console.log('[lookupTeams] Matches found:', matches.length, matches);

      // Sort matches: exact matches first, then starts-with, then contains
      matches.sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        const aLocation = a.location?.toLowerCase() || '';
        const bLocation = b.location?.toLowerCase() || '';

        // Exact match on any field gets highest priority
        const aExactMatch = aName === normalizedQuery || aLocation === normalizedQuery ||
                           a.nickname?.toLowerCase() === normalizedQuery;
        const bExactMatch = bName === normalizedQuery || bLocation === normalizedQuery ||
                           b.nickname?.toLowerCase() === normalizedQuery;

        if (aExactMatch && !bExactMatch) return -1;
        if (!aExactMatch && bExactMatch) return 1;

        // Then prioritize starts-with matches
        if (aName.startsWith(normalizedQuery) && !bName.startsWith(normalizedQuery)) return -1;
        if (!aName.startsWith(normalizedQuery) && bName.startsWith(normalizedQuery)) return 1;

        // Finally sort alphabetically
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
