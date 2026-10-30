import { describe, expect, it } from 'vitest';
import {
  normalizeRows,
  parseCsv,
  type ImportMapping,
} from './import';
import type { MonthKey } from './models';

const mapping: ImportMapping = {
  date: 'fecha',
  description: 'descripcion',
  amount: 'monto',
};

describe('import domain', () => {
  it('normalizes dates, amounts, and directions from CSV rows', () => {
    const rows = parseCsv('fecha,descripcion,monto\n28/10/2026,Cine,-60,00');
    const { valid, errors } = normalizeRows(rows, mapping, { today: '2026-10-29' as never });
    expect(valid[0]).toMatchObject({ date: '2026-10-28', amountCents: 6000, direction: 'out' });
    expect(errors).toHaveLength(0);
  });

  it('rejects rows inside a closed month', () => {
    const { valid, errors } = normalizeRows(
      [{ fecha: '2026-09-15', descripcion: 'X', monto: '-10' }],
      mapping,
      { closedMonths: ['2026-09' as MonthKey], today: '2026-10-29' as never },
    );
    expect(valid).toHaveLength(0);
    expect(errors[0]?.reason).toMatch(/cerrado/i);
  });
});
