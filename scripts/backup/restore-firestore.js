/**
 * Firestore Restore Script
 *
 * Restores brolays from a JSON backup file to Firestore.
 * THIS IS YOUR SAFETY NET if the Track 2 migration goes wrong.
 *
 * Usage:
 *   node scripts/backup/restore-firestore.js [backup-file]
 *
 * Examples:
 *   node scripts/backup/restore-firestore.js
 *     -> Restores from backups/brolay-backup-latest.json
 *
 *   node scripts/backup/restore-firestore.js backups/brolay-backup-2026-01-25-143022.json
 *     -> Restores from specific backup file
 *
 * WARNING: This will OVERWRITE existing documents with the same IDs!
 *
 * The script will:
 * 1. Read the backup JSON file
 * 2. Validate the backup structure
 * 3. Ask for confirmation before proceeding
 * 4. Restore each document to Firestore
 * 5. Generate a restore report
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, writeBatch } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Firebase configuration (same as App.jsx)
const firebaseConfig = {
  apiKey: "AIzaSyDWhm77FUPJUHt7Bdb9R1NHH9PoAorkxlc",
  authDomain: "brolay-toxic-standings.firebaseapp.com",
  projectId: "brolay-toxic-standings",
  storageBucket: "brolay-toxic-standings.firebasestorage.app",
  messagingSenderId: "466981190192",
  appId: "1:466981190192:web:f03423a047f8ce554a8bf5"
};

// Batch size for Firestore writes (max 500 per batch)
const BATCH_SIZE = 400;

/**
 * Prompt user for confirmation
 */
function askConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

/**
 * Validate backup file structure
 */
function validateBackup(backup) {
  const errors = [];

  if (!backup) {
    errors.push('Backup file is empty or invalid JSON');
    return errors;
  }

  if (!backup.metadata) {
    errors.push('Missing metadata section');
  } else {
    if (!backup.metadata.exportedAt) {
      errors.push('Missing metadata.exportedAt');
    }
    if (!backup.metadata.collection) {
      errors.push('Missing metadata.collection');
    }
  }

  if (!backup.data) {
    errors.push('Missing data section');
  } else if (!Array.isArray(backup.data)) {
    errors.push('data section is not an array');
  } else if (backup.data.length === 0) {
    errors.push('data array is empty');
  } else {
    // Check first few documents have required fields
    const sampleSize = Math.min(5, backup.data.length);
    for (let i = 0; i < sampleSize; i++) {
      const doc = backup.data[i];
      if (!doc.id) {
        errors.push(`Document at index ${i} missing 'id' field`);
      }
    }
  }

  return errors;
}

/**
 * Main restore function
 */
async function restoreFirestore() {
  console.log('='.repeat(60));
  console.log('BROLAY FIRESTORE RESTORE');
  console.log('='.repeat(60));
  console.log('');

  try {
    // Determine backup file path
    let backupPath;
    if (process.argv[2]) {
      // Use specified file
      backupPath = path.resolve(process.argv[2]);
    } else {
      // Use latest backup
      backupPath = path.join(__dirname, '..', '..', 'backups', 'brolay-backup-latest.json');
    }

    console.log(`Backup file: ${backupPath}`);
    console.log('');

    // Check file exists
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`);
    }

    // Read and parse backup file
    console.log('Reading backup file...');
    const fileContent = fs.readFileSync(backupPath, 'utf8');
    const backup = JSON.parse(fileContent);
    console.log('Backup file parsed successfully');
    console.log('');

    // Validate backup structure
    console.log('Validating backup structure...');
    const validationErrors = validateBackup(backup);
    if (validationErrors.length > 0) {
      console.error('Validation errors:');
      validationErrors.forEach(err => console.error(`  - ${err}`));
      throw new Error('Backup validation failed');
    }
    console.log('Backup structure is valid');
    console.log('');

    // Display backup info
    console.log('='.repeat(60));
    console.log('BACKUP INFORMATION');
    console.log('='.repeat(60));
    console.log('');
    console.log(`Exported At: ${backup.metadata.exportedAt}`);
    console.log(`Project ID: ${backup.metadata.projectId}`);
    console.log(`Collection: ${backup.metadata.collection}`);
    console.log(`Document Count: ${backup.metadata.documentCount}`);
    if (backup.metadata.pickCount) {
      console.log(`Pick Count: ${backup.metadata.pickCount}`);
    }
    console.log('');

    if (backup.statistics) {
      console.log('Statistics:');
      console.log(`  - Settled: ${backup.statistics.settledCount}`);
      console.log(`  - Pending: ${backup.statistics.pendingCount}`);
      if (backup.statistics.dateRange) {
        console.log(`  - Date Range: ${backup.statistics.dateRange.earliest} to ${backup.statistics.dateRange.latest}`);
      }
      console.log('');
    }

    // Get confirmation
    console.log('='.repeat(60));
    console.log('WARNING');
    console.log('='.repeat(60));
    console.log('');
    console.log('This will OVERWRITE documents in the production Firestore database!');
    console.log(`Target collection: ${backup.metadata.collection} (should be "parlays")`);
    console.log(`Documents to restore: ${backup.data.length}`);
    console.log('');

    const confirmed = await askConfirmation('Type "yes" to confirm restore: ');
    if (!confirmed) {
      console.log('');
      console.log('Restore cancelled by user.');
      return { success: false, cancelled: true };
    }

    console.log('');
    console.log('Starting restore...');
    console.log('');

    // Initialize Firebase
    console.log('Initializing Firebase...');
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    console.log('Firebase initialized');
    console.log('');

    // Restore documents in batches
    const collectionName = backup.metadata.collection;
    const documents = backup.data;
    const totalDocs = documents.length;
    let restored = 0;
    let failed = 0;
    const failedDocs = [];

    console.log(`Restoring ${totalDocs} documents in batches of ${BATCH_SIZE}...`);
    console.log(`Collection name: "${collectionName}" (type: ${typeof collectionName})`);
    console.log('');

    for (let i = 0; i < totalDocs; i += BATCH_SIZE) {
      const batchDocs = documents.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);

      batchDocs.forEach((docData, idx) => {
        const { id: rawId, ...data } = docData;
        // Convert numeric IDs to strings (some old brolays have timestamp IDs)
        const id = String(rawId);
        if (idx === 0 && i === 0) {
          console.log(`First doc ID: "${id}" (type: ${typeof id})`);
        }
        if (!id) {
          throw new Error(`Invalid document ID at index ${i + idx}: ${JSON.stringify(rawId)}`);
        }
        const docRef = doc(db, collectionName, id);
        batch.set(docRef, data);
      });

      try {
        await batch.commit();
        restored += batchDocs.length;
        const progress = Math.round((restored / totalDocs) * 100);
        console.log(`Progress: ${restored}/${totalDocs} (${progress}%)`);
      } catch (batchError) {
        console.error(`Batch failed at index ${i}: ${batchError.message}`);

        // Fall back to individual writes for this batch
        for (const docData of batchDocs) {
          const { id, ...data } = docData;
          try {
            const docRef = doc(db, collectionName, id);
            await setDoc(docRef, data);
            restored++;
          } catch (docError) {
            failed++;
            failedDocs.push({ id, error: docError.message });
            console.error(`  Failed to restore ${id}: ${docError.message}`);
          }
        }
      }
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('RESTORE COMPLETE');
    console.log('='.repeat(60));
    console.log('');
    console.log(`Total documents: ${totalDocs}`);
    console.log(`Restored: ${restored}`);
    console.log(`Failed: ${failed}`);
    console.log('');

    if (failedDocs.length > 0) {
      console.log('Failed documents:');
      failedDocs.forEach(({ id, error }) => {
        console.log(`  - ${id}: ${error}`);
      });
      console.log('');
    }

    if (failed === 0) {
      console.log('ALL DOCUMENTS RESTORED SUCCESSFULLY!');
    } else {
      console.log(`WARNING: ${failed} documents failed to restore.`);
    }

    return {
      success: failed === 0,
      restored,
      failed,
      failedDocs
    };

  } catch (error) {
    console.error('');
    console.error('='.repeat(60));
    console.error('RESTORE FAILED');
    console.error('='.repeat(60));
    console.error('');
    console.error('Error:', error.message);
    console.error('');

    return {
      success: false,
      error: error.message
    };
  }
}

// Run the restore
restoreFirestore()
  .then(result => {
    if (result.success || result.cancelled) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });
