# Brolay Toxic Standings - New Session Start Prompt

Use this prompt to start a new Claude Code session and continue working on the Brolay Toxic Standings app.

---

## 🚀 QUICK START PROMPT

Copy and paste this into a new Claude Code session:

```
I'm continuing work on the Brolay Toxic Standings app (React/Vite/Firebase).

Current status as of January 28, 2026:
- Track 1 (Code Organization): COMPLETE - App.jsx reduced from 9,166 → 116 lines
- Track 2 (Data Restructure): COMPLETE - 725 brolays migrated to new schema. In 30-day observation period (ends Feb 27, 2026). All post-migration bugs fixed.
- Track 3 (Performance): ALL 5 PHASES COMPLETE
  - Phase 1: Route-level code splitting ✅
  - Phase 2: Calculation memoization ✅
  - Phase 3: Context splitting ✅
  - Phase 4: Component memoization (CalendarDay) ✅
  - Phase 5: Event handler memoization (useCallback) ✅
- Track 4 (Testing): NOT STARTED
- Track 5 (Features): NOT STARTED

Last session (Jan 28, 2026):
- Created CalendarDay memoized component
- Added useCallback to 3 key handlers
- Fixed all remaining old-schema field access (Rankings, Search, Entry)
- All changes committed: fb696e3

Please read these files for full context:
1. REFACTORING_ROADMAP.md (master plan and progress)
2. TRACK_2_SESSION_HANDOFF.md (data restructure details)
3. TRACK_3_SESSION_HANDOFF.md (performance optimization details)
4. SESSION_2026_01_28_COMPLETION_SUMMARY.md (latest session summary)

Key architecture:
- React 18 + React Router v6 + Context API (BrolayContext, UIContext, FilterContext)
- Firebase Firestore for data, ESPN API for auto-updates, The Odds API for odds
- Dual-schema helpers in src/utils/formatters.js (getPicksArray, getPickBigGuy, getPickResult, getSubmittedBy)
- PWA with vite-plugin-pwa (service worker may cache old builds)

[DESCRIBE WHAT YOU WANT TO WORK ON HERE]
```

---

## 📋 COMMON TASKS & PROMPTS

### Option 1: Start Track 4 (Testing Infrastructure)

```
I want to start Track 4: Testing Infrastructure.

Please read REFACTORING_ROADMAP.md for the testing plan. I'd like to:
1. Set up Jest and React Testing Library
2. Add unit tests for utils and hooks
3. Add component tests for critical components
4. Add integration tests for key user flows

Let's start with setting up the testing infrastructure.
```

### Option 2: Start Track 5 (Feature Enhancements)

```
I want to start Track 5: Feature Enhancements.

Please read REFACTORING_ROADMAP.md for the feature roadmap. I'm interested in:
1. [Choose: User authentication | Real-time updates | Export to CSV | Dark mode]

Let's plan the implementation approach.
```

### Option 3: Bug Fix or Improvement

```
I found a bug/want to make an improvement:

[DESCRIBE THE BUG OR IMPROVEMENT]

Please read the relevant documentation files and help me fix this.
```

### Option 4: Add New Feature

```
I want to add a new feature: [FEATURE NAME]

[DESCRIBE THE FEATURE]

Please read REFACTORING_ROADMAP.md and the handoff documents, then help me plan and implement this feature.
```

### Option 5: Performance Profiling

```
I want to profile and verify the Track 3 performance optimizations.

Please help me:
1. Set up React DevTools Profiler
2. Measure component re-renders
3. Verify memoization is working
4. Check bundle size optimization from code splitting
5. Identify any remaining performance bottlenecks
```

### Option 6: Cleanup After Observation Period (After Feb 27, 2026)

```
The 30-day observation period for Track 2 has ended (started Jan 28, 2026).

Please help me:
1. Remove dual-schema helper code
2. Simplify formatters.js to use new schema only
3. Clean up any remaining old-schema references
4. Update documentation to remove dual-schema notes
```

---

## 🔍 USEFUL CONTEXT FILES

When starting a session, Claude should always read these files first:

### Essential (Always Read)
- `REFACTORING_ROADMAP.md` - Master plan and overall progress
- `SESSION_2026_01_28_COMPLETION_SUMMARY.md` - Latest session summary

### Track-Specific (Read as needed)
- `TRACK_2_SESSION_HANDOFF.md` - Data restructure implementation details
- `TRACK_3_SESSION_HANDOFF.md` - Performance optimization implementation details

### Reference (Read when relevant)
- `src/utils/formatters.js` - Dual-schema helper functions
- `src/contexts/BrolayContext.jsx` - Main context provider
- `TRACK_2_DATA_RESTRUCTURE_PLAN.md` - Original data restructure plan

---

## 🎯 CURRENT PRIORITIES (as of Jan 28, 2026)

### High Priority
1. **Track 4: Testing** - No tests currently exist
2. **Monitor Track 2** - Watch for any issues during 30-day observation period

### Medium Priority
1. **Track 5: Feature Enhancements** - User auth, real-time updates, exports
2. **Performance Profiling** - Verify Track 3 optimizations are working

### Low Priority
1. **Technical Debt** - See REFACTORING_ROADMAP.md "Technical Debt Identified" section
2. **Cleanup** - After Feb 27, remove dual-schema code

---

## 🛠️ COMMON DEVELOPMENT TASKS

### Running the App
```bash
cd brolay-toxic-standings
npm run dev
```

### Building for Production
```bash
npm run build
npm run preview
```

### Git Workflow
```bash
# Check status
git status

# Stage changes
git add -A

# Commit with detailed message
git commit -m "Description

- Change 1
- Change 2

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# Push to GitHub
git push origin main
```

### Backup & Restore (Track 2 Scripts)
```bash
# Create backup
node scripts/backup/export-firestore.js

# Restore from backup (emergency only)
node scripts/backup/restore-firestore.js
```

---

## 📚 PROJECT STRUCTURE REFERENCE

```
brolay-toxic-standings/
├── src/
│   ├── components/
│   │   ├── common/ (Button, Card, etc.)
│   │   ├── dashboard/ (StatCard, ComparisonTable, BrolayGrid)
│   │   ├── filters/ (FilterBar)
│   │   ├── forms/ (PickEntry)
│   │   ├── layout/ (Layout, Sidebar)
│   │   ├── modals/ (EditParlayModal)
│   │   └── calendar/ (CalendarDay - memoized)
│   ├── contexts/
│   │   ├── BrolayContext.jsx (main context, re-exports UI & Filter)
│   │   ├── UIContext.jsx (mobile/UI state)
│   │   └── FilterContext.jsx (filter/search state)
│   ├── hooks/
│   │   ├── useBrolays.js (Firestore CRUD)
│   │   ├── useESPN.js (ESPN API integration)
│   │   ├── useStats.js (statistics calculations)
│   │   └── useOdds.js (The Odds API)
│   ├── pages/
│   │   ├── Entry.jsx (new brolay form)
│   │   ├── AllBrolays.jsx (calendar/list view)
│   │   ├── GroupDashboard.jsx (stats, calendar, settlements)
│   │   ├── IndividualDashboard.jsx (player stats, comparison)
│   │   ├── Rankings.jsx (sole survivors, streaks, combos)
│   │   ├── AllPicks.jsx (all picks view)
│   │   ├── Search.jsx (search & insights)
│   │   ├── Grid.jsx (matrix view)
│   │   ├── Payments.jsx (financial tracking)
│   │   ├── Settings.jsx (app settings)
│   │   └── Import.jsx (import data)
│   ├── router/ (React Router v6 setup with lazy loading)
│   ├── utils/
│   │   ├── formatters.js (dual-schema helpers, date formatting)
│   │   └── actionHandlers.js (action handlers)
│   ├── constants/
│   │   ├── sports.js (sports data, teams, players, bet types)
│   │   └── theme.js (colors, styles)
│   ├── insightsHelper.js (insights logic)
│   ├── searchUtils.js (search utilities)
│   └── App.jsx (116 lines - main app wrapper)
├── scripts/
│   ├── backup/ (export/restore scripts)
│   └── migration/ (Track 2 migration scripts)
└── backups/ (Firestore backups - not in git)
```

---

## ⚠️ IMPORTANT NOTES

### Service Worker Caching
The PWA service worker aggressively caches builds. After deploying:
- Users need hard refresh (Ctrl+Shift+R)
- Or unregister service worker in DevTools

### Dual-Schema Support
Until Feb 27, 2026, app supports both old and new schemas:
- **Always use helpers**: `getPicksArray()`, `getPickBigGuy()`, `getPickResult()`, `getSubmittedBy()`
- **Never access directly**: `pick.player`, `pick.result`, `parlay.placedBy`, `parlay.participants`

### Git Best Practices
- Don't commit `dist/`, `backups/`, `node_modules/`
- Use descriptive commit messages
- Always add "Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

### Testing Before Commit
```bash
# Always test before committing
npm run dev
# Test the changes manually
# Then commit
```

---

## 🎓 LESSONS LEARNED

### From Track 1 (Code Organization)
- Incremental extraction with testing prevents breaking changes
- Git commits after each extraction allow easy rollback
- JSDoc comments provide clarity without TypeScript overhead

### From Track 2 (Data Restructure)
- Dual-schema approach enables zero-downtime migration
- Comprehensive validation catches issues before production
- Backup/restore scripts are essential

### From Track 3 (Performance)
- useMemo prevents expensive recalculations
- React.memo with custom comparison optimizes re-renders
- useCallback stabilizes function references
- Context splitting prevents unnecessary re-renders

---

## 📞 NEED HELP?

If you encounter issues:
1. Read the relevant SESSION_HANDOFF or COMPLETION_SUMMARY document
2. Check REFACTORING_ROADMAP.md for context
3. Look at recent git commits for examples: `git log --oneline -10`
4. Search the codebase: Use Grep or Glob tools

---

**Last Updated**: January 28, 2026
**Last Commit**: fb696e3
**Next Track**: Track 4 (Testing) or Track 5 (Features)
