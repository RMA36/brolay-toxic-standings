# Track 3: Performance Optimization - Session Handoff Document

**Last Updated**: January 28, 2026
**Session Date**: January 28, 2026
**Current Stage**: Phase 3 Complete - Ready for Testing

---

## QUICK START FOR NEW SESSION

If you're starting a new Claude Code session and want to continue work on the Brolay Toxic Standings app:

### Option 1: Verify Track 3 Changes
```
I'm continuing work on the Brolay Toxic Standings app.

Track 3 (Performance Optimization) implementation is complete:
- Phase 1: Route-level code splitting with React.lazy()
- Phase 2: Critical calculation memoization with useMemo
- Phase 3: Context splitting (UIContext, FilterContext)

Please read TRACK_3_SESSION_HANDOFF.md and run `npm run build` to verify.
```

### Option 2: Continue with Phase 4-5 (Optional)
```
I'm ready to continue Track 3 Performance Optimization.

Phases 1-3 are complete. I'd like to implement:
- Phase 4: Component-level memoization (React.memo)
- Phase 5: Event handler memoization (useCallback)

Please read TRACK_3_SESSION_HANDOFF.md for context.
```

---

## PROJECT OVERVIEW

### What is Track 3?
Track 3 is the **Performance Optimization** phase of the Brolay Toxic Standings refactoring roadmap. It focuses on:
- Reducing initial bundle size via code splitting
- Eliminating unnecessary re-renders via memoization
- Splitting the monolithic context for better render isolation

### What Was Accomplished?

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1: Code Splitting | ✅ Complete | Route-level lazy loading with React.lazy() |
| Phase 2: Calculation Memoization | ✅ Complete | useMemo for expensive calculations |
| Phase 3: Context Splitting | ✅ Complete | UIContext and FilterContext created |
| Phase 4: Component Memoization | ⏳ Optional | React.memo for components |
| Phase 5: useCallback | ⏳ Optional | Event handler memoization |

---

## CHANGES MADE

### Phase 1: Route-Level Code Splitting

**New Files Created:**
- `src/components/common/RouteLoader.jsx` - Loading spinner for Suspense

**Files Modified:**
- `src/router/index.jsx` - Converted 10 imports to lazy()
- `src/components/layout/Layout.jsx` - Added Suspense boundary around Outlet
- `vite.config.js` - Added chunk naming for better debugging

**Key Changes:**
```javascript
// router/index.jsx - Before
import AllBrolays from '../pages/AllBrolays';

// router/index.jsx - After
const AllBrolays = lazy(() => import('../pages/AllBrolays'));
```

**Expected Impact:**
- Initial bundle reduced by 40-50%
- Pages loaded on-demand
- Better caching for unchanged chunks

---

### Phase 2: Critical Calculation Memoization

**Files Modified:**
- `src/pages/AllBrolays.jsx` - Added 3 useMemo hooks
- `src/pages/Rankings.jsx` - Added 4 useMemo hooks
- `src/pages/IndividualDashboard.jsx` - Added 3 useMemo hooks

**Key Memoizations:**

| File | Calculation | Dependencies |
|------|-------------|--------------|
| AllBrolays.jsx | `thresholds` (dynamic color scale) | `[parlays]` |
| AllBrolays.jsx | `filteredParlays` | `[parlays, filters]` |
| AllBrolays.jsx | `pendingPicksCount` | `[filteredParlays]` |
| Rankings.jsx | `soleSurvivors` | `[parlays, players]` |
| Rankings.jsx | `currentStreaks/allTimeStreaks` | `[parlays, players]` |
| Rankings.jsx | `topCombos/worstCombos` | `[parlays]` |
| Rankings.jsx | `topTeams` | `[parlays]` |
| Rankings.jsx | `playerTeamCombos` | `[parlays]` |
| IndividualDashboard.jsx | `filteredParlays` | `[parlays, filters]` |
| IndividualDashboard.jsx | `pendingPicksCount` | `[filteredParlays]` |
| IndividualDashboard.jsx | `allStats/currentInsight` | `[filteredParlays, players, ...]` |

**Expected Impact:**
- Expensive calculations only run when dependencies change
- Calendar view renders faster
- Filter changes don't recalculate unrelated data

---

### Phase 3: Context Splitting

**New Files Created:**
- `src/contexts/UIContext.jsx` - Mobile/UI state
- `src/contexts/FilterContext.jsx` - Filter/search state

**Files Modified:**
- `src/App.jsx` - Wrapped with UIProvider and FilterProvider
- `src/contexts/BrolayContext.jsx` - Now uses state from split contexts

**Context Architecture:**
```
UIProvider (outer)
  └─ FilterProvider
       └─ BrolayProvider
            └─ RouterProvider
```

**What's in Each Context:**

| Context | State Managed |
|---------|---------------|
| UIContext | isMobile, sidebarOpen, pullDistance, touch handlers |
| FilterContext | filters, filtersExpanded, searchQuery, suggestions |
| BrolayContext | parlays, stats, CRUD handlers, insights, re-exports above |

**Backward Compatibility:**
- BrolayContext re-exports all UI and Filter state
- Existing code using `useBrolayContext()` continues to work
- New code can import directly from specific contexts for better performance

**Expected Impact:**
- UI changes (sidebar toggle) don't re-render data components
- Filter changes don't re-render UI-only components
- Better render isolation across the app

---

## VERIFICATION STEPS

### Build Verification
```bash
cd brolay-toxic-standings
npm run build
```

Expected output:
- Separate chunk files for each lazy-loaded page
- Chunks named: `AllBrolays-[hash].js`, `Rankings-[hash].js`, etc.
- No build errors

### Runtime Verification
```bash
npm run dev
```

Then test:
1. Open React DevTools Profiler
2. Navigate between routes - verify lazy loading
3. Toggle sidebar - verify data components don't re-render
4. Change filters - verify calendar calculations don't re-run

### File Structure Check
```
src/
├── contexts/
│   ├── BrolayContext.jsx (modified)
│   ├── UIContext.jsx (new)
│   └── FilterContext.jsx (new)
├── components/
│   └── common/
│       └── RouteLoader.jsx (new)
├── router/
│   └── index.jsx (modified - lazy imports)
└── pages/
    ├── AllBrolays.jsx (modified - useMemo)
    ├── Rankings.jsx (modified - useMemo)
    └── IndividualDashboard.jsx (modified - useMemo)
```

---

## OPTIONAL NEXT STEPS (Phases 4-5)

### Phase 4: Component Memoization
Add `React.memo()` to frequently re-rendered components:
- Calendar day cells in AllBrolays
- Player leaderboard cards
- Brolay list items

### Phase 5: useCallback for Handlers
Add `useCallback()` to event handlers passed as props:
- `handleAutoUpdate`
- `handleCalendarViewToggle`
- `handleDateSelect`

These phases are optional polish and can be done later if needed.

---

## KEY DECISIONS MADE

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Keep Entry.jsx eager | Not lazy-loaded | Most common first page |
| Backward compatible contexts | BrolayContext re-exports | No breaking changes |
| useMemo dependencies | Minimal deps | Prevent unnecessary recalculations |

---

## USEFUL COMMANDS

```bash
# Development
npm run dev

# Build
npm run build

# Preview production build
npm run preview

# Analyze bundle
npx vite-bundle-visualizer
```

---

## TRACK STATUS

**Track 1 (Code Organization)**: ✅ Complete
**Track 2 (Data Restructure)**: ✅ Complete (in observation period until Feb 27)
**Track 3 (Performance)**: ✅ Phases 1-3 Complete
**Track 4 (Testing)**: Not Started
**Track 5 (Features)**: Not Started

---

**Session Status**: ✅ PHASES 1-3 COMPLETE
**Build Status**: ✅ Verified (committed and pushed Jan 28, 2026)
**Next Steps**: Optionally implement Phase 4-5 (React.memo, useCallback)

---

## POST-IMPLEMENTATION BUG FIXES (January 28, 2026)

After Track 3 was committed, several dual-schema issues were discovered and fixed:

| Issue | Root Cause | Fix | Commit |
|-------|-----------|-----|--------|
| Search page crash | `getPicksArray()` called `Object.values()` on array | Check `Array.isArray()` first | `5baee2f` |
| Payments page crash | Same `getPicksArray()` issue | Same fix | `5baee2f` |
| Payments filter broken | `applyFilters` used `parlay.placedBy` directly | Use `getSubmittedBy()` helper | `5baee2f` |
| Bet type search no results | `isBetType` detected but no handler existed | Added `betType` search category | `3a205d8` |

All fixes are committed and pushed to main.
