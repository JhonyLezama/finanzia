import { beforeEach, describe, expect, it } from 'vitest';
import { asCents } from '@/domain/money';
import type {
  Category,
  ISODate,
  ISOTimestamp,
  MonthKey,
  RecurringRule,
} from '@/domain/models';
import { ConflictError, db } from '../db';
import { resetDb } from '../test-utils';
import { auditRepo } from './audit';
import { categoryRepo } from './categories';
import { planRepo } from './plans';
import { addMonths, currentMonth, todayInLima } from '@/domain/dates';
import { reminderStateRepo } from './reminder-states';
import { transactionRepo } from './transactions';

const timestamp = '2026-01-01T00:00:00.000Z' as ISOTimestamp;

function ctx(entity: { updatedAt: string }) {
  return { expectedUpdatedAt: entity.updatedAt };
}

function rule(partial: Partial<RecurringRule> & Pick<RecurringRule, 'id' | 'name' | 'categoryId'>): RecurringRule {
  return {
    kind: 'fixed_expense',
    amountCents: asCents(38000),
    dayOfMonth: 5,
    startMonth: '2026-01' as MonthKey,
    active: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...partial,
  };
}

let vivienda: Category;
let servicios: Category;
let comida: Category;
let sueldo: Category;

beforeEach(async () => {
  await resetDb();
  await categoryRepo.ensureDefaults();
  const categories = await categoryRepo.list();
  vivienda = categories.find((category) => category.name === 'Vivienda') as Category;
  servicios = categories.find((category) => category.name === 'Servicios') as Category;
  comida = categories.find((category) => category.name === 'Comida') as Category;
  sueldo = categories.find((category) => category.name === 'Sueldo') as Category;
});

const RENT_RULE_ID = '11111111-1111-4111-8111-111111111111';
const INTERNET_RULE_ID = '22222222-2222-4222-8222-222222222222';
const SALARY_RULE_ID = '33333333-3333-4333-8333-333333333333';

async function seedOctoberPlan() {
  await db.recurringRules.bulkAdd([
    rule({ id: RENT_RULE_ID, name: 'Alquiler', categoryId: vivienda.id, dayOfMonth: 5 }),
    rule({
      id: INTERNET_RULE_ID,
      name: 'Internet',
      categoryId: servicios.id,
      amountCents: asCents(12000),
      dayOfMonth: 15,
    }),
  ]);
  const plan = await planRepo.getOrCreate('2026-10' as MonthKey);
  const items = await planRepo.ensureItems('2026-10' as MonthKey);
  return { plan, items };
}

describe('planRepo.getOrCreate', () => {
  it('creates the plan for a month and returns it on later calls', async () => {
    const plan = await planRepo.getOrCreate('2026-10' as MonthKey);
    const again = await planRepo.getOrCreate('2026-10' as MonthKey);

    expect(plan).toMatchObject({
      id: '2026-10',
      year: 2026,
      month: 10,
      status: 'active',
      savingsTargetCents: 0,
    });
    expect(plan.variableBudgets).toEqual([]);
    expect(again.updatedAt).toBe(plan.updatedAt);
  });
});

describe('planRepo.ensureItems', () => {
  it('generates recurring items idempotently', async () => {
    const { plan, items } = await seedOctoberPlan();
    const second = await planRepo.ensureItems('2026-10' as MonthKey);

    expect(plan.status).toBe('active');
    expect(items).toHaveLength(2);
    expect(second).toHaveLength(0);
    expect(items.map((item) => item.name).sort()).toEqual(['Alquiler', 'Internet']);
    expect(items.every((item) => item.status === 'pending')).toBe(true);
  });

  it('clamps the due date to the last day of a short month', async () => {
    await db.recurringRules.add(
      rule({ id: RENT_RULE_ID, name: 'Alquiler', categoryId: vivienda.id, dayOfMonth: 31 }),
    );
    await planRepo.getOrCreate('2026-04' as MonthKey);

    const items = await planRepo.ensureItems('2026-04' as MonthKey);

    expect(items).toHaveLength(1);
    expect(items[0]?.dueDate).toBe('2026-04-30');
  });
});

describe('planRepo.payItem', () => {
  it('pays a fixed item, settles it, and links the transaction', async () => {
    const { items } = await seedOctoberPlan();
    const rent = items.find((item) => item.name === 'Alquiler');

    const { item, transaction } = await planRepo.payItem(
      rent!.id,
      { amountCents: asCents(38000), date: '2026-10-05' as ISODate },
      ctx(rent!),
    );

    expect(item.status).toBe('settled');
    expect(item.transactionId).toBe(transaction.id);
    expect(transaction.planItemId).toBe(item.id);
    expect(transaction.type).toBe('expense');
    expect(transaction.source).toBe('recurring');
    expect(transaction.categoryId).toBe(vivienda.id);

    const entries = await auditRepo.list();
    expect(entries.some((entry) => entry.entity === 'plan_item')).toBe(true);
  });

  it('rejects paying the same item twice', async () => {
    const { items } = await seedOctoberPlan();
    const rent = items.find((item) => item.name === 'Alquiler');

    await planRepo.payItem(
      rent!.id,
      { amountCents: asCents(38000), date: '2026-10-05' as ISODate },
      ctx(rent!),
    );

    await expect(
      planRepo.payItem(
        rent!.id,
        { amountCents: asCents(38000), date: '2026-10-05' as ISODate },
        ctx(rent!),
      ),
    ).rejects.toThrow(/liquidado/i);
  });

  it('rejects paying a skipped item', async () => {
    const { items } = await seedOctoberPlan();
    const rent = items.find((item) => item.name === 'Alquiler');
    const skipped = await planRepo.skipItem(rent!.id, ctx(rent!));

    await expect(
      planRepo.payItem(
        rent!.id,
        { amountCents: asCents(38000), date: '2026-10-05' as ISODate },
        ctx(skipped),
      ),
    ).rejects.toThrow(/omitido/i);
  });

  it('rejects a stale item update', async () => {
    const { items } = await seedOctoberPlan();
    const rent = items.find((item) => item.name === 'Alquiler');

    await planRepo.payItem(
      rent!.id,
      { amountCents: asCents(38000), date: '2026-10-05' as ISODate },
      ctx(rent!),
    );

    await expect(
      planRepo.skipItem(rent!.id, ctx(rent!)),
    ).rejects.toThrow(/liquidado|conflicto|actualiz/i);
  });
});

describe('planRepo.receiveItem', () => {
  it('receives an expected income and creates an income transaction', async () => {
    await db.recurringRules.add(
      rule({
        id: SALARY_RULE_ID,
        name: 'Sueldo',
        kind: 'expected_income',
        categoryId: sueldo.id,
        amountCents: asCents(220000),
        dayOfMonth: 1,
      }),
    );
    await planRepo.getOrCreate('2026-10' as MonthKey);
    const items = await planRepo.ensureItems('2026-10' as MonthKey);
    const salary = items.find((item) => item.kind === 'expected_income');

    const { item, transaction } = await planRepo.receiveItem(
      salary!.id,
      { amountCents: asCents(220000), date: '2026-10-01' as ISODate },
      ctx(salary!),
    );

    expect(item.status).toBe('settled');
    expect(transaction.type).toBe('income');
    expect(transaction.direction).toBe('in');
    expect(transaction.planItemId).toBe(item.id);
  });
});

describe('planRepo.skipItem', () => {
  it('marks an item as skipped', async () => {
    const { items } = await seedOctoberPlan();
    const internet = items.find((item) => item.name === 'Internet');

    const skipped = await planRepo.skipItem(internet!.id, ctx(internet!));

    expect(skipped.status).toBe('skipped');
    expect(skipped.updatedAt > internet!.updatedAt).toBe(true);
  });
});

describe('planRepo.update', () => {
  it('updates the savings target and variable budgets', async () => {
    const plan = await planRepo.getOrCreate('2026-10' as MonthKey);

    const updated = await planRepo.update(
      '2026-10' as MonthKey,
      {
        savingsTargetCents: asCents(30000),
        variableBudgets: [{ categoryId: comida.id, plannedCents: asCents(60000) }],
      },
      ctx(plan),
    );

    expect(updated.savingsTargetCents).toBe(30000);
    expect(updated.variableBudgets).toEqual([
      { categoryId: comida.id, plannedCents: 60000 },
    ]);
    expect(updated.updatedAt > plan.updatedAt).toBe(true);
  });

  it('rejects a stale update', async () => {
    const plan = await planRepo.getOrCreate('2026-10' as MonthKey);
    await planRepo.update(
      '2026-10' as MonthKey,
      { savingsTargetCents: asCents(30000) },
      ctx(plan),
    );

    await expect(
      planRepo.update(
        '2026-10' as MonthKey,
        { savingsTargetCents: asCents(40000) },
        ctx(plan),
      ),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('rejects variable budgets for fixed categories or duplicates', async () => {
    const plan = await planRepo.getOrCreate('2026-10' as MonthKey);

    await expect(
      planRepo.update(
        '2026-10' as MonthKey,
        { variableBudgets: [{ categoryId: vivienda.id, plannedCents: asCents(1000) }] },
        ctx(plan),
      ),
    ).rejects.toThrow(/categoría|variable/i);

    await expect(
      planRepo.update(
        '2026-10' as MonthKey,
        {
          variableBudgets: [
            { categoryId: comida.id, plannedCents: asCents(1000) },
            { categoryId: comida.id, plannedCents: asCents(2000) },
          ],
        },
        ctx(plan),
      ),
    ).rejects.toThrow(/duplicad/i);
  });

  it('rejects edits on a closed plan', async () => {
    const plan = await planRepo.getOrCreate('2026-10' as MonthKey);
    await db.plans.update(plan.id, { status: 'closed' });

    await expect(
      planRepo.update(
        '2026-10' as MonthKey,
        { savingsTargetCents: asCents(30000) },
        ctx(plan),
      ),
    ).rejects.toThrow(/cerrado/i);
  });
});

describe('planRepo.copyFromPrevious', () => {
  it('copies the savings target and variable budgets only', async () => {
    const previous = await planRepo.getOrCreate('2026-09' as MonthKey);
    await planRepo.update(
      '2026-09' as MonthKey,
      {
        savingsTargetCents: asCents(30000),
        variableBudgets: [{ categoryId: comida.id, plannedCents: asCents(60000) }],
      },
      ctx(previous),
    );

    const copied = await planRepo.copyFromPrevious('2026-10' as MonthKey);

    expect(copied.savingsTargetCents).toBe(30000);
    expect(copied.variableBudgets).toEqual([
      { categoryId: comida.id, plannedCents: 60000 },
    ]);
    expect(copied.status).toBe('active');
  });

  it('creates an empty plan when there is no previous month', async () => {
    const copied = await planRepo.copyFromPrevious('2026-07' as MonthKey);

    expect(copied.savingsTargetCents).toBe(0);
    expect(copied.variableBudgets).toEqual([]);
  });
});

describe('planRepo.close', () => {
  async function seedSeptember() {
    await planRepo.getOrCreate('2026-09' as MonthKey);
    await transactionRepo.create({
      type: 'income',
      direction: 'in',
      amountCents: asCents(220000),
      date: '2026-09-01' as ISODate,
      categoryId: sueldo.id,
      description: 'Sueldo',
      source: 'manual',
    });
    await transactionRepo.create({
      type: 'expense',
      direction: 'out',
      amountCents: asCents(38000),
      date: '2026-09-05' as ISODate,
      categoryId: vivienda.id,
      description: 'Alquiler',
      source: 'manual',
    });
    await transactionRepo.create({
      type: 'expense',
      direction: 'out',
      amountCents: asCents(25000),
      date: '2026-09-10' as ISODate,
      categoryId: comida.id,
      description: 'Comida',
      source: 'manual',
    });
  }

  it('closes a past month with a snapshot and reopens it', async () => {
    await seedSeptember();

    const closed = await planRepo.close('2026-09' as MonthKey);

    expect(closed.status).toBe('closed');
    expect(closed.closedAt).toBeTruthy();
    expect(closed.snapshot).toMatchObject({
      incomeCents: 220000,
      expenseCents: 63000,
      fixedCents: 38000,
      variableCents: 25000,
      savingsCents: 0,
    });

    const entries = await auditRepo.list();
    expect(entries[0]?.action).toBe('close_month');

    const reopened = await planRepo.reopen('2026-09' as MonthKey);

    expect(reopened.status).toBe('active');
    expect(reopened.snapshot?.expenseCents).toBe(63000);
    expect((await auditRepo.list())[0]?.action).toBe('reopen_month');
  });

  it('rejects closing the current or a future month', async () => {
    const current = currentMonth();
    await planRepo.getOrCreate(current);

    await expect(planRepo.close(current)).rejects.toThrow(/termin/i);
    await expect(planRepo.close(addMonths(current, 1))).rejects.toThrow(/termin/i);
  });

  it('rejects closing a month with pending items', async () => {
    await planRepo.getOrCreate('2026-09' as MonthKey);
    await db.planItems.add({
      id: crypto.randomUUID(),
      planId: '2026-09' as MonthKey,
      kind: 'fixed_expense',
      name: 'Internet',
      categoryId: servicios.id,
      amountCents: asCents(12000),
      dueDate: '2026-09-15' as ISODate,
      status: 'pending',
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    await expect(planRepo.close('2026-09' as MonthKey)).rejects.toThrow(/pendiente/i);
  });

  it('blocks transaction writes after closing', async () => {
    await seedSeptember();
    await planRepo.close('2026-09' as MonthKey);

    await expect(
      transactionRepo.create({
        type: 'expense',
        direction: 'out',
        amountCents: asCents(1000),
        date: '2026-09-20' as ISODate,
        categoryId: comida.id,
        description: 'Tarde',
        source: 'manual',
      }),
    ).rejects.toThrow(/cerrado/i);
  });
});

describe('planRepo.createItem', () => {
  it('creates a pending one-off fixed expense in the current month', async () => {
    const item = await planRepo.createItem({
      name: 'Cena especial',
      amountCents: asCents(15000),
      categoryId: comida.id,
      dueDate: todayInLima(),
    });

    expect(item).toMatchObject({
      name: 'Cena especial',
      kind: 'fixed_expense',
      status: 'pending',
      dueDate: todayInLima(),
      planId: currentMonth(),
    });
    expect(item.recurringRuleId).toBeUndefined();
    expect(await db.plans.get(currentMonth())).toBeTruthy();
  });

  it('rejects a date before the current month', async () => {
    const previous = addMonths(currentMonth(), -1);
    await expect(
      planRepo.createItem({
        name: 'Viejo',
        amountCents: asCents(10000),
        categoryId: comida.id,
        dueDate: `${previous}-01` as ISODate,
      }),
    ).rejects.toThrow(/anterior al mes actual/i);
  });

  it('rejects a closed month', async () => {
    await planRepo.getOrCreate(currentMonth());
    await db.plans.update(currentMonth(), { status: 'closed' });

    await expect(
      planRepo.createItem({
        name: 'Cerrado',
        amountCents: asCents(10000),
        categoryId: comida.id,
        dueDate: todayInLima(),
      }),
    ).rejects.toThrow(/cerrado/i);
  });

  it('rejects an income category', async () => {
    await expect(
      planRepo.createItem({
        name: 'Sueldo',
        amountCents: asCents(10000),
        categoryId: sueldo.id,
        dueDate: todayInLima(),
      }),
    ).rejects.toThrow(/gasto/i);
  });
});

describe('one-off payments', () => {
  it('records a manual source and clears reminder state', async () => {
    const item = await planRepo.createItem({
      name: 'Cena especial',
      amountCents: asCents(15000),
      categoryId: comida.id,
      dueDate: todayInLima(),
    });
    await reminderStateRepo.hide(item.id);

    const { transaction } = await planRepo.payItem(
      item.id,
      { amountCents: item.amountCents, date: todayInLima() },
      { expectedUpdatedAt: item.updatedAt },
    );

    expect(transaction.source).toBe('manual');
    expect(await reminderStateRepo.list()).toEqual([]);
  });

  it('clears reminder state when an item is skipped', async () => {
    const item = await planRepo.createItem({
      name: 'Cena especial',
      amountCents: asCents(15000),
      categoryId: comida.id,
      dueDate: todayInLima(),
    });
    await reminderStateRepo.snooze(
      item.id,
      todayInLima(new Date(Date.now() + 86_400_000)),
    );

    await planRepo.skipItem(item.id, { expectedUpdatedAt: item.updatedAt });
    expect(await reminderStateRepo.list()).toEqual([]);
  });
});
