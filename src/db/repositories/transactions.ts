import { todayInLima, toMonthKey } from '@/domain/dates';
import type {
  Cents,
  ISODate,
  MonthKey,
  Transaction,
  UUID,
} from '@/domain/models';
import { transactionSchema } from '@/domain/schemas';
import { ConflictError, db, nextTimestamp, nowTimestamp, type Ctx } from '../db';
import { auditRepo } from './audit';

export interface TransactionInput {
  type: Transaction['type'];
  direction: Transaction['direction'];
  amountCents: Cents;
  date: ISODate;
  categoryId?: UUID;
  description: string;
  note?: string;
  goalId?: UUID;
  planItemId?: UUID;
  source: Transaction['source'];
}

const TRANSACTION_TABLES = [
  db.transactions,
  db.planItems,
  db.categories,
  db.goals,
  db.plans,
  db.auditLog,
] as const;

function typeLabel(transaction: Pick<Transaction, 'type'>): string {
  switch (transaction.type) {
    case 'income':
      return 'Ingreso';
    case 'expense':
      return 'Gasto';
    case 'goal_deposit':
      return 'Aporte a meta';
    case 'goal_withdraw':
      return 'Retiro de meta';
    case 'opening':
      return 'Saldo inicial';
  }
}

async function assertDateAllowed(date: ISODate): Promise<void> {
  if (date > todayInLima()) {
    throw new Error('La fecha no puede ser futura.');
  }

  const plan = await db.plans.get(toMonthKey(date));
  if (plan?.status === 'closed') {
    throw new Error('El mes está cerrado y no admite cambios.');
  }
}

async function assertCategoryMatches(
  type: Transaction['type'],
  categoryId?: UUID,
): Promise<void> {
  if (!categoryId) {
    return;
  }

  const category = await db.categories.get(categoryId);
  if (!category) {
    throw new Error('La categoría no existe.');
  }

  if (type === 'income' && category.kind !== 'income') {
    throw new Error('La categoría no corresponde a un ingreso.');
  }
  if (type === 'expense' && category.kind !== 'expense') {
    throw new Error('La categoría no corresponde a un gasto.');
  }
}

async function assertGoalExists(goalId?: UUID): Promise<void> {
  if (!goalId) {
    return;
  }

  const goal = await db.goals.get(goalId);
  if (!goal) {
    throw new Error('La meta no existe.');
  }
}

async function assertPlanItemMatches(input: {
  type: Transaction['type'];
  date: ISODate;
  categoryId?: UUID;
  planItemId?: UUID;
  transactionId?: UUID;
}): Promise<void> {
  if (!input.planItemId) {
    return;
  }

  const item = await db.planItems.get(input.planItemId);
  if (!item) {
    throw new Error('El compromiso no existe.');
  }
  if (item.status === 'settled' && item.transactionId !== input.transactionId) {
    throw new Error('El compromiso ya está liquidado.');
  }
  if (item.status === 'skipped') {
    throw new Error('El compromiso está omitido.');
  }
  if (item.kind === 'fixed_expense' && input.type !== 'expense') {
    throw new Error('El tipo del movimiento no coincide con el compromiso.');
  }
  if (item.kind === 'expected_income' && input.type !== 'income') {
    throw new Error('El tipo del movimiento no coincide con el compromiso.');
  }
  if (input.categoryId && item.categoryId !== input.categoryId) {
    throw new Error('La categoría no coincide con la del compromiso.');
  }
  if (toMonthKey(input.date) !== item.planId) {
    throw new Error('La fecha debe pertenecer al mes del compromiso.');
  }

  const linked = await db.transactions
    .where('planItemId')
    .equals(item.id)
    .and(
      (transaction) => !transaction.deleted && transaction.id !== input.transactionId,
    )
    .first();
  if (linked) {
    throw new Error('El compromiso ya tiene un movimiento activo.');
  }
}

async function assertIntegrity(input: {
  type: Transaction['type'];
  date: ISODate;
  categoryId?: UUID;
  goalId?: UUID;
  planItemId?: UUID;
  transactionId?: UUID;
}): Promise<void> {
  await assertDateAllowed(input.date);
  await assertCategoryMatches(input.type, input.categoryId);
  await assertGoalExists(input.goalId);
  await assertPlanItemMatches(input);
}

function buildTransaction(input: TransactionInput): Transaction {
  const now = nowTimestamp();

  return {
    id: crypto.randomUUID(),
    type: input.type,
    direction: input.direction,
    amountCents: input.amountCents,
    currency: 'PEN',
    date: input.date,
    ...(input.categoryId ? { categoryId: input.categoryId } : {}),
    description: input.description.trim(),
    ...(input.note ? { note: input.note } : {}),
    ...(input.goalId ? { goalId: input.goalId } : {}),
    ...(input.planItemId ? { planItemId: input.planItemId } : {}),
    source: input.source,
    createdAt: now,
    updatedAt: now,
    deleted: 0,
  };
}

function withoutUndefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as Partial<T>;
}

export const transactionRepo = {
  async listByMonth(month: MonthKey): Promise<Transaction[]> {
    const transactions = await db.transactions
      .where('date')
      .between(`${month}-01`, `${month}-31`, true, true)
      .toArray();

    return transactions
      .filter((transaction) => !transaction.deleted)
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt),
      );
  },

  async listAll(): Promise<Transaction[]> {
    const transactions = await db.transactions.toArray();

    return transactions
      .filter((transaction) => !transaction.deleted)
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt),
      );
  },

  async create(input: TransactionInput): Promise<Transaction> {
    return db.transaction('rw', TRANSACTION_TABLES, async () => {
      await assertIntegrity(input);

      const transaction = transactionSchema.parse(buildTransaction(input)) as Transaction;
      await db.transactions.add(transaction);
      await auditRepo.log({
        action: 'create',
        entity: 'transaction',
        entityId: transaction.id,
        summary: `${typeLabel(transaction)} registrado: ${transaction.description}`,
        after: transaction,
      });

      return transaction;
    });
  },

  async update(id: UUID, patch: Partial<TransactionInput>, ctx: Ctx): Promise<Transaction> {
    return db.transaction('rw', TRANSACTION_TABLES, async () => {
      const current = await db.transactions.get(id);
      if (!current) {
        throw new Error('El movimiento no existe.');
      }
      if (ctx.expectedUpdatedAt && current.updatedAt !== ctx.expectedUpdatedAt) {
        throw new ConflictError();
      }

      await assertDateAllowed(current.date);

      const definedPatch = withoutUndefined(patch);
      const nextDate = (definedPatch.date ?? current.date) as ISODate;
      const monthChanged = toMonthKey(nextDate) !== toMonthKey(current.date);

      if (current.planItemId) {
        if (monthChanged) {
          throw new Error('No se puede cambiar de mes un movimiento vinculado a un compromiso.');
        }

        const linkedFieldChanged =
          (definedPatch.type !== undefined && definedPatch.type !== current.type) ||
          (definedPatch.direction !== undefined &&
            definedPatch.direction !== current.direction) ||
          (definedPatch.categoryId !== undefined &&
            definedPatch.categoryId !== current.categoryId) ||
          (definedPatch.planItemId !== undefined &&
            definedPatch.planItemId !== current.planItemId) ||
          (definedPatch.goalId !== undefined && definedPatch.goalId !== current.goalId);

        if (linkedFieldChanged) {
          throw new Error(
            'El movimiento está vinculado a un compromiso y solo admite monto, fecha, descripción y nota.',
          );
        }
      }

      const candidate: Transaction = {
        ...current,
        ...definedPatch,
        date: nextDate,
        updatedAt: nextTimestamp(current.updatedAt),
      } as Transaction;

      await assertIntegrity({
        type: candidate.type,
        date: candidate.date,
        categoryId: candidate.categoryId,
        goalId: candidate.goalId,
        planItemId: candidate.planItemId,
        transactionId: current.id,
      });

      const validated = transactionSchema.parse(candidate) as Transaction;
      await db.transactions.put(validated);
      await auditRepo.log({
        action: 'update',
        entity: 'transaction',
        entityId: validated.id,
        summary: `${typeLabel(validated)} actualizado: ${validated.description}`,
        before: current,
        after: validated,
      });

      return validated;
    });
  },

  async softDelete(id: UUID, ctx: Ctx): Promise<void> {
    await db.transaction('rw', TRANSACTION_TABLES, async () => {
      const current = await db.transactions.get(id);
      if (!current) {
        throw new Error('El movimiento no existe.');
      }
      if (ctx.expectedUpdatedAt && current.updatedAt !== ctx.expectedUpdatedAt) {
        throw new ConflictError();
      }

      await assertDateAllowed(current.date);

      const deletedAt = nextTimestamp(current.updatedAt);
      const deleted: Transaction = {
        ...current,
        deleted: 1,
        deletedAt,
        updatedAt: deletedAt,
      };
      await db.transactions.put(deleted);

      if (current.planItemId) {
        const item = await db.planItems.get(current.planItemId);
        if (item && item.transactionId === current.id) {
          await db.planItems.put({
            ...item,
            status: 'pending',
            transactionId: undefined,
            updatedAt: nextTimestamp(item.updatedAt),
          });
        }
      }

      await auditRepo.log({
        action: 'delete',
        entity: 'transaction',
        entityId: deleted.id,
        summary: `${typeLabel(deleted)} eliminado: ${deleted.description}`,
        before: current,
        after: deleted,
      });
    });
  },

  async restore(id: UUID): Promise<void> {
    await db.transaction('rw', TRANSACTION_TABLES, async () => {
      const current = await db.transactions.get(id);
      if (!current) {
        throw new Error('El movimiento no existe.');
      }
      if (current.deleted === 0) {
        return;
      }

      await assertDateAllowed(current.date);

      const restored: Transaction = {
        ...current,
        deleted: 0,
        deletedAt: undefined,
        updatedAt: nextTimestamp(current.updatedAt),
      };
      await db.transactions.put(restored);

      if (restored.planItemId) {
        const item = await db.planItems.get(restored.planItemId);
        if (item && item.status === 'pending' && !item.transactionId) {
          await db.planItems.put({
            ...item,
            status: 'settled',
            transactionId: restored.id,
            updatedAt: nextTimestamp(item.updatedAt),
          });
        }
      }

      await auditRepo.log({
        action: 'restore',
        entity: 'transaction',
        entityId: restored.id,
        summary: `${typeLabel(restored)} restaurado: ${restored.description}`,
        before: current,
        after: restored,
      });
    });
  },

  async findByPlanItem(planItemId: UUID): Promise<Transaction | undefined> {
    return db.transactions
      .where('planItemId')
      .equals(planItemId)
      .and((transaction) => !transaction.deleted)
      .first();
  },

  async countByCategory(categoryId: UUID): Promise<number> {
    return db.transactions
      .where('categoryId')
      .equals(categoryId)
      .and((transaction) => !transaction.deleted)
      .count();
  },
};
