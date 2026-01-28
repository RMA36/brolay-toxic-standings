/**
 * Validator - Validates transformed data before migration
 *
 * Ensures all transformed brolays and picks meet the new schema requirements.
 * Critical for catching data issues before they reach production.
 */

/**
 * Valid Big Guy names
 */
const VALID_BIG_GUYS = ['Management', 'CD', '914', 'Junior', 'Jacoby'];

/**
 * Valid submittedBy values (includes Big Guys plus special cases)
 */
const VALID_SUBMITTED_BY = [...VALID_BIG_GUYS, 'All'];

/**
 * Valid bet categories
 */
const VALID_BET_CATEGORIES = [
  'standard',
  'playerProp',
  'h2hProp',
  'combinedProp',
  'eitherProp',
  'teamTotal',
  'firstHalf',
  'firstHalfTeamTotal',
  'quarter',
  'quarterTeamTotal',
  'firstInningRuns',
  'teamProp',
  'gameProp',
  'unknown'
];

/**
 * Valid outcome statuses
 */
const VALID_STATUSES = ['win', 'loss', 'push', 'pending'];

/**
 * Valid entity types
 */
const VALID_ENTITY_TYPES = ['team', 'player'];

/**
 * Valid entity roles
 */
const VALID_ENTITY_ROLES = ['primary', 'secondary', 'opponent', 'home', 'away'];

/**
 * Validate a single pick
 *
 * @param {Object} pick - The transformed pick
 * @param {string} pickId - The pick ID
 * @returns {Object} { valid: boolean, errors: string[], warnings: string[] }
 */
function validatePick(pick, pickId) {
  const errors = [];
  const warnings = [];

  // Required fields
  if (!pick.bigGuy) {
    errors.push(`[${pickId}] Missing bigGuy field`);
  } else if (!VALID_BIG_GUYS.includes(pick.bigGuy)) {
    errors.push(`[${pickId}] Invalid bigGuy: "${pick.bigGuy}". Expected one of: ${VALID_BIG_GUYS.join(', ')}`);
  }

  if (!pick.sport) {
    errors.push(`[${pickId}] Missing sport field`);
  }

  if (!pick.betType) {
    errors.push(`[${pickId}] Missing betType field`);
  }

  if (!pick.betCategory) {
    warnings.push(`[${pickId}] Missing betCategory field`);
  } else if (!VALID_BET_CATEGORIES.includes(pick.betCategory)) {
    warnings.push(`[${pickId}] Unknown betCategory: "${pick.betCategory}"`);
  }

  // Validate game object
  if (!pick.game) {
    warnings.push(`[${pickId}] Missing game object`);
  } else {
    if (!pick.game.date) {
      warnings.push(`[${pickId}] Missing game.date`);
    }
    if (!pick.game.league) {
      warnings.push(`[${pickId}] Missing game.league`);
    }
  }

  // Validate entities array
  if (!pick.entities) {
    errors.push(`[${pickId}] Missing entities array`);
  } else if (!Array.isArray(pick.entities)) {
    errors.push(`[${pickId}] entities is not an array`);
  } else if (pick.entities.length === 0) {
    warnings.push(`[${pickId}] entities array is empty`);
  } else {
    // Validate each entity
    pick.entities.forEach((entity, idx) => {
      if (!entity.entityType) {
        errors.push(`[${pickId}] Entity ${idx} missing entityType`);
      } else if (!VALID_ENTITY_TYPES.includes(entity.entityType)) {
        errors.push(`[${pickId}] Entity ${idx} invalid entityType: "${entity.entityType}"`);
      }

      if (!entity.name) {
        errors.push(`[${pickId}] Entity ${idx} missing name`);
      }

      if (!entity.role) {
        warnings.push(`[${pickId}] Entity ${idx} missing role`);
      } else if (!VALID_ENTITY_ROLES.includes(entity.role)) {
        warnings.push(`[${pickId}] Entity ${idx} unknown role: "${entity.role}"`);
      }
    });
  }

  // Validate line object
  if (!pick.line) {
    errors.push(`[${pickId}] Missing line object`);
  } else {
    if (!pick.line.type) {
      warnings.push(`[${pickId}] Missing line.type`);
    }
    // Value can be null for moneylines
    if (pick.line.value !== null && typeof pick.line.value !== 'number') {
      warnings.push(`[${pickId}] line.value should be a number or null, got: ${typeof pick.line.value}`);
    }
    // Ensure value is positive when present
    if (typeof pick.line.value === 'number' && pick.line.value < 0) {
      errors.push(`[${pickId}] line.value must be positive, got: ${pick.line.value}`);
    }
  }

  // Validate outcome object
  if (!pick.outcome) {
    errors.push(`[${pickId}] Missing outcome object`);
  } else {
    if (!pick.outcome.status) {
      errors.push(`[${pickId}] Missing outcome.status`);
    } else if (!VALID_STATUSES.includes(pick.outcome.status)) {
      errors.push(`[${pickId}] Invalid outcome.status: "${pick.outcome.status}"`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate a transformed brolay
 *
 * @param {Object} brolay - The transformed brolay
 * @returns {Object} { valid: boolean, errors: string[], warnings: string[] }
 */
function validateBrolay(brolay) {
  const errors = [];
  const warnings = [];

  // Validate brolay-level fields
  if (!brolay.id) {
    errors.push('Missing brolay id');
  }

  if (!brolay.date) {
    errors.push(`[${brolay.id}] Missing date`);
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(brolay.date)) {
    errors.push(`[${brolay.id}] Invalid date format: "${brolay.date}". Expected YYYY-MM-DD`);
  }

  // submittedBy can be empty string (some old brolays don't have it)
  if (brolay.submittedBy && !VALID_SUBMITTED_BY.includes(brolay.submittedBy)) {
    warnings.push(`[${brolay.id}] submittedBy "${brolay.submittedBy}" is not a known Big Guy`);
  }

  if (typeof brolay.betAmount !== 'number') {
    warnings.push(`[${brolay.id}] betAmount is not a number`);
  }

  if (typeof brolay.settled !== 'boolean') {
    warnings.push(`[${brolay.id}] settled is not a boolean`);
  }

  // Validate picks
  if (!brolay.picks) {
    errors.push(`[${brolay.id}] Missing picks object`);
  } else if (typeof brolay.picks !== 'object') {
    errors.push(`[${brolay.id}] picks is not an object`);
  } else {
    const pickCount = Object.keys(brolay.picks).length;

    if (pickCount === 0) {
      errors.push(`[${brolay.id}] No picks in brolay`);
    } else if (pickCount < 3) {
      warnings.push(`[${brolay.id}] Only ${pickCount} picks (minimum expected: 3)`);
    } else if (pickCount > 5) {
      warnings.push(`[${brolay.id}] ${pickCount} picks (maximum expected: 5)`);
    }

    // Validate each pick
    Object.entries(brolay.picks).forEach(([pickId, pick]) => {
      const pickResult = validatePick(pick, `${brolay.id}/${pickId}`);
      errors.push(...pickResult.errors);
      warnings.push(...pickResult.warnings);
    });

    // Check for duplicate Big Guys in picks
    const bigGuys = Object.values(brolay.picks).map(p => p.bigGuy).filter(Boolean);
    const uniqueBigGuys = new Set(bigGuys);
    if (bigGuys.length !== uniqueBigGuys.size) {
      warnings.push(`[${brolay.id}] Duplicate Big Guy in picks`);
    }
  }

  // Check totalPicks matches actual picks
  if (brolay.totalPicks !== undefined) {
    const actualCount = Object.keys(brolay.picks || {}).length;
    if (brolay.totalPicks !== actualCount) {
      warnings.push(`[${brolay.id}] totalPicks (${brolay.totalPicks}) doesn't match actual count (${actualCount})`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate all brolays and generate summary report
 *
 * @param {Array} brolays - Array of transformed brolays
 * @returns {Object} Validation report
 */
function validateAll(brolays) {
  const report = {
    totalBrolays: brolays.length,
    validBrolays: 0,
    invalidBrolays: 0,
    totalErrors: 0,
    totalWarnings: 0,
    allErrors: [],
    allWarnings: [],
    errorsByType: {},
    warningsByType: {},
    invalidBrolayIds: []
  };

  brolays.forEach(brolay => {
    const result = validateBrolay(brolay);

    if (result.valid) {
      report.validBrolays++;
    } else {
      report.invalidBrolays++;
      report.invalidBrolayIds.push(brolay.id);
    }

    report.totalErrors += result.errors.length;
    report.totalWarnings += result.warnings.length;
    report.allErrors.push(...result.errors);
    report.allWarnings.push(...result.warnings);

    // Categorize errors
    result.errors.forEach(err => {
      const type = categorizeError(err);
      report.errorsByType[type] = (report.errorsByType[type] || 0) + 1;
    });

    // Categorize warnings
    result.warnings.forEach(warn => {
      const type = categorizeError(warn);
      report.warningsByType[type] = (report.warningsByType[type] || 0) + 1;
    });
  });

  report.validationPassed = report.invalidBrolays === 0;

  return report;
}

/**
 * Categorize an error/warning message
 */
function categorizeError(message) {
  if (message.includes('bigGuy')) return 'bigGuy';
  if (message.includes('entity')) return 'entity';
  if (message.includes('line')) return 'line';
  if (message.includes('outcome')) return 'outcome';
  if (message.includes('game')) return 'game';
  if (message.includes('picks')) return 'picks';
  if (message.includes('date')) return 'date';
  return 'other';
}

/**
 * Print validation report to console
 */
function printReport(report) {
  console.log('');
  console.log('='.repeat(60));
  console.log('VALIDATION REPORT');
  console.log('='.repeat(60));
  console.log('');
  console.log(`Total Brolays: ${report.totalBrolays}`);
  console.log(`Valid: ${report.validBrolays} (${(report.validBrolays / report.totalBrolays * 100).toFixed(1)}%)`);
  console.log(`Invalid: ${report.invalidBrolays}`);
  console.log('');
  console.log(`Total Errors: ${report.totalErrors}`);
  console.log(`Total Warnings: ${report.totalWarnings}`);
  console.log('');

  if (Object.keys(report.errorsByType).length > 0) {
    console.log('Errors by Type:');
    Object.entries(report.errorsByType)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        console.log(`  - ${type}: ${count}`);
      });
    console.log('');
  }

  if (Object.keys(report.warningsByType).length > 0) {
    console.log('Warnings by Type:');
    Object.entries(report.warningsByType)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        console.log(`  - ${type}: ${count}`);
      });
    console.log('');
  }

  if (report.invalidBrolayIds.length > 0 && report.invalidBrolayIds.length <= 20) {
    console.log('Invalid Brolay IDs:');
    report.invalidBrolayIds.forEach(id => {
      console.log(`  - ${id}`);
    });
    console.log('');
  } else if (report.invalidBrolayIds.length > 20) {
    console.log(`Invalid Brolay IDs: ${report.invalidBrolayIds.length} total (too many to list)`);
    console.log('First 10:');
    report.invalidBrolayIds.slice(0, 10).forEach(id => {
      console.log(`  - ${id}`);
    });
    console.log('');
  }

  // Print first few errors as examples
  if (report.allErrors.length > 0) {
    console.log('Sample Errors (first 10):');
    report.allErrors.slice(0, 10).forEach(err => {
      console.log(`  ${err}`);
    });
    console.log('');
  }

  // Print first few warnings as examples
  if (report.allWarnings.length > 0) {
    console.log('Sample Warnings (first 20):');
    report.allWarnings.slice(0, 20).forEach(warn => {
      console.log(`  ${warn}`);
    });
    console.log('');
  }

  console.log('='.repeat(60));
  console.log(report.validationPassed ? 'VALIDATION PASSED' : 'VALIDATION FAILED');
  console.log('='.repeat(60));
}

module.exports = {
  validatePick,
  validateBrolay,
  validateAll,
  printReport,
  VALID_BIG_GUYS,
  VALID_BET_CATEGORIES,
  VALID_STATUSES,
  VALID_ENTITY_TYPES,
  VALID_ENTITY_ROLES
};
