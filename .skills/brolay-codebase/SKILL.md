---
name: brolay-codebase
description: "Codebase reference map for the Brolay Toxic Standings web app. Read this skill at the START of every session involving the Brolay app — whether you're adding features, fixing bugs, analyzing data, or making any changes. This replaces the need to explore the codebase from scratch. Trigger whenever the user mentions Brolay, toxic standings, Big Guys, parlays, picks, brolays, or any work on this sports betting tracking app."
---

# Brolay Toxic Standings — Codebase Reference

This is a context-loading skill. Read it once at the start of any session to understand the app's architecture, data models, and conventions. This saves significant time versus re-exploring from scratch.

## What Is Brolay?

A private web app for a group of 5 friends ("Big Guys") who track their sports betting parlays. They enter their bets, track wins/losses, view statistics, rankings, and insights. The app auto-updates results via ESPN and can fetch live odds from The Odds API.

## Tech Stack

- **React 18** + **React Router v6** (lazy-loaded pages)
- **Vite** (build tool, PWA-enabled)
- **Tailwind CSS** for styling
- **Firebase Firestore** for real-time database with persistent local cache
- **The Odds API** for live sports odds (API key in App.jsx, 500 calls/month limit)
- **ESPN API** for live game scores and auto-settling
- **tesseract.js** for OCR (bet slip image parsing)
- **recharts** for charts/visualization
- **lucide-react** for icons
- **Vitest** + React Testing Library for tests (~120 test cases)

## Project Root

The app lives at: `brolay-toxic-standings/` within whatever workspace folder is mounted.

```
brolay-toxic-standings/
├── src/
│   ├── App.jsx                    # Firebase init, auth, context providers
│   ├── router/index.jsx           # Route definitions
│   ├── contexts/
│   │   ├── BrolayContext.jsx      # Main data context (~3,500 lines)
│   │   ├── FilterContext.jsx      # Filter & search state
│   │   └── UIContext.jsx          # UI state, mobile, pull-to-refresh
│   ├── hooks/
│   │   ├── useBrolays.js          # Firestore CRUD operations
│   │   ├── useStats.js            # Statistical calculations
│   │   ├── useOdds.js             # The Odds API integration
│   │   └── useESPN.js             # ESPN API integration
│   ├── pages/                     # One file per route/tab
│   ├── components/
│   │   ├── layout/Layout.jsx      # Main layout with nav (nav is hardcoded here)
│   │   ├── common/                # Shared UI components
│   │   ├── entry/                 # Entry form components
│   │   └── stats/                 # Stats/analytics components
│   ├── constants/sports.js        # Sports, teams, players, prop types, odds mappings
│   ├── utils/formatters.js        # Data transformation & dual-schema helpers
│   └── insightsHelper.js          # Insights calculations (money maker, danger zone)
├── public/
├── tests/
├── package.json
└── vite.config.js
```

## The 5 Big Guys

Defined in `src/constants/sports.js`:
```javascript
export const PLAYERS = ['Management', 'CD', '914', 'Junior', 'Jacoby'];
```

## Current Routes & Navigation

Routes are defined in `src/router/index.jsx`. Navigation is **hardcoded in Layout.jsx** using dropdown groups.

| Route | Page Component | Nav Location |
|-------|---------------|--------------|
| `/entry` | Entry.jsx | Standalone button "New Brolay" |
| `/brolays` | AllBrolays.jsx | Brolays dropdown |
| `/picks` | AllPicks.jsx | Brolays dropdown |
| `/search` | Search.jsx | Analytics dropdown |
| `/individual` | IndividualDashboard.jsx | Analytics dropdown |
| `/group` | GroupDashboard.jsx | Analytics dropdown |
| `/rankings` | Rankings.jsx | Analytics dropdown |
| `/grid` | Grid.jsx | Analytics dropdown |
| `/payments` | Payments.jsx | Standalone button |
| `/settings` | Settings.jsx | (accessible but not in main nav) |
| `/import` | Import.jsx | (accessible but not in main nav) |

### How to Add a New Tab

1. Create the page component in `src/pages/NewPage.jsx`
2. Add a lazy import and route in `src/router/index.jsx`
3. Add the nav item in `src/components/layout/Layout.jsx`:
   - Either add to an existing dropdown's `isGroupActive([...paths])` array
   - Or create a new standalone button / dropdown group
   - The pattern uses `handleNavClick(path)` for navigation
   - Active state uses `isActive('/path')` for standalone or `isGroupActive(['/path1', '/path2'])` for dropdowns
4. Both desktop and mobile nav are in the same Layout.jsx file (mobile uses `mobileDropdownOpen` state)

## Firestore Data Model

### Collection: `parlays`

Each document is a "brolay" (parlay) with this structure (new schema, post-Jan 2026 migration):

```javascript
{
  id: "firestore-doc-id",
  date: "2026-03-15",              // YYYY-MM-DD
  submittedBy: "Management",       // Big Guy name (new schema field)
  placedBy: "...",                 // Legacy field (still supported)
  betAmount: 10,
  totalPayout: 250,
  totalPicks: 3,
  settled: true,
  settledAt: "2026-03-15T18:00:00Z",
  sortOrder: 1,

  // Picks stored as object keyed by pick ID
  picks: {
    "pick_1708000000_abc1": { /* pick object */ },
    "pick_1708000000_abc2": { /* pick object */ }
  }
}
```

### Pick Object Structure

```javascript
{
  bigGuy: "Management",
  sport: "NFL",
  betType: "Spread",              // From PICK_TYPES constant
  betCategory: "standard",

  entities: [{
    entityType: "team",           // "team" or "player"
    name: "Kansas City Chiefs",
    role: "primary",              // "primary", "secondary", "opponent", "home", "away"
    team: "KC",                   // For player props
    position: "QB",               // For player props
    statType: "Points"            // For player props
  }],

  line: {
    type: "spread",               // "spread", "total", "moneyline", "prop", "teamTotal"
    value: 9.5,
    direction: "favorite",        // "favorite", "underdog", "over", "under"
    odds: "-110",
    source: "FanDuel"
  },

  game: {
    date: "2026-03-15",
    awayTeam: "Denver Broncos",
    homeTeam: "Kansas City Chiefs",
    espnGameId: "401547...",
    league: "NFL"
  },

  outcome: {
    status: "pending",            // "pending", "win", "loss", "push"
    actualStats: "27 points",
    autoUpdated: false,
    settledAt: "2026-03-15T18:00:00Z"
  }
}
```

### Dual-Schema Support

The app migrated schemas in Jan 2026. Helper functions in `src/utils/formatters.js` handle both:
- `getPicksArray(parlay)` — extracts picks object into array
- `getPickBigGuy(pick)` — gets Big Guy from `bigGuy` or legacy `player`
- `getPickResult(pick)` — gets outcome from `outcome.status` or legacy `result`
- `getPickPropType(pick)` — gets prop type from various locations
- `getPickActualStats(pick)` — gets actual stats/result

Always use these helpers when reading pick data rather than accessing fields directly.

## Three Context Providers

Contexts are split for performance (preventing unnecessary re-renders):

**BrolayContext** (`src/contexts/BrolayContext.jsx`) — The big one (~3,500 lines):
- Parlay data (CRUD), ESPN integration, stats, odds, insights
- Learned data (teams, prop types from localStorage)
- Entry form state, calendar state
- Re-exports UI and Filter state for backward compatibility

**FilterContext** (`src/contexts/FilterContext.jsx`):
- Filter state (date, player, sport, result)
- Search state (query, results, cache)
- Rankings-specific filters

**UIContext** (`src/contexts/UIContext.jsx`):
- Mobile detection, sidebar, dropdowns
- Pull-to-refresh state and handlers

## The Odds API Integration

File: `src/hooks/useOdds.js`

- **API Key**: In App.jsx, passed via context. **500 calls/month limit — be conservative.**
- **Bookmaker priority**: FanDuel > DraftKings > any US bookmaker
- **Market types**: spreads, h2h, totals, player props, team totals, first half, quarters
- **Prop mappings**: `ODDS_API_PROP_MAPPINGS` in `src/constants/sports.js` maps normalized prop types to API market keys
- **Line matching**: Smart matching with tolerance (±0.5 preferred, up to ±3-4 for large moves)
- **Player matching**: Fuzzy matching handles nicknames, initials, suffixes

Supported sports keys for Odds API:
```
NFL, NBA, MLB, NHL, College Football, College Basketball, Soccer, Tennis, Golf, UFC, Women's Hockey
```

## ESPN API Integration

File: `src/hooks/useESPN.js`

- Fetches live game scores for auto-settling picks
- Stat mappings in `ESPN_STAT_MAPPINGS` constant
- Runs on demand (no background scheduler)

## Existing Analytics/Insights

File: `src/insightsHelper.js`

- `findMoneyMaker(parlays, players)` — highest win rate Big Guy
- `findDangerZone(parlays, players)` — worst performing Big Guy
- `getCurrentSportsInSeason()` — array of sports currently in season
- `getSeasonalTip()` — sport-specific tips
- `analyzeCombo(parlays, player, sport, dayOfWeek, betType)` — performance of specific combinations
- `getCurrentDayOfWeek()` — returns day name

No ML/AI models exist yet — all analysis is rule-based and statistical.

## Authentication

Simple password protection (not Firebase Auth):
- Password: hardcoded in App.jsx
- Stored in localStorage as `brolay-auth`
- No user-specific data isolation

## Key Constants Reference

**Sports**: NFL, NBA, MLB, NHL, College Football, College Basketball, WNBA, Soccer, Tennis, Golf, Rugby, UFC, Women's Hockey

**Bet Types (PICK_TYPES)**: Spread, Moneyline, 3-Way Moneyline, Total, Player Prop, Team Prop, Game Prop, H2H Prop, Either Prop, Combined Prop, First Half Bet, Quarter/Period Bet, Prop Bet (legacy)

**Individual Sports** (no team context): Tennis, Tennis (Women's), Golf, UFC

## Historic Data

- 725+ brolays migrated to new schema
- All in `parlays` Firestore collection
- Date range spans from app inception through present

## Development

```bash
npm run dev      # Start dev server (Vite)
npm run build    # Production build
npm run test     # Run Vitest tests
npm run preview  # Preview production build
```

Deployed on Vercel as a PWA.
