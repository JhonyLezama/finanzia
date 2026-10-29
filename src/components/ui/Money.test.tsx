import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Money } from './Money';

describe('Money', () => {
  it('formats cents as PEN', () => {
    render(<Money cents={123456} />);
    expect(screen.getByText('S/ 1,234.56')).toBeInTheDocument();
  });

  it('marks outflows with a true minus sign', () => {
    render(<Money cents={6000} direction="out" signed />);
    expect(screen.getByText('−S/ 60.00')).toBeInTheDocument();
  });

  it('marks inflows with a plus sign when signed', () => {
    render(<Money cents={220000} direction="in" signed />);
    expect(screen.getByText('+S/ 2,200.00')).toBeInTheDocument();
  });
});
