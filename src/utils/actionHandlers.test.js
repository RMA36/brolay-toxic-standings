import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { matchPlayerName, saveLearnedData } from './actionHandlers';

describe('actionHandlers.js', () => {
  describe('matchPlayerName', () => {
    it('should match exact same names', () => {
      expect(matchPlayerName('Patrick Mahomes', 'Patrick Mahomes')).toBe(true);
      expect(matchPlayerName('Josh Allen', 'Josh Allen')).toBe(true);
    });

    it('should match names with different casing', () => {
      expect(matchPlayerName('patrick mahomes', 'Patrick Mahomes')).toBe(true);
      expect(matchPlayerName('JOSH ALLEN', 'josh allen')).toBe(true);
    });

    it('should match names with different spacing/punctuation', () => {
      expect(matchPlayerName('Patrick  Mahomes', 'Patrick Mahomes')).toBe(true);
      expect(matchPlayerName("D'Andre Swift", 'DAndre Swift')).toBe(true);
      expect(matchPlayerName('A.J. Brown', 'AJ Brown')).toBe(true);
    });

    it('should match by last name if last name is >3 characters', () => {
      expect(matchPlayerName('P. Mahomes', 'Patrick Mahomes')).toBe(true);
      expect(matchPlayerName('Mahomes', 'Patrick Mahomes')).toBe(true);
      expect(matchPlayerName('Josh Allen', 'J. Allen')).toBe(true);
    });

    it('should not match different players with short last names', () => {
      // Last name "Lee" is only 3 chars, shouldn't match on last name alone
      expect(matchPlayerName('John Lee', 'Mike Lee')).toBe(false);
    });

    it('should not match completely different names', () => {
      expect(matchPlayerName('Patrick Mahomes', 'Josh Allen')).toBe(false);
      expect(matchPlayerName('Tom Brady', 'Aaron Rodgers')).toBe(false);
    });

    it('should handle null/undefined inputs', () => {
      expect(matchPlayerName(null, 'Patrick Mahomes')).toBe(false);
      expect(matchPlayerName('Patrick Mahomes', null)).toBe(false);
      expect(matchPlayerName(undefined, 'Josh Allen')).toBe(false);
      expect(matchPlayerName('Josh Allen', undefined)).toBe(false);
      expect(matchPlayerName(null, null)).toBe(false);
    });

    it('should handle empty strings', () => {
      expect(matchPlayerName('', 'Patrick Mahomes')).toBe(false);
      expect(matchPlayerName('Patrick Mahomes', '')).toBe(false);
      expect(matchPlayerName('', '')).toBe(false);
    });

    it('should match names with Jr/Sr suffixes', () => {
      expect(matchPlayerName('Patrick Mahomes Jr.', 'Patrick Mahomes')).toBe(true);
      expect(matchPlayerName('Marvin Harrison', 'Marvin Harrison Jr.')).toBe(true);
    });
  });

  describe('saveLearnedData', () => {
    // Mock localStorage
    let localStorageMock;

    beforeEach(() => {
      localStorageMock = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      };
      global.localStorage = localStorageMock;
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it('should save teams, propTypes, and players to localStorage', () => {
      const teams = ['Kansas City Chiefs', 'Buffalo Bills'];
      const propTypes = ['Passing Yards', 'Rushing Yards'];
      const players = ['Patrick Mahomes', 'Josh Allen'];

      saveLearnedData(teams, propTypes, players);

      expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'brolay-learned-data',
        JSON.stringify({
          teams,
          propTypes,
          players,
        })
      );
    });

    it('should save empty arrays', () => {
      saveLearnedData([], [], []);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'brolay-learned-data',
        JSON.stringify({
          teams: [],
          propTypes: [],
          players: [],
        })
      );
    });

    it('should handle missing players parameter (defaults to empty array)', () => {
      const teams = ['Kansas City Chiefs'];
      const propTypes = ['Passing Yards'];

      saveLearnedData(teams, propTypes);

      const callArgs = localStorageMock.setItem.mock.calls[0];
      const savedData = JSON.parse(callArgs[1]);

      expect(savedData.teams).toEqual(teams);
      expect(savedData.propTypes).toEqual(propTypes);
      expect(savedData.players).toEqual([]);
    });

    it('should overwrite existing data', () => {
      const teams1 = ['Team A'];
      const propTypes1 = ['Prop 1'];
      saveLearnedData(teams1, propTypes1);

      const teams2 = ['Team B', 'Team C'];
      const propTypes2 = ['Prop 2', 'Prop 3'];
      saveLearnedData(teams2, propTypes2);

      expect(localStorageMock.setItem).toHaveBeenCalledTimes(2);

      const lastCall = localStorageMock.setItem.mock.calls[1];
      const savedData = JSON.parse(lastCall[1]);

      expect(savedData.teams).toEqual(teams2);
      expect(savedData.propTypes).toEqual(propTypes2);
    });

    it('should handle special characters in data', () => {
      const teams = ["Team O'Brien", 'Team "Quotes"'];
      const propTypes = ['Prop/Type', 'Prop\\Type'];

      saveLearnedData(teams, propTypes);

      const callArgs = localStorageMock.setItem.mock.calls[0];
      const savedData = JSON.parse(callArgs[1]);

      expect(savedData.teams).toEqual(teams);
      expect(savedData.propTypes).toEqual(propTypes);
    });
  });
});
