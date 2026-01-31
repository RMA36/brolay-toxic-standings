import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Card from './Card';

describe('Card Component', () => {
  describe('Basic Rendering', () => {
    it('should render children content', () => {
      render(
        <Card>
          <div>Test Content</div>
        </Card>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should render title when provided', () => {
      render(
        <Card title="Test Title">
          <div>Content</div>
        </Card>
      );

      expect(screen.getByText('Test Title')).toBeInTheDocument();
    });

    it('should render subtitle when provided', () => {
      render(
        <Card title="Test Title" subtitle="Test Subtitle">
          <div>Content</div>
        </Card>
      );

      expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
    });

    it('should not render header when no title or headerAction', () => {
      const { container } = render(
        <Card>
          <div>Content</div>
        </Card>
      );

      // No header div should be present
      const headerDiv = container.querySelector('.flex.justify-between');
      expect(headerDiv).toBeNull();
    });

    it('should render headerAction when provided', () => {
      render(
        <Card headerAction={<button>Action Button</button>}>
          <div>Content</div>
        </Card>
      );

      expect(screen.getByText('Action Button')).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('should apply default variant classes', () => {
      const { container } = render(
        <Card variant="default">
          <div>Content</div>
        </Card>
      );

      const card = container.firstChild;
      expect(card.className).toContain('from-gray-800');
      expect(card.className).toContain('to-gray-900');
      expect(card.className).toContain('border-yellow-500/20');
    });

    it('should apply highlighted variant classes', () => {
      const { container } = render(
        <Card variant="highlighted">
          <div>Content</div>
        </Card>
      );

      const card = container.firstChild;
      expect(card.className).toContain('border-yellow-500/50');
      expect(card.className).toContain('shadow-lg');
    });

    it('should apply success variant classes', () => {
      const { container } = render(
        <Card variant="success">
          <div>Content</div>
        </Card>
      );

      const card = container.firstChild;
      expect(card.className).toContain('from-green-900/20');
      expect(card.className).toContain('border-green-500/30');
    });

    it('should apply danger variant classes', () => {
      const { container } = render(
        <Card variant="danger">
          <div>Content</div>
        </Card>
      );

      const card = container.firstChild;
      expect(card.className).toContain('from-red-900/20');
      expect(card.className).toContain('border-red-500/30');
    });

    it('should apply warning variant classes', () => {
      const { container } = render(
        <Card variant="warning">
          <div>Content</div>
        </Card>
      );

      const card = container.firstChild;
      expect(card.className).toContain('from-yellow-900/20');
      expect(card.className).toContain('border-yellow-500/30');
    });

    it('should apply info variant classes', () => {
      const { container } = render(
        <Card variant="info">
          <div>Content</div>
        </Card>
      );

      const card = container.firstChild;
      expect(card.className).toContain('from-blue-900/20');
      expect(card.className).toContain('border-blue-500/30');
    });
  });

  describe('Padding', () => {
    it('should apply default padding', () => {
      const { container } = render(
        <Card>
          <div>Content</div>
        </Card>
      );

      const card = container.firstChild;
      expect(card.className).toContain('p-4');
      expect(card.className).toContain('md:p-6');
    });

    it('should apply no padding', () => {
      const { container } = render(
        <Card padding="none">
          <div>Content</div>
        </Card>
      );

      const card = container.firstChild;
      expect(card.className).not.toContain('p-');
    });

    it('should apply small padding', () => {
      const { container } = render(
        <Card padding="small">
          <div>Content</div>
        </Card>
      );

      const card = container.firstChild;
      expect(card.className).toContain('p-3');
      expect(card.className).toContain('md:p-4');
    });

    it('should apply large padding', () => {
      const { container } = render(
        <Card padding="large">
          <div>Content</div>
        </Card>
      );

      const card = container.firstChild;
      expect(card.className).toContain('p-6');
      expect(card.className).toContain('md:p-8');
    });
  });

  describe('Custom Classes', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <Card className="custom-class">
          <div>Content</div>
        </Card>
      );

      const card = container.firstChild;
      expect(card.className).toContain('custom-class');
    });

    it('should preserve base classes when custom className is provided', () => {
      const { container } = render(
        <Card className="custom-class">
          <div>Content</div>
        </Card>
      );

      const card = container.firstChild;
      expect(card.className).toContain('rounded-xl');
      expect(card.className).toContain('shadow-xl');
      expect(card.className).toContain('border');
      expect(card.className).toContain('custom-class');
    });
  });

  describe('Complex Scenarios', () => {
    it('should render all props together', () => {
      render(
        <Card
          title="Full Card"
          subtitle="With all features"
          variant="success"
          padding="large"
          className="extra-class"
          headerAction={<button>Action</button>}
        >
          <div>Card Content</div>
        </Card>
      );

      expect(screen.getByText('Full Card')).toBeInTheDocument();
      expect(screen.getByText('With all features')).toBeInTheDocument();
      expect(screen.getByText('Action')).toBeInTheDocument();
      expect(screen.getByText('Card Content')).toBeInTheDocument();
    });

    it('should render multiple children', () => {
      render(
        <Card title="Multi-Content Card">
          <div>First Child</div>
          <div>Second Child</div>
          <p>Third Child</p>
        </Card>
      );

      expect(screen.getByText('First Child')).toBeInTheDocument();
      expect(screen.getByText('Second Child')).toBeInTheDocument();
      expect(screen.getByText('Third Child')).toBeInTheDocument();
    });

    it('should not render subtitle without title or headerAction', () => {
      render(
        <Card subtitle="Just a subtitle">
          <div>Content</div>
        </Card>
      );

      // Subtitle won't render without title or headerAction (by design)
      expect(screen.queryByText('Just a subtitle')).not.toBeInTheDocument();
      // Content should still render
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });
});
