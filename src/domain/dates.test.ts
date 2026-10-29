import { describe, expect, it } from 'vitest';
import type { ISODate, MonthKey } from './models';
import {
  addMonths,
  dueDateForMonth,
  formatDateShort,
  formatMonthLong,
  isDateInMonth,
  isFutureDate,
  monthKeyFromParts,
  monthRange,
  monthsBetween,
  parseMonthKey,
  toMonthKey,
  todayInLima,
} from './dates';

describe('todayInLima', () => {
  it('computes today in Lima, not UTC', () => {
    expect(todayInLima(new Date('2026-10-29T03:00:00Z'))).toBe('2026-10-28');
  });

  it('rolls the date forward after Lima midnight', () => {
    expect(todayInLima(new Date('2026-10-29T05:30:00Z'))).toBe('2026-10-29');
  });
});

describe('month keys', () => {
  it('derives the month from a calendar date', () => {
    expect(toMonthKey('2026-10-29' as ISODate)).toBe('2026-10');
  });

  it('builds and parses month keys', () => {
    expect(monthKeyFromParts(2026, 10)).toBe('2026-10');
    expect(parseMonthKey('2026-10' as MonthKey)).toEqual({ year: 2026, month: 10 });
  });

  it('rejects invalid month keys', () => {
    expect(() => parseMonthKey('2026-13' as MonthKey)).toThrow();
    expect(() => monthKeyFromParts(2026, 0)).toThrow();
  });

  it('rolls over December to January', () => {
    expect(addMonths('2026-12' as MonthKey, 1)).toBe('2027-01');
    expect(addMonths('2026-01' as MonthKey, -1)).toBe('2025-12');
  });

  it('returns an inclusive range for a month', () => {
    expect(monthRange('2026-02' as MonthKey)).toEqual({
      start: '2026-02-01',
      end: '2026-02-28',
    });
  });

  it('lists months between two keys inclusively', () => {
    expect(monthsBetween('2026-10' as MonthKey, '2026-12' as MonthKey)).toEqual([
      '2026-10',
      '2026-11',
      '2026-12',
    ]);
    expect(monthsBetween('2026-12' as MonthKey, '2026-10' as MonthKey)).toEqual([]);
  });
});

describe('calendar dates', () => {
  it('clamps day 31 to the last day of the month', () => {
    expect(dueDateForMonth('2026-04' as MonthKey, 31)).toBe('2026-04-30');
    expect(dueDateForMonth('2028-02' as MonthKey, 31)).toBe('2028-02-29');
    expect(dueDateForMonth('2026-10' as MonthKey, 5)).toBe('2026-10-05');
  });

  it('keeps future dates distinct from today', () => {
    expect(isFutureDate('2026-10-30' as ISODate, '2026-10-29' as ISODate)).toBe(true);
    expect(isFutureDate('2026-10-29' as ISODate, '2026-10-29' as ISODate)).toBe(false);
  });

  it('checks whether a date belongs to a month', () => {
    expect(isDateInMonth('2026-10-31' as ISODate, '2026-10' as MonthKey)).toBe(true);
    expect(isDateInMonth('2026-11-01' as ISODate, '2026-10' as MonthKey)).toBe(false);
  });

  it('formats months and short dates in Spanish', () => {
    expect(formatMonthLong('2026-10' as MonthKey)).toBe('Octubre de 2026');
    expect(formatDateShort('2026-10-05' as ISODate)).toBe('5 oct 2026');
  });
});
