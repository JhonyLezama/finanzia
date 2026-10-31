import { z } from 'zod';
import { isValidISODate, parseMonthKey } from './dates';
import { MAX_CENTS } from './money';
import type {
  Cents,
  Direction,
  ISODate,
  ISOTimestamp,
  MonthKey,
  TransactionType,
} from './models';

const uuidSchema = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    'Identificador inválido',
  );

export const centsSchema = z
  .number()
  .int('El monto debe ser entero en céntimos')
  .min(0, 'El monto no puede ser negativo')
  .max(MAX_CENTS, 'El monto supera el límite permitido')
  .transform((value) => value as Cents);

export const positiveCentsSchema = z
  .number()
  .int('El monto debe ser entero en céntimos')
  .min(1, 'El monto debe ser mayor a cero')
  .max(MAX_CENTS, 'El monto supera el límite permitido')
  .transform((value) => value as Cents);

export const isoDateSchema = z
  .string()
  .refine(isValidISODate, 'La fecha debe ser una fecha de calendario válida (YYYY-MM-DD)')
  .transform((value) => value as ISODate);

export const monthKeySchema = z
  .string()
  .refine(
    (value) => {
      try {
        parseMonthKey(value as MonthKey);
        return true;
      } catch {
        return false;
      }
    },
    { message: 'El mes debe tener el formato YYYY-MM' },
  )
  .transform((value) => value as MonthKey);

export const timestampSchema = z.iso
  .datetime()
  .transform((value) => value as ISOTimestamp);

export const settingsSchema = z.object({
  id: z.literal('app'),
  displayName: z.string().trim().max(60).optional(),
  currency: z.literal('PEN'),
  locale: z.literal('es-PE'),
  timezone: z.literal('America/Lima'),
  theme: z.enum(['system', 'light', 'dark']),
  onboardingStep: z.number().int().min(0).max(5),
  onboardingCompletedAt: timestampSchema.optional(),
  lastBackupAt: timestampSchema.optional(),
  backupReminderDismissedAt: timestampSchema.optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const categorySchema = z
  .object({
    id: uuidSchema,
    name: z.string().trim().min(1, 'El nombre es obligatorio').max(40),
    kind: z.enum(['expense', 'income']),
    group: z.enum(['fixed', 'variable', 'income']),
    colorToken: z.string().min(1).max(40),
    icon: z.string().max(40).optional(),
    order: z.number().int().min(0),
    archived: z.union([z.literal(0), z.literal(1)]),
    isDefault: z.union([z.literal(0), z.literal(1)]),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .superRefine((category, ctx) => {
    if (category.kind === 'income' && category.group !== 'income') {
      ctx.addIssue({
        code: 'custom',
        path: ['group'],
        message: 'Una categoría de ingreso debe tener grupo income.',
      });
    }
    if (category.kind === 'expense' && category.group === 'income') {
      ctx.addIssue({
        code: 'custom',
        path: ['group'],
        message: 'Una categoría de gasto debe ser fija o variable.',
      });
    }
  });

const directionByType: Record<TransactionType, Direction[]> = {
  income: ['in'],
  expense: ['out'],
  goal_deposit: ['out'],
  goal_withdraw: ['in'],
  opening: ['in', 'out'],
};

export const transactionSchema = z
  .object({
    id: uuidSchema,
    type: z.enum(['income', 'expense', 'goal_deposit', 'goal_withdraw', 'opening']),
    direction: z.enum(['in', 'out']),
    amountCents: positiveCentsSchema,
    currency: z.literal('PEN'),
    date: isoDateSchema,
    categoryId: uuidSchema.optional(),
    description: z.string().trim().min(1, 'La descripción es obligatoria').max(120),
    note: z.string().max(500).optional(),
    goalId: uuidSchema.optional(),
    planItemId: uuidSchema.optional(),
    recurringRuleId: uuidSchema.optional(),
    importBatchId: uuidSchema.optional(),
    externalId: z.string().max(120).optional(),
    dedupeHash: z.string().max(128).optional(),
    source: z.enum(['manual', 'import', 'recurring', 'goal', 'opening']),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
    deleted: z.union([z.literal(0), z.literal(1)]),
    deletedAt: timestampSchema.optional(),
  })
  .superRefine((transaction, ctx) => {
    if (!directionByType[transaction.type].includes(transaction.direction)) {
      ctx.addIssue({
        code: 'custom',
        path: ['direction'],
        message: `La dirección ${transaction.direction} no corresponde a un movimiento ${transaction.type}.`,
      });
    }

    const isGoalMovement =
      transaction.type === 'goal_deposit' || transaction.type === 'goal_withdraw';

    if (isGoalMovement && !transaction.goalId) {
      ctx.addIssue({
        code: 'custom',
        path: ['goalId'],
        message: 'Los movimientos de meta exigen una meta.',
      });
    }

    if (!isGoalMovement && transaction.goalId) {
      ctx.addIssue({
        code: 'custom',
        path: ['goalId'],
        message: 'Solo los movimientos de meta pueden tener una meta asociada.',
      });
    }
  });

export const variableBudgetSchema = z.object({
  categoryId: uuidSchema,
  plannedCents: centsSchema,
});

export const monthlyPlanSnapshotSchema = z.object({
  closedAt: timestampSchema,
  incomeCents: centsSchema,
  expenseCents: centsSchema,
  fixedCents: centsSchema,
  variableCents: centsSchema,
  savingsCents: centsSchema,
  availableCents: centsSchema,
  planExpenseCents: centsSchema,
});

export const monthlyPlanSchema = z
  .object({
    id: monthKeySchema,
    year: z.number().int().min(1000).max(9999),
    month: z.number().int().min(1).max(12),
    status: z.enum(['active', 'closed']),
    savingsTargetCents: centsSchema,
    variableBudgets: z.array(variableBudgetSchema),
    snapshot: monthlyPlanSnapshotSchema.optional(),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
    closedAt: timestampSchema.optional(),
  })
  .superRefine((plan, ctx) => {
    const parsed = parseMonthKey(plan.id);
    if (parsed.year !== plan.year || parsed.month !== plan.month) {
      ctx.addIssue({
        code: 'custom',
        path: ['id'],
        message: 'El identificador del plan no coincide con su año y mes.',
      });
    }
  });

export const planItemSchema = z
  .object({
    id: uuidSchema,
    planId: monthKeySchema,
    kind: z.enum(['expected_income', 'fixed_expense']),
    name: z.string().trim().min(1).max(120),
    categoryId: uuidSchema,
    amountCents: positiveCentsSchema,
    dueDate: isoDateSchema,
    status: z.enum(['pending', 'settled', 'skipped']),
    transactionId: uuidSchema.optional(),
    recurringRuleId: uuidSchema.optional(),
    note: z.string().max(500).optional(),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .superRefine((item, ctx) => {
    if (item.status === 'settled' && !item.transactionId) {
      ctx.addIssue({
        code: 'custom',
        path: ['transactionId'],
        message: 'Un compromiso liquidado exige su transacción.',
      });
    }

    if (item.status !== 'settled' && item.transactionId) {
      ctx.addIssue({
        code: 'custom',
        path: ['transactionId'],
        message: 'Solo un compromiso liquidado puede tener transacción.',
      });
    }

    if (!item.dueDate.startsWith(`${item.planId}-`)) {
      ctx.addIssue({
        code: 'custom',
        path: ['dueDate'],
        message: 'El vencimiento debe caer dentro del mes del plan.',
      });
    }
  });

export const recurringRuleSchema = z
  .object({
    id: uuidSchema,
    name: z.string().trim().min(1).max(120),
    kind: z.enum(['expected_income', 'fixed_expense']),
    amountCents: positiveCentsSchema,
    categoryId: uuidSchema,
    dayOfMonth: z.number().int().min(1).max(31),
    startMonth: monthKeySchema,
    endMonth: monthKeySchema.optional(),
    active: z.union([z.literal(0), z.literal(1)]),
    note: z.string().max(500).optional(),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .superRefine((rule, ctx) => {
    if (rule.endMonth && rule.endMonth < rule.startMonth) {
      ctx.addIssue({
        code: 'custom',
        path: ['endMonth'],
        message: 'El mes final no puede ser anterior al inicial.',
      });
    }
  });

export const goalSchema = z.object({
  id: uuidSchema,
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(80),
  targetCents: positiveCentsSchema,
  targetDate: isoDateSchema.optional(),
  status: z.enum(['active', 'archived']),
  colorToken: z.string().min(1).max(40),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  completedAt: timestampSchema.optional(),
});

export const importBatchSchema = z.object({
  id: uuidSchema,
  filename: z.string().min(1).max(255),
  fileType: z.enum(['csv', 'xlsx']),
  importedAt: timestampSchema,
  rowCount: z.number().int().min(0),
  importedCount: z.number().int().min(0),
  skippedCount: z.number().int().min(0),
  errorCount: z.number().int().min(0),
  status: z.enum(['completed', 'undone']),
  undoneAt: timestampSchema.optional(),
  mapping: z.record(z.string(), z.string()),
});

export const auditEntrySchema = z.object({
  id: uuidSchema,
  at: timestampSchema,
  action: z.enum([
    'create',
    'update',
    'delete',
    'restore',
    'import',
    'undo_import',
    'seed_data',
    'close_month',
    'reopen_month',
    'goal_archive',
    'category_archive',
    'backup_export',
    'backup_import',
    'reset',
  ]),
  entity: z.enum([
    'transaction',
    'plan',
    'plan_item',
    'goal',
    'category',
    'recurring_rule',
    'import_batch',
    'settings',
  ]),
  entityId: z.string().min(1),
  summary: z.string().min(1).max(500),
  before: z.unknown().optional(),
  after: z.unknown().optional(),
});

export const reminderStateSchema = z.object({
  planItemId: uuidSchema,
  snoozedUntil: isoDateSchema.optional(),
  hiddenAt: timestampSchema.optional(),
  updatedAt: timestampSchema,
});

export const backupSchema = z.object({
  schemaVersion: z.literal(1),
  appVersion: z.string().min(1),
  exportedAt: timestampSchema,
  data: z.object({
    settings: settingsSchema,
    categories: z.array(categorySchema),
    transactions: z.array(transactionSchema),
    plans: z.array(monthlyPlanSchema),
    planItems: z.array(planItemSchema),
    recurringRules: z.array(recurringRuleSchema),
    goals: z.array(goalSchema),
    importBatches: z.array(importBatchSchema),
    auditLog: z.array(auditEntrySchema),
  }),
});
