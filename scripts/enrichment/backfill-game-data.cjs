/**
 * Backfill Game-Level Data in Firestore
 *
 * For picks missing game.awayTeam/game.homeTeam, extracts teams from
 * outcome.actualStats (format: "AwayTeam Score @ HomeTeam Score").
 *
 * Usage:
 *   node scripts/enrichment/backfill-game-data.cjs           # Dry run
 *   node scripts/enrichment/backfill-game-data.cjs --write    # Write to Firebase
 */

const fs = require('fs');
const path = require('path');

const enrichedPath = path.join(__dirname, '..', '..', 'backups', 'enriched-data.json');
const enrichedRaw = JSON.parse(fs.readFileSync(enrichedPath, 'utf8'));
const brolays = enrichedRaw.data;

const writeMode = process.argv.includes('--write');

console.log('='.repeat(60));
console.log('BACKFILL GAME-LEVEL DATA');
console.log(writeMode ? '*** WRITE MODE ***' : '*** DRY RUN ***');
console.log('='.repeat(60));

/**
 * Parse actualStats to extract away/home teams.
 * Expected format: "AwayTeam Score @ HomeTeam Score" or "AwayTeam Score - HomeTeam Score"
 * Examples:
 *   "Hawks 124 @ Celtics 118" → { awayTeam: "Hawks", homeTeam: "Celtics" }
 *   "Duke 85 - UNC 72" → { awayTeam: "Duke", homeTeam: "UNC" }
 */
function parseActualStats(stats) {
  if (!stats || typeof stats !== 'string') return null;

  // Try "Team1 Score @ Team2 Score" format
  const atMatch = stats.match(/^(.+?)\s+\d+\s*@\s*(.+?)\s+\d+/);
  if (atMatch) {
    return { awayTeam: atMatch[1].trim(), homeTeam: atMatch[2].trim() };
  }

  // Try "Team1 Score - Team2 Score" format
  const dashMatch = stats.match(/^(.+?)\s+\d+\s*-\s*(.+?)\s+\d+/);
  if (dashMatch) {
    return { awayTeam: dashMatch[1].trim(), homeTeam: dashMatch[2].trim() };
  }

  return null;
}

const fixes = [];
let totalPicks = 0;
let hasGameData = 0;
let missingGameData = 0;
let fixable = 0;
let unfixable = 0;

for (const par of brolays) {
  if (!par.picks) continue;

  for (const [pickId, pk] of Object.entries(par.picks)) {
    totalPicks++;

    // Check if game data exists and has teams
    const hasAway = pk.game && pk.game.awayTeam;
    const hasHome = pk.game && pk.game.homeTeam;

    if (hasAway && hasHome) {
      hasGameData++;
      continue;
    }

    missingGameData++;

    // Try to extract from actualStats
    const actualStats = pk.outcome && pk.outcome.actualStats;
    const parsed = parseActualStats(actualStats);

    if (parsed) {
      fixable++;
      fixes.push({
        parlayId: par.id,
        pickId: pickId,
        entity: pk.entities && pk.entities[0] ? pk.entities[0].name : '?',
        betType: pk.betType,
        awayTeam: parsed.awayTeam,
        homeTeam: parsed.homeTeam,
        source: 'actualStats'
      });
    } else {
      unfixable++;
    }
  }
}

console.log(`\nTotal picks: ${totalPicks}`);
console.log(`Has game data: ${hasGameData}`);
console.log(`Missing game data: ${missingGameData}`);
console.log(`  Fixable (from actualStats): ${fixable}`);
console.log(`  Unfixable (no actualStats): ${unfixable}`);

console.log(`\nSample fixes:`);
fixes.slice(0, 10).forEach(f => {
  console.log(`  ${f.parlayId} / ${f.pickId}: ${f.entity} ${f.betType} → ${f.awayTeam} @ ${f.homeTeam}`);
});
if (fixes.length > 10) console.log(`  ... and ${fixes.length - 10} more`);

if (!writeMode) {
  console.log('\nDRY RUN COMPLETE — Run with --write to apply');
  process.exit(0);
}

async function writeToFirebase() {
  const { initializeApp } = require('firebase/app');
  const { getFirestore, doc, updateDoc } = require('firebase/firestore');

  const firebaseConfig = {
    apiKey: "AIzaSyDWhm77FUPJUHt7Bdb9R1NHH9PoAorkxlc",
    authDomain: "brolay-toxic-standings.firebaseapp.com",
    projectId: "brolay-toxic-standings",
    storageBucket: "brolay-toxic-standings.firebasestorage.app",
    messagingSenderId: "466981190192",
    appId: "1:466981190192:web:f03423a047f8ce554a8bf5"
  };

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  let success = 0;
  let failed = 0;

  console.log(`\n🔥 Writing ${fixes.length} game data updates to Firebase...`);

  const BATCH = 25;
  for (let i = 0; i < fixes.length; i += BATCH) {
    const batch = fixes.slice(i, i + BATCH);
    console.log(`  Batch ${Math.floor(i/BATCH) + 1}/${Math.ceil(fixes.length/BATCH)}...`);

    for (const fix of batch) {
      try {
        const docRef = doc(db, 'parlays', String(fix.parlayId));
        await updateDoc(docRef, {
          [`picks.${fix.pickId}.game.awayTeam`]: fix.awayTeam,
          [`picks.${fix.pickId}.game.homeTeam`]: fix.homeTeam
        });
        success++;
      } catch (err) {
        console.log(`  ❌ ${fix.parlayId}/${fix.pickId}: ${err.message}`);
        failed++;
      }
    }

    if (i + BATCH < fixes.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log(`\n✅ Success: ${success}`);
  if (failed > 0) console.log(`❌ Failed: ${failed}`);
}

writeToFirebase()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
  });
