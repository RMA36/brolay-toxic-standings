# Brolay Toxic Standings - Testing Guide

**Last Updated**: January 29, 2026
**Track 4**: Testing Infrastructure

---

## Overview

This guide explains the testing setup and best practices for the Brolay Toxic Standings application. We use **Vitest** as our testing framework, chosen for its excellent Vite integration and performance.

---

## Quick Start

### Installation

All testing dependencies should already be installed. If starting fresh:

```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event vitest jsdom @vitest/ui
```

### Running Tests

```bash
# Run all tests (watch mode)
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage report
npm run test:coverage

# Run tests once (CI mode)
npx vitest run
```

---

## Testing Architecture

### Why Vitest?

- **Native Vite integration**: No complex configuration needed
- **Fast**: Instant hot module reload for tests
- **Jest-compatible API**: Easy migration path if needed
- **ESM support**: Works seamlessly with modern JavaScript
- **Better DX**: Excellent error messages and UI

### Test Structure

```
src/
├── test/
│   ├── setup.js              # Global test setup
│   ├── test-utils.jsx        # Custom render helpers
│   └── mock-data.js          # Mock data factories
├── utils/
│   └── formatters.test.js    # Unit tests for utilities
└── components/
    └── common/
        ├── Button.jsx
        └── Button.test.jsx   # Component tests
```

---

## Configuration Files

### vitest.config.js

The main Vitest configuration file:
- Uses `jsdom` environment for DOM testing
- Runs `src/test/setup.js` before each test file
- Configures coverage reporting
- Sets up path aliases

### src/test/setup.js

Global test setup that:
- Imports `@testing-library/jest-dom` matchers
- Cleans up after each test
- Mocks `window.matchMedia` for responsive components
- Mocks `IntersectionObserver` for lazy loading

---

## Writing Tests

### Unit Tests (Utilities)

Test pure functions in isolation:

```javascript
// src/utils/formatters.test.js
import { describe, it, expect } from 'vitest';
import { formatDateForDisplay } from './formatters';

describe('formatDateForDisplay', () => {
  it('should format yyyy-mm-dd to mm/dd/yyyy', () => {
    expect(formatDateForDisplay('2026-01-28')).toBe('01/28/2026');
  });

  it('should handle empty string', () => {
    expect(formatDateForDisplay('')).toBe('');
  });
});
```

**Best Practices**:
- Test the happy path first
- Test edge cases (null, undefined, empty strings)
- Test error conditions
- Use descriptive test names

### Component Tests

Test component rendering and interactions:

```javascript
// src/components/common/Button.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from './Button';

describe('Button Component', () => {
  it('should render children text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should call onClick handler when clicked', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Click me</Button>);

    await user.click(screen.getByText('Click me'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

**Best Practices**:
- Use `screen.getByRole()` for accessibility
- Test user interactions with `@testing-library/user-event`
- Test what users see, not implementation details
- Mock external dependencies

### Testing Components with Context

Use the custom `renderWithProviders` helper:

```javascript
import { renderWithProviders } from '../../test/test-utils';
import MyComponent from './MyComponent';

it('should render with context', () => {
  renderWithProviders(<MyComponent />);
  expect(screen.getByText('Expected Text')).toBeInTheDocument();
});
```

Options:
- `withRouter: true/false` - Wrap with BrowserRouter
- `withProviders: true/false` - Wrap with Context providers
- `providerProps: {}` - Props to pass to BrolayProvider

---

## Mock Data

The `src/test/mock-data.js` file provides factories for creating test data:

```javascript
import {
  createMockBrolay,
  createMockPick,
  createMockBrolayOldSchema
} from '../../test/mock-data';

// Create a mock brolay (new schema)
const brolay = createMockBrolay();

// Create with overrides
const settledBrolay = createMockBrolay({
  settled: true,
  totalPayout: 250
});

// Create old schema for dual-schema testing
const oldBrolay = createMockBrolayOldSchema();
```

**Available Factories**:
- `createMockBrolay(overrides)` - New schema brolay
- `createMockBrolayOldSchema(overrides)` - Old schema brolay
- `createMockPick(overrides)` - New schema pick
- `createMockPickOldSchema(overrides)` - Old schema pick
- `createMockPlayerPropPick(overrides)` - Player prop pick
- `createMockSettledBrolay(isWin, overrides)` - Settled brolay
- `createMockBrolays(count)` - Multiple brolays
- `createMockESPNGameResult(overrides)` - ESPN API response

---

## Testing Patterns

### Testing Dual-Schema Code

Many utilities support both old and new schemas. Test both:

```javascript
describe('getPickBigGuy', () => {
  it('should return bigGuy from new schema', () => {
    const pick = createMockPick({ bigGuy: 'Management' });
    expect(getPickBigGuy(pick)).toBe('Management');
  });

  it('should return player from old schema', () => {
    const pick = createMockPickOldSchema({ player: 'Labor' });
    expect(getPickBigGuy(pick)).toBe('Labor');
  });
});
```

### Testing User Interactions

Always use `userEvent` over `fireEvent`:

```javascript
import userEvent from '@testing-library/user-event';

it('should handle form submission', async () => {
  const user = userEvent.setup();
  const handleSubmit = vi.fn();

  render(<Form onSubmit={handleSubmit} />);

  await user.type(screen.getByLabelText('Name'), 'John Doe');
  await user.click(screen.getByRole('button', { name: 'Submit' }));

  expect(handleSubmit).toHaveBeenCalled();
});
```

### Testing Async Code

Use `waitFor` for async operations:

```javascript
import { waitFor } from '@testing-library/react';

it('should load data asynchronously', async () => {
  render(<DataComponent />);

  expect(screen.getByText('Loading...')).toBeInTheDocument();

  await waitFor(() => {
    expect(screen.getByText('Data loaded')).toBeInTheDocument();
  });
});
```

### Mocking Functions

Use Vitest's `vi.fn()` for mocks:

```javascript
import { vi } from 'vitest';

it('should call callback', () => {
  const mockCallback = vi.fn();

  render(<Component onComplete={mockCallback} />);

  // Trigger callback
  fireEvent.click(screen.getByText('Complete'));

  expect(mockCallback).toHaveBeenCalledTimes(1);
  expect(mockCallback).toHaveBeenCalledWith({ status: 'done' });
});
```

---

## Test Coverage

### Viewing Coverage

```bash
npm run test:coverage
```

This generates:
- **Terminal report**: Summary of coverage
- **HTML report**: Detailed report in `coverage/` folder

### Coverage Goals

| Type | Goal |
|------|------|
| Utilities | 90%+ |
| Components | 80%+ |
| Hooks | 75%+ |
| Overall | 80%+ |

### What to Focus On

**High Priority**:
- Dual-schema helper functions (formatters.js)
- Critical business logic (calculations, stats)
- User-facing components (forms, buttons, cards)
- Data transformation functions

**Lower Priority**:
- Styling utilities
- Simple presentational components
- Third-party integrations (Firebase, ESPN API)

---

## Testing Firebase & External APIs

### Mocking Firebase

For components that use Firebase:

```javascript
import { vi } from 'vitest';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
  addDoc: vi.fn(),
  // ... other functions
}));
```

### Mocking Custom Hooks

For components using `useBrolays`, `useESPN`, etc:

```javascript
vi.mock('../../hooks/useBrolays', () => ({
  useBrolays: () => ({
    parlays: mockParlays,
    createBrolay: vi.fn(),
    updateBrolay: vi.fn(),
    deleteBrolay: vi.fn(),
  })
}));
```

---

## Common Testing Scenarios

### Testing Forms

```javascript
it('should validate required fields', async () => {
  const user = userEvent.setup();
  render(<BrolayForm />);

  // Try to submit without filling fields
  await user.click(screen.getByRole('button', { name: 'Submit' }));

  // Should show validation errors
  expect(screen.getByText('This field is required')).toBeInTheDocument();
});
```

### Testing Navigation

```javascript
import { renderWithRouter } from '../../test/test-utils';

it('should navigate to detail page', async () => {
  const user = userEvent.setup();
  renderWithRouter(<BrolayList />);

  await user.click(screen.getByText('View Details'));

  // Check URL or rendered content
  expect(screen.getByText('Brolay Details')).toBeInTheDocument();
});
```

### Testing Conditional Rendering

```javascript
it('should show different content based on props', () => {
  const { rerender } = render(<StatusBadge status="pending" />);
  expect(screen.getByText('Pending')).toBeInTheDocument();

  rerender(<StatusBadge status="win" />);
  expect(screen.getByText('Win')).toBeInTheDocument();
});
```

---

## Debugging Tests

### Using test.only

Run a single test:

```javascript
it.only('should test this specific case', () => {
  // Only this test will run
});
```

### Using screen.debug()

Print the current DOM:

```javascript
render(<MyComponent />);
screen.debug(); // Prints entire DOM
screen.debug(screen.getByRole('button')); // Prints specific element
```

### Using Vitest UI

The UI provides better debugging:

```bash
npm run test:ui
```

Features:
- Visual test runner
- Filter tests
- See console logs
- Inspect component renders

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test -- --run
      - run: npm run test:coverage
```

---

## Best Practices Summary

1. **Test behavior, not implementation**
   - Test what users see and do
   - Don't test internal state or methods

2. **Use semantic queries**
   - Prefer `getByRole`, `getByLabelText`
   - Avoid `getByTestId` unless necessary

3. **Keep tests simple**
   - One assertion per test is ideal
   - Name tests clearly

4. **Use factories for test data**
   - Don't copy-paste mock data
   - Use the mock-data.js factories

5. **Mock external dependencies**
   - Firebase, APIs, localStorage
   - Keep unit tests isolated

6. **Test edge cases**
   - Null, undefined, empty arrays
   - Error states
   - Loading states

7. **Keep tests fast**
   - Avoid unnecessary renders
   - Mock expensive operations
   - Run only affected tests during development

---

## Next Steps

### Phase 4.1: Test Infrastructure ✅ COMPLETE
- ✅ Set up Vitest and React Testing Library
- ✅ Add unit tests for utils
- ✅ Add component tests for critical components

### Phase 4.2: Expand Test Coverage (Future)
- [ ] Add tests for custom hooks
- [ ] Add integration tests for user flows
- [ ] Add tests for context providers
- [ ] Set up visual regression testing (optional)

### Phase 4.3: Code Quality Tools (Future)
- [ ] Set up ESLint with React rules
- [ ] Add Prettier for code formatting
- [ ] Add pre-commit hooks with Husky
- [ ] Set up GitHub Actions for CI/CD

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Vitest UI](https://vitest.dev/guide/ui.html)

---

**Track 4 Status**: Phase 4.1 Complete
**Last Updated**: January 29, 2026
**Next Priority**: Expand test coverage for hooks and integration tests
