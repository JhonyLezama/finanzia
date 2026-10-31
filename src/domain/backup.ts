import type { Backup } from './models';
import { backupSchema } from './schemas';

export const CURRENT_BACKUP_SCHEMA = 2 as const;

export function parseBackup(raw: unknown): Backup {
  return backupSchema.parse(raw) as Backup;
}

export function migrateBackup(raw: unknown): Backup {
  if (raw && typeof raw === 'object' && 'schemaVersion' in raw) {
    const version = (raw as { schemaVersion?: unknown }).schemaVersion;

    if (version === 1) {
      const legacy = raw as {
        data?: Record<string, unknown>;
      } & Record<string, unknown>;
      return parseBackup({
        ...legacy,
        schemaVersion: 2,
        data: { ...(legacy.data ?? {}), reminderStates: [] },
      });
    }

    if (version !== CURRENT_BACKUP_SCHEMA) {
      throw new Error('Este respaldo usa un esquema que esta versión no puede migrar.');
    }
  }

  return parseBackup(raw);
}
