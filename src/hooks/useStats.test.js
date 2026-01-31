import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useStats } from './useStats';
import {
  createMockBrolay,
  createMockBrolayOldSchema,
  createMockSettledBrolay,
} from '../test/mock-data';

describe('useStats hook', () => {
  const players = ['Management', 'Labor', 'Operations'];

  describe('Basic Statistics Calculation', () => {
    it('should initialize stats for all players', () => {
      const { result } = renderHook(() => useStats([], players));

      const stats = result.current.stats;

      expect(stats.Management).toBeDefined();
      expect(stats.Labor).toBeDefined();
      expect(stats.Operations).toBeDefined();

      // Check structure
      expect(stats.Management.totalPicks).toBe(0);
      expect(stats.Management.wins).toBe(0);
      expect(stats.Management.losses).toBe(0);
      expect(stats.Management.moneyWon).toBe(0);
      expect(stats.Management.moneyLost).toBe(0);
    });

    it('should count total picks correctly', () => {
      const brolays = [
        createMockSettledBrolay(true, {
          picks: {
            pick1: { bigGuy: 'Management', sport: 'NFL', betType: 'Spread', outcome: { status: 'win' } },
            pick2: { bigGuy: 'Labor', sport: 'NFL', betType: 'Spread', outcome: { status: 'win' } },
          },
        }),
        createMockSettledBrolay(false, {
          picks: {
            pick1: { bigGuy: 'Management', sport: 'NBA', betType: 'Total', outcome: { status: 'loss' } },
          },
        }),
      ];

      const { result } = renderHook(() => useStats(brolays, players));

      expect(result.current.stats.Management.totalPicks).toBe(2);
      expect(result.current.stats.Labor.totalPicks).toBe(1);
      expect(result.current.stats.Operations.totalPicks).toBe(0);
    });

    it('should count wins and losses correctly', () => {
      const brolays = [
        createMockSettledBrolay(true, {
          picks: {
            pick1: {
              bigGuy: 'Management',
              sport: 'NFL',
              betType: 'Spread',
              outcome: { status: 'win' },
            },
          },
        }),
        createMockSettledBrolay(false, {
          picks: {
            pick1: {
              bigGuy: 'Management',
              sport: 'NFL',
              betType: 'Spread',
              outcome: { status: 'loss' },
            },
          },
        }),
      ];

      const { result } = renderHook(() => useStats(brolays, players));

      expect(result.current.stats.Management.wins).toBe(1);
      expect(result.current.stats.Management.losses).toBe(1);
    });

    it('should handle push results', () => {
      const brolays = [
        {
          ...createMockBrolay(),
          picks: {
            pick1: {
              bigGuy: 'Management',
              sport: 'NFL',
              betType: 'Spread',
              outcome: { status: 'push' },
            },
          },
        },
      ];

      const { result } = renderHook(() => useStats(brolays, players));

      // Pushes shouldn't count as wins or losses
      expect(result.current.stats.Management.wins).toBe(0);
      expect(result.current.stats.Management.losses).toBe(0);
      expect(result.current.stats.Management.totalPicks).toBe(1);
    });
  });

  describe('Money Tracking', () => {
    it('should track money won on winning parlays', () => {
      const brolays = [
        createMockSettledBrolay(true, {
          betAmount: 10,
          totalPayout: 100,
          picks: {
            pick1: {
              bigGuy: 'Management',
              sport: 'NFL',
              betType: 'Spread',
              outcome: { status: 'win' },
            },
          },
        }),
      ];

      const { result } = renderHook(() => useStats(brolays, players));

      // Profit = totalPayout - betAmount = 100 - 10 = 90
      expect(result.current.stats.Management.moneyWon).toBe(90);
      expect(result.current.stats.Management.moneyLost).toBe(0);
    });

    it('should track money lost on losing parlays', () => {
      const brolays = [
        createMockSettledBrolay(false, {
          betAmount: 10,
          picks: {
            pick1: {
              bigGuy: 'Management',
              sport: 'NFL',
              betType: 'Spread',
              outcome: { status: 'loss' },
            },
          },
        }),
      ];

      const { result } = renderHook(() => useStats(brolays, players));

      expect(result.current.stats.Management.moneyWon).toBe(0);
      expect(result.current.stats.Management.moneyLost).toBe(10);
    });

    it('should split profit among winners in mixed results', () => {
      const brolays = [
        {
          ...createMockBrolay(),
          betAmount: 10,
          totalPayout: 100,
          settled: true,
          picks: {
            pick1: {
              bigGuy: 'Management',
              sport: 'NFL',
              betType: 'Spread',
              outcome: { status: 'win' },
            },
            pick2: {
              bigGuy: 'Labor',
              sport: 'NFL',
              betType: 'Spread',
              outcome: { status: 'win' },
            },
            pick3: {
              bigGuy: 'Operations',
              sport: 'NFL',
              betType: 'Spread',
              outcome: { status: 'loss' },
            },
          },
        },
      ];

      const { result } = renderHook(() => useStats(brolays, players));

      // This is an and-1 situation (1 loss, 2 wins)
      // Loser pays betAmount * picks.length
      expect(result.current.stats.Operations.moneyLost).toBe(30);

      // Winners don't get money because parlay lost (not parlayWon)
      expect(result.current.stats.Management.moneyWon).toBe(0);
      expect(result.current.stats.Labor.moneyWon).toBe(0);
    });
  });

  describe('And-1 Detection', () => {
    it('should detect and-1 situations (1 loss, rest wins)', () => {
      const brolays = [
        {
          ...createMockBrolay(),
          betAmount: 10,
          totalPayout: 100,
          picks: {
            pick1: {
              bigGuy: 'Management',
              sport: 'NFL',
              betType: 'Spread',
              outcome: { status: 'win' },
            },
            pick2: {
              bigGuy: 'Labor',
              sport: 'NFL',
              betType: 'Spread',
              outcome: { status: 'loss' },
            },
          },
        },
      ];

      const { result } = renderHook(() => useStats(brolays, players));

      // The loser should have an and-1
      expect(result.current.stats.Labor.and1s).toBe(1);
      // and1Cost = potentialNetProfit = totalPayout - (betAmount * picks.length)
      // = 100 - (10 * 2) = 80
      expect(result.current.stats.Labor.and1Cost).toBe(80);
    });

    it('should not count and-1 if multiple losses', () => {
      const brolays = [
        {
          ...createMockBrolay(),
          betAmount: 10,
          picks: {
            pick1: {
              bigGuy: 'Management',
              sport: 'NFL',
              betType: 'Spread',
              outcome: { status: 'loss' },
            },
            pick2: {
              bigGuy: 'Labor',
              sport: 'NFL',
              betType: 'Spread',
              outcome: { status: 'loss' },
            },
          },
        },
      ];

      const { result } = renderHook(() => useStats(brolays, players));

      expect(result.current.stats.Management.and1s).toBe(0);
      expect(result.current.stats.Labor.and1s).toBe(0);
    });

    it('should not count and-1 if all picks won', () => {
      const brolays = [createMockSettledBrolay(true)];

      const { result } = renderHook(() => useStats(brolays, players));

      players.forEach((player) => {
        expect(result.current.stats[player].and1s).toBe(0);
      });
    });
  });

  describe('Sport and Bet Type Breakdowns', () => {
    it('should track stats by sport', () => {
      const brolays = [
        {
          ...createMockBrolay(),
          picks: {
            pick1: {
              bigGuy: 'Management',
              sport: 'NFL',
              betType: 'Spread',
              outcome: { status: 'win' },
            },
            pick2: {
              bigGuy: 'Management',
              sport: 'NBA',
              betType: 'Spread',
              outcome: { status: 'loss' },
            },
          },
        },
      ];

      const { result } = renderHook(() => useStats(brolays, players));

      expect(result.current.stats.Management.bySport.NFL).toEqual({
        total: 1,
        wins: 1,
        losses: 0,
      });
      expect(result.current.stats.Management.bySport.NBA).toEqual({
        total: 1,
        wins: 0,
        losses: 1,
      });
    });

    it('should track stats by bet type', () => {
      const brolays = [
        {
          ...createMockBrolay(),
          picks: {
            pick1: {
              bigGuy: 'Management',
              sport: 'NFL',
              betType: 'Spread',
              outcome: { status: 'win' },
            },
            pick2: {
              bigGuy: 'Management',
              sport: 'NFL',
              betType: 'Moneyline',
              outcome: { status: 'loss' },
            },
          },
        },
      ];

      const { result } = renderHook(() => useStats(brolays, players));

      expect(result.current.stats.Management.byBetType.Spread).toEqual({
        total: 1,
        wins: 1,
        losses: 0,
      });
      expect(result.current.stats.Management.byBetType.Moneyline).toEqual({
        total: 1,
        wins: 0,
        losses: 1,
      });
    });
  });

  describe('Dual-Schema Support', () => {
    it('should work with old schema (participants, player, result)', () => {
      const brolays = [
        createMockBrolayOldSchema({
          participants: {
            pick1: {
              player: 'Management',
              sport: 'NFL',
              betType: 'Spread',
              result: 'win',
            },
          },
        }),
      ];

      const { result } = renderHook(() => useStats(brolays, players));

      expect(result.current.stats.Management.totalPicks).toBe(1);
      expect(result.current.stats.Management.wins).toBe(1);
    });

    it('should work with new schema (picks, bigGuy, outcome.status)', () => {
      const brolays = [
        createMockBrolay({
          picks: {
            pick1: {
              bigGuy: 'Management',
              sport: 'NFL',
              betType: 'Spread',
              outcome: { status: 'win' },
            },
          },
        }),
      ];

      const { result } = renderHook(() => useStats(brolays, players));

      expect(result.current.stats.Management.totalPicks).toBe(1);
      expect(result.current.stats.Management.wins).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty parlays array', () => {
      const { result } = renderHook(() => useStats([], players));

      players.forEach((player) => {
        expect(result.current.stats[player].totalPicks).toBe(0);
        expect(result.current.stats[player].wins).toBe(0);
        expect(result.current.stats[player].losses).toBe(0);
      });
    });

    it('should skip picks with missing required fields', () => {
      const brolays = [
        {
          ...createMockBrolay(),
          picks: {
            pick1: {
              bigGuy: 'Management',
              // Missing sport and betType
              outcome: { status: 'win' },
            },
            pick2: {
              // Missing bigGuy
              sport: 'NFL',
              betType: 'Spread',
              outcome: { status: 'win' },
            },
            pick3: {
              bigGuy: '',
              sport: 'NFL',
              betType: 'Spread',
              outcome: { status: 'win' },
            },
          },
        },
      ];

      const { result } = renderHook(() => useStats(brolays, players));

      // All picks should be skipped
      players.forEach((player) => {
        expect(result.current.stats[player].totalPicks).toBe(0);
      });
    });

    it('should skip picks from unknown players', () => {
      const brolays = [
        {
          ...createMockBrolay(),
          picks: {
            pick1: {
              bigGuy: 'UnknownPlayer',
              sport: 'NFL',
              betType: 'Spread',
              outcome: { status: 'win' },
            },
          },
        },
      ];

      const { result } = renderHook(() => useStats(brolays, players));

      players.forEach((player) => {
        expect(result.current.stats[player].totalPicks).toBe(0);
      });
    });

    it('should exclude editingParlay from calculations', () => {
      const editingParlay = createMockBrolay({
        id: 'editing-123',
        picks: {
          pick1: {
            bigGuy: 'Management',
            sport: 'NFL',
            betType: 'Spread',
            outcome: { status: 'win' },
          },
        },
      });

      const brolays = [
        editingParlay,
        createMockSettledBrolay(true, {
          picks: {
            pick1: {
              bigGuy: 'Management',
              sport: 'NFL',
              betType: 'Spread',
              outcome: { status: 'win' },
            },
          },
        }),
      ];

      const { result } = renderHook(() =>
        useStats(brolays, players, editingParlay)
      );

      // Should only count the non-editing parlay
      expect(result.current.stats.Management.totalPicks).toBe(1);
    });

    it('should handle pending picks (not settled)', () => {
      const brolays = [
        {
          ...createMockBrolay(),
          settled: false,
          picks: {
            pick1: {
              bigGuy: 'Management',
              sport: 'NFL',
              betType: 'Spread',
              outcome: { status: 'pending' },
            },
          },
        },
      ];

      const { result } = renderHook(() => useStats(brolays, players));

      // Pending picks should still be counted
      expect(result.current.stats.Management.totalPicks).toBe(1);
      expect(result.current.stats.Management.wins).toBe(0);
      expect(result.current.stats.Management.losses).toBe(0);
    });
  });
});
