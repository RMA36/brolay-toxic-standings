# Track 5: Feature Enhancements - Session Start Prompt

Use this prompt to start a new Claude Code session for Track 5 work:

---

## Prompt for New Session

```
I'm ready to start Track 5: Feature Enhancements for the Brolay Toxic Standings app.

PROJECT CONTEXT:
- React/Vite/Firebase app for tracking sports betting parlays among friends
- Three players: Management, Labor, Operations
- Dual-schema support (old + new) until February 27, 2026

COMPLETED TRACKS:
✅ Track 1: Code Organization - COMPLETE
✅ Track 2: Data Restructure - COMPLETE (observation period until Feb 27)
✅ Track 3: Performance Optimization - COMPLETE (all 5 phases)
✅ Track 4 Phase 4.1: Testing Infrastructure - COMPLETE
   - 145 passing tests (100% success rate)
   - Vitest + React Testing Library configured
   - Test coverage: utilities, hooks, components

PROJECT LOCATION:
C:\Users\ander\OneDrive\Documents\Claude Code\brolay-toxic-standings

KEY FILES TO READ:
1. ROADMAP.md - Full project roadmap and track details
2. TRACK_4_PHASE_4.1_FINAL_SUMMARY.md - Recent testing work summary
3. TESTING_QUICKSTART.md - How to run tests

IMPORTANT NOTES:
- Always run `npm test` in PowerShell (not in bash - npm not available)
- Project uses ES modules (type: "module" in package.json)
- OneDrive sync requires `--pool=forks` flag for tests
- Supports both old and new data schemas during migration

TRACK 5 OPTIONS (from ROADMAP.md):
1. Enhanced filtering and sorting on Rankings page
2. Export/import functionality for brolay data
3. Mobile-responsive improvements
4. Advanced statistics and analytics
5. User preferences and settings
6. Dark mode / theme support
7. Other features as needed

WHAT I NEED:
Please read the ROADMAP.md file to understand Track 5 options, then help me:
1. Review available Track 5 features
2. Recommend priority based on user value and complexity
3. Plan implementation approach
4. Implement the chosen feature(s) with tests

Let's discuss which Track 5 feature makes the most sense to tackle first.
```

---

## Alternative Quick Start (If You Already Know What Feature You Want)

```
I want to implement [SPECIFIC FEATURE] for the Brolay Toxic Standings app (Track 5).

PROJECT LOCATION:
C:\Users\ander\OneDrive\Documents\Claude Code\brolay-toxic-standings

CONTEXT:
- React/Vite/Firebase sports betting tracker
- 145 passing tests already in place
- Dual-schema support until Feb 27, 2026

FEATURE REQUEST:
[Describe the specific feature you want to add]

Please:
1. Read ROADMAP.md to understand the project structure
2. Identify affected files
3. Plan the implementation
4. Write tests first (TDD approach)
5. Implement the feature
6. Ensure all 145+ tests pass
```

---

## Features Ready for Implementation

Based on ROADMAP.md, here are the Track 5 options with complexity estimates:

### High Priority (User Value + Low Complexity)
1. **Enhanced Filtering** (Phase 5.1)
   - Filter by date range, player, sport, result
   - Already has some filtering, just needs expansion
   - Estimated: 2-3 hours

2. **Export/Import Functionality** (Phase 5.2)
   - Export brolays to JSON/CSV
   - Import from backup files
   - Estimated: 3-4 hours

3. **Mobile Responsive Improvements** (Phase 5.3)
   - Better touch targets
   - Improved mobile navigation
   - Already mostly responsive
   - Estimated: 2-3 hours

### Medium Priority (High Value + Medium Complexity)
4. **Advanced Statistics** (Phase 5.4)
   - Win streaks, hot/cold players
   - Performance trends over time
   - Estimated: 4-5 hours

5. **User Preferences** (Phase 5.5)
   - Save filter preferences
   - Customize display options
   - Estimated: 3-4 hours

### Lower Priority (Nice to Have)
6. **Dark Mode** (Phase 5.6)
   - Theme toggle
   - Already has dark design base
   - Estimated: 2-3 hours

7. **Notifications System** (Phase 5.7)
   - Alert when picks settle
   - Remind to enter new brolays
   - Estimated: 4-5 hours

---

## Recommended Starting Point

**Suggestion: Start with Phase 5.1 - Enhanced Filtering**

**Why:**
- ✅ High user value (easier to find specific brolays)
- ✅ Low complexity (build on existing filter infrastructure)
- ✅ Quick win to build momentum
- ✅ Good introduction to Track 5 work
- ✅ Easy to test

**What it includes:**
- Advanced date range picker
- Multi-select sport filter
- Filter by bet type
- Filter by result (win/loss/push)
- Save filter state in URL
- "Clear all filters" button

---

## Testing Reminder

After implementing any Track 5 feature:

```bash
cd "C:\Users\ander\OneDrive\Documents\Claude Code\brolay-toxic-standings"
npm test
```

All 145 existing tests must continue passing, plus any new tests for the feature.

---

## Session Tips for Claude

1. **Always read files before editing** - Use Read tool first
2. **Run tests frequently** - After any code changes
3. **Write tests first** - TDD approach when possible
4. **Use TodoWrite** - Track progress for multi-step features
5. **Update documentation** - Add notes to ROADMAP.md when complete
6. **Check dual-schema** - Ensure new features work with both schemas
7. **Git commits** - Create commits when user requests (never automatically)

---

## Quick Reference Commands

```bash
# Navigate to project
cd "C:\Users\ander\OneDrive\Documents\Claude Code\brolay-toxic-standings"

# Run tests (PowerShell only)
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run dev server
npm run dev

# Build for production
npm run build
```

---

## Key Project Principles

1. **Don't break existing functionality** - All 145 tests must pass
2. **Dual-schema support** - Until February 27, 2026
3. **Mobile-first** - Ensure features work on mobile
4. **Test coverage** - Write tests for new features
5. **Keep it simple** - Avoid over-engineering

---

**Ready to start Track 5? Copy the prompt above and begin!** 🚀
