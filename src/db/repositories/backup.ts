import { migrateBackup } from '@/domain/backup';
import type { Backup } from '@/domain/models';
import { backupSchema } from '@/domain/schemas';
import { db, nowTimestamp } from '../db';
import { auditRepo } from './audit';
import { settingsRepo } from './settings';

const BACKUP_TABLES = [
  db.settings,
  db.categories,
  db.transactions,
  db.plans,
  db.planItems,
  db.recurringRules,
  db.goals,
  db.importBatches,
  db.auditLog,
  db.reminderStates,
] as const;

export const backupRepo = {
  async exportAll(appVersion: string): Promise<Backup> {
    const [
      settings,
      categories,
      transactions,
      plans,
      planItems,
      recurringRules,
      goals,
      importBatches,
      auditLog,
      reminderStates,
    ] = await Promise.all([
      settingsRepo.get(),
      db.categories.toArray(),
      db.transactions.toArray(),
      db.plans.toArray(),
      db.planItems.toArray(),
      db.recurringRules.toArray(),
      db.goals.toArray(),
      db.importBatches.toArray(),
      db.auditLog.toArray(),
      db.reminderStates.toArray(),
    ]);

    const backup = backupSchema.parse({
      schemaVersion: 2,
      appVersion,
      exportedAt: nowTimestamp(),
      data: {
        settings,
        categories,
        transactions,
        plans,
        planItems,
        recurringRules,
        goals,
        importBatches,
        auditLog,
        reminderStates,
      },
    }) as Backup;

    await settingsRepo.update({ lastBackupAt: backup.exportedAt });
    await auditRepo.log({
      action: 'backup_export',
      entity: 'settings',
      entityId: 'app',
      summary: 'Respaldo JSON exportado.',
    });

    return backup;
  },

  async replaceAll(raw: unknown): Promise<void> {
    const backup = migrateBackup(raw);

    await db.transaction('rw', BACKUP_TABLES, async () => {
      await Promise.all(BACKUP_TABLES.map((table) => table.clear()));
      await db.settings.put(backup.data.settings);
      if (backup.data.categories.length) await db.categories.bulkPut(backup.data.categories);
      if (backup.data.transactions.length) await db.transactions.bulkPut(backup.data.transactions);
      if (backup.data.plans.length) await db.plans.bulkPut(backup.data.plans);
      if (backup.data.planItems.length) await db.planItems.bulkPut(backup.data.planItems);
      if (backup.data.recurringRules.length) await db.recurringRules.bulkPut(backup.data.recurringRules);
      if (backup.data.goals.length) await db.goals.bulkPut(backup.data.goals);
      if (backup.data.importBatches.length) await db.importBatches.bulkPut(backup.data.importBatches);
      if (backup.data.auditLog.length) await db.auditLog.bulkPut(backup.data.auditLog);
      if (backup.data.reminderStates.length) await db.reminderStates.bulkPut(backup.data.reminderStates);
    });

    await auditRepo.log({
      action: 'backup_import',
      entity: 'settings',
      entityId: 'app',
      summary: 'Respaldo JSON restaurado. Los datos anteriores fueron reemplazados.',
    });
  },
};
