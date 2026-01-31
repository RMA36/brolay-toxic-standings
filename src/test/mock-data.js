/**
 * Mock data factories for testing
 */

/**
 * Create a mock brolay (new schema)
 */
export function createMockBrolay(overrides = {}) {
  return {
    id: 'brolay_test_001',
    date: '2026-01-28',
    dayOfWeek: 'Tuesday',
    submittedBy: 'Management',
    betAmount: 10,
    totalPayout: 100,
    settled: false,
    settledAt: null,
    picks: {
      pick_001: createMockPick({ bigGuy: 'Management' }),
      pick_002: createMockPick({ bigGuy: 'Labor' }),
    },
    ...overrides,
  };
}

/**
 * Create a mock pick (new schema)
 */
export function createMockPick(overrides = {}) {
  return {
    bigGuy: 'Management',
    sport: 'NFL',
    betCategory: 'standard',
    betType: 'Spread',
    game: {
      date: '2026-01-28',
      awayTeam: 'Kansas City Chiefs',
      homeTeam: 'Buffalo Bills',
      espnGameId: '401547649',
      league: 'NFL',
    },
    entities: [
      {
        entityType: 'team',
        name: 'Kansas City Chiefs',
        team: 'Kansas City Chiefs',
        role: 'primary',
      },
    ],
    line: {
      type: 'spread',
      value: 3.5,
      direction: 'favorite',
      odds: '-110',
      source: 'FanDuel',
    },
    outcome: {
      status: 'pending',
      margin: null,
      actualStat: null,
      autoUpdated: false,
      settledAt: null,
    },
    ...overrides,
  };
}

/**
 * Create a mock pick with old schema (for dual-schema testing)
 */
export function createMockPickOldSchema(overrides = {}) {
  return {
    player: 'Management',
    sport: 'NFL',
    betCategory: 'standard',
    betType: 'Spread',
    game: {
      date: '2026-01-28',
      awayTeam: 'Kansas City Chiefs',
      homeTeam: 'Buffalo Bills',
      espnGameId: '401547649',
      league: 'NFL',
    },
    team: 'Kansas City Chiefs',
    pickType: 'Spread',
    line: -3.5,
    odds: '-110',
    result: 'pending',
    actualStats: null,
    ...overrides,
  };
}

/**
 * Create a mock brolay with old schema
 */
export function createMockBrolayOldSchema(overrides = {}) {
  return {
    id: 'brolay_old_001',
    date: '2026-01-28',
    dayOfWeek: 'Tuesday',
    placedBy: 'Management',
    betAmount: 10,
    totalPayout: 100,
    settled: false,
    settledAt: null,
    participants: {
      pick_001: createMockPickOldSchema({ player: 'Management' }),
      pick_002: createMockPickOldSchema({ player: 'Labor' }),
    },
    ...overrides,
  };
}

/**
 * Create multiple mock brolays
 */
export function createMockBrolays(count = 3) {
  return Array.from({ length: count }, (_, i) => ({
    ...createMockBrolay(),
    id: `brolay_test_${String(i + 1).padStart(3, '0')}`,
    date: `2026-01-${String(i + 1).padStart(2, '0')}`,
  }));
}

/**
 * Mock player prop pick
 */
export function createMockPlayerPropPick(overrides = {}) {
  return createMockPick({
    betCategory: 'playerProp',
    betType: 'Player Prop',
    entities: [
      {
        entityType: 'player',
        name: 'Patrick Mahomes',
        team: 'Kansas City Chiefs',
        position: 'QB',
        role: 'primary',
      },
    ],
    line: {
      type: 'prop',
      value: 300.5,
      direction: 'over',
      odds: '-110',
      statType: 'Passing Yards',
      source: 'FanDuel',
    },
    ...overrides,
  });
}

/**
 * Mock settled brolay with results
 */
export function createMockSettledBrolay(isWin = true, overrides = {}) {
  return createMockBrolay({
    settled: true,
    settledAt: '2026-01-29T02:00:00Z',
    picks: {
      pick_001: createMockPick({
        outcome: {
          status: isWin ? 'win' : 'loss',
          margin: isWin ? 7 : -3,
          actualStat: null,
          autoUpdated: true,
          settledAt: '2026-01-29T02:00:00Z',
        },
      }),
      pick_002: createMockPick({
        outcome: {
          status: isWin ? 'win' : 'loss',
          margin: isWin ? 10 : -5,
          actualStat: null,
          autoUpdated: true,
          settledAt: '2026-01-29T02:00:00Z',
        },
      }),
    },
    ...overrides,
  });
}

/**
 * Mock players array
 */
export const mockPlayers = ['Management', 'Labor', 'Operations', 'Finance'];

/**
 * Mock ESPN game result
 */
export function createMockESPNGameResult(overrides = {}) {
  return {
    id: '401547649',
    name: 'Kansas City Chiefs at Buffalo Bills',
    shortName: 'KC @ BUF',
    date: '2026-01-28T20:00Z',
    status: {
      type: {
        completed: true,
      },
    },
    competitions: [
      {
        competitors: [
          {
            team: {
              displayName: 'Kansas City Chiefs',
              abbreviation: 'KC',
            },
            score: '28',
            homeAway: 'away',
          },
          {
            team: {
              displayName: 'Buffalo Bills',
              abbreviation: 'BUF',
            },
            score: '24',
            homeAway: 'home',
          },
        ],
      },
    ],
    ...overrides,
  };
}
