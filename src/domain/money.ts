import type { Cents } from './models';

export const MAX_CENTS = 1_000_000_000_000;

const penFormatter = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat('es-PE', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function asCents(value: number): Cents {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_CENTS) {
    throw new RangeError('El monto debe ser un entero de céntimos entre 0 y el límite permitido.');
  }
  return value as Cents;
}

function hasDecimalTail(value: string, separator: string): boolean {
  const index = value.lastIndexOf(separator);
  return /^\d{1,2}$/.test(value.slice(index + 1));
}

function count(value: string, separator: string): number {
  return value.split(separator).length - 1;
}

export function parseAmountInput(raw: string): Cents {
  const cleaned = raw
    .replace(/[Ss]\s*\//g, '')
    .replace(/[\s\u00a0\u202f]/g, '')
    .trim();

  if (!cleaned) {
    throw new Error('Ingresá un monto.');
  }
  if (!/^\d[\d.,]*$/.test(cleaned)) {
    throw new Error('El monto solo puede tener números y separadores decimales.');
  }

  const dots = count(cleaned, '.');
  const commas = count(cleaned, ',');
  let decimalSeparator: '.' | ',' | null = null;

  if (dots > 0 && commas > 0) {
    const lastDot = cleaned.lastIndexOf('.');
    const lastComma = cleaned.lastIndexOf(',');
    decimalSeparator = lastDot > lastComma ? '.' : ',';
  } else if (dots > 0) {
    if (dots > 1 && hasDecimalTail(cleaned, '.')) {
      throw new Error('El monto tiene separadores ambiguos.');
    }
    decimalSeparator = hasDecimalTail(cleaned, '.') && dots === 1 ? '.' : null;
  } else if (commas > 0) {
    if (commas > 1 && hasDecimalTail(cleaned, ',')) {
      throw new Error('El monto tiene separadores ambiguos.');
    }
    decimalSeparator = hasDecimalTail(cleaned, ',') && commas === 1 ? ',' : null;
  }

  let integerPart: string;
  let fractionPart = '';

  if (decimalSeparator) {
    if (count(cleaned, decimalSeparator) !== 1) {
      throw new Error('El monto tiene separadores ambiguos.');
    }
    const index = cleaned.lastIndexOf(decimalSeparator);
    integerPart = cleaned.slice(0, index).replace(/[.,]/g, '');
    fractionPart = cleaned.slice(index + 1);

    if (!/^\d{1,2}$/.test(fractionPart)) {
      throw new Error('El monto admite como máximo dos decimales.');
    }
  } else {
    integerPart = cleaned.replace(/[.,]/g, '');
  }

  if (!/^\d+$/.test(integerPart)) {
    throw new Error('El monto no es válido.');
  }

  const integerValue = Number(integerPart);
  if (!Number.isSafeInteger(integerValue)) {
    throw new Error('El monto es demasiado grande.');
  }

  const cents = integerValue * 100 + Number(fractionPart.padEnd(2, '0') || '0');

  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > MAX_CENTS) {
    throw new Error('El monto debe ser mayor a cero y menor al límite permitido.');
  }

  return cents as Cents;
}

export function formatPEN(cents: Cents, options: { sign?: boolean } = {}): string {
  const formatted = penFormatter.format(cents / 100).replace(/[\u00a0\u202f]/g, ' ');
  return options.sign && cents > 0 ? `+${formatted}` : formatted;
}

export function formatPercent(value: number | null, digits = 1): string {
  if (value === null || !Number.isFinite(value)) {
    return '—';
  }

  if (digits === 1) {
    return percentFormatter.format(value);
  }

  return new Intl.NumberFormat('es-PE', {
    style: 'percent',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}
