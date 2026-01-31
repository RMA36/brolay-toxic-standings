# Track 4: Testing Infrastructure - Quick Start

**Last Updated**: January 29, 2026

---

## Installation

Since npm is not available in the Claude Code environment, you'll need to run this command in your terminal:

```bash
cd brolay-toxic-standings
npm install
```

This will install the testing dependencies that were added to `package.json`:
- `vitest` - Testing framework
- `@testing-library/react` - React component testing
- `@testing-library/jest-dom` - DOM matchers
- `@testing-library/user-event` - User interaction simulation
- `jsdom` - DOM environment
- `@vitest/ui` - Visual test runner

---

## Running Tests

### Watch Mode (Development)

```bash
npm test
```

This runs tests in watch mode and re-runs them when files change. Perfect for development!

### UI Mode (Visual Test Runner)

```bash
npm run test:ui
```

This opens a browser-based UI where you can:
- See all tests visually
- Filter and run specific tests
- View console logs
- Debug tests interactively

### Coverage Report

```bash
npm run test:coverage
```

This generates a coverage report showing which code is tested:
- Terminal summary
- HTML report in `coverage/` folder (open `coverage/index.html` in browser)

### Run Once (CI Mode)

```bash
npx vitest run
```

Runs all tests once and exits. Used for CI/CD pipelines.

---

## What's Been Set Up

### Configuration Files

✅ **vitest.config.js** - Main Vitest configuration
- jsdom environment for DOM testing
- Coverage settings
- Test file patterns
- Path aliases

✅ **src/test/setup.js** - Global test setup
- Cleanup after each test
- Mocks for `window.matchMedia`
- Mocks for `IntersectionObserver`

### Test Utilities

✅ **src/test/test-utils.jsx** - Custom render helpers
- `renderWithProviders()` - Renders with Context + Router
- `renderWithRouter()` - Renders with Router only

✅ **src/test/mock-data.js** - Mock data factories
- `createMockBrolay()` - New schema brolay
- `createMockPick()` - New schema pick
- `createMockBrolayOldSchema()` - Old schema brolay
- `createMockPickOldSchema()` - Old schema pick
- Many more helpers for testing

### Existing Tests

✅ **src/utils/formatters.test.js** - 90+ test cases
- Date formatting functions
- Dual-schema helper functions
- Normalization functions

✅ **src/components/dashboard/StatCard.test.jsx** - 11 test cases
- Rendering, props, variants

✅ **src/components/common/Button.test.jsx** - 20+ test cases
- Variants, sizes, interactions, accessibility

---

## Current Coverage

| Category | Files Tested | Status |
|----------|--------------|--------|
| Utilities | 1/10+ | 🟡 Started |
| Components | 2/28+ | 🟡 Started |
| Hooks | 0/5 | 🔴 Not Started |
| Pages | 0/10 | 🔴 Not Started |

**Total Test Cases**: 120+
**Overall Coverage**: ~6%

---

## Next Steps

### High Priority

1. **Add more utility tests**
   - `src/utils/actionHandlers.js`
   - `src/insightsHelper.js`

2. **Add component tests**
   - `Card.jsx`
   - `LoadingSpinner.jsx`
   - `FilterBar.jsx`

3. **Add hook tests**
   - `useStats.js` (critical business logic)
   - `useBrolays.js` (CRUD operations)

### Medium Priority

4. **Integration tests**
   - Create brolay flow
   - Filter and search flow
   - Auto-update flow

5. **Page tests**
   - Entry page form validation
   - Rankings page calculations
   - Dashboard rendering

---

## Documentation

📖 **TESTING_GUIDE.md** - Comprehensive testing guide
- Testing patterns and best practices
- How to write tests
- Mock data usage
- Examples for every scenario

📖 **TRACK_4_SESSION_HANDOFF.md** - Session handoff document
- What was accomplished
- Current status
- Detailed breakdown of changes

---

## Quick Reference

### Import Test Utilities

```javascript
// Import Vitest functions
import { describe, it, expect, vi } from 'vitest';

// Import React Testing Library
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Import custom utilities
import { renderWithProviders } from '../../test/test-utils';
import { createMockBrolay } from '../../test/mock-data';
```

### Basic Component Test

```javascript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('should render text', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### Test with User Interaction

```javascript
import userEvent from '@testing-library/user-event';

it('should handle click', async () => {
  const user = userEvent.setup();
  const handleClick = vi.fn();

  render(<Button onClick={handleClick}>Click me</Button>);

  await user.click(screen.getByText('Click me'));

  expect(handleClick).toHaveBeenCalled();
});
```

### Test with Mock Data

```javascript
import { createMockBrolay } from '../../test/mock-data';

it('should display brolay', () => {
  const brolay = createMockBrolay({ settled: true });

  render(<BrolayCard brolay={brolay} />);

  expect(screen.getByText('Settled')).toBeInTheDocument();
});
```

---

## Troubleshooting

### Tests not running?

1. Make sure you ran `npm install`
2. Check that you're in the `brolay-toxic-standings` directory
3. Try `npm test -- --run` to run once instead of watch mode

### Import errors?

Make sure test files use the correct import paths:
- Use `../../test/test-utils` not `../test/test-utils`
- Check that all imports match file locations

### Coverage not working?

Install the v8 coverage provider:
```bash
npm install --save-dev @vitest/coverage-v8
```

---

**Status**: ✅ Phase 4.1 Complete - Infrastructure Ready
**Next**: Expand test coverage for better code quality
