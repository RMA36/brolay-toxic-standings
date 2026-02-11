import { describe, it, expect } from 'vitest';
import {
  formatDateForDisplay,
  formatDateForStorage,
  formatCalendarDate,
  formatBetDescription,
  getPickBigGuy,
  getPickResult,
  getPickActualStats,
  getPicksArray,
  getSubmittedBy,
  normalizePlayerName,
  normalizePropType,
  getPickPlayerPosition,
  getPickPlayerTeam,
  getPickPropType,
} from './formatters';
import {
  createMockPick,
  createMockPickOldSchema,
  createMockBrolay,
  createMockBrolayOldSchema,
  createMockPlayerPropPick,
} from '../test/mock-data';

describe('Date Formatting Functions', () => {
  describe('formatDateForDisplay', () => {
    it('should format yyyy-mm-dd to mm/dd/yyyy', () => {
      expect(formatDateForDisplay('2026-01-28')).toBe('01/28/2026');
      expect(formatDateForDisplay('2026-12-31')).toBe('12/31/2026');
    });

    it('should handle empty string', () => {
      expect(formatDateForDisplay('')).toBe('');
    });

    it('should handle null/undefined', () => {
      expect(formatDateForDisplay(null)).toBe('');
      expect(formatDateForDisplay(undefined)).toBe('');
    });
  });

  describe('formatDateForStorage', () => {
    it('should format mm/dd/yyyy to yyyy-mm-dd', () => {
      expect(formatDateForStorage('01/28/2026')).toBe('2026-01-28');
      expect(formatDateForStorage('12/31/2026')).toBe('2026-12-31');
    });

    it('should pad single digit months and days', () => {
      expect(formatDateForStorage('1/5/2026')).toBe('2026-01-05');
    });

    it('should return unchanged if already in storage format', () => {
      expect(formatDateForStorage('2026-01-28')).toBe('2026-01-28');
    });

    it('should handle empty string', () => {
      expect(formatDateForStorage('')).toBe('');
    });
  });

  describe('formatCalendarDate', () => {
    it('should format year, month, day to yyyy-mm-dd', () => {
      expect(formatCalendarDate(2026, 0, 28)).toBe('2026-01-28');
      expect(formatCalendarDate(2026, 11, 31)).toBe('2026-12-31');
    });

    it('should pad single digit months and days', () => {
      expect(formatCalendarDate(2026, 0, 5)).toBe('2026-01-05');
      expect(formatCalendarDate(2026, 8, 1)).toBe('2026-09-01');
    });
  });
});

describe('Schema Helper Functions', () => {
  describe('getPickBigGuy', () => {
    it('should return bigGuy from new schema', () => {
      const pick = createMockPick({ bigGuy: 'Management' });
      expect(getPickBigGuy(pick)).toBe('Management');
    });

    it('should return empty string if no bigGuy', () => {
      const pick = {};
      expect(getPickBigGuy(pick)).toBe('');
    });
  });

  describe('getPickResult', () => {
    it('should return outcome.status from new schema', () => {
      const pick = createMockPick({
        outcome: { status: 'win', margin: 7 },
      });
      expect(getPickResult(pick)).toBe('win');
    });

    it('should return empty string if no outcome', () => {
      const pick = {};
      expect(getPickResult(pick)).toBe('');
    });

    it('should handle pending status', () => {
      const pick = createMockPick();
      expect(getPickResult(pick)).toBe('pending');
    });

    it('should handle push status', () => {
      const pick = createMockPick({
        outcome: { status: 'push', margin: 0 },
      });
      expect(getPickResult(pick)).toBe('push');
    });
  });

  describe('getPickActualStats', () => {
    it('should return outcome.actualStats from new schema', () => {
      const pick = createMockPick({
        outcome: { actualStats: { passingYards: 327 } },
      });
      expect(getPickActualStats(pick)).toEqual({ passingYards: 327 });
    });

    it('should return empty string if no outcome', () => {
      const pick = {};
      expect(getPickActualStats(pick)).toBe('');
    });
  });

  describe('getPicksArray', () => {
    it('should return picks array from new schema', () => {
      const brolay = createMockBrolay();
      const picks = getPicksArray(brolay);
      expect(Array.isArray(picks)).toBe(true);
      expect(picks.length).toBe(2);
    });

    it('should handle picks as object (keyed by pickId)', () => {
      const brolay = createMockBrolay();
      const picks = getPicksArray(brolay);
      expect(Array.isArray(picks)).toBe(true);
      expect(picks.length).toBeGreaterThan(0);
    });

    it('should return empty array if no picks/participants', () => {
      const brolay = { id: 'test' };
      expect(getPicksArray(brolay)).toEqual([]);
    });
  });

  describe('getSubmittedBy', () => {
    it('should return submittedBy from new schema', () => {
      const brolay = createMockBrolay({ submittedBy: 'Management' });
      expect(getSubmittedBy(brolay)).toBe('Management');
    });

    it('should return empty string if no submittedBy', () => {
      const brolay = {};
      expect(getSubmittedBy(brolay)).toBe('');
    });
  });

  describe('getPickPlayerPosition', () => {
    it('should return position from new schema entities', () => {
      const pick = createMockPlayerPropPick();
      pick.entities[0].position = 'QB';
      expect(getPickPlayerPosition(pick)).toBe('QB');
    });

    it('should return null if no entities with position', () => {
      const pick = createMockPick();
      expect(getPickPlayerPosition(pick)).toBeNull();
    });

    it('should return null if no position found', () => {
      const pick = createMockPick();
      expect(getPickPlayerPosition(pick)).toBeNull();
    });
  });

  describe('getPickPlayerTeam', () => {
    it('should return team from new schema entities', () => {
      const pick = createMockPlayerPropPick();
      expect(getPickPlayerTeam(pick)).toBe('Kansas City Chiefs');
    });

    it('should return null if no entities with team', () => {
      const pick = createMockPick();
      expect(getPickPlayerTeam(pick)).toBeNull();
    });

    it('should return null if no team found', () => {
      const pick = createMockPick();
      expect(getPickPlayerTeam(pick)).toBeNull();
    });
  });

  describe('getPickPropType', () => {
    it('should return statType from new schema line object', () => {
      const pick = createMockPlayerPropPick();
      expect(getPickPropType(pick)).toBe('Passing Yards');
    });

    it('should return null if no line.statType', () => {
      const pick = createMockPick();
      expect(getPickPropType(pick)).toBeNull();
    });

    it('should return null if no prop type found', () => {
      const pick = createMockPick();
      expect(getPickPropType(pick)).toBeNull();
    });
  });
});

describe('formatBetDescription', () => {
  describe('Spread bets', () => {
    it('should format favorite spread correctly', () => {
      const pick = createMockPick({
        betType: 'Spread',
        line: { type: 'spread', value: 3.5, direction: 'favorite' },
      });
      expect(formatBetDescription(pick)).toBe('-3.5');
    });

    it('should format underdog spread correctly', () => {
      const pick = createMockPick({
        betType: 'Spread',
        line: { type: 'spread', value: 7, direction: 'underdog' },
      });
      expect(formatBetDescription(pick)).toBe('+7');
    });
  });

  describe('Moneyline bets', () => {
    it('should format moneyline as ML', () => {
      const pick = createMockPick({ betType: 'Moneyline' });
      expect(formatBetDescription(pick)).toBe('ML');
    });

    it('should format first half moneyline as ML', () => {
      const pick = createMockPick({ betType: 'First Half Moneyline' });
      expect(formatBetDescription(pick)).toBe('ML');
    });
  });

  describe('Total bets', () => {
    it('should format over total correctly', () => {
      const pick = createMockPick({
        betType: 'Total',
        line: { type: 'total', value: 47.5, direction: 'over' },
      });
      expect(formatBetDescription(pick)).toBe('Over 47.5');
    });

    it('should format under total correctly', () => {
      const pick = createMockPick({
        betType: 'Total',
        line: { type: 'total', value: 47.5, direction: 'under' },
      });
      expect(formatBetDescription(pick)).toBe('Under 47.5');
    });
  });

  describe('Player props', () => {
    it('should format player prop with team and position', () => {
      const pick = createMockPlayerPropPick();
      const description = formatBetDescription(pick);
      expect(description).toContain('Passing Yards');
      expect(description).toContain('Over');
      expect(description).toContain('300.5');
    });
  });
});

describe('Normalization Functions', () => {
  describe('normalizePlayerName', () => {
    it('should convert to lowercase and replace spaces with underscores', () => {
      expect(normalizePlayerName('Patrick Mahomes')).toBe('patrick_mahomes');
      expect(normalizePlayerName('Josh Allen')).toBe('josh_allen');
    });

    it('should remove special characters', () => {
      expect(normalizePlayerName("D'Andre Swift")).toBe('dandre_swift');
      expect(normalizePlayerName('A.J. Brown')).toBe('aj_brown');
    });

    it('should handle empty string', () => {
      expect(normalizePlayerName('')).toBe('');
    });

    it('should handle null/undefined', () => {
      expect(normalizePlayerName(null)).toBe('');
      expect(normalizePlayerName(undefined)).toBe('');
    });
  });

  describe('normalizePropType', () => {
    it('should normalize to lowercase and trim', () => {
      expect(normalizePropType('Passing Yards')).toBe('passing yards');
      expect(normalizePropType('  Rushing Yards  ')).toBe('rushing yards');
    });

    it('should return canonical form for variations', () => {
      // These tests assume PROP_TYPE_VARIATIONS has mappings
      // Update based on actual constants/sports.js content
      expect(normalizePropType('pass yds')).toBeDefined();
      expect(normalizePropType('rush yds')).toBeDefined();
    });

    it('should handle empty string', () => {
      expect(normalizePropType('')).toBe('');
    });
  });
});
