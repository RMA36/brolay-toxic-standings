# Testing Quick Start - Brolay Toxic Standings

**Last Updated**: January 29, 2026

---

## IMPORTANT: Directory Location

⚠️ **Always run tests from the correct directory:**

```bash
cd "C:\Users\ander\OneDrive\Documents\Claude Code\brolay-toxic-standings"
```

**NOT** from `C:\Users\ander\brolay-toxic-standings` (old location)

---

## Running Tests

### Quick Commands

```bash
# Run all tests once (recommended)
npm test

# Run tests in watch mode (for active development)
npm run test:watch

# Run tests with visual UI
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

### What These Commands Actually Do

Behind the scenes:
- `npm test` → `vitest run --pool=forks --poolOptions.forks.singleFork`
- `npm run test:watch` → `vitest`
- `npm run test:ui` → `vitest --ui`
- `npm run test:coverage` → `vitest run --coverage --pool=forks --poolOptions.forks.singleFork`

The `--pool=forks --poolOptions.forks.singleFork` flags are needed because the project is in OneDrive, which can cause sync conflicts with the default thread pool.

---

## Current Test Status

✅ **77 tests passing** across 3 test files:
- `src/utils/formatters.test.js` - 46 tests
- `src/components/common/Button.test.jsx` - 21 tests
- `src/components/dashboard/StatCard.test.jsx` - 10 tests

---

## For Claude Code: How to Run Tests

When I (Claude) need to run tests, here's the exact process:

### Step 1: Navigate to Correct Directory
```bash
cd brolay-toxic-standings
pwd  # Should show: /c/Users/ander/OneDrive/Documents/Claude Code/brolay-toxic-standings
```

### Step 2: Run Tests via Bash
```bash
# I cannot run npm directly, but I can verify files and guide the user
ls src/**/*.test.{js,jsx}  # Verify test files exist
cat package.json | grep -A 5 "scripts"  # Verify test scripts
```

### Step 3: Instruct User
Tell the user to run in PowerShell:
```
Please run the following command in PowerShell from the correct directory:

cd "C:\Users\ander\OneDrive\Documents\Claude Code\brolay-toxic-standings"
npm test
```

### What NOT to Do
❌ Don't try to run `npm test` via Bash (npm not available)
❌ Don't use `npx vitest` directly (can cause timeout issues)
❌ Don't run from `C:\Users\ander\brolay-toxic-standings` (wrong directory)

---

## Troubleshooting

### Issue: "Missing script: test"
**Solution**: You're in the wrong directory. Navigate to:
```bash
cd "C:\Users\ander\OneDrive\Documents\Claude Code\brolay-toxic-standings"
```

### Issue: "No test files found"
**Cause**: Config file not being read or wrong directory
**Solution**:
1. Verify you're in the correct directory
2. Check that `vite.config.js` has the test configuration
3. Verify test files exist: `ls src/**/*.test.*`

### Issue: Timeout errors / "Unhandled Errors"
**Cause**: OneDrive sync conflicts with watch mode
**Solution**: Use the run-once command instead of watch mode:
```bash
npm test  # (uses --pool=forks flag automatically)
```

### Issue: OneDrive sync errors
**Solutions**:
1. Pause OneDrive sync temporarily (right-click OneDrive icon → Pause syncing)
2. Wait a few seconds after saving files before running tests
3. Use the `.onedriveignore` file (already created)

---

## Adding New Tests

### 1. Create Test File
Place test files next to the code they test:
```
src/
├── utils/
│   ├── myUtil.js
│   └── myUtil.test.js       ← Test file here
├── components/
│   └── MyComponent.jsx
│       └── MyComponent.test.jsx  ← Test file here
```

### 2. Use Test Utilities
```javascript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMockBrolay } from '../../test/mock-data';

describe('MyComponent', () => {
  it('should render', () => {
    const brolay = createMockBrolay();
    render(<MyComponent brolay={brolay} />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

### 3. Run Tests
```bash
npm test
```

---

## Test File Patterns

Vitest looks for files matching:
- `src/**/*.test.js`
- `src/**/*.test.jsx`
- `src/**/*.spec.js`
- `src/**/*.spec.jsx`

---

## Coverage Report

To see which code is covered by tests:

```bash
npm run test:coverage
```

This generates:
- Console output with coverage summary
- HTML report in `coverage/` folder

To view HTML report:
```bash
# Open in browser
start coverage/index.html
```

---

## Quick Reference

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `npm test` | Run all tests once | Before commits, CI/CD |
| `npm run test:watch` | Watch mode | Active development |
| `npm run test:ui` | Visual UI | Debugging tests |
| `npm run test:coverage` | Coverage report | Check test coverage |

---

## Integration with Development Workflow

### Before Committing
```bash
npm test
npm run build  # Ensure build still works
```

### After Making Changes
```bash
# Run only affected tests (watch mode will detect changes)
npm run test:watch

# Or run all tests once
npm test
```

### Before Deploying
```bash
npm run test:coverage
npm run build
```

---

## Files Created for Testing

```
brolay-toxic-standings/
├── vite.config.js              # Test configuration (in test: {} block)
├── package.json                # Test scripts
├── .onedriveignore            # Prevents OneDrive sync issues
├── src/
│   ├── test/
│   │   ├── setup.js           # Global test setup
│   │   ├── test-utils.jsx     # Custom render helpers
│   │   └── mock-data.js       # Mock data factories
│   ├── utils/
│   │   └── formatters.test.js  # Example utility tests
│   └── components/
│       ├── common/
│       │   └── Button.test.jsx # Example component tests
│       └── dashboard/
│           └── StatCard.test.jsx
└── TESTING_GUIDE.md            # Comprehensive testing guide
```

---

## Key Learnings from Setup

1. **OneDrive causes sync issues** - That's why we use `--pool=forks` flag
2. **Directory matters** - Must be in the OneDrive location, not the old `C:\Users\ander\brolay-toxic-standings`
3. **npm vs npx** - `npm test` works better than `npx vitest` due to OneDrive
4. **Config location** - Test config is in `vite.config.js` (not separate `vitest.config.js`)

---

**Last Test Run**: January 29, 2026
**Status**: ✅ 77 tests passing
**Coverage**: ~6% (utilities and basic components covered)
