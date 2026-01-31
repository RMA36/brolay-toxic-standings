import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoadingSpinner from './LoadingSpinner';

describe('LoadingSpinner Component', () => {
  describe('Basic Rendering', () => {
    it('should render with default props', () => {
      render(<LoadingSpinner />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should render custom message', () => {
      render(<LoadingSpinner message="Please wait..." />);

      expect(screen.getByText('Please wait...')).toBeInTheDocument();
    });

    it('should not render message when message is empty', () => {
      render(<LoadingSpinner message="" />);

      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    it('should not render message when message is null', () => {
      const { container } = render(<LoadingSpinner message={null} />);

      const messageElement = container.querySelector('p');
      expect(messageElement).toBeNull();
    });
  });

  describe('Size Variants', () => {
    it('should apply default size classes', () => {
      const { container } = render(<LoadingSpinner />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner.className).toContain('w-12');
      expect(spinner.className).toContain('h-12');
    });

    it('should apply small size classes', () => {
      const { container } = render(<LoadingSpinner size="small" />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner.className).toContain('w-6');
      expect(spinner.className).toContain('h-6');
    });

    it('should apply large size classes', () => {
      const { container } = render(<LoadingSpinner size="large" />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner.className).toContain('w-16');
      expect(spinner.className).toContain('h-16');
    });
  });

  describe('Styling', () => {
    it('should have spinner with correct base classes', () => {
      const { container } = render(<LoadingSpinner />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner.className).toContain('border-4');
      expect(spinner.className).toContain('border-yellow-500');
      expect(spinner.className).toContain('border-t-transparent');
      expect(spinner.className).toContain('rounded-full');
      expect(spinner.className).toContain('animate-spin');
    });

    it('should have container with flex layout', () => {
      const { container } = render(<LoadingSpinner />);

      const wrapper = container.firstChild;
      expect(wrapper.className).toContain('flex');
      expect(wrapper.className).toContain('flex-col');
      expect(wrapper.className).toContain('items-center');
      expect(wrapper.className).toContain('justify-center');
      expect(wrapper.className).toContain('p-8');
    });

    it('should have message with correct styling', () => {
      const { container } = render(<LoadingSpinner message="Loading..." />);

      const message = container.querySelector('p');
      expect(message.className).toContain('mt-4');
      expect(message.className).toContain('text-gray-300');
    });
  });

  describe('Complex Scenarios', () => {
    it('should render with small size and custom message', () => {
      const { container } = render(
        <LoadingSpinner size="small" message="Fetching data..." />
      );

      const spinner = container.querySelector('.animate-spin');
      expect(spinner.className).toContain('w-6');
      expect(spinner.className).toContain('h-6');
      expect(screen.getByText('Fetching data...')).toBeInTheDocument();
    });

    it('should render with large size and no message', () => {
      const { container } = render(
        <LoadingSpinner size="large" message="" />
      );

      const spinner = container.querySelector('.animate-spin');
      expect(spinner.className).toContain('w-16');
      expect(spinner.className).toContain('h-16');
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    it('should render multiple spinners independently', () => {
      const { container } = render(
        <>
          <LoadingSpinner size="small" message="First" />
          <LoadingSpinner size="large" message="Second" />
        </>
      );

      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();

      const spinners = container.querySelectorAll('.animate-spin');
      expect(spinners).toHaveLength(2);
    });
  });

  describe('Accessibility', () => {
    it('should have visible message for screen readers', () => {
      render(<LoadingSpinner message="Loading data" />);

      const message = screen.getByText('Loading data');
      expect(message).toBeVisible();
    });

    it('should maintain proper contrast for message text', () => {
      const { container } = render(<LoadingSpinner />);

      const message = container.querySelector('p');
      expect(message.className).toContain('text-gray-300');
    });
  });
});
