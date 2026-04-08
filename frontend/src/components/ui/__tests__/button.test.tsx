import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Button } from '@/components/ui';

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('applies primary variant styles', () => {
    render(<Button variant="primary">Primary</Button>);
    const button = screen.getByText('Primary');
    expect(button).toHaveClass('bg-corporate');
  });

  it('applies secondary variant styles', () => {
    render(<Button variant="secondary">Secondary</Button>);
    const button = screen.getByText('Secondary');
    expect(button).toHaveClass('bg-white');
  });

  it('handles onClick events', () => {
    let clicked = false;
    render(<Button onClick={() => (clicked = true)}>Click</Button>);
    const button = screen.getByText('Click');
    button.click();
    expect(clicked).toBe(true);
  });
});
