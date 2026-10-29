import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  it('marks progress above 100% as bad', () => {
    render(<ProgressBar value={120} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('data-tone', 'bad');
  });

  it('marks progress under 80% as ok', () => {
    render(<ProgressBar value={45} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('data-tone', 'ok');
  });

  it('marks progress between 80% and 100% as warn', () => {
    render(<ProgressBar value={85} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('data-tone', 'warn');
  });

  it('clamps the visual width and reports the real value', () => {
    render(<ProgressBar value={120} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '120');
    const fill = bar.firstElementChild as HTMLElement;
    expect(fill.style.width).toBe('100%');
  });
});
