import { beforeEach, describe, expect, it } from 'vitest';
import { todayInLima } from '@/domain/dates';
import { asCents } from '@/domain/money';
import type {
  Category,
  ISODate,
  ISOTimestamp,
  MonthlyPlan,
  PlanItem,
  Transaction,
} from '@/domain/models';
import { ConflictError, db } from '../db';
import { resetDb } from '../test-utils';
import { auditRepo } from './audit';
import { categoryRepo } from './categories';
import { transactionRepo, type TransactionInput } from './transactions';

const timestamp = '2026-10-01T00:00:00.000Z' as ISOTimestamp;

function shiftDate(date: ISODate, days: number): ISODate {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10) as ISODate;
}

function closedPlan(month: string): MonthlyPlan {
  return {
    id: month as MonthlyPlan['id'],
    year: Number(month.slice(0, 4)),
    month: Number(month.slice(5, 7)),
    status: 'closed',
    savingsTargetCents: asCents(0) as MonthlyPlan['savingsTargetCents'],
    variableBudgets: [],
    createdAt: timestamp,
    updatedAt: timestamp,
    closedAt: timestamp,
  };
}

function planItem(partial: Partial<PlanItem> & Pick<PlanItem, 'id' | 'categoryId'>): PlanItem {
  return {
    planId: '2026-10' as PlanItem['planId'],
    kind: 'fixed_expense',
    name: 'Alquiler',
    amountCents: asCents(38000),
    dueDate: '2026-10-05' as ISODate,
    status: 'pending',
    createdAt: timestamp,
    updatedAt: timestamp,
    ...partial,
  };
}

let comida: Category;
let vivienda: Category;
let sueldo: Category;

beforeEach(async () => {
  await resetDb();
  await categoryRepo.ensureDefaults();
  const categories = await categoryRepo.list();
  comida = categories.find((category) => category.name === 'Comida') as Category;
  vivienda = categories.find((category) => category.name === 'Vivienda') as Category;
  sueldo = categories.find((category) => category.name === 'Sueldo') as Category;
});

function expenseInput(overrides: Partial<TransactionInput> = {}): TransactionInput {
  return {
    type: 'expense',
    direction: 'out',
    amountCents: asCents(6000),
    date: '2026-10-10' as ISODate,
    categoryId: comida.id,
    description: 'Cine',
    source: 'manual',
    ...overrides,
  };
}

describe('transactionRepo.create', () => {
  it('creates an expense and writes audit', async () => {
    const transaction = await transactionRepo.create(
      expenseInput({ amountCents: asCents(6000), description: 'Cine' }),
    );

    expect(transaction.direction).toBe('out');
    expect(transaction.deleted).toBe(0);
    expect(transaction.currency).toBe('PEN');

    const entries = await auditRepo.list();
    expect(entries[0]).toMatchObject({
      action: 'create',
      entity: 'transaction',
      entityId: transaction.id,
    });
  });

  it('creates an income linked to an income category', async () => {
    const transaction = await transactionRepo.create(
      expenseInput({
        type: 'income',
        direction: 'in',
        categoryId: sueldo.id,
        description: 'Sueldo',
      }),
    );

    expect(transaction.type).toBe('income');
  });

  it('rejects a future date', async () => {
    await expect(
      transactionRepo.create(
        expenseInput({ date: shiftDate(todayInLima(), 1) }),
      ),
    ).rejects.toThrow(/futura/i);
  });

  it('rejects a date inside a closed month', async () => {
    await db.plans.add(closedPlan('2026-09'));

    await expect(
      transactionRepo.create(expenseInput({ date: '2026-09-15' as ISODate })),
    ).rejects.toThrow(/cerrado/i);
  });

  it('rejects a category of the wrong kind', async () => {
    await expect(
      transactionRepo.create(expenseInput({ categoryId: sueldo.id })),
    ).rejects.toThrow(/categoría/i);

    await expect(
      transactionRepo.create(
        expenseInput({ type: 'income', direction: 'in', categoryId: comida.id }),
      ),
    ).rejects.toThrow(/categoría/i);
  });

  it('rejects a movement that does not match its plan item', async () => {
    const item = planItem({ id: crypto.randomUUID(), categoryId: vivienda.id });
    await db.planItems.add(item);

    await expect(
      transactionRepo.create(
        expenseInput({
          type: 'income',
          direction: 'in',
          planItemId: item.id,
          categoryId: sueldo.id,
        }),
      ),
    ).rejects.toThrow(/compromiso|tipo/i);

    await expect(
      transactionRepo.create(
        expenseInput({
          planItemId: item.id,
          categoryId: comida.id,
        }),
      ),
    ).rejects.toThrow(/categoría|compromiso/i);

    await expect(
      transactionRepo.create(
        expenseInput({
          planItemId: item.id,
          categoryId: vivienda.id,
          date: '2026-09-05' as ISODate,
        }),
      ),
    ).rejects.toThrow(/mes/i);
  });

  it('rejects a category that does not exist', async () => {
    await expect(
      transactionRepo.create(expenseInput({ categoryId: crypto.randomUUID() })),
    ).rejects.toThrow(/categoría/i);
  });

  it('rejects a goal movement without an existing goal', async () => {
    await expect(
      transactionRepo.create(
        expenseInput({
          type: 'goal_deposit',
          description: 'Aporte',
          categoryId: undefined,
          goalId: crypto.randomUUID(),
        }),
      ),
    ).rejects.toThrow(/meta/i);
  });
});

describe('transactionRepo.update', () => {
  it('updates a manual transaction and advances updatedAt', async () => {
    const created = await transactionRepo.create(expenseInput());

    const updated = await transactionRepo.update(
      created.id,
      { description: 'Cine y cena', amountCents: asCents(9000) },
      { expectedUpdatedAt: created.updatedAt },
    );

    expect(updated.description).toBe('Cine y cena');
    expect(updated.amountCents).toBe(9000);
    expect(updated.updatedAt > created.updatedAt).toBe(true);
  });

  it('rejects a stale update', async () => {
    const created = await transactionRepo.create(expenseInput());
    await transactionRepo.update(
      created.id,
      { description: 'Cine' },
      { expectedUpdatedAt: created.updatedAt },
    );

    await expect(
      transactionRepo.update(
        created.id,
        { description: 'Otra' },
        { expectedUpdatedAt: created.updatedAt },
      ),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('rejects a month change for a transaction linked to a plan item', async () => {
    const item = planItem({ id: crypto.randomUUID(), categoryId: vivienda.id });
    await db.planItems.add(item);
    const created = await transactionRepo.create(
      expenseInput({ planItemId: item.id, categoryId: vivienda.id, date: item.dueDate }),
    );

    await expect(
      transactionRepo.update(
        created.id,
        { date: '2026-11-05' as ISODate },
        { expectedUpdatedAt: created.updatedAt },
      ),
    ).rejects.toThrow(/mes/i);
  });

  it('rejects editing a transaction in a closed month', async () => {
    const created = await transactionRepo.create(expenseInput());
    await db.plans.add({ ...closedPlan('2026-10'), status: 'closed' });

    await expect(
      transactionRepo.update(
        created.id,
        { description: 'Otra' },
        { expectedUpdatedAt: created.updatedAt },
      ),
    ).rejects.toThrow(/cerrado/i);
  });
});

describe('transactionRepo.softDelete', () => {
  it('reopens the plan item when its linked transaction is deleted', async () => {
    const item = planItem({ id: crypto.randomUUID(), categoryId: vivienda.id });
    await db.planItems.add(item);
    const transaction = await transactionRepo.create(
      expenseInput({ planItemId: item.id, categoryId: vivienda.id, date: item.dueDate }),
    );
    await db.planItems.update(item.id, {
      status: 'settled',
      transactionId: transaction.id,
    });

    await transactionRepo.softDelete(transaction.id, {
      expectedUpdatedAt: transaction.updatedAt,
    });

    const reopened = await db.planItems.get(item.id);
    expect(reopened).toMatchObject({ status: 'pending' });
    expect(reopened?.transactionId).toBeUndefined();

    const deleted = await db.transactions.get(transaction.id);
    expect(deleted).toMatchObject({ deleted: 1 });
    expect(deleted?.deletedAt).toBeTruthy();
  });

  it('rejects a stale delete', async () => {
    const created = await transactionRepo.create(expenseInput());
    await transactionRepo.softDelete(created.id, { expectedUpdatedAt: created.updatedAt });

    await expect(
      transactionRepo.softDelete(created.id, { expectedUpdatedAt: created.updatedAt }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('restores a deleted transaction and re-settles its plan item', async () => {
    const item = planItem({ id: crypto.randomUUID(), categoryId: vivienda.id });
    await db.planItems.add(item);
    const transaction = await transactionRepo.create(
      expenseInput({ planItemId: item.id, categoryId: vivienda.id, date: item.dueDate }),
    );
    await db.planItems.update(item.id, { status: 'settled', transactionId: transaction.id });
    await transactionRepo.softDelete(transaction.id, {
      expectedUpdatedAt: transaction.updatedAt,
    });

    await transactionRepo.restore(transaction.id);

    const restored = await db.transactions.get(transaction.id);
    expect(restored).toMatchObject({ deleted: 0 });
    expect(restored?.deletedAt).toBeUndefined();

    const settled = await db.planItems.get(item.id);
    expect(settled).toMatchObject({ status: 'settled', transactionId: transaction.id });
  });
});

describe('transactionRepo queries', () => {
  it('lists a month without deleted transactions', async () => {
    const keep = await transactionRepo.create(expenseInput({ date: '2026-10-10' as ISODate }));
    const remove = await transactionRepo.create(expenseInput({ date: '2026-10-11' as ISODate }));
    await transactionRepo.create(expenseInput({ date: '2026-09-20' as ISODate }));
    await transactionRepo.softDelete(remove.id, { expectedUpdatedAt: remove.updatedAt });

    const october = await transactionRepo.listByMonth('2026-10' as MonthlyPlan['id']);

    expect(october.map((transaction) => transaction.id)).toEqual([keep.id]);
    expect(await transactionRepo.listAll()).toHaveLength(2);
  });

  it('finds the active transaction linked to a plan item', async () => {
    const item = planItem({ id: crypto.randomUUID(), categoryId: vivienda.id });
    await db.planItems.add(item);
    const created = await transactionRepo.create(
      expenseInput({ planItemId: item.id, categoryId: vivienda.id, date: item.dueDate }),
    );

    const found = await transactionRepo.findByPlanItem(item.id);

    expect(found?.id).toBe(created.id);
  });

  it('counts active transactions by category', async () => {
    const created = await transactionRepo.create(expenseInput());
    await transactionRepo.create(expenseInput());
    const deleted = await transactionRepo.create(expenseInput());
    await transactionRepo.softDelete(deleted.id, { expectedUpdatedAt: deleted.updatedAt });

    expect(await transactionRepo.countByCategory(comida.id)).toBe(2);
    expect(created.categoryId).toBe(comida.id);
  });
});

describe('transaction schema integration', () => {
  it('stores only integer cents', async () => {
    const transaction = await transactionRepo.create(expenseInput({ amountCents: asCents(1234) }));

    expect(Number.isInteger(transaction.amountCents)).toBe(true);
  });

  it('rejects an invalid goal direction through the schema', async () => {
    await expect(
      transactionRepo.create(
        expenseInput({
          type: 'goal_deposit',
          direction: 'in',
          categoryId: undefined,
          goalId: crypto.randomUUID(),
        }),
      ),
    ).rejects.toThrow();
  });

  it('returns a typed transaction', async () => {
    const transaction: Transaction = await transactionRepo.create(expenseInput());

    expect(transaction.source).toBe('manual');
  });
});
