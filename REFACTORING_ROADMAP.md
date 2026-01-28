# Brolay Toxic Standings - Refactoring Roadmap

## Overview
This document tracks the progress of refactoring the Brolay Toxic Standings application to improve maintainability, performance, and code organization.

---

## 🎯 Track 1: Code Organization & Modularization

### ✅ Phase 1.1: Initial State (COMPLETE)
**Status**: Complete
**Starting Point**: App.jsx at 9,166 lines

### ✅ Phase 1.2: Constants Extraction (COMPLETE)
**Goal**: Extract hardcoded values into organized constant files
**Status**: Complete

**Completed**:
- ✅ Created `src/constants/theme.js` for colors, button styles, card styles, input classes
- ✅ Created `src/constants/sports.js` for sports data, players, pick types, preloaded teams, prop type variations, API mappings
- ✅ Updated App.jsx to import and use constants
- ✅ **Result**: App.jsx reduced to 8,847 lines (~319 lines extracted)

### ✅ Phase 1.3: Custom Hooks Extraction (COMPLETE)
**Goal**: Extract stateful logic into reusable custom hooks
**Status**: Complete

**Completed**:
- ✅ Created `src/hooks/useBrolays.js` - Firestore data management (parlays, CRUD operations)
- ✅ Created `src/hooks/useESPN.js` - ESPN API integration (auto-update, game results, team matching)
- ✅ Created `src/hooks/useStats.js` - Statistics calculations (player stats, insights)
- ✅ Created `src/hooks/useOdds.js` - Odds API integration (fetch odds, find best odds)
- ✅ Updated App.jsx to use hooks instead of inline logic
- ✅ **Result**: App.jsx reduced to 7,349 lines (~1,498 lines extracted into hooks)

### ✅ Phase 1.4: Component Extraction (COMPLETE)
**Goal**: Extract render functions and UI components into separate files
**Status**: Complete

**Completed - Small/Medium Components**:
- ✅ Created `src/components/dashboard/StatCard.jsx` (47 lines) - Dashboard stat card component
- ✅ Created `src/components/filters/FilterBar.jsx` (189 lines) - Collapsible filter controls
- ✅ Created `src/components/dashboard/ComparisonTable.jsx` (228 lines) - Player head-to-head comparison table
- ✅ Created `src/components/dashboard/BrolayGrid.jsx` (98 lines) - Matrix-style brolay visualization

**Completed - Page-Level Components**:
- ✅ Created `src/pages/Rankings.jsx` (491 lines) - Rankings page with sole survivors, streaks, combos
- ✅ Created `src/pages/IndividualDashboard.jsx` (533 lines) - Individual player stats with comparison mode
- ✅ Created `src/pages/GroupDashboard.jsx` (1,390 lines) - Group dashboard with stats, calendar, settlements
- ✅ Created `src/pages/AllBrolays.jsx` (794 lines) - All Brolays calendar/list view

**Final Metrics**:
- ✅ **Starting**: App.jsx at 9,166 lines
- ✅ **Ending**: App.jsx at 3,840 lines
- ✅ **Total Reduction**: 5,326 lines (58.1% reduction!)
- ✅ **Components Created**: 8 files (4 small/medium + 4 page-level)
- ✅ **Lines Extracted**: ~3,380 lines to new components

### ✅ Phase 1.5: Context API & React Router (COMPLETE)
**Goal**: Implement modern React architecture with Context API and routing
**Status**: Complete

**Completed**:
- ✅ Created BrolayContext for centralized state management (430 lines)
- ✅ Implemented React Router v6 with proper routing
- ✅ Created Layout component with responsive navigation
- ✅ Extracted 6 remaining pages (Entry, Search, AllPicks, Grid, Settings, Import)
- ✅ Created EditParlayModal reusable component (900 lines)
- ✅ Created utility files (actionHandlers.js, custom.css)
- ✅ Added all handler functions to Context
- ✅ **Result**: App.jsx reduced to 116 lines (97% reduction from 3,913 lines!)

---

## Track 2: Data Structure Enhancement

### Phase 2.1: Type Safety with PropTypes/TypeScript
**Goal**: Add type checking to prevent runtime errors
**Status**: Not Started

**Planned**:
- Add PropTypes to all components
- OR migrate to TypeScript for full type safety
- Define interfaces for Parlay, Pick, Player objects
- Add type checking to custom hooks

### Phase 2.2: Data Model Optimization
**Goal**: Optimize data structures for performance
**Status**: Not Started

**Planned**:
- Review and optimize Firestore data structure
- Add indexes for common queries
- Implement data normalization where needed
- Add data validation layer

---

## Track 3: Performance Optimization

### ✅ Phase 3.1: Route-Level Code Splitting (COMPLETE)
**Goal**: Reduce initial bundle size via lazy loading
**Status**: Complete (January 28, 2026)

**Completed**:
- ✅ Created RouteLoader component for Suspense fallback
- ✅ Converted 10 page imports to React.lazy()
- ✅ Added Suspense boundary in Layout.jsx
- ✅ Added chunk naming in vite.config.js

### ✅ Phase 3.2: Calculation Memoization (COMPLETE)
**Goal**: Eliminate expensive recalculations on every render
**Status**: Complete (January 28, 2026)

**Completed**:
- ✅ AllBrolays.jsx: memoized thresholds, filteredParlays, pendingPicksCount
- ✅ Rankings.jsx: memoized soleSurvivors, streaks, playerSportCombos, topTeams
- ✅ IndividualDashboard.jsx: memoized filteredParlays, pendingPicksCount, allStats

### ✅ Phase 3.3: Context Splitting (COMPLETE)
**Goal**: Prevent UI state from triggering data component re-renders
**Status**: Complete (January 28, 2026)

**Completed**:
- ✅ Created UIContext for mobile/UI state
- ✅ Created FilterContext for filter/search state
- ✅ Updated BrolayContext to use split contexts
- ✅ Maintained backward compatibility (re-exports)

### Phase 3.4: Component Memoization (Optional)
**Goal**: Add React.memo to expensive components
**Status**: Not Started

**Planned**:
- Add React.memo to calendar day cells
- Add React.memo to player leaderboard cards
- Add React.memo to brolay list items

### Phase 3.5: Event Handler Memoization (Optional)
**Goal**: Add useCallback to prevent child re-renders
**Status**: Not Started

**Planned**:
- Add useCallback to filter handlers
- Add useCallback to auto-update handlers

---

## Track 4: Testing & Quality

### Phase 4.1: Test Infrastructure
**Goal**: Set up testing framework
**Status**: Not Started

**Planned**:
- Set up Jest and React Testing Library
- Add unit tests for utils and hooks
- Add component tests for critical components
- Add integration tests for key user flows

### Phase 4.2: Code Quality Tools
**Goal**: Enforce code quality standards
**Status**: Not Started

**Planned**:
- Set up ESLint with React rules
- Add Prettier for code formatting
- Add pre-commit hooks with Husky
- Set up GitHub Actions for CI/CD

---

## Track 5: Feature Enhancements

### Phase 5.1: User Experience
**Goal**: Improve user interface and interactions
**Status**: Not Started

**Planned**:
- Add loading states and skeletons
- Improve error handling and user feedback
- Add animations and transitions
- Mobile responsive improvements

### Phase 5.2: Advanced Features
**Goal**: Add new functionality
**Status**: Not Started

**Planned**:
- User authentication and profiles
- Real-time updates with Firestore listeners
- Export data to CSV/Excel
- Print-friendly views
- Dark mode support

---

## Summary

### ✅ Track 1 Status: **100% COMPLETE**
- Phase 1.1: ✅ Complete
- Phase 1.2: ✅ Complete
- Phase 1.3: ✅ Complete
- Phase 1.4: ✅ Complete
- Phase 1.5: ✅ Complete

### ✅ Track 2 Status: **IN OBSERVATION** (Data Restructure)
- Completed January 28, 2026
- 30-day observation period ends February 27, 2026
- See TRACK_2_SESSION_HANDOFF.md for details

### ✅ Track 3 Status: **PHASES 1-3 COMPLETE** (Performance)
- Phase 3.1: ✅ Route-level code splitting
- Phase 3.2: ✅ Calculation memoization
- Phase 3.3: ✅ Context splitting
- Phase 3.4: ⏳ Optional (React.memo)
- Phase 3.5: ⏳ Optional (useCallback)
- See TRACK_3_SESSION_HANDOFF.md for details

### Overall Progress
- **Lines Reduced**: 9,050 lines (98.7% reduction from 9,166 → 116!)
- **Files Created**: 28+ new files (constants, utils, hooks, components, pages, contexts, router, layout, modals, styles)
- **Code Quality**: Complete separation of concerns with modern React patterns
- **Maintainability**: Dramatically easier to navigate and modify
- **Architecture**: Context API + React Router v6 fully implemented
- **Performance**: Route-level code splitting, calculation memoization, context splitting
- **Pattern Established**: Clear, reusable patterns for all future development

### Next Priority: Track 4 (Testing)
Tracks 1-3 are complete! Next steps:
1. **Track 4**: Testing infrastructure (Jest, React Testing Library)
2. **Track 5**: Feature enhancements and polish

---

## Notes

### Lessons Learned (Phase 1.1-1.4)
- Incremental extraction with testing prevents breaking changes
- JSDoc comments provide clarity without TypeScript overhead
- Prop drilling is verbose but explicit (Context API would reduce this)
- Git commits after each extraction allow easy rollback
- Large page components (1,000+ lines) can often be broken down further

### Technical Debt Identified
- Tailwind CDN should be replaced with PostCSS build for production
- Some helper functions still in App.jsx could be extracted to utils
- Calendar logic could be extracted to a custom hook
- GroupDashboard could be split into smaller sub-components
- FilterBar could use React Hook Form for better form management

### Dependencies Added
- None (all refactoring used existing dependencies)

### Breaking Changes
- None (all changes were internal restructuring)
