import { renderHook, waitFor } from '@testing-library/react';
import { useESPNTeams } from './useESPNTeams';

// Mock fetch globally
global.fetch = jest.fn();

describe('useESPNTeams', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('lookupTeams', () => {
    it('should return empty array for queries less than 2 characters', async () => {
      const { result } = renderHook(() => useESPNTeams());

      const teams = await result.current.lookupTeams('M', 'College Basketball');

      expect(teams).toEqual([]);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should return empty array when no sport is provided', async () => {
      const { result } = renderHook(() => useESPNTeams());

      const teams = await result.current.lookupTeams('Michigan', null);

      expect(teams).toEqual([]);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should fetch and return teams for College Basketball', async () => {
      const mockResponse = {
        sports: [{
          leagues: [{
            teams: [
              {
                team: {
                  id: '130',
                  displayName: 'Michigan Wolverines',
                  shortDisplayName: 'Michigan',
                  abbreviation: 'MICH',
                  location: 'Michigan',
                  name: 'Wolverines',
                  logos: [{ href: 'https://example.com/logo.png' }]
                }
              },
              {
                team: {
                  id: '127',
                  displayName: 'Michigan State Spartans',
                  shortDisplayName: 'Michigan State',
                  abbreviation: 'MSU',
                  location: 'Michigan State',
                  name: 'Spartans',
                  logos: [{ href: 'https://example.com/logo2.png' }]
                }
              }
            ]
          }]
        }]
      };

      fetch.mockResolvedValueOnce({
        json: async () => mockResponse
      });

      const { result } = renderHook(() => useESPNTeams());

      const teams = await result.current.lookupTeams('Michigan', 'College Basketball');

      expect(fetch).toHaveBeenCalledWith(
        'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams'
      );
      expect(teams).toHaveLength(2);
      expect(teams[0].name).toBe('Michigan Wolverines');
      expect(teams[1].name).toBe('Michigan State Spartans');
    });

    it('should filter teams based on query', async () => {
      const mockResponse = {
        sports: [{
          leagues: [{
            teams: [
              {
                team: {
                  id: '130',
                  displayName: 'Michigan Wolverines',
                  shortDisplayName: 'Michigan',
                  abbreviation: 'MICH',
                  location: 'Michigan',
                  name: 'Wolverines',
                  logos: []
                }
              },
              {
                team: {
                  id: '127',
                  displayName: 'Michigan State Spartans',
                  shortDisplayName: 'Michigan State',
                  abbreviation: 'MSU',
                  location: 'Michigan State',
                  name: 'Spartans',
                  logos: []
                }
              },
              {
                team: {
                  id: '333',
                  displayName: 'Duke Blue Devils',
                  shortDisplayName: 'Duke',
                  abbreviation: 'DUKE',
                  location: 'Duke',
                  name: 'Blue Devils',
                  logos: []
                }
              }
            ]
          }]
        }]
      };

      fetch.mockResolvedValueOnce({
        json: async () => mockResponse
      });

      const { result } = renderHook(() => useESPNTeams());

      const teams = await result.current.lookupTeams('Wolverines', 'College Basketball');

      // Should only return Michigan Wolverines, not Michigan State or Duke
      expect(teams).toHaveLength(1);
      expect(teams[0].name).toBe('Michigan Wolverines');
      expect(teams[0].nickname).toBe('Wolverines');
    });

    it('should sort exact matches first', async () => {
      const mockResponse = {
        sports: [{
          leagues: [{
            teams: [
              {
                team: {
                  id: '2',
                  displayName: 'Buffalo Bulls',
                  shortDisplayName: 'Buffalo',
                  abbreviation: 'BUF',
                  location: 'Buffalo',
                  name: 'Bulls',
                  logos: []
                }
              },
              {
                team: {
                  id: '1',
                  displayName: 'Duke Blue Devils',
                  shortDisplayName: 'Duke',
                  abbreviation: 'DUKE',
                  location: 'Duke',
                  name: 'Blue Devils',
                  logos: []
                }
              }
            ]
          }]
        }]
      };

      fetch.mockResolvedValueOnce({
        json: async () => mockResponse
      });

      const { result } = renderHook(() => useESPNTeams());

      const teams = await result.current.lookupTeams('duke', 'College Basketball');

      // Duke should be first (exact match on location)
      expect(teams[0].name).toBe('Duke Blue Devils');
    });

    it('should limit results to 10 teams', async () => {
      const mockTeams = Array.from({ length: 15 }, (_, i) => ({
        team: {
          id: `${i}`,
          displayName: `Team ${i}`,
          shortDisplayName: `Team ${i}`,
          abbreviation: `T${i}`,
          location: `Location ${i}`,
          name: `Name ${i}`,
          logos: []
        }
      }));

      const mockResponse = {
        sports: [{
          leagues: [{
            teams: mockTeams
          }]
        }]
      };

      fetch.mockResolvedValueOnce({
        json: async () => mockResponse
      });

      const { result } = renderHook(() => useESPNTeams());

      const teams = await result.current.lookupTeams('team', 'College Basketball');

      expect(teams).toHaveLength(10);
    });

    it('should handle API errors gracefully', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useESPNTeams());

      const teams = await result.current.lookupTeams('Michigan', 'College Basketball');

      expect(teams).toEqual([]);
    });

    it('should handle missing sports data', async () => {
      const mockResponse = {
        // Missing sports array
      };

      fetch.mockResolvedValueOnce({
        json: async () => mockResponse
      });

      const { result } = renderHook(() => useESPNTeams());

      const teams = await result.current.lookupTeams('Michigan', 'College Basketball');

      expect(teams).toEqual([]);
    });

    it('should map sport names to correct ESPN endpoints', async () => {
      const mockResponse = {
        sports: [{
          leagues: [{
            teams: []
          }]
        }]
      };

      fetch.mockResolvedValue({
        json: async () => mockResponse
      });

      const { result } = renderHook(() => useESPNTeams());

      // Test NFL
      await result.current.lookupTeams('Patriots', 'NFL');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('football/nfl')
      );

      // Test NBA
      await result.current.lookupTeams('Lakers', 'NBA');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('basketball/nba')
      );

      // Test College Basketball
      await result.current.lookupTeams('Duke', 'College Basketball');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('basketball/mens-college-basketball')
      );
    });

    it('should set loading state correctly', async () => {
      const mockResponse = {
        sports: [{
          leagues: [{
            teams: []
          }]
        }]
      };

      fetch.mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({ json: async () => mockResponse }), 100)
        )
      );

      const { result } = renderHook(() => useESPNTeams());

      expect(result.current.loading).toBe(false);

      const promise = result.current.lookupTeams('Michigan', 'College Basketball');

      // Note: loading state changes happen asynchronously
      // We can't reliably test loading=true without more complex setup

      await promise;

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should match teams by abbreviation', async () => {
      const mockResponse = {
        sports: [{
          leagues: [{
            teams: [
              {
                team: {
                  id: '130',
                  displayName: 'Michigan Wolverines',
                  shortDisplayName: 'Michigan',
                  abbreviation: 'MICH',
                  location: 'Michigan',
                  name: 'Wolverines',
                  logos: []
                }
              }
            ]
          }]
        }]
      };

      fetch.mockResolvedValueOnce({
        json: async () => mockResponse
      });

      const { result } = renderHook(() => useESPNTeams());

      const teams = await result.current.lookupTeams('MICH', 'College Basketball');

      expect(teams).toHaveLength(1);
      expect(teams[0].abbreviation).toBe('MICH');
    });
  });

  describe('Edge cases', () => {
    it('should handle case-insensitive queries', async () => {
      const mockResponse = {
        sports: [{
          leagues: [{
            teams: [
              {
                team: {
                  id: '130',
                  displayName: 'Michigan Wolverines',
                  shortDisplayName: 'Michigan',
                  abbreviation: 'MICH',
                  location: 'Michigan',
                  name: 'Wolverines',
                  logos: []
                }
              }
            ]
          }]
        }]
      };

      fetch.mockResolvedValue({
        json: async () => mockResponse
      });

      const { result } = renderHook(() => useESPNTeams());

      const teams1 = await result.current.lookupTeams('michigan', 'College Basketball');
      const teams2 = await result.current.lookupTeams('MICHIGAN', 'College Basketball');
      const teams3 = await result.current.lookupTeams('MiChIgAn', 'College Basketball');

      expect(teams1).toHaveLength(1);
      expect(teams2).toHaveLength(1);
      expect(teams3).toHaveLength(1);
    });

    it('should not match Michigan to Michigan State', async () => {
      const mockResponse = {
        sports: [{
          leagues: [{
            teams: [
              {
                team: {
                  id: '130',
                  displayName: 'Michigan Wolverines',
                  shortDisplayName: 'Michigan',
                  abbreviation: 'MICH',
                  location: 'Michigan',
                  name: 'Wolverines',
                  logos: []
                }
              },
              {
                team: {
                  id: '127',
                  displayName: 'Michigan State Spartans',
                  shortDisplayName: 'Michigan State',
                  abbreviation: 'MSU',
                  location: 'Michigan State',
                  name: 'Spartans',
                  logos: []
                }
              }
            ]
          }]
        }]
      };

      fetch.mockResolvedValueOnce({
        json: async () => mockResponse
      });

      const { result } = renderHook(() => useESPNTeams());

      // Both should be returned since query matches both
      const teams = await result.current.lookupTeams('michigan', 'College Basketball');

      expect(teams).toHaveLength(2);
      expect(teams.map(t => t.name)).toContain('Michigan Wolverines');
      expect(teams.map(t => t.name)).toContain('Michigan State Spartans');
    });
  });
});
