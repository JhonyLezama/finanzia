import { beforeEach, describe, expect, it } from 'vitest';
import { asCents } from '@/domain/money';
import type { ISODate } from '@/domain/models';
import { resetDb } from '../test-utils';
import { backupRepo } from './backup';
import { transactionRepo } from './transactions';

beforeEach(async () => {
  await resetDb();
});

describe('backup repository', () => {
  it('round-trips a backup and replaces all data', async () => {
    await transactionRepo.create({
      type: 'expense',
      direction: 'out',
      amountCents: asCents(6000),
      date: '2026-10-28' as ISODate,
      description: 'Cine',
      source: 'manual',
    });

    const backup = await backupRepo.exportAll('1.0.0');
    expect(backup.data.transactions).toHaveLength(1);

    await resetDb();
    await backupRepo.replaceAll(backup);
    expect(await transactionRepo.listAll()).toHaveLength(backup.data.transactions.length);
  });

  it('rejects an invalid backup schema', async () => {
    await expect(backupRepo.replaceAll({ nope: true } as never)).rejects.toThrow();
  });
});
