import Papa from 'papaparse';
import { sha256Hex } from '@/lib/crypto';
import { isFutureDate, isValidISODate, todayInLima, toMonthKey } from './dates';
import type { Cents, Direction, ISODate, MonthKey } from './models';
import { parseAmountInput } from './money';

export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;

export interface ImportMapping {
  date: string;
  description: string;
  amount?: string;
  debit?: string;
  credit?: string;
  category?: string;
  externalId?: string;
  note?: string;
}

export interface ImportRow {
  rowNumber: number;
  date: ISODate;
  description: string;
  amountCents: Cents;
  direction: Direction;
  type: 'income' | 'expense';
  categoryName?: string;
  categoryId?: string;
  externalId?: string;
  note?: string;
  warning?: string;
}

export interface ImportError {
  rowNumber: number;
  reason: string;
  raw: Record<string, string>;
}

export interface NormalizeOptions {
  today?: ISODate;
  closedMonths?: Iterable<string>;
}

function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('es')
    .trim();
}

function cell(row: Record<string, string>, key?: string): string {
  if (!key) {
    return '';
  }
  return (row[key] ?? '').trim();
}

export function normalizeDescription(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLocaleLowerCase('es');
}

export function parseImportDate(raw: string): ISODate {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error('Falta la fecha.');
  }

  if (isValidISODate(trimmed)) {
    return trimmed as ISODate;
  }

  const dmy = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/.exec(trimmed);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    const year = Number(dmy[3]);
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (!isValidISODate(iso)) {
      throw new Error('La fecha no es válida.');
    }
    return iso as ISODate;
  }

  const ymd = /^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/.exec(trimmed);
  if (ymd) {
    const iso = `${ymd[1]}-${String(Number(ymd[2])).padStart(2, '0')}-${String(Number(ymd[3])).padStart(2, '0')}`;
    if (!isValidISODate(iso)) {
      throw new Error('La fecha no es válida.');
    }
    return iso as ISODate;
  }

  throw new Error('No se reconoció el formato de fecha.');
}

export function parseSignedImportAmount(raw: string): { amountCents: Cents; signedOut: boolean } {
  let value = raw.trim();
  if (!value) {
    throw new Error('Falta el monto.');
  }

  let signedOut = false;
  if (value.startsWith('(') && value.endsWith(')')) {
    signedOut = true;
    value = value.slice(1, -1).trim();
  }

  if (value.startsWith('+')) {
    value = value.slice(1).trim();
  } else if (value.startsWith('-')) {
    signedOut = true;
    value = value.slice(1).trim();
  }

  return { amountCents: parseAmountInput(value), signedOut };
}

function resolveAmount(
  row: Record<string, string>,
  mapping: ImportMapping,
): { amountCents: Cents; direction: Direction } {
  const debitRaw = cell(row, mapping.debit);
  const creditRaw = cell(row, mapping.credit);

  if (mapping.debit || mapping.credit) {
    if (debitRaw && creditRaw) {
      throw new Error('La fila tiene débito y crédito a la vez.');
    }
    if (debitRaw) {
      return { amountCents: parseSignedImportAmount(debitRaw).amountCents, direction: 'out' };
    }
    if (creditRaw) {
      return { amountCents: parseSignedImportAmount(creditRaw).amountCents, direction: 'in' };
    }
  }

  const amountRaw = cell(row, mapping.amount);
  const parsed = parseSignedImportAmount(amountRaw);
  return {
    amountCents: parsed.amountCents,
    direction: parsed.signedOut ? 'out' : 'in',
  };
}

export function suggestMapping(headers: string[]): ImportMapping {
  const folded = headers.map((header) => ({ header, key: fold(header) }));

  const find = (...aliases: string[]): string | undefined =>
    folded.find((item) => aliases.includes(item.key))?.header;

  const date = find('fecha', 'date', 'f. operacion', 'f operacion', 'operacion', 'value date', 'posted');
  const description = find(
    'descripcion',
    'description',
    'concepto',
    'detalle',
    'glosa',
    'narration',
    'memo',
  );
  const amount = find('monto', 'importe', 'amount', 'valor', 'cargo/abono');
  const debit = find('debito', 'debit', 'cargo', 'retiro');
  const credit = find('credito', 'credit', 'abono', 'deposito');
  const category = find('categoria', 'category', 'rubro');
  const externalId = find('id', 'id externo', 'external id', 'referencia', 'reference', 'nro operacion');
  const note = find('nota', 'note', 'observacion', 'comentario');

  return {
    date: date ?? headers[0] ?? 'fecha',
    description: description ?? headers[1] ?? 'descripcion',
    ...(amount ? { amount } : debit || credit ? {} : { amount: headers[2] ?? 'monto' }),
    ...(debit ? { debit } : {}),
    ...(credit ? { credit } : {}),
    ...(category ? { category } : {}),
    ...(externalId ? { externalId } : {}),
    ...(note ? { note } : {}),
  };
}

export function parseCsv(text: string): Record<string, string>[] {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim(),
  });

  return result.data
    .filter((row) => Object.values(row).some((value) => String(value ?? '').trim() !== ''))
    .map((row) => {
      const extra = (row as Record<string, unknown>).__parsed_extra;
      const next: Record<string, string> = {};

      for (const [key, value] of Object.entries(row)) {
        if (key === '__parsed_extra') {
          continue;
        }
        next[key] = value == null ? '' : String(value).trim();
      }

      if (Array.isArray(extra) && extra.length > 0) {
        const keys = Object.keys(next);
        const last = keys[keys.length - 1];
        if (last) {
          next[last] = [next[last], ...extra.map((item) => String(item))].join(',');
        }
      }

      return next;
    });
}

export function decodeImportBytes(bytes: Uint8Array): string {
  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  if (!utf8.includes('\uFFFD')) {
    return utf8;
  }

  return new TextDecoder('windows-1252', { fatal: false }).decode(bytes);
}

export function stringifyImportCell(value: unknown): string {
  if (value == null) {
    return '';
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return String(value).trim();
}

export function rowsFromSheet(rows: unknown[][]): Record<string, string>[] {
  if (rows.length < 2) {
    return [];
  }

  const headers = (rows[0] ?? []).map((cellValue) => stringifyImportCell(cellValue));
  return rows.slice(1).map((row) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      if (!header) {
        return;
      }
      record[header] = stringifyImportCell(row[index]);
    });
    return record;
  });
}

export async function dedupeHash(
  row: Pick<ImportRow, 'date' | 'amountCents' | 'description' | 'externalId'>,
): Promise<string> {
  const payload = [
    row.date,
    String(row.amountCents),
    normalizeDescription(row.description),
    row.externalId?.trim() ?? '',
  ].join('|');
  return sha256Hex(payload);
}

export function normalizeRows(
  rows: Record<string, string>[],
  mapping: ImportMapping,
  options: NormalizeOptions = {},
): { valid: ImportRow[]; errors: ImportError[] } {
  const today = options.today ?? todayInLima();
  const closedMonths = new Set(
    [...(options.closedMonths ?? [])].map((month) => month as MonthKey),
  );
  const valid: ImportRow[] = [];
  const errors: ImportError[] = [];

  rows.forEach((raw, index) => {
    const rowNumber = index + 2;

    try {
      const date = parseImportDate(cell(raw, mapping.date));
      if (isFutureDate(date, today)) {
        throw new Error('La fecha no puede ser futura.');
      }
      if (closedMonths.has(toMonthKey(date))) {
        throw new Error('El mes está cerrado y no admite importación.');
      }

      const description = cell(raw, mapping.description);
      if (!description) {
        throw new Error('Falta la descripción.');
      }

      const { amountCents, direction } = resolveAmount(raw, mapping);
      const categoryName = cell(raw, mapping.category) || undefined;
      const externalId = cell(raw, mapping.externalId) || undefined;
      const note = cell(raw, mapping.note) || undefined;

      valid.push({
        rowNumber,
        date,
        description,
        amountCents,
        direction,
        type: direction === 'out' ? 'expense' : 'income',
        ...(categoryName ? { categoryName } : {}),
        ...(externalId ? { externalId } : {}),
        ...(note ? { note } : {}),
      });
    } catch (error) {
      errors.push({
        rowNumber,
        reason: error instanceof Error ? error.message : 'Fila inválida.',
        raw,
      });
    }
  });

  return { valid, errors };
}
