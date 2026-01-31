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

    const button = screen.getByText('Click me');
    await user.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should not call onClick when disabled', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick} disabled>Click me</Button>);

    const button = screen.getByText('Click me');
    await user.click(button);

    expect(handleClick).not.toHaveBeenCalled();
  });

  describe('Variants', () => {
    it('should apply primary variant styles by default', () => {
      render(<Button>Primary</Button>);
      const button = screen.getByText('Primary');
      expect(button).toHaveClass('bg-yellow-500');
    });

    it('should apply secondary variant styles', () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByText('Secondary');
      expect(button).toHaveClass('bg-gray-700');
    });

    it('should apply danger variant styles', () => {
      render(<Button variant="danger">Delete</Button>);
      const button = screen.getByText('Delete');
      expect(button).toHaveClass('bg-red-600');
    });

    it('should apply success variant styles', () => {
      render(<Button variant="success">Save</Button>);
      const button = screen.getByText('Save');
      expect(button).toHaveClass('bg-green-600');
    });

    it('should apply ghost variant styles', () => {
      render(<Button variant="ghost">Ghost</Button>);
      const button = screen.getByText('Ghost');
      expect(button).toHaveClass('bg-transparent');
    });
  });

  describe('Sizes', () => {
    it('should apply medium size by default', () => {
      render(<Button>Medium</Button>);
      const button = screen.getByText('Medium');
      expect(button).toHaveClass('px-4', 'py-2', 'text-base');
    });

    it('should apply small size styles', () => {
      render(<Button size="small">Small</Button>);
      const button = screen.getByText('Small');
      expect(button).toHaveClass('px-3', 'py-1.5', 'text-sm');
    });

    it('should apply large size styles', () => {
      render(<Button size="large">Large</Button>);
      const button = screen.getByText('Large');
      expect(button).toHaveClass('px-6', 'py-3', 'text-lg');
    });
  });

  describe('Button type attribute', () => {
    it('should have type="button" by default', () => {
      render(<Button>Default Type</Button>);
      const button = screen.getByText('Default Type');
      expect(button).toHaveAttribute('type', 'button');
    });

    it('should accept type="submit"', () => {
      render(<Button type="submit">Submit</Button>);
      const button = screen.getByText('Submit');
      expect(button).toHaveAttribute('type', 'submit');
    });

    it('should accept type="reset"', () => {
      render(<Button type="reset">Reset</Button>);
      const button = screen.getByText('Reset');
      expect(button).toHaveAttribute('type', 'reset');
    });
  });

  describe('Disabled state', () => {
    it('should be enabled by default', () => {
      render(<Button>Enabled</Button>);
      const button = screen.getByText('Enabled');
      expect(button).not.toBeDisabled();
    });

    it('should be disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByText('Disabled');
      expect(button).toBeDisabled();
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      render(<Button className="custom-class">Custom</Button>);
      const button = screen.getByText('Custom');
      expect(button).toHaveClass('custom-class');
    });

    it('should merge custom className with base styles', () => {
      render(<Button className="mt-4">Custom</Button>);
      const button = screen.getByText('Custom');
      expect(button).toHaveClass('mt-4', 'font-semibold', 'rounded');
    });
  });

  describe('Accessibility', () => {
    it('should have focus ring styles', () => {
      render(<Button>Focus</Button>);
      const button = screen.getByText('Focus');
      expect(button).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-offset-2');
    });

    it('should be keyboard accessible', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(<Button onClick={handleClick}>Keyboard</Button>);
      const button = screen.getByText('Keyboard');

      // Tab to button and press Enter
      await user.tab();
      expect(button).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  it('should render with icon children', () => {
    const Icon = () => <svg data-testid="icon" />;
    render(
      <Button>
        <Icon />
        <span>With Icon</span>
      </Button>
    );

    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByText('With Icon')).toBeInTheDocument();
  });
});
