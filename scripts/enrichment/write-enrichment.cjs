/**
 * Write Enrichment to Firebase
 *
 * Reads the enriched data and writes it to Firestore.
 * For migrated brolays: only updates fields that changed (partial updates).
 * For legacy brolays: writes the full new schema document.
 *
 * Usage:
 *   node scripts/enrichment/write-enrichment.cjs           # Dry run (shows what would change)
 *   node scripts/enrichment/write-enrichment.cjs --write    # Actually write to Firebase
 */

const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, updateDoc } = require('firebase/firestore');

const ENRICHED_PATH = path.join(__dirname, '..', '..', 'backups', 'enriched-data.json');
const BACKUP_PATH = path.join(__dirname, '..', '..', 'backups', 'brolay-backup-latest.json');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDWhm77FUPJUHt7Bdb9R1NHH9PoAorkxlc",
  authDomain: "brolay-toxic-standings.firebaseapp.com",
  projectId: "brolay-toxic-standings",
  storageBucket: "brolay-toxic-standings.firebasestorage.app",
  messagingSenderId: "466981190192",
  appId: "1:466981190192:web:f03423a047f8ce554a8bf5"
};

// Rate limiting
const BATCH_SIZE = 50;
const DELAY_BETWEEN_BATCHES_MS = 1000;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const writeMode = process.argv.includes('--write');

  console.log('='.repeat(60));
  console.log('WRITE ENRICHMENT TO FIREBASE');
  console.log(writeMode ? '*** WRITE MODE — WILL UPDATE FIREBASE ***' : '*** DRY RUN MODE — NO CHANGES ***');
  console.log('='.repeat(60));
  console.log('');

  // Load enriched data
  console.log('Loading enriched data...');
  const enriched = JSON.parse(fs.readFileSync(ENRICHED_PATH, 'utf8'));
  console.log(`  Enriched brolays: ${enriched.data.length}`);
  console.log(`  Enrichments:`, enriched.metadata.enrichments);
  console.log('');

  // Load original backup for comparison
  console.log('Loading original backup for diff...');
  const original = JSON.parse(fs.readFileSync(BACKUP_PATH, 'utf8'));
  const originalMap = {};
  for (const b of original.data) {
    originalMap[b.id] = b;
  }
  console.log(`  Original brolays: ${original.data.length}`);
  console.log('');

  // Identify legacy brolays (those that had participants but no picks)
  const legacyIds = new Set();
  for (const b of original.data) {
    if (b.participants && !b.picks) {
      legacyIds.add(b.id);
    }
  }
  console.log(`Legacy brolays to fully rewrite: ${legacyIds.size}`);

  // Build update operations
  const operations = [];

  for (const enrichedBrolay of enriched.data) {
    const id = enrichedBrolay.id;
    const orig = originalMap[id];

    if (legacyIds.has(id)) {
      // Full write — legacy brolays need complete new schema
      // Remove the id from the document data (id is the document key)
      const { id: _, ...docData } = enrichedBrolay;
      operations.push({
        type: 'set',
        id,
        data: docData,
        reason: 'Legacy brolay → full new schema'
      });
      continue;
    }

    // For migrated brolays, build partial updates
    if (!orig || !orig.picks) continue;

    const origPicks = Array.isArray(orig.picks) ? {} : orig.picks;
    if (Array.isArray(orig.picks)) {
      orig.picks.forEach((p, i) => {
        origPicks[`pick_${String(i).padStart(3, '0')}`] = p;
      });
    }

    const enrichedPicks = enrichedBrolay.picks || {};
    const updates = {};

    for (const [pickId, enrichedPick] of Object.entries(enrichedPicks)) {
      const origPick = origPicks[pickId];
      if (!origPick) continue;

      // Check entities[0].team
      if (enrichedPick.entities?.[0]?.team && !origPick.entities?.[0]?.team) {
        updates[`picks.${pickId}.entities`] = enrichedPick.entities;
      }

      // Check entities[0].position (if team was also set, entities already included above)
      if (enrichedPick.entities?.[0]?.position && !origPick.entities?.[0]?.position && !updates[`picks.${pickId}.entities`]) {
        updates[`picks.${pickId}.entities`] = enrichedPick.entities;
      }

      // Check betCategory change (game prop fix)
      if (enrichedPick.betCategory !== origPick.betCategory) {
        updates[`picks.${pickId}.betCategory`] = enrichedPick.betCategory;
        updates[`picks.${pickId}.betType`] = enrichedPick.betType;
        updates[`picks.${pickId}.entities`] = enrichedPick.entities;
        if (enrichedPick.line) {
          updates[`picks.${pickId}.line`] = enrichedPick.line;
        }
      }

      // Check game teams from actualStats
      if (enrichedPick.game?.homeTeam && !origPick.game?.homeTeam) {
        updates[`picks.${pickId}.game`] = enrichedPick.game;
      }
      if (enrichedPick.game?.awayTeam && !origPick.game?.awayTeam && !updates[`picks.${pickId}.game`]) {
        updates[`picks.${pickId}.game`] = enrichedPick.game;
      }
    }

    if (Object.keys(updates).length > 0) {
      operations.push({
        type: 'update',
        id,
        data: updates,
        reason: `${Object.keys(updates).length} field updates`
      });
    }
  }

  console.log(`\nTotal operations: ${operations.length}`);
  console.log(`  Full writes (legacy): ${operations.filter(o => o.type === 'set').length}`);
  console.log(`  Partial updates (migrated): ${operations.filter(o => o.type === 'update').length}`);
  console.log('');

  // Show what would change
  if (operations.length <= 30 || !writeMode) {
    console.log('--- Operations ---');
    for (const op of operations) {
      if (op.type === 'set') {
        const pickCount = Object.keys(op.data.picks || {}).length;
        console.log(`  SET ${op.id}: ${op.reason} (${pickCount} picks)`);
      } else {
        console.log(`  UPDATE ${op.id}: ${op.reason}`);
        for (const [key, val] of Object.entries(op.data)) {
          const preview = typeof val === 'object' ? JSON.stringify(val).slice(0, 100) : val;
          console.log(`    ${key} = ${preview}`);
        }
      }
    }
    console.log('');
  }

  if (!writeMode) {
    console.log('DRY RUN COMPLETE — Run with --write to apply changes');
    return;
  }

  // Execute writes
  console.log('Initializing Firebase...');
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  console.log('Firebase initialized');
  console.log('');

  let success = 0;
  let failed = 0;

  for (let i = 0; i < operations.length; i += BATCH_SIZE) {
    const batch = operations.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1} (${batch.length} operations)...`);

    for (const op of batch) {
      try {
        const docRef = doc(db, 'parlays', String(op.id));
        if (op.type === 'set') {
          await setDoc(docRef, op.data);
        } else {
          await updateDoc(docRef, op.data);
        }
        success++;
      } catch (err) {
        console.error(`  FAILED ${op.id}: ${err.message}`);
        failed++;
      }
    }

    if (i + BATCH_SIZE < operations.length) {
      console.log(`  Waiting ${DELAY_BETWEEN_BATCHES_MS}ms...`);
      await sleep(DELAY_BETWEEN_BATCHES_MS);
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('WRITE COMPLETE');
  console.log('='.repeat(60));
  console.log(`  Success: ${success}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Total: ${operations.length}`);
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
