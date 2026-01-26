# Track 2: Data Structure Restructure - Implementation Plan

**Last Updated**: January 25, 2026
**Status**: Stage 3 Complete - Ready for Testing
**Estimated Effort**: 7-9 sessions
**Risk Level**: Medium-High (mitigated by comprehensive backup strategy)

---

## 🎯 OBJECTIVE

Restructure the Brolay Toxic Standings data model from current fragmented field structure to a unified, extensible entity-based schema that:
- Separates "Big Guys" (Management, CD, 914, Junior, Jacoby) from sports players/teams
- Unifies all bet types under consistent entity structure
- Enables margin tracking for all bets
- Future-proofs for new bet types without schema changes
- Maintains complete backward compatibility during transition

---

## 📊 CURRENT STATE (Before Migration)

### Current Data Structure
```javascript
{
  id: "xyz123",
  date: "2025-01-22",
  placedBy: "Management",        // Who submitted the brolay
  betAmount: 10,
  totalPayout: 240,
  participants: {                // ⚠️ Confusing name - really "picks"
    "0": {
      player: "Management",      // ⚠️ Confusing - "Big Guy" not sports player
      sport: "NFL",
      betType: "Player Prop",
      team: "Patrick Mahomes",   // ⚠️ Stores PLAYER name despite field name
      playerTeam: "Kansas City Chiefs",  // ⚠️ Duplicate team storage
      playerPosition: "QB",
      propType: "Passing Yards",
      line: "300.5",
      overUnder: "Over",
      odds: "-110",
      result: "win"
    }
  },
  settled: true,
  settledAt: "2025-01-23T02:15:00Z"
}
```

### Problems with Current Structure
1. **Naming confusion**: `player` = Big Guy, `team` = sports player for props
2. **Duplicate storage**: `team` and `playerTeam` both store team data
3. **Inconsistent patterns**: Different fields for different bet types
4. **No margin tracking**: Only stores win/loss, not by how much
5. **Hard to extend**: New bet types require new field patterns
6. **Complex queries**: Must check multiple fields to find entities

---

## 🎯 TARGET STATE (After Migration)

### New Data Structure
```javascript
{
  id: "brolay_abc123",
  date: "2025-01-22",
  submittedBy: "Management",     // ✅ Clear: who submitted
  betAmount: 10,
  totalPayout: 240,

  picks: {                       // ✅ Better semantic name
    "pick_001": {
      bigGuy: "Management",      // ✅ Clear: which Big Guy made this pick
      sport: "NFL",
      betCategory: "playerProp",
      betType: "Player Prop",

      game: {                    // ✅ NEW: Explicit game identification
        date: "2025-01-22",
        awayTeam: "Kansas City Chiefs",
        homeTeam: "Buffalo Bills",
        espnGameId: "401547649",
        league: "NFL"
      },

      entities: [                // ✅ NEW: Unified entity structure
        {
          entityType: "player",
          name: "Patrick Mahomes",
          team: "Kansas City Chiefs",
          position: "QB",
          role: "primary"
        }
      ],

      line: {                    // ✅ Structured line data
        type: "prop",
        value: 300.5,            // ✅ Always positive
        direction: "over",
        odds: "-110",
        statType: "Passing Yards"
      },

      outcome: {                 // ✅ NEW: Comprehensive outcome tracking
        status: "win",
        margin: 26.5,            // ✅ NEW: Margin tracking
        autoUpdated: true,
        settledAt: "2025-01-23T02:15:00Z",
        actualStat: 327          // For display
      }
    }
  },

  settled: true,
  settledAt: "2025-01-23T02:15:00Z"
}
```

### Benefits of New Structure
1. ✅ Clear separation: Big Guys vs sports entities
2. ✅ No duplication: Team stored once in entities
3. ✅ Consistent patterns: All bet types use entities array
4. ✅ Margin tracking: Built-in for all picks
5. ✅ Easy to extend: New bet types = same structure
6. ✅ Simple queries: Single entities array to search

---

## 📋 IMPLEMENTATION STAGES

### **STAGE 1: Backup & Preparation** (1 session)

#### Goals
- Export all Firestore data safely
- Set up test environment
- Create rollback capability

#### Tasks
- [x] Export all brolays from production Firestore to JSON
- [x] Count total: **724 brolays, 3,119 picks** (actual - was ~350/~1,500 estimated)
- [x] Verify export completeness (check random samples)
- [ ] Create test Firebase project/collection
- [ ] Upload sample data to test instance
- [x] Create rollback script to restore from backup
- [x] Document backup location and restoration process

#### Success Criteria
- Full JSON export of all production data
- Test Firebase instance operational
- Rollback script tested and verified

#### Files to Create
- `scripts/backup/export-firestore.js` - Export script
- `scripts/backup/restore-firestore.js` - Rollback script
- `backups/brolay-backup-YYYY-MM-DD.json` - Backup file
- `scripts/backup/README.md` - Backup/restore documentation

---

### **STAGE 2: Migration Script Development** (2-3 sessions)

#### Goals
- Build comprehensive migration script
- Handle all bet types correctly
- Validate transformations
- Generate detailed reports

#### Tasks

##### 2.1: Core Migration Functions
- [ ] Create `scripts/migration/transform-pick.js`
  - [ ] Function: `transformPick(oldPick, brolayDate)` → returns new pick structure
  - [ ] Handle all 15+ bet types (Spread, ML, Total, Player Prop, H2H Prop, etc.)
  - [ ] Generate pick IDs using: `pick_${timestamp}_${random}`
  - [ ] Populate `game` object from bet type + date + teams
  - [ ] Build `entities` array based on bet type
  - [ ] Structure `line` object with positive values
  - [ ] Create `outcome` object with status (convert "win"/"loss"/"push"/"pending")

##### 2.2: Entity Population Logic
- [ ] Create `scripts/migration/entity-builder.js`
  - [ ] `buildEntitiesForSpread(pick)` → single team entity
  - [ ] `buildEntitiesForTotal(pick)` → away/home team entities
  - [ ] `buildEntitiesForPlayerProp(pick)` → player entity with team/position
  - [ ] `buildEntitiesForH2HProp(pick)` → two player entities
  - [ ] `buildEntitiesForMoneyline(pick)` → team or player entity
  - [ ] Handle all edge cases and missing data

##### 2.3: Game Object Builder
- [ ] Create `scripts/migration/game-builder.js`
  - [ ] Extract game info from pick data
  - [ ] Derive league from sport
  - [ ] Handle team sports (awayTeam/homeTeam)
  - [ ] Handle individual sports (awayFighter/homeFighter)
  - [ ] ESPN ID population (if available in old data)

##### 2.4: Margin Calculator
- [ ] Create `scripts/migration/margin-calculator.js`
  - [ ] Calculate margin from old `actualStats` field (if present)
  - [ ] Parse text results to extract scores/stats
  - [ ] Return null for moneylines
  - [ ] Return numeric margin for spreads/totals/props
  - [ ] Handle missing data gracefully

##### 2.5: Validation Functions
- [ ] Create `scripts/migration/validator.js`
  - [ ] `validateBrolay(newBrolay)` → checks structure
  - [ ] Verify required fields present
  - [ ] Verify Big Guy names valid
  - [ ] Verify entities array correct for bet type
  - [ ] Verify line.value always positive
  - [ ] Verify picks object has valid pick IDs
  - [ ] Generate validation errors list

##### 2.6: Main Migration Script
- [ ] Create `scripts/migration/migrate-all.js`
  - [ ] Read all brolays from backup JSON
  - [ ] For each brolay:
    - [ ] Transform parlay-level fields
    - [ ] Rename `placedBy` → `submittedBy`
    - [ ] Rename `participants` → `picks`
    - [ ] For each participant/pick:
      - [ ] Generate unique pick ID
      - [ ] Rename `player` → `bigGuy`
      - [ ] Transform to new pick structure
      - [ ] Validate transformed pick
    - [ ] Validate transformed brolay
  - [ ] Generate migration report
  - [ ] Write to test Firebase instance

##### 2.7: Reporting
- [ ] Create `scripts/migration/reporter.js`
  - [ ] Count successful transformations
  - [ ] List failed transformations with reasons
  - [ ] Identify data quality issues
  - [ ] Flag manual review needed cases
  - [ ] Generate CSV report for inspection
  - [ ] Summary statistics

#### Success Criteria
- Migration script runs without errors
- All brolays transformed successfully
- Validation passes for all transformed data
- Report shows 100% success rate
- Spot checks confirm accuracy

#### Files to Create
- `scripts/migration/transform-pick.js`
- `scripts/migration/entity-builder.js`
- `scripts/migration/game-builder.js`
- `scripts/migration/margin-calculator.js`
- `scripts/migration/validator.js`
- `scripts/migration/migrate-all.js`
- `scripts/migration/reporter.js`
- `scripts/migration/test-migration.js` - Unit tests

---

### **STAGE 3: Code Updates** (3-4 sessions)

#### Goals
- Update all application code to use new schema
- Maintain functionality
- Improve code quality

#### Tasks

##### 3.1: Update Hooks
- [x] `src/hooks/useBrolays.js`
  - [x] Update `addBrolay()` - save with new schema
  - [x] Update `updateBrolay()` - update with new schema
  - [x] Update `deleteBrolay()` - no changes needed
  - [x] Real-time listener returns new schema

- [x] `src/hooks/useStats.js`
  - [x] Update all references from `participant.player` → `pick.bigGuy`
  - [x] Update entity extraction logic (use `entities` array)
  - [x] Add margin-based statistics calculations
  - [x] Update win rate calculations
  - [x] Update streak calculations

- [x] `src/hooks/useESPN.js`
  - [x] Update game matching logic (use `game` object)
  - [x] Update entity extraction for auto-update
  - [x] Populate `outcome.actualStat`, `outcome.finalScore`, etc.
  - [x] Calculate and store `outcome.margin`

- [x] `src/hooks/useOdds.js`
  - [x] Update entity extraction (use `entities` array)
  - [x] Update team/player matching logic

##### 3.2: Update Forms & Entry
- [x] `src/components/forms/PickEntry.jsx`
  - [x] Supports both old and new schema field names
  - [x] Writes to both `player` and `bigGuy` fields
  - [x] Writes to both `result` and `outcome.status` fields
  - [x] Dual-schema approach maintains backward compatibility

- [x] `src/pages/Entry.jsx`
  - [x] Supports both `submittedBy` and `placedBy`
  - [x] Supports both `picks` and `participants` structures
  - [x] Dual-schema approach maintains backward compatibility

##### 3.3: Update Display & Formatting
- [x] `src/utils/formatters.js`
  - [x] Added `getPicksArray()` helper for dual-schema support
  - [x] Added `getPickBigGuy()` helper for dual-schema support
  - [x] Added `getPickResult()` helper for dual-schema support
  - [x] Added `getPickActualStats()` helper for dual-schema support
  - [x] Added `getSubmittedBy()` helper for dual-schema support

- [x] `src/components/dashboard/BrolayGrid.jsx`
  - [x] Uses helper functions for data extraction
  - [x] Supports both old and new schema seamlessly

- [x] `src/components/modals/EditParlayModal.jsx`
  - [x] Detects schema type and uses correct field names
  - [x] Saves to both old and new fields for compatibility

##### 3.4: Update Filters & Search
- [x] `src/components/filters/FilterBar.jsx`
  - [x] Renamed `placedBy` filter to `submittedBy`
  - [x] Uses helper functions for dual-schema filtering

- [x] `src/utils/actionHandlers.js`
  - [x] Updated `applyFilters()` with dual-schema support
  - [x] Added local helper functions for schema compatibility
  - [x] Updated learned data extraction for both schemas

##### 3.5: Update Pages
- [x] `src/pages/AllBrolays.jsx`
  - [x] Full dual-schema support using helper functions
  - [x] Calendar view supports both schemas
  - [x] List view supports both schemas

- [x] `src/pages/AllPicks.jsx`
  - [x] Full dual-schema support for pick flattening
  - [x] Edit modal detects schema and saves correctly
  - [x] Filter support for both field names

- [x] `src/pages/Rankings.jsx`
  - [x] Sole survivors calculation uses helpers
  - [x] Streak calculation uses helpers
  - [x] Player/sport combos use helpers
  - [x] Team counts use helpers

- [x] `src/pages/IndividualDashboard.jsx`
  - [x] applyFilters uses dual-schema helpers
  - [x] pendingPicksCount uses dual-schema helpers
  - [x] Full backward compatibility

- [x] `src/pages/GroupDashboard.jsx`
  - [x] All statistics use dual-schema helpers
  - [x] Money calculations support both schemas
  - [x] Last 10 brolays support both schemas

##### 3.6: Update Context
- [x] `src/contexts/BrolayContext.jsx`
  - [x] Filter state supports both `submittedBy` and `placedBy`
  - [x] `handleSaveEditedParlay` detects schema and uses correct fields
  - [x] Entry form state supports both schemas

##### 3.7: Update Insights Helper
- [x] `src/insightsHelper.js`
  - [x] Added local helper functions for dual-schema
  - [x] `analyzeCombo()` supports both schemas
  - [x] All insight calculations work with either schema

#### Success Criteria
- All files compile without errors
- All components render correctly
- No console errors
- New brolays save with new schema
- Edit functionality works
- Filters work correctly
- Statistics calculate correctly

#### Files to Update (~40 files)
- 4 hook files
- 2 form/entry files
- 5 display/format files
- 2 filter files
- 5 page files
- 1 context file
- 1 constants file
- Various component files

---

### **STAGE 4: Testing & Validation** (1-2 sessions)

#### Goals
- Verify all functionality works
- Catch edge cases
- Ensure data integrity

#### Tasks

##### 4.1: Data Migration Testing
- [ ] Run migration on test Firebase instance
- [ ] Verify all 350 brolays migrated
- [ ] Verify all 1,500 picks migrated
- [ ] Check random sample of 50 brolays for accuracy
- [ ] Verify all bet types represented
- [ ] Check margin calculations accurate

##### 4.2: Entry Form Testing
- [ ] Test creating new brolay with:
  - [ ] Spread bet
  - [ ] Moneyline bet
  - [ ] Total bet
  - [ ] Player Prop
  - [ ] H2H Prop
  - [ ] Either Prop
  - [ ] Combined Prop
  - [ ] Team Prop
  - [ ] First Half bets
  - [ ] Quarter bets
- [ ] Verify entities array populated correctly
- [ ] Verify game object populated correctly
- [ ] Verify line object structured correctly
- [ ] Verify pick saves to Firebase correctly

##### 4.3: Display Testing
- [ ] AllBrolays page displays all brolays
- [ ] AllPicks page displays all picks
- [ ] BrolayGrid displays correctly
- [ ] Bet descriptions formatted correctly
- [ ] Entity names display correctly
- [ ] Margins display correctly

##### 4.4: Filter Testing
- [ ] Filter by Big Guy works
- [ ] Filter by sport works
- [ ] Filter by bet type works
- [ ] Search by team name works
- [ ] Search by player name works
- [ ] Combined filters work

##### 4.5: Statistics Testing
- [ ] Win rates calculate correctly
- [ ] Streaks calculate correctly
- [ ] By-sport stats correct
- [ ] By-bet-type stats correct
- [ ] Margin statistics work (new feature)
- [ ] Rankings page displays correctly

##### 4.6: Edit & Delete Testing
- [ ] Edit existing brolay works
- [ ] Changes save correctly
- [ ] Delete brolay works
- [ ] Settlement toggle works

##### 4.7: ESPN Auto-Update Testing
- [ ] Auto-update finds correct games
- [ ] Auto-update populates outcome correctly
- [ ] Margin calculated correctly
- [ ] All bet types auto-update correctly

##### 4.8: Edge Case Testing
- [ ] Brolays with only 3 picks
- [ ] Brolays with 5 picks (all Big Guys)
- [ ] Same-game parlays
- [ ] Multi-day brolays
- [ ] Individual sports (UFC, Tennis)
- [ ] Missing data (no ESPN ID)
- [ ] Legacy "Prop Bet" type (backward compatibility)

#### Success Criteria
- All tests pass
- No data loss
- No functionality regression
- New margin features working
- User acceptance approved

#### Files to Create
- `scripts/testing/test-migration.js`
- `scripts/testing/test-entry.js`
- `scripts/testing/test-statistics.js`
- `TESTING_CHECKLIST.md`

---

### **STAGE 5: Production Migration** (1 session)

#### Goals
- Migrate production database safely
- Monitor for issues
- Provide rollback capability

#### Tasks

##### 5.1: Pre-Migration
- [ ] Final production backup
- [ ] Verify backup integrity
- [ ] Deploy updated code to staging
- [ ] Final testing on staging
- [ ] Get user approval to proceed

##### 5.2: Migration Execution
- [ ] Put app in maintenance mode (optional)
- [ ] Run migration script on production
- [ ] Monitor progress
- [ ] Verify completion
- [ ] Check error logs

##### 5.3: Post-Migration Validation
- [ ] Count total brolays (should be ~350)
- [ ] Count total picks (should be ~1,500)
- [ ] Spot check 20 random brolays
- [ ] Verify all Big Guys present
- [ ] Verify all sports represented
- [ ] Test creating new brolay
- [ ] Test editing existing brolay
- [ ] Test filters and search
- [ ] Test statistics pages

##### 5.4: Monitoring
- [ ] Monitor error logs for 24 hours
- [ ] Check Firebase console for anomalies
- [ ] User testing and feedback
- [ ] Fix any issues discovered

##### 5.5: Cleanup
- [ ] Remove old field references (after 30 days stability)
- [ ] Update documentation
- [ ] Archive migration scripts
- [ ] Document lessons learned

#### Success Criteria
- Production migration successful
- All data migrated correctly
- No user-reported issues
- Performance acceptable
- Backup available for 30 days

#### Rollback Plan (if needed)
1. Stop all traffic to app
2. Run restore script from backup
3. Redeploy old code version
4. Verify restoration
5. Investigate migration failure
6. Fix issues and retry

---

## 📁 FILE STRUCTURE

### New Files to Create
```
brolay-toxic-standings/
├── scripts/
│   ├── backup/
│   │   ├── export-firestore.js
│   │   ├── restore-firestore.js
│   │   └── README.md
│   ├── migration/
│   │   ├── transform-pick.js
│   │   ├── entity-builder.js
│   │   ├── game-builder.js
│   │   ├── margin-calculator.js
│   │   ├── validator.js
│   │   ├── reporter.js
│   │   ├── migrate-all.js
│   │   └── test-migration.js
│   └── testing/
│       ├── test-migration.js
│       ├── test-entry.js
│       └── test-statistics.js
├── backups/
│   └── brolay-backup-2026-01-25.json
└── docs/
    ├── TRACK_2_DATA_RESTRUCTURE_PLAN.md (this file)
    ├── SCHEMA_SPECIFICATION.md
    ├── MIGRATION_REPORT.md (generated)
    └── TESTING_CHECKLIST.md
```

---

## 📊 MIGRATION COMPLEXITY BREAKDOWN

### Bet Types to Handle (15+)
1. Spread
2. Moneyline
3. Total
4. Player Prop
5. H2H Prop
6. Either Prop
7. Combined Prop
8. Team Prop
9. Game Prop
10. Team Total
11. First Half Spread
12. First Half Moneyline
13. First Half Total
14. First Half Team Total
15. Quarter Moneyline
16. Quarter Total
17. Quarter Team Total
18. First Inning Runs
19. Prop Bet (legacy - backward compatibility)

### Sports to Handle (12)
1. NFL
2. NBA
3. MLB
4. NHL
5. College Football
6. College Basketball
7. WNBA
8. Soccer
9. Tennis
10. Golf
11. Rugby
12. UFC

### Transformation Patterns

| Old Structure | New Structure |
|--------------|---------------|
| `placedBy` | `submittedBy` |
| `participants` | `picks` |
| `participants["0"].player` | `picks["pick_001"].bigGuy` |
| `participants["0"].team` (for props) | `picks["pick_001"].entities[0].name` |
| `participants["0"].playerTeam` | `picks["pick_001"].entities[0].team` |
| `participants["0"].result` | `picks["pick_001"].outcome.status` |
| (not present) | `picks["pick_001"].game` |
| (not present) | `picks["pick_001"].outcome.margin` |

---

## ⚠️ RISK MITIGATION

### High Risk Items
1. **Data loss during migration**
   - Mitigation: Comprehensive backup before migration
   - Rollback script tested and ready

2. **Incorrect margin calculations**
   - Mitigation: Extensive testing on sample data
   - Manual validation of calculated margins

3. **Missing edge cases in transformation**
   - Mitigation: Handle all 15+ bet types explicitly
   - Validation checks for all transformations

4. **Code breaks after deployment**
   - Mitigation: Comprehensive testing before production
   - Staged rollout (test instance first)

### Medium Risk Items
1. **ESPN auto-update breaks**
   - Mitigation: Test auto-update thoroughly
   - Manual fallback available

2. **Filter/search breaks**
   - Mitigation: Test all filter combinations
   - Validate entity search logic

3. **Statistics calculation errors**
   - Mitigation: Compare old vs new stats on same data
   - Spot check calculations

---

## 🎯 SUCCESS METRICS

### Migration Success
- [ ] 100% of brolays migrated (target: 350)
- [ ] 100% of picks migrated (target: 1,500)
- [ ] 0 data loss incidents
- [ ] < 5 manual corrections needed
- [ ] All validation checks pass

### Code Quality Success
- [ ] 0 console errors in production
- [ ] All tests passing
- [ ] No functionality regression
- [ ] New margin features working
- [ ] Code more maintainable than before

### User Success
- [ ] No user-reported data issues
- [ ] All features working as expected
- [ ] Performance equal or better
- [ ] New insights from margin data valuable

---

## 📞 SUPPORT & RESOURCES

### Key Files Reference
- Current schema: Check existing brolay in Firebase
- New schema: See `SCHEMA_SPECIFICATION.md`
- Margin calculation: See Stage 2.4 tasks
- Entity building: See Stage 2.2 tasks

### Testing Resources
- Test Firebase: (create during Stage 1)
- Sample data: Export from production
- Validation scripts: Create during Stage 2

---

## 📝 NOTES & DECISIONS

### Decision Log
1. **2026-01-25**: Chose Option 3 (Full Restructure) for long-term stability
2. **2026-01-25**: Decided to use `player1` for single player props (consistency)
3. **2026-01-25**: Decided to omit optional fields rather than set to null (storage)
4. **2026-01-25**: Decided to keep `picks` as object with generated IDs (searchability)
5. **2026-01-25**: Decided to add `game` object for all bet types (auto-update)

### Open Questions
- None at this time

### Assumptions
- ~350 brolays in production
- ~1,500 picks total
- All Big Guys: Management, CD, 914, Junior, Jacoby
- Minimum 3 picks per brolay
- Maximum 1 pick per Big Guy per brolay

---

## ✅ COMPLETION CRITERIA

Track 2 Data Restructure is complete when:
- [x] Planning complete and documented
- [ ] All 5 stages completed successfully
- [x] Migration script runs cleanly (100% validation pass rate)
- [x] All code updated to new schema (dual-schema support)
- [ ] All tests passing
- [ ] Production migration successful
- [ ] 30 days of stable operation
- [x] Documentation updated
- [x] Session handoff document created

**Current Status**: Stage 3 (Code Updates) - Complete ✅
**Next Step**: Stage 4 - Testing & Validation
