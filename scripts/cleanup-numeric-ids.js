/**
 * Cleanup script to delete documents with numeric IDs
 *
 * After migration, Firestore has duplicate documents:
 * - Original numeric IDs (e.g., 1768015179931)
 * - New string IDs (e.g., "1768015179931")
 *
 * This script deletes the numeric ID documents.
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, writeBatch } = require('firebase/firestore');
const readline = require('readline');

const firebaseConfig = {
  apiKey: "AIzaSyDWhm77FUPJUHt7Bdb9R1NHH9PoAorkxlc",
  authDomain: "brolay-toxic-standings.firebaseapp.com",
  projectId: "brolay-toxic-standings",
  storageBucket: "brolay-toxic-standings.firebasestorage.app",
  messagingSenderId: "466981190192",
  appId: "1:466981190192:web:f03423a047f8ce554a8bf5"
};

const BATCH_SIZE = 400;

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

async function cleanup() {
  console.log('============================================================');
  console.log('CLEANUP: Delete Duplicate Numeric ID Documents');
  console.log('============================================================');
  console.log('');

  try {
    // Initialize Firebase
    console.log('Initializing Firebase...');
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    console.log('Firebase initialized');
    console.log('');

    // Fetch all documents
    console.log('Fetching all documents from parlays collection...');
    const parlaysRef = collection(db, 'parlays');
    const snapshot = await getDocs(parlaysRef);
    console.log(`Found ${snapshot.size} total documents`);
    console.log('');

    // Identify documents with numeric-looking IDs that are OLD schema (have 'participants' not 'picks')
    const documentsToDelete = [];
    const newSchemaIds = new Set();
    const oldSchemaIds = new Set();

    snapshot.forEach(docSnap => {
      const id = docSnap.id;
      const data = docSnap.data();

      // Check if this is new schema (has 'picks') or old schema (has 'participants')
      const isNewSchema = data.picks && !data.participants;
      const isOldSchema = data.participants && !data.picks;

      if (isNewSchema) {
        newSchemaIds.add(id);
      } else if (isOldSchema) {
        oldSchemaIds.add(id);
        documentsToDelete.push({ id, date: data.date });
      }
    });

    console.log(`New schema documents: ${newSchemaIds.size}`);
    console.log(`Old schema documents (to delete): ${oldSchemaIds.size}`);
    console.log('');

    if (documentsToDelete.length === 0) {
      console.log('No old schema documents found. Nothing to delete.');
      return { success: true, deleted: 0 };
    }

    // Show sample of documents to delete
    console.log('Sample of documents to delete:');
    documentsToDelete.slice(0, 5).forEach(d => {
      console.log(`  - ID: ${d.id}, Date: ${d.date}`);
    });
    if (documentsToDelete.length > 5) {
      console.log(`  ... and ${documentsToDelete.length - 5} more`);
    }
    console.log('');

    // Confirm deletion
    console.log('============================================================');
    console.log('WARNING');
    console.log('============================================================');
    console.log('');
    console.log(`This will DELETE ${documentsToDelete.length} documents from Firestore!`);
    console.log('These are the OLD schema duplicates that were not overwritten.');
    console.log('');

    const confirmed = await askConfirmation('Type "yes" to confirm deletion: ');
    if (!confirmed) {
      console.log('');
      console.log('Deletion cancelled by user.');
      return { success: false, cancelled: true };
    }

    console.log('');
    console.log('Deleting documents...');

    // Delete in batches
    let deleted = 0;
    for (let i = 0; i < documentsToDelete.length; i += BATCH_SIZE) {
      const batchDocs = documentsToDelete.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);

      batchDocs.forEach(({ id }) => {
        const docRef = doc(db, 'parlays', id);
        batch.delete(docRef);
      });

      await batch.commit();
      deleted += batchDocs.length;
      const progress = Math.round((deleted / documentsToDelete.length) * 100);
      console.log(`Progress: ${deleted}/${documentsToDelete.length} (${progress}%)`);
    }

    console.log('');
    console.log('============================================================');
    console.log('CLEANUP COMPLETE');
    console.log('============================================================');
    console.log('');
    console.log(`Deleted: ${deleted} old schema documents`);
    console.log(`Remaining: ${newSchemaIds.size} new schema documents`);
    console.log('');

    return { success: true, deleted };

  } catch (error) {
    console.error('');
    console.error('============================================================');
    console.error('CLEANUP FAILED');
    console.error('============================================================');
    console.error('');
    console.error('Error:', error.message);
    return { success: false, error: error.message };
  }
}

cleanup()
  .then(result => {
    process.exit(result.success ? 0 : 1);
  })
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });
