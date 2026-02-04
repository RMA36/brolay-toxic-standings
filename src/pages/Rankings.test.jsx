import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen, userEvent } from '../test/test-utils';
import Rankings from './Rankings';

/**
 * Rankings Page Tests
 *
 * Note: These tests verify the Rankings page renders correctly.
 * The complex calculation logic (streaks, combos, etc.) is tested
 * through integration tests with real data in production.
 */
describe('Rankings Page', () => {
  describe('Rendering', () => {
    it('should render the Rankings page title', () => {
      renderWithProviders(<Rankings />);
      expect(screen.getByText(/Rankings & Records/i)).toBeInTheDocument();
    });

    it('should render all ranking sections', () => {
      renderWithProviders(<Rankings />);

      // Check for main sections
      expect(screen.getByText(/Sole Survivors/i)).toBeInTheDocument();
      expect(screen.getByText(/Current Hot Streak/i)).toBeInTheDocument();
      expect(screen.getByText(/Current Cold Streak/i)).toBeInTheDocument();
      expect(screen.getByText(/Top 5 Hot Streaks/i)).toBeInTheDocument();
      expect(screen.getByText(/Top 5 Cold Streaks/i)).toBeInTheDocument();
      expect(screen.getByText(/Top 5 Player\/Sport Combos/i)).toBeInTheDocument();
      expect(screen.getByText(/Most Picked Teams/i)).toBeInTheDocument();
    });
  });

  describe('RankingsFilter Integration', () => {
    it('should render the RankingsFilter component', () => {
      renderWithProviders(<Rankings />);

      // Filter component should be present
      expect(screen.getByRole('button', { name: /Filters/i })).toBeInTheDocument();
    });

    it('should show filter controls when expanded', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Rankings />);

      const filterButton = screen.getByRole('button', { name: /Filters/i });
      await user.click(filterButton);

      // Should show filter controls
      expect(screen.getByLabelText(/Date From/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Date To/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Min Sample Size/i)).toBeInTheDocument();
    });

    it('should show date range preset buttons when expanded', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Rankings />);

      const filterButton = screen.getByRole('button', { name: /Filters/i });
      await user.click(filterButton);

      // Check for date range buttons - there might be multiple from different components
      const last7DaysButtons = screen.getAllByText(/Last 7 Days/i);
      const last30DaysButtons = screen.getAllByText(/Last 30 Days/i);
      const thisYearButtons = screen.getAllByText(/This Year/i);
      const allTimeButtons = screen.getAllByText(/All Time/i);

      expect(last7DaysButtons.length).toBeGreaterThan(0);
      expect(last30DaysButtons.length).toBeGreaterThan(0);
      expect(thisYearButtons.length).toBeGreaterThan(0);
      expect(allTimeButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Empty State', () => {
    it('should show "Not enough data yet" messages when no data meets criteria', () => {
      renderWithProviders(<Rankings />);

      // With no brolays, should show empty state messages
      const notEnoughDataMessages = screen.getAllByText(/Not enough data yet/i);
      expect(notEnoughDataMessages.length).toBeGreaterThan(0);
    });

    it('should show "No active hot streaks" when no hot streaks exist', () => {
      renderWithProviders(<Rankings />);

      expect(screen.getByText(/No active hot streaks/i)).toBeInTheDocument();
    });

    it('should show "No active cold streaks" when no cold streaks exist', () => {
      renderWithProviders(<Rankings />);

      expect(screen.getByText(/No active cold streaks/i)).toBeInTheDocument();
    });
  });

  describe('Minimum Sample Size Display', () => {
    it('should show default minimum sample size of 10 in subtitle', () => {
      renderWithProviders(<Rankings />);

      // Should show "Minimum 10 picks" in player/sport combo cards
      const minText = screen.getAllByText(/Minimum 10 picks/i);
      expect(minText.length).toBeGreaterThan(0);
    });
  });
});
