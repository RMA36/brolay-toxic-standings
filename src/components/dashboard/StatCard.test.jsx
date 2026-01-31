import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TrendingUp } from 'lucide-react';
import StatCard from './StatCard';

describe('StatCard Component', () => {
  it('should render with required props', () => {
    render(
      <StatCard
        icon={TrendingUp}
        title="Total Brolays"
        value="42"
      />
    );

    expect(screen.getByText('Total Brolays')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('should render with subtitle when provided', () => {
    render(
      <StatCard
        icon={TrendingUp}
        title="Win Rate"
        value="65%"
        subtitle="Last 30 days"
      />
    );

    expect(screen.getByText('Win Rate')).toBeInTheDocument();
    expect(screen.getByText('65%')).toBeInTheDocument();
    expect(screen.getByText('Last 30 days')).toBeInTheDocument();
  });

  it('should not render subtitle when not provided', () => {
    render(
      <StatCard
        icon={TrendingUp}
        title="Total Brolays"
        value="42"
      />
    );

    const subtitle = screen.queryByText(/Last 30 days/);
    expect(subtitle).not.toBeInTheDocument();
  });

  it('should apply custom colors', () => {
    const { container } = render(
      <StatCard
        icon={TrendingUp}
        iconColor="text-green-500"
        title="Profit"
        titleColor="text-green-400"
        value="$1,234"
        valueColor="text-green-300"
      />
    );

    const title = screen.getByText('Profit');
    expect(title).toHaveClass('text-green-400');

    const value = screen.getByText('$1,234');
    expect(value).toHaveClass('text-green-300');
  });

  it('should apply variant prop', () => {
    const { container } = render(
      <StatCard
        icon={TrendingUp}
        title="Wins"
        value="10"
        variant="success"
      />
    );

    // Card component applies variant styles
    const card = container.querySelector('[class*="border"]');
    expect(card).toBeTruthy();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <StatCard
        icon={TrendingUp}
        title="Total"
        value="100"
        className="custom-class"
      />
    );

    const card = container.querySelector('.custom-class');
    expect(card).toBeTruthy();
  });

  it('should render icon component', () => {
    const { container } = render(
      <StatCard
        icon={TrendingUp}
        title="Stats"
        value="50"
      />
    );

    // lucide-react icons render as SVG
    const icon = container.querySelector('svg');
    expect(icon).toBeTruthy();
  });

  it('should handle numeric values', () => {
    render(
      <StatCard
        icon={TrendingUp}
        title="Count"
        value={42}
      />
    );

    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('should handle zero value', () => {
    render(
      <StatCard
        icon={TrendingUp}
        title="Losses"
        value={0}
      />
    );

    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('should render with default color classes when not specified', () => {
    render(
      <StatCard
        icon={TrendingUp}
        title="Default Colors"
        value="Test"
      />
    );

    const title = screen.getByText('Default Colors');
    expect(title).toHaveClass('text-blue-400');

    const value = screen.getByText('Test');
    expect(value).toHaveClass('text-white');
  });
});
