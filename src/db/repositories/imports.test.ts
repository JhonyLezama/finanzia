import { beforeEach, describe, expect, it } from 'vitest';
import { asCents } from '@/domain/money';
import type { ImportMapping, ImportRow } from '@/domain/import';
import type { ISODate, MonthKey } from '@/domain/models';
import { db, resetDb } from '../test-utils';
import { planRepo } from './plans';
import { importRepo } from './imports';
import { transactionRepo } from './transactions';

const mapping: ImportMapping = {
  date: 'fecha',
  description: 'descripcion',
  amount: 'monto',
};

function row(partial: Partial<ImportRow> = {}): ImportRow {
  return {
    rowNumber: 2,
    date: '2026-10-28' as ISODate,
    description: 'Cine',
    amountCents: asCents(6000),
    direction: 'out',
    type: 'expense',
    ...partial,
  };
}

beforeEach(async () => {
  await resetDb();
});

describe('import repository', () => {
  it('deduplicates the same row on a second import', async () => {
    const first = await importRepo.createBatch({
      filename: 'bank.csv',
      fileType: 'csv',
      rows: [row()],
      mapping,
    });
    const second = await importRepo.createBatch({
      filename: 'bank.csv',
      fileType: 'csv',
      rows: [row()],
      mapping,
    });

    expect(first.importedCount).toBe(1);
    expect(second.skippedCount).toBe(1);
    expect(await transactionRepo.listAll()).toHaveLength(1);
  });

  it('undoes an import batch and restores counts', async () => {
    const batch = await importRepo.createBatch({
      filename: 'bank.csv',
      fileType: 'csv',
      rows: [row()],
      mapping,
    });
    await importRepo.undo(batch.id);
    expect(await transactionRepo.listAll()).toHaveLength(0);
    expect((await db.importBatches.get(batch.id))?.status).toBe('undone');
  });

  it('rejects rows inside a closed month at insert time', async () => {
    await planRepo.getOrCreate('2026-09' as MonthKey);
    await planRepo.close('2026-09' as MonthKey);

    const batch = await importRepo.createBatch({
      filename: 'bank.csv',
      fileType: 'csv',
      rows: [row({ date: '2026-09-15' as ISODate, description: 'X' })],
      mapping,
    });

    expect(batch.importedCount).toBe(0);
    expect(batch.errorCount).toBe(1);
    expect(await transactionRepo.listAll()).toHaveLength(0);
  });
});
