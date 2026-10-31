export type Cents = number & { readonly __brand: 'Cents' };
export type ISODate = string & { readonly __brand: 'ISODate' };
export type MonthKey = string & { readonly __brand: 'MonthKey' };
export type ISOTimestamp = string & { readonly __brand: 'ISOTimestamp' };
export type UUID = string;

export interface Settings {
  id: 'app';
  displayName?: string;
  currency: 'PEN';
  locale: 'es-PE';
  timezone: 'America/Lima';
  theme: 'system' | 'light' | 'dark';
  onboardingStep: 0 | 1 | 2 | 3 | 4 | 5;
  onboardingCompletedAt?: ISOTimestamp;
  lastBackupAt?: ISOTimestamp;
  backupReminderDismissedAt?: ISOTimestamp;
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}

export interface Category {
  id: UUID;
  name: string;
  kind: 'expense' | 'income';
  group: 'fixed' | 'variable' | 'income';
  colorToken: string;
  icon?: string;
  order: number;
  archived: 0 | 1;
  isDefault: 0 | 1;
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}

export type TransactionType =
  | 'income'
  | 'expense'
  | 'goal_deposit'
  | 'goal_withdraw'
  | 'opening';

export type Direction = 'in' | 'out';

export interface Transaction {
  id: UUID;
  type: TransactionType;
  direction: Direction;
  amountCents: Cents;
  currency: 'PEN';
  date: ISODate;
  categoryId?: UUID;
  description: string;
  note?: string;
  goalId?: UUID;
  planItemId?: UUID;
  recurringRuleId?: UUID;
  importBatchId?: UUID;
  externalId?: string;
  dedupeHash?: string;
  source: 'manual' | 'import' | 'recurring' | 'goal' | 'opening';
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
  deleted: 0 | 1;
  deletedAt?: ISOTimestamp;
}

export interface MonthlyPlanSnapshot {
  closedAt: ISOTimestamp;
  incomeCents: Cents;
  expenseCents: Cents;
  fixedCents: Cents;
  variableCents: Cents;
  savingsCents: Cents;
  availableCents: Cents;
  planExpenseCents: Cents;
}

export interface VariableBudget {
  categoryId: UUID;
  plannedCents: Cents;
}

export interface MonthlyPlan {
  id: MonthKey;
  year: number;
  month: number;
  status: 'active' | 'closed';
  savingsTargetCents: Cents;
  variableBudgets: VariableBudget[];
  snapshot?: MonthlyPlanSnapshot;
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
  closedAt?: ISOTimestamp;
}

export type PlanItemKind = 'expected_income' | 'fixed_expense';
export type PlanItemStatus = 'pending' | 'settled' | 'skipped';

export interface PlanItem {
  id: UUID;
  planId: MonthKey;
  kind: PlanItemKind;
  name: string;
  categoryId: UUID;
  amountCents: Cents;
  dueDate: ISODate;
  status: PlanItemStatus;
  transactionId?: UUID;
  recurringRuleId?: UUID;
  note?: string;
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}

export interface RecurringRule {
  id: UUID;
  name: string;
  kind: PlanItemKind;
  amountCents: Cents;
  categoryId: UUID;
  dayOfMonth: number;
  startMonth: MonthKey;
  endMonth?: MonthKey;
  active: 0 | 1;
  note?: string;
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}

export interface ReminderState {
  planItemId: UUID;
  snoozedUntil?: ISODate;
  hiddenAt?: ISOTimestamp;
  updatedAt: ISOTimestamp;
}

export interface Goal {
  id: UUID;
  name: string;
  targetCents: Cents;
  targetDate?: ISODate;
  status: 'active' | 'archived';
  colorToken: string;
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
  completedAt?: ISOTimestamp;
}

export interface ImportBatch {
  id: UUID;
  filename: string;
  fileType: 'csv' | 'xlsx';
  importedAt: ISOTimestamp;
  rowCount: number;
  importedCount: number;
  skippedCount: number;
  errorCount: number;
  status: 'completed' | 'undone';
  undoneAt?: ISOTimestamp;
  mapping: Record<string, string>;
}

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'restore'
  | 'import'
  | 'undo_import'
  | 'seed_data'
  | 'close_month'
  | 'reopen_month'
  | 'goal_archive'
  | 'category_archive'
  | 'backup_export'
  | 'backup_import'
  | 'reset';

export type AuditEntity =
  | 'transaction'
  | 'plan'
  | 'plan_item'
  | 'goal'
  | 'category'
  | 'recurring_rule'
  | 'import_batch'
  | 'settings';

export interface AuditEntry {
  id: UUID;
  at: ISOTimestamp;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  summary: string;
  before?: unknown;
  after?: unknown;
}

export interface BackupData {
  settings: Settings;
  categories: Category[];
  transactions: Transaction[];
  plans: MonthlyPlan[];
  planItems: PlanItem[];
  recurringRules: RecurringRule[];
  goals: Goal[];
  importBatches: ImportBatch[];
  auditLog: AuditEntry[];
  reminderStates: ReminderState[];
}

export interface Backup {
  schemaVersion: 2;
  appVersion: string;
  exportedAt: ISOTimestamp;
  data: BackupData;
}
