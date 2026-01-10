import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDWhm77FUPJUHt7Bdb9R1NHH9PoAorkxlc",
  authDomain: "brolay-toxic-standings.firebaseapp.com",
  projectId: "brolay-toxic-standings",
  storageBucket: "brolay-toxic-standings.firebasestorage.app",
  messagingSenderId: "466981190192",
  appId: "1:466981190192:web:f03423a047f8ce554a8bf5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrateParleysToBrolays() {
  console.log('Starting migration from "parlays" to "brolays"...');
  
  try {
    // 1. Fetch all documents from 'parlays' collection
    const parlaysRef = collection(db, 'parlays');
    const snapshot = await getDocs(parlaysRef);
    
    console.log(`Found ${snapshot.docs.length} documents to migrate`);
    
    // 2. Copy each document to 'brolays' collection with same ID
    let successCount = 0;
    let errorCount = 0;
    
    for (const docSnapshot of snapshot.docs) {
      try {
        const data = docSnapshot.data();
        const docId = docSnapshot.id;
        
        // Create document in new collection with same ID
        const brolaysDocRef = doc(db, 'brolays', docId);
        await setDoc(brolaysDocRef, data);
        
        successCount++;
        console.log(`✓ Migrated document ${docId} (${successCount}/${snapshot.docs.length})`);
      } catch (error) {
        errorCount++;
        console.error(`✗ Error migrating document ${docSnapshot.id}:`, error);
      }
    }
    
    console.log('\n=== Migration Summary ===');
    console.log(`Total documents: ${snapshot.docs.length}`);
    console.log(`Successfully migrated: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
    
    if (errorCount === 0) {
      console.log('\n✓ Migration completed successfully!');
      console.log('\nIMPORTANT: Please verify the data in the "brolays" collection in Firebase Console.');
      console.log('Once verified, you can manually delete the old "parlays" collection.');
    } else {
      console.log('\n⚠ Migration completed with errors. Please review the error messages above.');
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Run the migration
migrateParleysToBrolays();
