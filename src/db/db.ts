import Dexie, { type EntityTable } from 'dexie';
import type {
  AuditEntry,
  Category,
  Goal,
  ImportBatch,
  ISOTimestamp,
  MonthlyPlan,
  PlanItem,
  RecurringRule,
  ReminderState,
  Settings,
  Transaction,
} from '@/domain/models';

export interface MetaEntry {
  key: string;
  value: unknown;
}

export const DB_NAME = 'alcancia';

export interface Ctx {
  expectedUpdatedAt?: string;
}

export class ConflictError extends Error {
  constructor(message = 'Este registro cambió en otra pestaña.') {
    super(message);
    this.name = 'ConflictError';
  }
}

export class AlcanciaDB extends Dexie {
  settings!: EntityTable<Settings, 'id'>;
  categories!: EntityTable<Category, 'id'>;
  transactions!: EntityTable<Transaction, 'id'>;
  plans!: EntityTable<MonthlyPlan, 'id'>;
  planItems!: EntityTable<PlanItem, 'id'>;
  recurringRules!: EntityTable<RecurringRule, 'id'>;
  goals!: EntityTable<Goal, 'id'>;
  importBatches!: EntityTable<ImportBatch, 'id'>;
  auditLog!: EntityTable<AuditEntry, 'id'>;
  reminderStates!: EntityTable<ReminderState, 'planItemId'>;
  meta!: EntityTable<MetaEntry, 'key'>;

  constructor(name = DB_NAME) {
    super(name);

    this.version(1).stores({
      settings: 'id',
      categories: 'id, kind, group, archived, order',
      transactions:
        'id, date, type, categoryId, goalId, planItemId, importBatchId, dedupeHash, deleted, updatedAt, [type+date], [categoryId+date]',
      plans: 'id, year, month, status',
      planItems: 'id, planId, kind, status, dueDate, recurringRuleId, [planId+recurringRuleId]',
      recurringRules: 'id, kind, active, startMonth',
      goals: 'id, status, createdAt',
      importBatches: 'id, importedAt, status',
      auditLog: 'id, at, entity, entityId',
      meta: 'key',
    });

    this.version(2).stores({
      reminderStates: 'planItemId',
    });
  }
}

export const db = new AlcanciaDB();

export function nowTimestamp(): ISOTimestamp {
  return new Date().toISOString() as ISOTimestamp;
}

export function nextTimestamp(previous?: ISOTimestamp): ISOTimestamp {
  const current = Date.now();
  const last = previous ? Date.parse(previous) : 0;
  return new Date(Math.max(current, last + 1)).toISOString() as ISOTimestamp;
}

export async function resetDb(): Promise<void> {
  db.close();
  await db.delete();
  await db.open();
}
