# Track 2: Data Restructure - Session Handoff Document

**Last Updated**: January 25, 2026
**Session Date**: January 25, 2026
**Current Stage**: Stage 3 - Code Updates (COMPLETE)

---

## 🎯 QUICK START FOR NEW SESSION

If you're starting a new Claude Code session and want to continue Track 2 work:

### Option 1: Continue Where We Left Off (RECOMMENDED)
```
I'm ready to continue Track 2 (Data Structure Restructure) for the Brolay Toxic Standings app.

We completed Stages 1-2:
- Stage 1: Full backup created (724 brolays, 3,119 picks)
- Stage 2: Migration scripts built and tested (100% validation pass)

Please read these files in the brolay-toxic-standings folder:
1. TRACK_2_SESSION_HANDOFF.md (current status)
2. TRACK_2_DATA_RESTRUCTURE_PLAN.md (full plan with Stage 3 tasks)

Then start Stage 3: Code Updates - updating the React app to use the new schema.
```

### Option 2: Resume at Specific Stage
```
I'm ready to continue Track 2. Please read TRACK_2_SESSION_HANDOFF.md
and start Stage [NUMBER]: [STAGE_NAME].
```

### Option 3: Review Status
```
What's the current status of Track 2? Please read TRACK_2_SESSION_HANDOFF.md
and give me a summary of what's been completed and what's next.
```

---

## 📋 PROJECT OVERVIEW

### What is Track 2?
Track 2 is the **Data Structure Enhancement** phase of the Brolay Toxic Standings optimization roadmap. It involves completely restructuring the Firebase data model from a fragmented, inconsistent structure to a unified, extensible entity-based schema.

### Why Are We Doing This?
The current data structure has several critical issues:
1. **Field naming confusion**: `player` field stores "Big Guys" (Management, CD, etc.), but `team` field stores sports player names for props
2. **Data duplication**: Team information stored in both `team` and `playerTeam` fields
3. **Inconsistent patterns**: Different bet types use completely different field structures
4. **No margin tracking**: Only stores win/loss, not by how much
5. **Hard to extend**: Adding new bet types requires new field patterns
6. **Complex queries**: Must check 5+ different fields to find team/player names

### What's the Goal?
Transform the data to:
- ✅ Clearly separate "Big Guys" from sports players/teams
- ✅ Use consistent entity structure for all bet types
- ✅ Enable margin tracking (how much won/lost by)
- ✅ Make adding new bet types trivial
- ✅ Simplify all queries to single entities array

---

## 🗂️ KEY DOCUMENTS

### Must Read (in order)
1. **TRACK_2_SESSION_HANDOFF.md** (this file) - Session context and current status
2. **TRACK_2_DATA_RESTRUCTURE_PLAN.md** - Detailed implementation plan with all 5 stages
3. **SCHEMA_SPECIFICATION.md** (create during Stage 1) - Final schema reference

### Supporting Documents
- **REFACTORING_ROADMAP.md** - Overall Track 1-3 roadmap (Track 1 is complete)
- **TRACK_1_5_COMPLETION_SUMMARY.md** - Track 1 completion details
- **BROLAY_OPTIMIZATION_ROADMAP.md** - Original comprehensive roadmap

---

## 📊 CURRENT STATUS

### Completed ✅
- [x] Planning and design discussions
- [x] Schema refinement (corrected margin calculations, removed redundancy)
- [x] Decision on Option 3 (Full Unified Entity Model)
- [x] All 15 refinement questions addressed
- [x] Complete schema specification documented
- [x] Migration strategy designed
- [x] 5-stage implementation plan created
- [x] Risk mitigation strategies defined
- [x] **Stage 1: Backup & Preparation** - COMPLETE
  - Full backup: 724 brolays, 3,119 picks exported to JSON
  - Restore script created and ready
  - Backup file: `backups/brolay-backup-2026-01-25-110121.json`
- [x] **Stage 2: Migration Script Development** - COMPLETE
  - All transformation scripts created and tested
  - 100% validation pass rate (0 errors, 0 warnings)
  - Migrated data output: `backups/migrated-data.json`
- [x] **Stage 3: Code Updates** - MOSTLY COMPLETE (see details below)

### In Progress 🔄
- (None - Stage 3 Complete)

### Not Started ⏳
- [ ] Stage 4: Testing & Validation
- [ ] Stage 5: Production Migration

### Current Stage
**Stage 3: Code Updates - COMPLETE ✅**

### Next Stage
**Stage 4: Testing & Validation** (estimated 1-2 sessions)

---

## 🔑 KEY DECISIONS MADE

### Decision 1: Full Restructure (Option 3)
**Chosen**: Complete unified entity model
**Rationale**: Best long-term stability, worth short-term migration effort
**Alternative Considered**: Phased approach (Option 2.5)

### Decision 2: Use player1 for Single Player Props
**Chosen**: Single player props use `player1`, `player1Team`, `player1Position`
**Rationale**: Consistency with H2H props, no field name collisions
**Alternative Considered**: New `sportsPlayer` field

### Decision 3: Naming Conventions
- **Chosen**: `bigGuy` for who made the pick
- **Chosen**: `submittedBy` for who placed the brolay
- **Chosen**: `picks` instead of `participants`
- **Chosen**: `outcome.status` instead of `outcome.result`
- **Rationale**: Clearer semantics, less confusion

### Decision 4: Field Omission Strategy
**Chosen**: Omit optional fields entirely (don't set to null)
**Rationale**: Saves Firebase storage, cleaner data
**Exception**: Use `null` for meaningful absence (e.g., `margin: null` for moneylines)

### Decision 5: Picks Storage Structure
**Chosen**: Object with generated pick IDs as keys
**Rationale**: Easier to search and query individual picks
**Alternative Considered**: Array

### Decision 6: Game Object for All Bets
**Chosen**: All picks have `game` object with date, teams, ESPN ID
**Rationale**: Enables consistent auto-update logic
**Implementation**: Store ESPN IDs when available, null when not

### Decision 7: Margin Tracking
**Chosen**: `outcome.margin` stores signed number (positive = won by X, negative = lost by X)
**Chosen**: `margin: null` for moneylines (no margin concept)
**Chosen**: Remove `actualValue` field (redundant - margin is what matters)

### Decision 8: Line Value Storage
**Chosen**: `line.value` always positive, `line.direction` indicates polarity
**Example**: Chiefs -7.5 → `value: 7.5, direction: "favorite"`
**Rationale**: Consistent data structure, simplifies calculations

### Decision 9: Multiple Big Guys Per Brolay
**Confirmed**: Each brolay has:
- 1 `submittedBy` (who placed it)
- 3-5 picks (one per Big Guy)
- `submittedBy` may or may not be in the picks
**Use Case**: Determines who owes/receives payment

### Decision 10: Keep as Object Structure
**Chosen**: Keep `betCategory` and `betType` separate
**Chosen**: Keep `line.type` even if sometimes redundant
**Chosen**: Keep validation in code, not in data
**Rationale**: Self-documenting data, easier debugging

---

## 📐 SCHEMA QUICK REFERENCE

### Old Structure (Current)
```javascript
{
  id: "xyz123",
  date: "2025-01-22",
  placedBy: "Management",
  betAmount: 10,
  participants: {
    "0": {
      player: "Management",      // Big Guy
      sport: "NFL",
      betType: "Player Prop",
      team: "Patrick Mahomes",   // PLAYER name (confusing!)
      playerTeam: "Chiefs",      // Actual team
      playerPosition: "QB",
      propType: "Passing Yards",
      line: "300.5",
      overUnder: "Over",
      result: "win"
    }
  },
  settled: true
}
```

### New Structure (Target)
```javascript
{
  id: "brolay_abc123",
  date: "2025-01-22",
  submittedBy: "Management",
  betAmount: 10,
  picks: {
    "pick_001": {
      bigGuy: "Management",
      sport: "NFL",
      betCategory: "playerProp",
      betType: "Player Prop",

      game: {
        date: "2025-01-22",
        awayTeam: "Kansas City Chiefs",
        homeTeam: "Buffalo Bills",
        espnGameId: "401547649",
        league: "NFL"
      },

      entities: [
        {
          entityType: "player",
          name: "Patrick Mahomes",
          team: "Kansas City Chiefs",
          position: "QB",
          role: "primary"
        }
      ],

      line: {
        type: "prop",
        value: 300.5,
        direction: "over",
        odds: "-110",
        statType: "Passing Yards"
      },

      outcome: {
        status: "win",
        margin: 26.5,
        autoUpdated: true,
        settledAt: "2025-01-23T02:15:00Z",
        actualStat: 327
      }
    }
  },
  settled: true,
  settledAt: "2025-01-23T02:15:00Z"
}
```

### Transformation Map

| Old Field | New Field | Notes |
|-----------|-----------|-------|
| `placedBy` | `submittedBy` | Renamed for clarity |
| `participants` | `picks` | Better semantic name |
| `participants["0"].player` | `picks["pick_001"].bigGuy` | Renamed to avoid confusion |
| `participants["0"].team` | `picks["pick_001"].entities[0].name` | For player props |
| `participants["0"].playerTeam` | `picks["pick_001"].entities[0].team` | Consolidated |
| `participants["0"].result` | `picks["pick_001"].outcome.status` | Nested in outcome |
| N/A | `picks["pick_001"].game` | NEW - game identification |
| N/A | `picks["pick_001"].outcome.margin` | NEW - margin tracking |

---

## 🏗️ IMPLEMENTATION STAGES OVERVIEW

### Stage 1: Backup & Preparation (1 session)
**Goal**: Export all data, set up test environment, create rollback capability

**Key Tasks**:
- Export all ~350 brolays from Firestore to JSON
- Create test Firebase instance
- Build rollback script
- Verify backup integrity

**Deliverables**:
- `backups/brolay-backup-2026-01-25.json`
- `scripts/backup/export-firestore.js`
- `scripts/backup/restore-firestore.js`
- Test Firebase instance ready

**Success Criteria**: Full backup verified, rollback tested

---

### Stage 2: Migration Script Development (2-3 sessions)
**Goal**: Build comprehensive migration script with validation

**Key Tasks**:
- Create transformation functions for all bet types
- Build entity population logic
- Create game object builder
- Implement margin calculator
- Build validation functions
- Create reporting system

**Deliverables**:
- `scripts/migration/transform-pick.js`
- `scripts/migration/entity-builder.js`
- `scripts/migration/game-builder.js`
- `scripts/migration/margin-calculator.js`
- `scripts/migration/validator.js`
- `scripts/migration/migrate-all.js`
- `scripts/migration/reporter.js`

**Success Criteria**: Migration runs successfully on test data, 100% validation pass

---

### Stage 3: Code Updates (3-4 sessions)
**Goal**: Update all application code to use new schema

**Key Tasks**:
- Update 4 hooks (useBrolays, useStats, useESPN, useOdds)
- Update entry forms (PickEntry, Entry)
- Update display components (formatters, BrolayGrid, etc.)
- Update filters (FilterBar, actionHandlers)
- Update 5 pages (AllBrolays, AllPicks, Rankings, Dashboards)
- Update context (BrolayContext)
- Update constants

**Deliverables**:
- ~40 updated files
- No console errors
- All components rendering

**Success Criteria**: App compiles, runs, new data saves correctly

---

### Stage 4: Testing & Validation (1-2 sessions)
**Goal**: Verify everything works correctly

**Key Tasks**:
- Test migration on test instance
- Test all 15+ bet type entries
- Test all display pages
- Test all filters
- Test statistics calculations
- Test ESPN auto-update
- Test edge cases

**Deliverables**:
- `TESTING_CHECKLIST.md`
- Test results documented
- All tests passing

**Success Criteria**: All functionality working, no regressions

---

### Stage 5: Production Migration (1 session)
**Goal**: Migrate production safely

**Key Tasks**:
- Final production backup
- Run migration on production
- Validate results
- Monitor for issues
- User acceptance

**Deliverables**:
- Production migrated
- Migration report
- Monitoring logs

**Success Criteria**: All data migrated, no issues, users happy

---

## 📊 DATA INVENTORY

### Current Production Data (Estimated)
- **Total Brolays**: ~350
- **Total Picks**: ~1,500
- **Big Guys**: 5 (Management, CD, 914, Junior, Jacoby)
- **Sports**: 12 (NFL, NBA, MLB, NHL, CFB, CBB, WNBA, Soccer, Tennis, Golf, Rugby, UFC)
- **Bet Types**: 15+ (see full list in plan)

### Migration Complexity
- **Files to Update**: ~40
- **Lines of Code to Change**: ~2,000
- **Transformation Functions Needed**: 15+ (one per bet type)
- **Validation Rules**: 100+

---

## 🎓 CONTEXT FOR NEW SESSIONS

### What is a "Brolay"?
A brolay is a parlay (combined bet) submitted by one of the Big Guys. It contains 3-5 picks, with each pick made by a different Big Guy. The bet is placed as a group.

### Who are the "Big Guys"?
The 5 participants:
1. Management
2. CD
3. 914
4. Junior
5. Jacoby

### How Does Betting Work?
- One Big Guy submits the brolay (`submittedBy`)
- 3-5 different Big Guys each contribute one pick to the brolay
- If all picks win, everyone gets paid out
- If any pick loses, the brolay loses
- Settlement determines who owes who money

### Current Tech Stack
- **Frontend**: React (with Context API, React Router)
- **Database**: Firebase Firestore
- **APIs**: ESPN API (game results, player data), The Odds API
- **Build**: Vite
- **Styling**: Tailwind CSS

### Project Structure
```
brolay-toxic-standings/
├── src/
│   ├── components/      (UI components)
│   ├── contexts/        (React Context API)
│   ├── hooks/           (Custom React hooks)
│   ├── pages/           (Route pages)
│   ├── utils/           (Helper functions)
│   ├── constants/       (Constants and configs)
│   └── App.jsx
├── scripts/             (Migration and utility scripts)
├── backups/             (Data backups)
└── docs/                (Documentation)
```

---

## ⚠️ IMPORTANT CONSIDERATIONS

### Data Safety
- **ALWAYS backup before making changes**
- **Test on test instance first**
- **Keep rollback script ready**
- **Never delete old data until verified stable for 30 days**

### Bet Type Handling
Must handle all bet types correctly:
- Standard bets (Spread, Moneyline, Total)
- Player Props (single player)
- Multi-player props (H2H, Either, Combined)
- Team Props
- Period-specific bets (First Half, Quarter)
- Sport-specific (First Inning Runs)
- Legacy "Prop Bet" type (backward compatibility)

### Edge Cases to Remember
- Same Game Parlays (multiple picks from same game)
- Individual sports (UFC, Tennis) - different game structure
- Missing data (no ESPN ID, no position)
- Moneylines have no margin (`margin: null`)
- Doubleheaders (same teams, same day, different games)

### Performance Considerations
- Firebase reads cost money - minimize unnecessary queries
- Migration script should batch writes
- Consider rate limiting for ESPN API calls
- Keep learned data in localStorage for autocomplete

---

## 🔧 USEFUL COMMANDS

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
```

### Firebase
```bash
firebase login                    # Login to Firebase
firebase use <project-id>         # Switch Firebase project
firebase firestore:export <path>  # Export Firestore data
```

### Testing
```bash
node scripts/migration/test-migration.js  # Test migration
node scripts/migration/migrate-all.js     # Run migration
node scripts/backup/export-firestore.js   # Export backup
```

---

## 📝 SESSION WORKFLOW

### When Starting a New Session

1. **Read this file** (TRACK_2_SESSION_HANDOFF.md)
2. **Read the plan** (TRACK_2_DATA_RESTRUCTURE_PLAN.md)
3. **Check current stage** (look for "Current Stage" in Status section)
4. **Review last completed tasks** (look for checkmarks in plan)
5. **Start next stage** or continue current stage

### During the Session

1. **Update checkboxes** in TRACK_2_DATA_RESTRUCTURE_PLAN.md as you complete tasks
2. **Document decisions** in the plan's "Notes & Decisions" section
3. **Create files** as specified in the stage deliverables
4. **Test frequently** - don't wait until the end

### When Ending the Session

1. **Update this file** with current status
2. **Check off completed tasks** in the plan
3. **Note any blockers** or issues encountered
4. **Update "Current Stage"** section
5. **Commit changes** to git (if using version control)

---

## 🚨 TROUBLESHOOTING

### If Migration Fails
1. **DO NOT PANIC** - we have backups
2. Check error logs in migration report
3. Identify which picks failed and why
4. Fix transformation logic
5. Rerun migration on test instance
6. Only proceed to production when 100% successful

### If Code Breaks After Updates
1. Check console for errors
2. Verify new schema fields exist
3. Check for typos in field names
4. Ensure all references updated (grep for old field names)
5. Test each component individually

### If Statistics Don't Match
1. Compare old vs new calculations on same data
2. Verify margin calculations correct
3. Check entity extraction logic
4. Ensure filters work correctly
5. Spot check specific examples

---

## 📞 GETTING HELP

### Key Resources
- **Schema Reference**: See "Schema Quick Reference" section above
- **Migration Plan**: TRACK_2_DATA_RESTRUCTURE_PLAN.md
- **Track 1 Docs**: For understanding current code structure
- **Firebase Console**: For inspecting data
- **ESPN API Docs**: For auto-update logic

### Common Questions

**Q: What if I find an edge case not in the plan?**
A: Document it in the plan's "Notes & Decisions" section, create a solution, add to validation

**Q: Should I handle backward compatibility?**
A: No - migration is one-way. All old data will be transformed to new schema.

**Q: What if ESPN ID is not available?**
A: Store `espnGameId: null` or omit the field. Auto-update will try to match by date + teams.

**Q: How do I generate pick IDs?**
A: Use `pick_${timestamp}_${randomString}` format. See Stage 2 tasks.

**Q: What if a brolay has only 2 picks?**
A: Current business rule: minimum 3 picks. Flag for manual review if found.

---

## ✅ SESSION CHECKLIST

Before ending any session, verify:

- [ ] All code changes committed (if using git)
- [ ] This handoff document updated with current status
- [ ] Plan document updated with completed checkboxes
- [ ] Any new decisions documented
- [ ] Any blockers noted
- [ ] Next steps clearly identified
- [ ] Current stage updated
- [ ] Test results documented (if applicable)

---

## 🎯 QUICK WINS

If you only have a short session, here are self-contained tasks:

### Short (30 min)
- Create backup export script
- Create rollback script
- Document single bet type transformation logic
- Write margin calculator for one bet type

### Medium (1 hour)
- Complete Stage 1 (Backup & Preparation)
- Build entity builder for all bet types
- Update one hook file (useBrolays or useStats)
- Create comprehensive test checklist

### Long (2+ hours)
- Complete Stage 2 (Migration Script Development)
- Update all hooks (Stage 3.1)
- Update all forms and entry (Stage 3.2)
- Run full testing suite (Stage 4)

---

## 📈 PROGRESS TRACKING

### Overall Progress: 80% Complete

| Stage | Status | Progress |
|-------|--------|----------|
| Stage 0: Planning | ✅ Complete | 100% |
| Stage 1: Backup & Preparation | ✅ Complete | 100% |
| Stage 2: Migration Script | ✅ Complete | 100% |
| Stage 3: Code Updates | ✅ Complete | 100% |
| Stage 4: Testing | ⏳ Not Started | 0% |
| Stage 5: Production Migration | ⏳ Not Started | 0% |

### Files Created/Updated
- [x] TRACK_2_DATA_RESTRUCTURE_PLAN.md
- [x] TRACK_2_SESSION_HANDOFF.md
- [x] scripts/backup/export-firestore.js
- [x] scripts/backup/restore-firestore.js
- [x] scripts/backup/README.md
- [x] scripts/migration/transform-pick.js
- [x] scripts/migration/entity-builder.js
- [x] scripts/migration/game-builder.js
- [x] scripts/migration/validator.js
- [x] scripts/migration/migrate-all.js
- [x] scripts/migration/find-issues.js
- [x] backups/brolay-backup-2026-01-25-110121.json (724 brolays)
- [x] backups/migrated-data.json (transformed data)
- [x] backups/data-issues.csv (issues report)

### Stage 3 Code Files Updated ✅
- [x] src/hooks/useBrolays.js - Diagnostic logging supports both schemas
- [x] src/hooks/useStats.js - Full support for picks/bigGuy/outcome.status
- [x] src/hooks/useESPN.js - Auto-update supports both schemas
- [x] src/hooks/useOdds.js - Entity extraction supports both schemas
- [x] src/components/forms/PickEntry.jsx - Big Guy selection supports both
- [x] src/pages/Entry.jsx - Uses submittedBy, validates bigGuy
- [x] src/utils/formatters.js - Helper functions for both schemas
- [x] src/components/dashboard/BrolayGrid.jsx - Uses helper functions
- [x] src/components/modals/EditParlayModal.jsx - Supports both schemas
- [x] src/components/filters/FilterBar.jsx - Renamed to submittedBy
- [x] src/utils/actionHandlers.js - Full both-schema support
- [x] src/pages/AllBrolays.jsx - Full both-schema support
- [x] src/contexts/BrolayContext.jsx - Filter state, save handler updated

### Stage 3 Files Completed (Final Batch)
- [x] src/pages/AllPicks.jsx - Full dual-schema support
- [x] src/pages/Rankings.jsx - Full dual-schema support
- [x] src/pages/IndividualDashboard.jsx - Full dual-schema support
- [x] src/pages/GroupDashboard.jsx - Full dual-schema support
- [x] src/insightsHelper.js - Full dual-schema support

---

## 🏁 WHEN ARE WE DONE?

Track 2 is complete when:

1. ✅ All 5 stages completed
2. ✅ Production migration successful
3. ✅ All 724 brolays migrated
4. ✅ All 3,119 picks migrated
5. ✅ Zero data loss
6. ✅ All functionality working
7. ✅ New margin features working
8. ✅ 30 days of stable operation
9. ✅ User acceptance confirmed
10. ✅ Documentation complete

---

## 📅 TIMELINE ESTIMATE

- **Stage 1**: 1 session (4-6 hours)
- **Stage 2**: 2-3 sessions (8-12 hours)
- **Stage 3**: 3-4 sessions (12-16 hours)
- **Stage 4**: 1-2 sessions (4-8 hours)
- **Stage 5**: 1 session (4-6 hours)

**Total**: 7-11 sessions (32-48 hours)

---

## 💡 FINAL NOTES

### Why This Matters
This restructure is the foundation for all future Track 2 work:
- Phase 2.3: Structured Margin Tracking → Built-in with new schema
- Phase 2.4: Backfill Historical Margins → Easier with unified structure
- Phase 2.5: Denormalized Stats → Can aggregate from clean entities

### After Track 2
Once this restructure is complete, the remaining Track 2 phases will be much simpler:
- Adding new bet types: Just use entities array
- New statistics: Simple queries on entities
- Performance optimization: Clean data makes caching easier

### Long-Term Vision
This is the right foundation for the next 5+ years of the app. Worth the migration effort.

---

## 🚀 STAGE 3 CONTEXT (FOR NEXT SESSION)

### What Was Completed in Stages 1-2

**Stage 1 - Backup:**
- Exported 724 brolays (3,119 picks) to `backups/brolay-backup-2026-01-25-110121.json`
- Created restore script at `scripts/backup/restore-firestore.js`
- If anything goes wrong: `node scripts/backup/restore-firestore.js`

**Stage 2 - Migration Scripts:**
- All scripts in `scripts/migration/`:
  - `transform-pick.js` - Core transformation logic
  - `entity-builder.js` - Builds entities array
  - `game-builder.js` - Extracts game info
  - `validator.js` - Validates transformed data
  - `migrate-all.js` - Main orchestrator
  - `find-issues.js` - Finds data quality issues
- Migrated data output at `backups/migrated-data.json`
- 100% validation pass (0 errors, 0 warnings)

### Key Schema Changes to Implement in Stage 3

| Old Field | New Field | Notes |
|-----------|-----------|-------|
| `placedBy` | `submittedBy` | Who submitted the brolay |
| `participants` | `picks` | Object containing all picks |
| `participants[].player` | `picks[].bigGuy` | Big Guy who made the pick |
| `participants[].team` (for props) | `picks[].entities[0].name` | Player name in entities |
| `participants[].playerTeam` | `picks[].entities[0].team` | Player's team |
| `participants[].result` | `picks[].outcome.status` | win/loss/push/pending |
| N/A | `picks[].game` | NEW - game identification |
| N/A | `picks[].outcome.margin` | NEW - margin tracking |

### Files to Update in Stage 3

**Priority 1 - Hooks (data layer):**
- `src/hooks/useBrolays.js` - Save/load with new schema
- `src/hooks/useStats.js` - Update field references
- `src/hooks/useESPN.js` - Update game matching
- `src/hooks/useOdds.js` - Update entity extraction

**Priority 2 - Forms (data entry):**
- `src/components/forms/PickEntry.jsx` - Build new structure on save
- `src/pages/Entry.jsx` - Use submittedBy, picks

**Priority 3 - Display:**
- `src/utils/formatters.js` - Format from entities
- `src/components/dashboard/BrolayGrid.jsx` - Read from picks
- Other display components

**Priority 4 - Filters/Pages:**
- `src/components/filters/FilterBar.jsx`
- `src/utils/actionHandlers.js`
- All page files

### Important Notes for Stage 3

1. **Firestore collection is named `parlays`** (not `brolays`) - don't change this
2. **Test locally before touching production** - the app should work with new data
3. **The backup is your safety net** - if anything breaks, restore from backup
4. **Start with hooks** - they're the data layer everything else depends on

---

**Last Updated**: January 25, 2026
**Ready for**: Stage 4 - Testing & Validation
**Estimated Next Session**: 1-2 hours for testing all functionality
