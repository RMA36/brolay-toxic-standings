import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, fireEvent, userEvent } from '../../test/test-utils';
import RankingsFilter from './RankingsFilter';

describe('RankingsFilter Component', () => {
  const mockFilters = {
    dateFrom: '',
    dateTo: '',
    players: [],
    sports: [],
    minSampleSize: 10
  };

  const mockSetFilters = vi.fn();
  const mockOnClear = vi.fn();

  const defaultProps = {
    filters: mockFilters,
    setFilters: mockSetFilters,
    onClear: mockOnClear,
    expanded: true,
    onToggle: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render filter controls when expanded', () => {
      renderWithProviders(<RankingsFilter {...defaultProps} />);

      expect(screen.getByLabelText(/Date From/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Date To/i)).toBeInTheDocument();
      expect(screen.getByText('Players')).toBeInTheDocument();
      expect(screen.getByText('Sports')).toBeInTheDocument();
      expect(screen.getByLabelText(/Min Sample Size/i)).toBeInTheDocument();
    });

    it('should not render filter controls when collapsed', () => {
      renderWithProviders(<RankingsFilter {...defaultProps} expanded={false} />);

      expect(screen.queryByLabelText(/Date From/i)).not.toBeInTheDocument();
    });

    it('should render date range presets', () => {
      renderWithProviders(<RankingsFilter {...defaultProps} />);

      expect(screen.getByText(/Last 7 Days/i)).toBeInTheDocument();
      expect(screen.getByText(/Last 30 Days/i)).toBeInTheDocument();
      expect(screen.getByText(/This Year/i)).toBeInTheDocument();
      expect(screen.getByText(/All Time/i)).toBeInTheDocument();
    });
  });

  describe('Date Range Filtering', () => {
    it('should update dateFrom filter', async () => {
      const user = userEvent.setup();
      renderWithProviders(<RankingsFilter {...defaultProps} />);

      const dateFromInput = screen.getByLabelText(/Date From/i);
      await user.type(dateFromInput, '2026-01-01');

      expect(mockSetFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          dateFrom: '2026-01-01'
        })
      );
    });

    it('should update dateTo filter', async () => {
      const user = userEvent.setup();
      renderWithProviders(<RankingsFilter {...defaultProps} />);

      const dateToInput = screen.getByLabelText(/Date To/i);
      await user.type(dateToInput, '2026-12-31');

      expect(mockSetFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          dateTo: '2026-12-31'
        })
      );
    });

    it('should apply "Last 7 Days" preset', async () => {
      const user = userEvent.setup();
      renderWithProviders(<RankingsFilter {...defaultProps} />);

      const last7DaysButton = screen.getByText(/Last 7 Days/i);
      await user.click(last7DaysButton);

      expect(mockSetFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          dateFrom: expect.any(String),
          dateTo: expect.any(String)
        })
      );
    });

    it('should apply "This Year" preset', async () => {
      const user = userEvent.setup();
      renderWithProviders(<RankingsFilter {...defaultProps} />);

      const thisYearButton = screen.getByText(/This Year/i);
      await user.click(thisYearButton);

      expect(mockSetFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          dateFrom: '2026-01-01',
          dateTo: expect.any(String)
        })
      );
    });

    it('should clear dates when "All Time" is selected', async () => {
      const user = userEvent.setup();
      renderWithProviders(<RankingsFilter {...defaultProps} />);

      const allTimeButton = screen.getByText(/All Time/i);
      await user.click(allTimeButton);

      expect(mockSetFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          dateFrom: '',
          dateTo: ''
        })
      );
    });
  });

  describe('Player Filtering', () => {
    it('should render player checkboxes', () => {
      renderWithProviders(<RankingsFilter {...defaultProps} />);

      const playerCheckboxes = screen.getAllByRole('checkbox');
      expect(playerCheckboxes.length).toBeGreaterThan(0);
    });

    it('should toggle player selection', async () => {
      const user = userEvent.setup();
      renderWithProviders(<RankingsFilter {...defaultProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      const managementCheckbox = checkboxes.find(cb => cb.getAttribute('aria-label') === 'Management');
      await user.click(managementCheckbox);

      expect(mockSetFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          players: ['Management']
        })
      );
    });

    it('should support multiple player selections', async () => {
      const user = userEvent.setup();
      const filters = { ...mockFilters, players: ['Management'] };
      renderWithProviders(
        <RankingsFilter {...defaultProps} filters={filters} />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      const laborCheckbox = checkboxes.find(cb => cb.getAttribute('aria-label') === 'CD');
      await user.click(laborCheckbox);

      expect(mockSetFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          players: ['Management', 'CD']
        })
      );
    });

    it('should deselect a player when clicked again', async () => {
      const user = userEvent.setup();
      const filters = { ...mockFilters, players: ['Management', 'CD'] };
      renderWithProviders(
        <RankingsFilter {...defaultProps} filters={filters} />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      const managementCheckbox = checkboxes.find(cb => cb.getAttribute('aria-label') === 'Management');
      await user.click(managementCheckbox);

      expect(mockSetFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          players: ['CD']
        })
      );
    });
  });

  describe('Sport Filtering', () => {
    it('should render sport checkboxes', () => {
      renderWithProviders(<RankingsFilter {...defaultProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      const sportCheckboxes = checkboxes.filter(cb =>
        ['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB'].includes(cb.getAttribute('aria-label'))
      );
      expect(sportCheckboxes.length).toBeGreaterThan(0);
    });

    it('should toggle sport selection', async () => {
      const user = userEvent.setup();
      renderWithProviders(<RankingsFilter {...defaultProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      const nflCheckbox = checkboxes.find(cb => cb.getAttribute('aria-label') === 'NFL');
      await user.click(nflCheckbox);

      expect(mockSetFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          sports: ['NFL']
        })
      );
    });

    it('should support multiple sport selections', async () => {
      const user = userEvent.setup();
      const filters = { ...mockFilters, sports: ['NFL'] };
      renderWithProviders(
        <RankingsFilter {...defaultProps} filters={filters} />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      const nbaCheckbox = checkboxes.find(cb => cb.getAttribute('aria-label') === 'NBA');
      await user.click(nbaCheckbox);

      expect(mockSetFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          sports: ['NFL', 'NBA']
        })
      );
    });
  });

  describe('Minimum Sample Size', () => {
    it('should render sample size slider', () => {
      renderWithProviders(<RankingsFilter {...defaultProps} />);

      const slider = screen.getByLabelText(/Min Sample Size/i);
      expect(slider).toBeInTheDocument();
      expect(slider).toHaveAttribute('type', 'range');
    });

    it('should update sample size', async () => {
      const user = userEvent.setup();
      renderWithProviders(<RankingsFilter {...defaultProps} />);

      const slider = screen.getByLabelText(/Min Sample Size/i);
      fireEvent.change(slider, { target: { value: '15' } });

      expect(mockSetFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          minSampleSize: 15
        })
      );
    });

    it('should display current sample size value', () => {
      const filters = { ...mockFilters, minSampleSize: 20 };
      renderWithProviders(
        <RankingsFilter {...defaultProps} filters={filters} />
      );

      expect(screen.getByText(/20/)).toBeInTheDocument();
    });
  });

  describe('Clear Filters', () => {
    it('should call onClear when Clear Filters button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<RankingsFilter {...defaultProps} />);

      const clearButton = screen.getByText(/Clear Filters/i);
      await user.click(clearButton);

      expect(mockOnClear).toHaveBeenCalled();
    });
  });

  describe('Toggle Expand/Collapse', () => {
    it('should call onToggle when toggle button is clicked', async () => {
      const user = userEvent.setup();
      const onToggle = vi.fn();
      renderWithProviders(
        <RankingsFilter {...defaultProps} onToggle={onToggle} expanded={false} />
      );

      const toggleButtons = screen.getAllByRole('button');
      const filterButton = toggleButtons.find(button => button.textContent.includes('Filters'));
      await user.click(filterButton);

      expect(onToggle).toHaveBeenCalled();
    });

    it('should show + icon when collapsed', () => {
      renderWithProviders(
        <RankingsFilter {...defaultProps} expanded={false} />
      );

      expect(screen.getByText('+')).toBeInTheDocument();
    });

    it('should show − icon when expanded', () => {
      renderWithProviders(
        <RankingsFilter {...defaultProps} expanded={true} />
      );

      expect(screen.getByText('−')).toBeInTheDocument();
    });
  });

  describe('Active Filter Indicator', () => {
    it('should show active filter count when filters are applied', () => {
      const filters = {
        dateFrom: '2026-01-01',
        dateTo: '2026-12-31',
        players: ['Management', 'Labor'],
        sports: ['NFL'],
        minSampleSize: 15
      };

      renderWithProviders(
        <RankingsFilter {...defaultProps} filters={filters} />
      );

      // Should show "4 active" (dateFrom+dateTo counts as 1, players, sports, minSampleSize if different from default)
      expect(screen.getByText(/active/i)).toBeInTheDocument();
    });

    it('should not show active filter count when no filters applied', () => {
      renderWithProviders(<RankingsFilter {...defaultProps} />);

      expect(screen.queryByText(/active/i)).not.toBeInTheDocument();
    });
  });
});
