import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '../../test/test-utils';
import AdvancedStats from './AdvancedStats';

/**
 * AdvancedStats Component Tests
 *
 * Tests for the advanced statistics component showing:
 * - Win rate trends over time (interactive chart)
 * - Head-to-head player comparison
 * - Performance by day of week
 */
describe('AdvancedStats Component', () => {
  describe('Rendering', () => {
    it('should render the component title', () => {
      renderWithProviders(<AdvancedStats />);
      expect(screen.getByText(/Advanced Statistics/i)).toBeInTheDocument();
    });

    it('should render all stat sections', () => {
      renderWithProviders(<AdvancedStats />);

      expect(screen.getByText(/Win Rate Trends/i)).toBeInTheDocument();
      expect(screen.getByText(/Head-to-Head Comparison/i)).toBeInTheDocument();
      expect(screen.getByText(/Performance by Day/i)).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show "Not enough data" when no parlays exist', () => {
      renderWithProviders(<AdvancedStats />);

      const notEnoughDataMessages = screen.getAllByText(/Not enough data/i);
      expect(notEnoughDataMessages.length).toBeGreaterThan(0);
    });
  });

  describe('Win Rate Trends', () => {
    it('should render win rate trends section', () => {
      renderWithProviders(<AdvancedStats />);
      expect(screen.getByText(/Win Rate Trends/i)).toBeInTheDocument();
    });

    it('should show subtitle describing the metric', () => {
      renderWithProviders(<AdvancedStats />);
      expect(screen.getByText(/Interactive performance trends over time/i)).toBeInTheDocument();
    });
  });

  describe('Head-to-Head Comparison', () => {
    it('should render head-to-head section', () => {
      renderWithProviders(<AdvancedStats />);
      expect(screen.getByText(/Head-to-Head Comparison/i)).toBeInTheDocument();
    });

    it('should show subtitle describing the comparison', () => {
      renderWithProviders(<AdvancedStats />);
      expect(screen.getByText(/Compare two players side by side/i)).toBeInTheDocument();
    });
  });

  describe('Performance by Day', () => {
    it('should render performance by day section', () => {
      renderWithProviders(<AdvancedStats />);
      expect(screen.getByText(/Performance by Day/i)).toBeInTheDocument();
    });

    it('should show subtitle describing the metric', () => {
      renderWithProviders(<AdvancedStats />);
      expect(screen.getByText(/Win rate by day of the week/i)).toBeInTheDocument();
    });
  });
});
