# Session Handoff Prompt for Claude Code

Use this prompt to efficiently continue refactoring work in future sessions.

---

## 📋 Quick Start Prompt

```
I'm continuing the Brolay Toxic Standings refactoring project.

Please read these files to understand the current state:
1. REFACTORING_ROADMAP.md - Overall progress and next steps
2. src/App.jsx (lines 1-100) - Current main file structure
3. src/pages/ - Review existing page components
4. src/hooks/ - Review existing custom hooks
5. src/components/ - Review existing components

Current status: Track 1 (Code Organization) is ~80% complete. App.jsx has been reduced from 9,166 to 3,840 lines (58.1% reduction).

I'd like to continue with [SPECIFY YOUR GOAL - see options below].
```

---

## 🎯 Common Next Steps

### Option 1: Continue Track 1.5 (Further App.jsx Reduction)
```
I'd like to continue Track 1.5: Further optimization of App.jsx.

Focus areas:
1. Implement Context API to reduce prop drilling
2. Add React Router for proper routing instead of tab state
3. Extract remaining helper functions to utils
4. Consider breaking down large page components

Please analyze the current App.jsx structure and propose the next extraction opportunities.
```

### Option 2: Start Track 2 (Type Safety)
```
I'd like to start Track 2: Add type safety to the codebase.

Please:
1. Review all custom hooks and add PropTypes
2. Review all components and add PropTypes
3. Define common prop type shapes in a types file
4. Document expected data structures

Start with the most critical components (hooks and page-level components).
```

### Option 3: Start Track 3 (Performance Optimization)
```
I'd like to start Track 3: Performance optimization.

Please:
1. Analyze components that could benefit from React.memo
2. Review useEffect dependencies for optimization opportunities
3. Identify expensive computations that need useMemo/useCallback
4. Plan migration from Tailwind CDN to PostCSS build

Start with profiling the most frequently rendered components.
```

### Option 4: Fix Specific Issue
```
I need to fix [DESCRIBE ISSUE].

Current behavior: [WHAT'S HAPPENING]
Expected behavior: [WHAT SHOULD HAPPEN]
Error messages: [PASTE ANY ERRORS]

Please analyze the issue and provide a fix.
```

---

## 🗂️ Key File Locations Reference

### Main Application
- **App.jsx**: `src/App.jsx` (3,840 lines) - Main application component

### Custom Hooks (Track 1.3)
- **useBrolays**: `src/hooks/useBrolays.js` - Firestore data management
- **useESPN**: `src/hooks/useESPN.js` - ESPN API integration
- **useStats**: `src/hooks/useStats.js` - Statistics calculations
- **useOdds**: `src/hooks/useOdds.js` - Odds API integration

### Page Components (Track 1.4)
- **Rankings**: `src/pages/Rankings.jsx` (491 lines) - Rankings page
- **IndividualDashboard**: `src/pages/IndividualDashboard.jsx` (533 lines) - Individual stats
- **GroupDashboard**: `src/pages/GroupDashboard.jsx` (1,390 lines) - Group dashboard
- **AllBrolays**: `src/pages/AllBrolays.jsx` (794 lines) - All Brolays view

### Small/Medium Components (Track 1.4)
- **StatCard**: `src/components/dashboard/StatCard.jsx` (47 lines)
- **FilterBar**: `src/components/filters/FilterBar.jsx` (189 lines)
- **ComparisonTable**: `src/components/dashboard/ComparisonTable.jsx` (228 lines)
- **BrolayGrid**: `src/components/dashboard/BrolayGrid.jsx` (98 lines)

### Constants & Utils (Track 1.2)
- **Theme**: `src/constants/theme.js` - Colors, button/card styles
- **Sports**: `src/constants/sports.js` - Sports data, players, teams
- **Formatters**: `src/utils/formatters.js` - Date/data formatting

### Configuration
- **Firebase**: Configured in App.jsx
- **Vercel**: Auto-deploys from GitHub main branch
- **GitHub**: Repository at https://github.com/RMA36/brolay-toxic-standings

---

## 📊 Current Metrics

### Code Reduction Progress
- **Starting Point**: 9,166 lines (Phase 1.1)
- **After Constants**: 8,847 lines (Phase 1.2)
- **After Hooks**: 7,349 lines (Phase 1.3)
- **After Components**: 3,840 lines (Phase 1.4)
- **Total Reduction**: 5,326 lines (58.1%)

### Files Created
- **4** constants/utils files
- **4** custom hooks
- **8** components (4 small/medium + 4 page-level)
- **Total**: 16 new files

---

## 🚀 Git Workflow

All changes should follow this pattern:

```bash
# 1. Make changes to files
# 2. Stage changes
git add [files]

# 3. Commit with descriptive message
git commit -m "type: Brief description

- Detailed change 1
- Detailed change 2
- Result/impact

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# 4. Push to GitHub (triggers Vercel deployment)
git push
```

### Commit Types
- `feat:` - New feature or component extraction
- `fix:` - Bug fix
- `refactor:` - Code restructuring without behavior change
- `docs:` - Documentation updates
- `perf:` - Performance improvements
- `test:` - Test additions

---

## ⚠️ Important Notes

### Before Starting Work
1. Always read REFACTORING_ROADMAP.md first
2. Check current App.jsx line count: `wc -l src/App.jsx`
3. Review recent commits: `git log --oneline -10`
4. Check if there are uncommitted changes: `git status`

### During Work
1. Test after each major change (check Vercel deployment)
2. Commit incrementally (not one big commit at end)
3. Update REFACTORING_ROADMAP.md as phases complete
4. Document any new patterns or decisions

### Common Pitfalls to Avoid
- ❌ Don't use temp file names that get committed (tmpclaude-*)
- ❌ Don't break existing functionality (test after extraction)
- ❌ Don't skip JSDoc comments on new components
- ❌ Don't forget to import components in App.jsx
- ❌ Don't use wrong function names in props (like handleESPNSync)

---

## 🧪 Testing Checklist

After making changes, verify:
- [ ] Application builds without errors
- [ ] No console errors in browser
- [ ] All tabs/views still work
- [ ] Data loads correctly from Firebase
- [ ] ESPN sync functionality works
- [ ] Filtering works on all views
- [ ] Mobile responsive layout works
- [ ] Vercel deployment succeeds

---

## 📞 Context Refresh Commands

If you need to refresh understanding of the codebase:

```bash
# See all page components
ls -lh src/pages/

# See all hooks
ls -lh src/hooks/

# Count total components
find src/components -name "*.jsx" | wc -l

# See recent changes
git log --oneline --graph -15

# Check current line counts
wc -l src/App.jsx src/pages/*.jsx src/hooks/*.js
```

---

## 🎯 Success Criteria

### Track 1 Complete When:
- ✅ App.jsx under 2,000 lines
- ✅ All major pages extracted to components
- ✅ Context API implemented (reduced prop drilling)
- ✅ React Router implemented (proper routing)
- ✅ All helper functions in utils/

### Track 2 Complete When:
- ✅ All components have PropTypes or TypeScript
- ✅ Common types documented
- ✅ Data structures validated
- ✅ No prop type warnings in console

### Track 3 Complete When:
- ✅ Bundle size optimized (code splitting)
- ✅ Tailwind CDN replaced with PostCSS
- ✅ React.memo on expensive components
- ✅ Performance profiling shows improvements

---

## 📝 Template for Session End

At the end of each session, update this section:

### Last Session Summary
- **Date**: January 2026
- **Work Completed**: Extracted AllBrolays page component (794 lines), removed duplicate from GroupDashboard (748 lines), fixed console errors
- **Files Changed**:
  - Created: `src/pages/AllBrolays.jsx`
  - Modified: `src/App.jsx`, `src/pages/GroupDashboard.jsx`
- **Commits**:
  1. `feat: Extract AllBrolays page component` - Created standalone AllBrolays page
  2. `fix: Correct function names in AllBrolays props` - Fixed handleESPNSync reference error
- **App.jsx Status**: 3,840 lines (down from 3,806 - minor increase due to import/wrapper)
- **Next Priority**: Track 1.5 - Context API implementation or React Router setup to further reduce prop drilling
- **Blockers/Notes**:
  - Tailwind CDN warning (not critical, but should migrate to PostCSS for production)
  - GroupDashboard is still 1,390 lines - could be broken down further
  - Calendar logic could be extracted to a custom hook (useCalendar)
