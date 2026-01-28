/**
 * Migrate All - Main migration orchestrator for Track 2 data restructure
 *
 * This script:
 * 1. Reads the backup JSON file
 * 2. Transforms all brolays to the new schema
 * 3. Validates the transformed data
 * 4. Optionally writes to a test output file or to Firestore
 *
 * Usage:
 *   node scripts/migration/migrate-all.js [options]
 *
 * Options:
 *   --dry-run         Transform and validate without writing anywhere (default)
 *   --output-json     Write transformed data to backups/migrated-data.json
 *   --sample N        Only process first N brolays (for testing)
 *   --verbose         Show detailed transformation info
 *
 * Examples:
 *   node scripts/migration/migrate-all.js --dry-run
 *   node scripts/migration/migrate-all.js --output-json --sample 50
 *   node scripts/migration/migrate-all.js --output-json
 */

const fs = require('fs');
const path = require('path');
const { transformBrolay } = require('./transform-pick');
const { validateAll, printReport } = require('./validator');

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: true,
    outputJson: false,
    sample: null,
    verbose: false,
    inputFile: null
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--dry-run') {
      options.dryRun = true;
      options.outputJson = false;
    } else if (arg === '--output-json') {
      options.outputJson = true;
      options.dryRun = false;
    } else if (arg === '--sample' && args[i + 1]) {
      options.sample = parseInt(args[i + 1], 10);
      i++;
    } else if (arg === '--verbose') {
      options.verbose = true;
    } else if (arg === '--input' && args[i + 1]) {
      options.inputFile = args[i + 1];
      i++;
    }
  }

  return options;
}

/**
 * Load backup data from JSON file
 */
function loadBackup(filePath) {
  console.log(`Loading backup from: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Backup file not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const backup = JSON.parse(content);

  if (!backup.data || !Array.isArray(backup.data)) {
    throw new Error('Invalid backup format: missing or invalid data array');
  }

  console.log(`Loaded ${backup.data.length} brolays from backup`);
  console.log(`Backup timestamp: ${backup.metadata?.exportedAt || 'unknown'}`);
  console.log('');

  return backup;
}

/**
 * Transform all brolays
 */
function transformAll(brolays, options) {
  console.log('Transforming brolays...');
  console.log('');

  const transformed = [];
  const errors = [];
  let successCount = 0;
  let failCount = 0;

  const total = brolays.length;
  const reportInterval = Math.max(1, Math.floor(total / 10));

  brolays.forEach((brolay, index) => {
    try {
      const newBrolay = transformBrolay(brolay);
      transformed.push(newBrolay);
      successCount++;

      if (options.verbose) {
        const pickCount = Object.keys(newBrolay.picks).length;
        console.log(`  [${index + 1}/${total}] ${brolay.id}: ${pickCount} picks transformed`);
      } else if ((index + 1) % reportInterval === 0) {
        const progress = Math.round((index + 1) / total * 100);
        console.log(`  Progress: ${index + 1}/${total} (${progress}%)`);
      }
    } catch (err) {
      failCount++;
      errors.push({
        brolayId: brolay.id,
        error: err.message,
        stack: err.stack
      });

      console.error(`  ERROR transforming ${brolay.id}: ${err.message}`);
    }
  });

  console.log('');
  console.log(`Transformation complete: ${successCount} success, ${failCount} failed`);

  return { transformed, errors };
}

/**
 * Write transformed data to JSON file
 */
function writeOutput(transformed, outputPath, originalMetadata) {
  console.log('');
  console.log(`Writing transformed data to: ${outputPath}`);

  // Count total picks
  const totalPicks = transformed.reduce((sum, b) => sum + Object.keys(b.picks).length, 0);

  const output = {
    metadata: {
      migratedAt: new Date().toISOString(),
      sourceBackup: originalMetadata?.exportedAt || 'unknown',
      sourceCollection: originalMetadata?.collection || 'parlays',
      documentCount: transformed.length,
      pickCount: totalPicks,
      schemaVersion: '2.0'
    },
    data: transformed
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');
  console.log(`Wrote ${transformed.length} brolays (${totalPicks} picks) to ${outputPath}`);
}

/**
 * Generate migration statistics
 */
function generateStats(original, transformed) {
  const stats = {
    originalCount: original.length,
    transformedCount: transformed.length,
    totalOriginalPicks: 0,
    totalTransformedPicks: 0,
    betCategories: {},
    sports: {},
    bigGuys: {}
  };

  // Count original picks
  original.forEach(b => {
    if (b.participants) {
      stats.totalOriginalPicks += Object.keys(b.participants).length;
    }
  });

  // Analyze transformed data
  transformed.forEach(b => {
    Object.values(b.picks).forEach(pick => {
      stats.totalTransformedPicks++;

      // Count by category
      const cat = pick.betCategory || 'unknown';
      stats.betCategories[cat] = (stats.betCategories[cat] || 0) + 1;

      // Count by sport
      const sport = pick.sport || 'unknown';
      stats.sports[sport] = (stats.sports[sport] || 0) + 1;

      // Count by Big Guy
      const guy = pick.bigGuy || 'unknown';
      stats.bigGuys[guy] = (stats.bigGuys[guy] || 0) + 1;
    });
  });

  return stats;
}

/**
 * Print migration statistics
 */
function printStats(stats) {
  console.log('');
  console.log('='.repeat(60));
  console.log('MIGRATION STATISTICS');
  console.log('='.repeat(60));
  console.log('');
  console.log(`Brolays: ${stats.originalCount} -> ${stats.transformedCount}`);
  console.log(`Picks: ${stats.totalOriginalPicks} -> ${stats.totalTransformedPicks}`);
  console.log('');

  console.log('Picks by Bet Category:');
  Object.entries(stats.betCategories)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      console.log(`  - ${cat}: ${count}`);
    });
  console.log('');

  console.log('Picks by Big Guy:');
  Object.entries(stats.bigGuys)
    .sort((a, b) => b[1] - a[1])
    .forEach(([guy, count]) => {
      console.log(`  - ${guy}: ${count}`);
    });
  console.log('');
}

/**
 * Main migration function
 */
async function main() {
  console.log('='.repeat(60));
  console.log('TRACK 2: DATA MIGRATION');
  console.log('='.repeat(60));
  console.log('');

  // Parse arguments
  const options = parseArgs();

  console.log('Options:');
  console.log(`  Dry Run: ${options.dryRun}`);
  console.log(`  Output JSON: ${options.outputJson}`);
  console.log(`  Sample Size: ${options.sample || 'all'}`);
  console.log(`  Verbose: ${options.verbose}`);
  console.log('');

  try {
    // Determine input file
    const inputFile = options.inputFile ||
      path.join(__dirname, '..', '..', 'backups', 'brolay-backup-latest.json');

    // Load backup
    const backup = loadBackup(inputFile);

    // Get brolays to process
    let brolays = backup.data;
    if (options.sample && options.sample > 0) {
      brolays = brolays.slice(0, options.sample);
      console.log(`Processing sample of ${brolays.length} brolays`);
      console.log('');
    }

    // Transform all brolays
    const { transformed, errors: transformErrors } = transformAll(brolays, options);

    if (transformErrors.length > 0) {
      console.log('');
      console.log('Transformation Errors:');
      transformErrors.forEach(err => {
        console.log(`  - ${err.brolayId}: ${err.error}`);
      });
    }

    // Validate transformed data
    console.log('');
    console.log('Validating transformed data...');
    const validationReport = validateAll(transformed);
    printReport(validationReport);

    // Generate and print statistics
    const stats = generateStats(brolays, transformed);
    printStats(stats);

    // Write output if requested
    if (options.outputJson && !options.dryRun) {
      const outputPath = path.join(__dirname, '..', '..', 'backups', 'migrated-data.json');
      writeOutput(transformed, outputPath, backup.metadata);
    }

    // Summary
    console.log('');
    console.log('='.repeat(60));
    console.log('MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log('');
    console.log(`Brolays processed: ${brolays.length}`);
    console.log(`Successfully transformed: ${transformed.length}`);
    console.log(`Transform errors: ${transformErrors.length}`);
    console.log(`Validation passed: ${validationReport.validationPassed ? 'YES' : 'NO'}`);
    console.log(`Validation errors: ${validationReport.totalErrors}`);
    console.log(`Validation warnings: ${validationReport.totalWarnings}`);
    console.log('');

    if (options.dryRun) {
      console.log('This was a DRY RUN. No data was written.');
      console.log('To output transformed data, run with --output-json');
    }

    console.log('');
    console.log('='.repeat(60));

    // Exit with appropriate code
    if (transformErrors.length > 0 || !validationReport.validationPassed) {
      process.exit(1);
    }
    process.exit(0);

  } catch (err) {
    console.error('');
    console.error('FATAL ERROR:', err.message);
    console.error('');
    console.error(err.stack);
    process.exit(1);
  }
}

// Run migration
main();
