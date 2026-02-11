/**
 * Write Historical Odds to Firebase
 *
 * Reads the historical-odds-results.json and writes the found odds to Firestore.
 * This avoids re-fetching from The Odds API when results are already saved.
 *
 * Usage:
 *   node scripts/historical-odds/write-odds-to-firebase.cjs           # Dry run
 *   node scripts/historical-odds/write-odds-to-firebase.cjs --write   # Actually write
 */

const fs = require('fs');
const path = require('path');

const RESULTS_PATH = path.join(__dirname, 'historical-odds-results.json');

const firebaseConfig = {
  apiKey: "AIzaSyDWhm77FUPJUHt7Bdb9R1NHH9PoAorkxlc",
  authDomain: "brolay-toxic-standings.firebaseapp.com",
  projectId: "brolay-toxic-standings",
  storageBucket: "brolay-toxic-standings.firebasestorage.app",
  messagingSenderId: "466981190192",
  appId: "1:466981190192:web:f03423a047f8ce554a8bf5"
};

const BATCH_SIZE = 25;
const DELAY_MS = 500;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  const writeMode = process.argv.includes('--write');

  console.log('='.repeat(60));
  console.log('WRITE HISTORICAL ODDS TO FIREBASE');
  console.log(writeMode ? '*** WRITE MODE ***' : '*** DRY RUN ***');
  console.log('='.repeat(60));

  // Load results
  const results = JSON.parse(fs.readFileSync(RESULTS_PATH, 'utf8'));
  const found = results.found || [];
  console.log(`\nFound ${found.length} picks with odds to write`);

  // Show summary
  const byBookmaker = {};
  for (const r of found) {
    byBookmaker[r.bookmaker] = (byBookmaker[r.bookmaker] || 0) + 1;
  }
  console.log('By bookmaker:', byBookmaker);

  // Show sample
  console.log('\nSample writes:');
  for (const r of found.slice(0, 5)) {
    console.log(`  ${r.parlayId} / ${r.pickId}: ${r.entity} ${r.betType} → ${r.odds} (${r.bookmaker})`);
  }
  console.log(`  ... and ${Math.max(0, found.length - 5)} more`);

  if (!writeMode) {
    console.log('\nDRY RUN COMPLETE — Run with --write to apply');
    return;
  }

  // Initialize Firebase
  const { initializeApp } = require('firebase/app');
  const { getFirestore, doc, updateDoc } = require('firebase/firestore');

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < found.length; i += BATCH_SIZE) {
    const batch = found.slice(i, i + BATCH_SIZE);
    console.log(`\nBatch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(found.length/BATCH_SIZE)} (${batch.length} picks)...`);

    for (const result of batch) {
      try {
        const docRef = doc(db, 'parlays', String(result.parlayId));
        await updateDoc(docRef, {
          [`picks.${result.pickId}.line.odds`]: result.odds,
          [`picks.${result.pickId}.line.source`]: result.bookmaker
        });
        success++;
      } catch (err) {
        console.log(`  ❌ ${result.parlayId}/${result.pickId}: ${err.message}`);
        failed++;
      }
    }

    if (i + BATCH_SIZE < found.length) {
      await sleep(DELAY_MS);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('WRITE COMPLETE');
  console.log('='.repeat(60));
  console.log(`  ✅ Success: ${success}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  Total: ${found.length}`);
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
  });
