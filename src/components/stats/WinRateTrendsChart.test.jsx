import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen, userEvent } from '../../test/test-utils';
import WinRateTrendsChart from './WinRateTrendsChart';

/**
 * WinRateTrendsChart Component Tests
 *
 * Tests for the interactive win rate trends line chart:
 * - Rendering with empty/mock data
 * - Time period selector functionality
 * - Granularity selector functionality
 * - Chart display and controls
 */
describe('WinRateTrendsChart Component', () => {
  describe('Rendering', () => {
    it('should render the component title', () => {
      renderWithProviders(<WinRateTrendsChart />);
      expect(screen.getByText(/Win Rate Trends/i)).toBeInTheDocument();
    });

    it('should render the subtitle', () => {
      renderWithProviders(<WinRateTrendsChart />);
      expect(screen.getByText(/Interactive performance trends over time/i)).toBeInTheDocument();
    });

    it('should show empty state when no data is provided', () => {
      renderWithProviders(<WinRateTrendsChart filteredParlays={[]} />);
      expect(screen.getByText(/Not enough data for the selected period/i)).toBeInTheDocument();
    });
  });

  describe('Time Period Selector', () => {
    it('should render all time period buttons', () => {
      renderWithProviders(<WinRateTrendsChart />);

      expect(screen.getByText('Last 7 Days')).toBeInTheDocument();
      expect(screen.getByText('Last 30 Days')).toBeInTheDocument();
      expect(screen.getByText('Last 90 Days')).toBeInTheDocument();
      expect(screen.getByText('This Year')).toBeInTheDocument();
      expect(screen.getByText('All Time')).toBeInTheDocument();
    });

    it('should start with "All Time" selected by default', () => {
      renderWithProviders(<WinRateTrendsChart />);

      const allTimeButton = screen.getByText('All Time').closest('button');
      expect(allTimeButton).toHaveClass('bg-yellow-500');
    });

    it('should change selection when time period button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<WinRateTrendsChart />);

      const last30Button = screen.getByText('Last 30 Days').closest('button');
      await user.click(last30Button);

      expect(last30Button).toHaveClass('bg-yellow-500');
    });
  });

  describe('Granularity Selector', () => {
    it('should render all granularity buttons', () => {
      renderWithProviders(<WinRateTrendsChart />);

      expect(screen.getByText('Week')).toBeInTheDocument();
      expect(screen.getByText('Month')).toBeInTheDocument();
      expect(screen.getByText('Quarter')).toBeInTheDocument();
      expect(screen.getByText('Year')).toBeInTheDocument();
    });

    it('should start with "Month" selected by default', () => {
      renderWithProviders(<WinRateTrendsChart />);

      const monthButton = screen.getByText('Month').closest('button');
      expect(monthButton).toHaveClass('bg-yellow-500');
    });

    it('should change selection when granularity button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<WinRateTrendsChart />);

      const weekButton = screen.getByText('Week').closest('button');
      await user.click(weekButton);

      expect(weekButton).toHaveClass('bg-yellow-500');
    });
  });

  describe('Chart with Mock Data', () => {
    const mockParlays = [
      {
        id: '1',
        date: '2026-01-15',
        picks: [
          { bigGuy: 'Management', result: 'win', sport: 'NFL' },
          { bigGuy: 'Labor', result: 'loss', sport: 'NBA' }
        ]
      },
      {
        id: '2',
        date: '2026-02-01',
        picks: [
          { bigGuy: 'Management', result: 'loss', sport: 'NHL' },
          { bigGuy: 'Operations', result: 'win', sport: 'MLB' }
        ]
      }
    ];

    it('should render without crashing with data', () => {
      renderWithProviders(<WinRateTrendsChart filteredParlays={mockParlays} />);

      // Component should render (check for one of the control elements)
      expect(screen.getByText('Time Period')).toBeInTheDocument();
    });

    it('should not show empty state when data exists', () => {
      renderWithProviders(<WinRateTrendsChart filteredParlays={mockParlays} />);

      expect(screen.queryByText(/Not enough data for the selected period/i)).not.toBeInTheDocument();
    });
  });

  describe('Labels', () => {
    it('should show Time Period label', () => {
      renderWithProviders(<WinRateTrendsChart />);
      expect(screen.getByText('Time Period')).toBeInTheDocument();
    });

    it('should show Granularity label', () => {
      renderWithProviders(<WinRateTrendsChart />);
      expect(screen.getByText('Granularity')).toBeInTheDocument();
    });
  });
});
