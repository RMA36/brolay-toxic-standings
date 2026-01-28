/**
 * Firestore Export Script
 *
 * Exports all brolays from the Firestore database to a JSON file.
 * This is CRITICAL for Track 2 migration - creates a full backup before restructuring.
 *
 * Usage:
 *   node scripts/backup/export-firestore.js
 *
 * The script will:
 * 1. Connect to Firestore using the Firebase web SDK
 * 2. Fetch ALL documents from the 'parlays' collection (the actual Firestore collection name)
 * 3. Save them to backups/brolay-backup-YYYY-MM-DD-HHmmss.json
 * 4. Generate a summary report
 *
 * Requirements:
 * - Run from the project root directory
 * - Firebase project must be accessible
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

// Firebase configuration (same as App.jsx)
const firebaseConfig = {
  apiKey: "AIzaSyDWhm77FUPJUHt7Bdb9R1NHH9PoAorkxlc",
  authDomain: "brolay-toxic-standings.firebaseapp.com",
  projectId: "brolay-toxic-standings",
  storageBucket: "brolay-toxic-standings.firebasestorage.app",
  messagingSenderId: "466981190192",
  appId: "1:466981190192:web:f03423a047f8ce554a8bf5"
};

/**
 * Generate timestamp string for filename
 */
function getTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}-${hours}${minutes}${seconds}`;
}

/**
 * Count picks in a brolay (handles both numeric and named keys)
 */
function countPicks(brolay) {
  if (!brolay.participants) return 0;
  return Object.keys(brolay.participants).length;
}

/**
 * Analyze the data and generate summary statistics
 */
function analyzeData(brolays) {
  const stats = {
    totalBrolays: brolays.length,
    totalPicks: 0,
    bigGuys: new Set(),
    sports: new Set(),
    betTypes: new Set(),
    dateRange: { earliest: null, latest: null },
    settledCount: 0,
    pendingCount: 0,
    byBigGuy: {},
    bySport: {},
    byBetType: {}
  };

  brolays.forEach(brolay => {
    // Count settled vs pending
    if (brolay.settled) {
      stats.settledCount++;
    } else {
      stats.pendingCount++;
    }

    // Date range
    if (brolay.date) {
      if (!stats.dateRange.earliest || brolay.date < stats.dateRange.earliest) {
        stats.dateRange.earliest = brolay.date;
      }
      if (!stats.dateRange.latest || brolay.date > stats.dateRange.latest) {
        stats.dateRange.latest = brolay.date;
      }
    }

    // Analyze participants/picks
    if (brolay.participants) {
      Object.values(brolay.participants).forEach(pick => {
        stats.totalPicks++;

        // Track Big Guy
        if (pick.player) {
          stats.bigGuys.add(pick.player);
          stats.byBigGuy[pick.player] = (stats.byBigGuy[pick.player] || 0) + 1;
        }

        // Track sport
        if (pick.sport) {
          stats.sports.add(pick.sport);
          stats.bySport[pick.sport] = (stats.bySport[pick.sport] || 0) + 1;
        }

        // Track bet type
        if (pick.betType) {
          stats.betTypes.add(pick.betType);
          stats.byBetType[pick.betType] = (stats.byBetType[pick.betType] || 0) + 1;
        }
      });
    }
  });

  return {
    ...stats,
    bigGuys: Array.from(stats.bigGuys),
    sports: Array.from(stats.sports),
    betTypes: Array.from(stats.betTypes)
  };
}

/**
 * Main export function
 */
async function exportFirestore() {
  console.log('='.repeat(60));
  console.log('BROLAY FIRESTORE BACKUP EXPORT');
  console.log('='.repeat(60));
  console.log('');

  try {
    // Initialize Firebase
    console.log('Initializing Firebase...');
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    console.log('Firebase initialized successfully');
    console.log('');

    // Fetch all documents from 'parlays' collection (the actual Firestore collection name)
    console.log('Fetching all parlays from Firestore (collection: "parlays")...');
    const brolaysRef = collection(db, 'parlays');
    const snapshot = await getDocs(brolaysRef);

    console.log(`Found ${snapshot.size} documents`);
    console.log('');

    // Convert to array of objects with document IDs
    const brolays = [];
    snapshot.forEach(doc => {
      brolays.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Sort by date (newest first) for easier inspection
    brolays.sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return b.date.localeCompare(a.date);
    });

    // Analyze the data
    console.log('Analyzing data...');
    const stats = analyzeData(brolays);
    console.log('');

    // Create backup object with metadata
    const backup = {
      metadata: {
        exportedAt: new Date().toISOString(),
        projectId: firebaseConfig.projectId,
        collection: 'parlays',
        documentCount: brolays.length,
        pickCount: stats.totalPicks
      },
      statistics: stats,
      data: brolays
    };

    // Determine output path
    const timestamp = getTimestamp();
    const filename = `brolay-backup-${timestamp}.json`;
    const outputDir = path.join(__dirname, '..', '..', 'backups');
    const outputPath = path.join(outputDir, filename);

    // Ensure backups directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write to file
    console.log('Writing backup file...');
    fs.writeFileSync(outputPath, JSON.stringify(backup, null, 2), 'utf8');
    console.log(`Backup saved to: ${outputPath}`);
    console.log('');

    // Also create a "latest" symlink/copy for easy access
    const latestPath = path.join(outputDir, 'brolay-backup-latest.json');
    fs.copyFileSync(outputPath, latestPath);
    console.log(`Latest backup copy: ${latestPath}`);
    console.log('');

    // Print summary
    console.log('='.repeat(60));
    console.log('BACKUP SUMMARY');
    console.log('='.repeat(60));
    console.log('');
    console.log(`Total Brolays: ${stats.totalBrolays}`);
    console.log(`Total Picks: ${stats.totalPicks}`);
    console.log(`Average Picks per Brolay: ${(stats.totalPicks / stats.totalBrolays).toFixed(1)}`);
    console.log('');
    console.log(`Settled: ${stats.settledCount}`);
    console.log(`Pending: ${stats.pendingCount}`);
    console.log('');
    console.log(`Date Range: ${stats.dateRange.earliest} to ${stats.dateRange.latest}`);
    console.log('');
    console.log('Big Guys Found:');
    stats.bigGuys.forEach(guy => {
      console.log(`  - ${guy}: ${stats.byBigGuy[guy]} picks`);
    });
    console.log('');
    console.log('Sports Found:');
    stats.sports.forEach(sport => {
      console.log(`  - ${sport}: ${stats.bySport[sport]} picks`);
    });
    console.log('');
    console.log('Bet Types Found:');
    Object.entries(stats.byBetType)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        console.log(`  - ${type}: ${count} picks`);
      });
    console.log('');
    console.log('='.repeat(60));
    console.log('BACKUP COMPLETE - Data is safe!');
    console.log('='.repeat(60));

    // Return stats for programmatic use
    return {
      success: true,
      filename,
      outputPath,
      stats
    };

  } catch (error) {
    console.error('');
    console.error('='.repeat(60));
    console.error('BACKUP FAILED');
    console.error('='.repeat(60));
    console.error('');
    console.error('Error:', error.message);
    console.error('');
    console.error('Full error:', error);

    return {
      success: false,
      error: error.message
    };
  }
}

// Run the export
exportFirestore()
  .then(result => {
    if (result.success) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });
