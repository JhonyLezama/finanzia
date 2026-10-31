import { beforeEach, describe, expect, it } from 'vitest';
import { asCents } from '@/domain/money';
import { migrateBackup } from '@/domain/backup';
import type { ISODate, UUID } from '@/domain/models';
import { resetDb } from '../test-utils';
import { backupRepo } from './backup';
import { transactionRepo } from './transactions';
import { reminderStateRepo } from './reminder-states';

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

  it('round-trips reminder states', async () => {
    const itemId = '11111111-1111-4111-8111-111111111111' as UUID;
    await reminderStateRepo.snooze(itemId, '2026-10-31' as ISODate);

    const backup = await backupRepo.exportAll('1.0.0');
    expect(backup.schemaVersion).toBe(2);
    expect(backup.data.reminderStates).toHaveLength(1);

    await resetDb();
    await backupRepo.replaceAll(backup);
    expect(await reminderStateRepo.list()).toHaveLength(1);
  });

  it('migrates a v1 backup by adding an empty reminder state list', async () => {
    const backup = await backupRepo.exportAll('1.0.0');
    const legacy = JSON.parse(JSON.stringify(backup)) as Record<string, unknown>;
    legacy.schemaVersion = 1;
    delete (legacy.data as Record<string, unknown>).reminderStates;

    const migrated = migrateBackup(legacy);
    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.data.reminderStates).toEqual([]);
  });

  it('rejects an unknown backup schema version', async () => {
    const backup = await backupRepo.exportAll('1.0.0');
    expect(() =>
      migrateBackup({ ...backup, schemaVersion: 3 } as unknown),
    ).toThrow(/esquema/i);
  });
});
