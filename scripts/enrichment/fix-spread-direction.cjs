/**
 * Fix Spread Direction in Firestore
 *
 * Some spread picks have direction: "over" instead of "favorite"/"underdog"
 * due to a bug in the original enrichment migration. This script fixes them
 * by looking up the original favorite/dog value from the pre-migration backup.
 *
 * Usage:
 *   node scripts/enrichment/fix-spread-direction.cjs           # Dry run
 *   node scripts/enrichment/fix-spread-direction.cjs --write    # Write to Firebase
 */

const fs = require('fs');
const path = require('path');

// Load enriched data (current state) and original backup
const enrichedPath = path.join(__dirname, '..', '..', 'backups', 'enriched-data.json');
const originalPath = path.join(__dirname, '..', '..', 'backups', 'brolay-backup-latest.json');

const enrichedRaw = JSON.parse(fs.readFileSync(enrichedPath, 'utf8'));
const originalRaw = JSON.parse(fs.readFileSync(originalPath, 'utf8'));

const brolays = enrichedRaw.data;
const original = originalRaw.data || originalRaw;
const writeMode = process.argv.includes('--write');

console.log('='.repeat(60));
console.log('FIX SPREAD DIRECTION');
console.log(writeMode ? '*** WRITE MODE ***' : '*** DRY RUN ***');
console.log('='.repeat(60));

// Build a lookup from original data: parlayId -> pickIndex -> favorite value
// The original data uses participants[] array, so we need to match by index
const originalLookup = {};
for (const par of original) {
  if (par.participants) {
    // Old schema — participants can be array or object
    const parts = Array.isArray(par.participants) ? par.participants : Object.values(par.participants);
    parts.forEach((p, idx) => {
      if (p.betType === 'Spread' || p.betType === 'First Half Spread' || p.betType === 'Quarter Spread') {
        if (!originalLookup[par.id]) originalLookup[par.id] = {};
        originalLookup[par.id][idx] = p.favorite || 'Favorite';
      }
    });
  }
  if (par.picks) {
    // New schema — picks is an object with direction already set
    for (const [pickId, pk] of Object.entries(par.picks)) {
      if ((pk.betType === 'Spread' || pk.betType === 'First Half Spread' || pk.betType === 'Quarter Spread')
          && pk.line && pk.line.direction
          && pk.line.direction !== 'over' && pk.line.direction !== 'under') {
        // Already has correct direction in original backup
        if (!originalLookup[par.id]) originalLookup[par.id] = {};
        originalLookup[par.id][pickId] = pk.line.direction;
      }
    }
  }
}

// Find spread picks with wrong direction in enriched data
const fixes = [];
let totalSpreads = 0;
let alreadyCorrect = 0;
let needsFix = 0;
let cantFix = 0;

for (const par of brolays) {
  if (!par.picks) continue;

  const pickEntries = Object.entries(par.picks);
  pickEntries.forEach(([pickId, pk], idx) => {
    if (!pk.betType || !(pk.betType === 'Spread' || pk.betType === 'First Half Spread' || pk.betType === 'Quarter Spread')) return;

    totalSpreads++;
    const currentDir = pk.line ? pk.line.direction : '';

    if (currentDir === 'favorite' || currentDir === 'underdog') {
      alreadyCorrect++;
      return;
    }

    // Need to fix — look up original value
    let correctDirection = null;

    // Try to find in original backup by parlay ID
    const origParlay = originalLookup[par.id];
    if (origParlay) {
      // Try by pickId first (for new-schema originals)
      if (origParlay[pickId]) {
        const val = origParlay[pickId];
        correctDirection = val === 'Dog' ? 'underdog' : val === 'Favorite' ? 'favorite' : val;
      }
      // Try by index (for old-schema originals with participants array)
      else if (origParlay[idx] !== undefined) {
        const val = origParlay[idx];
        correctDirection = val === 'Dog' ? 'underdog' : 'favorite';
      }
    }

    if (correctDirection) {
      needsFix++;
      fixes.push({
        parlayId: par.id,
        pickId: pickId,
        entity: pk.entities && pk.entities[0] ? pk.entities[0].name : '?',
        betType: pk.betType,
        currentDir: currentDir,
        correctDir: correctDirection,
        lineValue: pk.line ? pk.line.value : '?'
      });
    } else {
      cantFix++;
      console.log(`  ⚠️  Cannot fix ${par.id} / ${pickId} — no original data found (${pk.entities && pk.entities[0] ? pk.entities[0].name : '?'})`);
    }
  });
}

console.log(`\nTotal spread picks: ${totalSpreads}`);
console.log(`Already correct: ${alreadyCorrect}`);
console.log(`Need fix: ${needsFix}`);
console.log(`Cannot fix: ${cantFix}`);

console.log('\nFixes to apply:');
fixes.forEach(f => {
  console.log(`  ${f.parlayId} / ${f.pickId}: ${f.entity} ${f.betType} ${f.lineValue} — ${f.currentDir} → ${f.correctDir}`);
});

if (!writeMode) {
  console.log('\nDRY RUN COMPLETE — Run with --write to apply');
  process.exit(0);
}

// Write to Firebase
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

  console.log(`\n🔥 Writing ${fixes.length} fixes to Firebase...`);

  for (const fix of fixes) {
    try {
      const docRef = doc(db, 'parlays', String(fix.parlayId));
      await updateDoc(docRef, {
        [`picks.${fix.pickId}.line.direction`]: fix.correctDir
      });
      success++;
    } catch (err) {
      console.log(`  ❌ ${fix.parlayId}/${fix.pickId}: ${err.message}`);
      failed++;
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
