import type { ISODate, MonthKey } from './models';

const MONTH_KEY_PATTERN = /^(\d{4})-(\d{2})$/;

function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

export function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    return false;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function todayInLima(now: Date = new Date()): ISODate {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now) as ISODate;
}

export function toMonthKey(date: ISODate): MonthKey {
  return date.slice(0, 7) as MonthKey;
}

export function monthKeyFromParts(year: number, month: number): MonthKey {
  if (!Number.isInteger(year) || year < 1000 || year > 9999) {
    throw new RangeError('El año debe tener cuatro dígitos.');
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError('El mes debe estar entre 1 y 12.');
  }
  return `${year}-${pad2(month)}` as MonthKey;
}

export function parseMonthKey(key: MonthKey): { year: number; month: number } {
  const match = MONTH_KEY_PATTERN.exec(key);
  if (!match) {
    throw new RangeError('El mes debe tener el formato YYYY-MM.');
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) {
    throw new RangeError('El mes debe estar entre 01 y 12.');
  }

  return { year, month };
}

export function addMonths(key: MonthKey, delta: number): MonthKey {
  const { year, month } = parseMonthKey(key);
  const absolute = year * 12 + (month - 1) + delta;
  const nextYear = Math.floor(absolute / 12);
  const nextMonth = (absolute % 12) + 1;
  return monthKeyFromParts(nextYear, nextMonth);
}

export function daysInMonth(key: MonthKey): number {
  const { year, month } = parseMonthKey(key);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function monthRange(key: MonthKey): { start: ISODate; end: ISODate } {
  return {
    start: `${key}-01` as ISODate,
    end: `${key}-${pad2(daysInMonth(key))}` as ISODate,
  };
}

export function dueDateForMonth(key: MonthKey, dayOfMonth: number): ISODate {
  const { year, month } = parseMonthKey(key);
  const day = Math.min(Math.max(Math.trunc(dayOfMonth), 1), daysInMonth(key));
  return `${year}-${pad2(month)}-${pad2(day)}` as ISODate;
}

export function formatMonthLong(key: MonthKey): string {
  const { year, month } = parseMonthKey(key);
  const label = new Intl.DateTimeFormat('es-PE', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)));

  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatDateShort(date: ISODate): string {
  if (!isValidISODate(date)) {
    return '—';
  }

  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  return new Intl.DateTimeFormat('es-PE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
    .format(new Date(Date.UTC(year, month - 1, day)))
    .replace(/\./g, '');
}

export function isFutureDate(date: ISODate, today: ISODate = todayInLima()): boolean {
  return date > today;
}

export function isDateInMonth(date: ISODate, key: MonthKey): boolean {
  return date.startsWith(`${key}-`);
}

export function monthsBetween(start: MonthKey, end: MonthKey): MonthKey[] {
  if (start > end) {
    return [];
  }

  const months: MonthKey[] = [];
  let cursor = start;
  while (cursor <= end) {
    months.push(cursor);
    cursor = addMonths(cursor, 1);
  }
  return months;
}
