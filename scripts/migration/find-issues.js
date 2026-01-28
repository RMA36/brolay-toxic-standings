/**
 * Find Issues - Identifies picks that may need manual review/cleanup
 *
 * This script helps find data quality issues after migration:
 * - Picks with empty entities arrays
 * - Picks with missing team/player information
 * - Any other data anomalies
 *
 * Usage:
 *   node scripts/migration/find-issues.js
 *   node scripts/migration/find-issues.js --input backups/migrated-data.json
 */

const fs = require('fs');
const path = require('path');

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    inputFile: null
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && args[i + 1]) {
      options.inputFile = args[i + 1];
      i++;
    }
  }

  return options;
}

/**
 * Find all issues in migrated data
 */
function findIssues(brolays) {
  const issues = {
    emptyEntities: [],
    missingBigGuy: [],
    unknownBetCategory: [],
    missingGame: [],
    pendingOldBrolays: [],
    duplicateBigGuys: []
  };

  brolays.forEach(brolay => {
    const brolayInfo = {
      id: brolay.id,
      date: brolay.date,
      submittedBy: brolay.submittedBy
    };

    // Check for duplicate Big Guys in picks
    const bigGuysInBrolay = [];

    Object.entries(brolay.picks || {}).forEach(([pickId, pick]) => {
      const pickInfo = {
        brolayId: brolay.id,
        brolayDate: brolay.date,
        pickId,
        bigGuy: pick.bigGuy,
        sport: pick.sport,
        betType: pick.betType,
        betCategory: pick.betCategory
      };

      // Track Big Guys for duplicate check
      if (pick.bigGuy) {
        bigGuysInBrolay.push(pick.bigGuy);
      }

      // Check for empty entities
      if (!pick.entities || pick.entities.length === 0) {
        issues.emptyEntities.push({
          ...pickInfo,
          reason: 'No entities extracted'
        });
      }

      // Check for missing Big Guy
      if (!pick.bigGuy) {
        issues.missingBigGuy.push({
          ...pickInfo,
          reason: 'Missing bigGuy field'
        });
      }

      // Check for unknown bet category
      if (pick.betCategory === 'unknown') {
        issues.unknownBetCategory.push({
          ...pickInfo,
          reason: `Unknown bet type: ${pick.betType}`
        });
      }

      // Check for missing game info
      if (!pick.game || (!pick.game.homeTeam && !pick.game.awayTeam && !pick.game.participant1)) {
        issues.missingGame.push({
          ...pickInfo,
          reason: 'No game identification info'
        });
      }
    });

    // Check for duplicate Big Guys
    const uniqueBigGuys = new Set(bigGuysInBrolay);
    if (bigGuysInBrolay.length !== uniqueBigGuys.size) {
      const duplicates = bigGuysInBrolay.filter((guy, idx) => bigGuysInBrolay.indexOf(guy) !== idx);
      issues.duplicateBigGuys.push({
        ...brolayInfo,
        duplicates: [...new Set(duplicates)]
      });
    }

    // Check for old pending brolays (might be forgotten)
    if (!brolay.settled && brolay.date) {
      const brolayDate = new Date(brolay.date);
      const daysSince = (Date.now() - brolayDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince > 7) {
        issues.pendingOldBrolays.push({
          ...brolayInfo,
          daysPending: Math.floor(daysSince)
        });
      }
    }
  });

  return issues;
}

/**
 * Print issues report
 */
function printReport(issues) {
  console.log('');
  console.log('='.repeat(60));
  console.log('DATA ISSUES REPORT');
  console.log('='.repeat(60));
  console.log('');

  // Empty Entities
  console.log(`Empty Entities: ${issues.emptyEntities.length}`);
  if (issues.emptyEntities.length > 0) {
    console.log('  These picks have no team/player information:');
    issues.emptyEntities.slice(0, 20).forEach(issue => {
      console.log(`    - [${issue.brolayDate}] ${issue.brolayId} / ${issue.bigGuy}: ${issue.betType} (${issue.sport})`);
    });
    if (issues.emptyEntities.length > 20) {
      console.log(`    ... and ${issues.emptyEntities.length - 20} more`);
    }
  }
  console.log('');

  // Missing Big Guy
  console.log(`Missing Big Guy: ${issues.missingBigGuy.length}`);
  if (issues.missingBigGuy.length > 0) {
    issues.missingBigGuy.slice(0, 10).forEach(issue => {
      console.log(`    - [${issue.brolayDate}] ${issue.brolayId}: ${issue.betType}`);
    });
  }
  console.log('');

  // Unknown Bet Category
  console.log(`Unknown Bet Category: ${issues.unknownBetCategory.length}`);
  if (issues.unknownBetCategory.length > 0) {
    issues.unknownBetCategory.slice(0, 10).forEach(issue => {
      console.log(`    - [${issue.brolayDate}] ${issue.brolayId} / ${issue.bigGuy}: ${issue.betType}`);
    });
  }
  console.log('');

  // Missing Game Info
  console.log(`Missing Game Info: ${issues.missingGame.length}`);
  if (issues.missingGame.length > 0) {
    issues.missingGame.slice(0, 10).forEach(issue => {
      console.log(`    - [${issue.brolayDate}] ${issue.brolayId} / ${issue.bigGuy}: ${issue.betType} (${issue.sport})`);
    });
    if (issues.missingGame.length > 10) {
      console.log(`    ... and ${issues.missingGame.length - 10} more`);
    }
  }
  console.log('');

  // Duplicate Big Guys
  console.log(`Duplicate Big Guys in Brolay: ${issues.duplicateBigGuys.length}`);
  if (issues.duplicateBigGuys.length > 0) {
    issues.duplicateBigGuys.slice(0, 10).forEach(issue => {
      console.log(`    - [${issue.date}] ${issue.id}: ${issue.duplicates.join(', ')}`);
    });
  }
  console.log('');

  // Old Pending Brolays
  console.log(`Old Pending Brolays (>7 days): ${issues.pendingOldBrolays.length}`);
  if (issues.pendingOldBrolays.length > 0) {
    issues.pendingOldBrolays.slice(0, 10).forEach(issue => {
      console.log(`    - [${issue.date}] ${issue.id}: pending ${issue.daysPending} days`);
    });
  }
  console.log('');

  console.log('='.repeat(60));

  // Summary
  const totalIssues = Object.values(issues).reduce((sum, arr) => sum + arr.length, 0);
  console.log(`Total Issues Found: ${totalIssues}`);
  console.log('='.repeat(60));

  return issues;
}

/**
 * Export issues to CSV for easy review
 */
function exportToCSV(issues, outputPath) {
  const rows = ['Type,BrolayID,Date,BigGuy,Sport,BetType,Details'];

  issues.emptyEntities.forEach(issue => {
    rows.push(`Empty Entities,${issue.brolayId},${issue.brolayDate},${issue.bigGuy},${issue.sport},${issue.betType},No entities`);
  });

  issues.missingBigGuy.forEach(issue => {
    rows.push(`Missing Big Guy,${issue.brolayId},${issue.brolayDate},,${issue.sport},${issue.betType},`);
  });

  issues.unknownBetCategory.forEach(issue => {
    rows.push(`Unknown Category,${issue.brolayId},${issue.brolayDate},${issue.bigGuy},${issue.sport},${issue.betType},${issue.reason}`);
  });

  issues.missingGame.forEach(issue => {
    rows.push(`Missing Game,${issue.brolayId},${issue.brolayDate},${issue.bigGuy},${issue.sport},${issue.betType},No game info`);
  });

  fs.writeFileSync(outputPath, rows.join('\n'), 'utf8');
  console.log(`\nIssues exported to: ${outputPath}`);
}

/**
 * Main function
 */
async function main() {
  console.log('='.repeat(60));
  console.log('FIND DATA ISSUES');
  console.log('='.repeat(60));
  console.log('');

  const options = parseArgs();

  // Determine input file
  const inputFile = options.inputFile ||
    path.join(__dirname, '..', '..', 'backups', 'migrated-data.json');

  console.log(`Reading from: ${inputFile}`);

  if (!fs.existsSync(inputFile)) {
    console.error(`File not found: ${inputFile}`);
    console.error('');
    console.error('Run the migration first:');
    console.error('  node scripts/migration/migrate-all.js --output-json');
    process.exit(1);
  }

  const content = fs.readFileSync(inputFile, 'utf8');
  const data = JSON.parse(content);

  console.log(`Loaded ${data.data.length} brolays`);
  console.log('');

  // Find issues
  const issues = findIssues(data.data);

  // Print report
  printReport(issues);

  // Export to CSV
  const csvPath = path.join(__dirname, '..', '..', 'backups', 'data-issues.csv');
  exportToCSV(issues, csvPath);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
