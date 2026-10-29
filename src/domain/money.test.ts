import { describe, expect, it } from 'vitest';
import { MAX_CENTS, asCents, formatPEN, formatPercent, parseAmountInput } from './money';

describe('parseAmountInput', () => {
  it.each([
    ['1,234.56', 123456],
    ['1.234,56', 123456],
    ['S/ 1 234,56', 123456],
    ['  60,5 ', 6050],
    ['1234', 123400],
    ['1.234', 123400],
    ['0,01', 1],
  ])('parses %s as %i cents', (raw, expected) => {
    expect(parseAmountInput(raw)).toBe(expected);
  });

  it.each(['0', '-5', 'abc', '', '1,2,3', '12.34.56', 'S/'])('rejects %s', (raw) => {
    expect(() => parseAmountInput(raw)).toThrow();
  });

  it(`rejects amounts above ${MAX_CENTS} cents`, () => {
    expect(() => parseAmountInput('10000000001')).toThrow();
    expect(parseAmountInput('10000000000')).toBe(MAX_CENTS);
  });
});

describe('asCents', () => {
  it('accepts non-negative safe integers', () => {
    expect(asCents(0)).toBe(0);
    expect(asCents(123456)).toBe(123456);
  });

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, MAX_CENTS + 1])(
    'rejects %s',
    (value) => {
      expect(() => asCents(value)).toThrow();
    },
  );
});

describe('formatPEN', () => {
  it('formats cents as Peruvian soles', () => {
    expect(formatPEN(asCents(123456))).toBe('S/ 1,234.56');
  });

  it('adds an explicit sign when requested', () => {
    expect(formatPEN(asCents(6000), { sign: true })).toBe('+S/ 60.00');
  });
});

describe('formatPercent', () => {
  it('formats a ratio as a Peruvian percentage', () => {
    expect(formatPercent(0.7136)).toBe('71.4%');
  });

  it('renders a dash for missing values', () => {
    expect(formatPercent(null)).toBe('—');
  });
});
