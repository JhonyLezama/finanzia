import { beforeEach, describe, expect, it } from 'vitest';
import { asCents } from '@/domain/money';
import type { Category, ISODate, MonthKey } from '@/domain/models';
import { ConflictError, db } from '../db';
import { resetDb } from '../test-utils';
import { auditRepo } from './audit';
import { categoryRepo } from './categories';
import { planRepo } from './plans';
import { recurringRepo, type RecurringRuleInput } from './recurring';
import { reminderStateRepo } from './reminder-states';

function ctx(entity: { updatedAt: string }) {
  return { expectedUpdatedAt: entity.updatedAt };
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

function ruleInput(overrides: Partial<RecurringRuleInput> = {}): RecurringRuleInput {
  return {
    name: 'Alquiler',
    kind: 'fixed_expense',
    amountCents: asCents(38000),
    categoryId: vivienda.id,
    dayOfMonth: 5,
    startMonth: '2026-01' as MonthKey,
    ...overrides,
  };
}

describe('recurringRepo.create', () => {
  it('creates an active rule and writes audit', async () => {
    const rule = await recurringRepo.create(ruleInput());

    expect(rule.active).toBe(1);
    expect(rule.amountCents).toBe(38000);
    expect((await auditRepo.list())[0]).toMatchObject({
      action: 'create',
      entity: 'recurring_rule',
      entityId: rule.id,
    });
  });

  it('rejects categories that do not match the rule kind', async () => {
    await expect(
      recurringRepo.create(ruleInput({ categoryId: comida.id })),
    ).rejects.toThrow(/categoría/i);

    await expect(
      recurringRepo.create(
        ruleInput({ kind: 'expected_income', categoryId: servicios.id }),
      ),
    ).rejects.toThrow(/categoría/i);
  });

  it('creates an expected income rule with an income category', async () => {
    const rule = await recurringRepo.create(
      ruleInput({
        name: 'Sueldo',
        kind: 'expected_income',
        categoryId: sueldo.id,
        amountCents: asCents(220000),
        dayOfMonth: 1,
      }),
    );

    expect(rule.kind).toBe('expected_income');
  });
});

describe('recurringRepo.update', () => {
  it('updates every pending plan item generated from the rule', async () => {
    const rule = await recurringRepo.create(ruleInput());
    await planRepo.getOrCreate('2026-10' as MonthKey);
    const october = await planRepo.ensureItems('2026-10' as MonthKey);
    await planRepo.getOrCreate('2026-11' as MonthKey);
    const november = await planRepo.ensureItems('2026-11' as MonthKey);

    await recurringRepo.update(
      rule.id,
      {
        name: 'Alquiler casa',
        amountCents: asCents(40000),
        categoryId: servicios.id,
        dayOfMonth: 12,
      },
      ctx(rule),
    );

    for (const item of [october[0]!, november[0]!]) {
      const updated = await db.planItems.get(item.id);
      expect(updated).toMatchObject({
        name: 'Alquiler casa',
        amountCents: 40000,
        categoryId: servicios.id,
        dueDate: `${item.planId}-12`,
      });
    }
  });

  it('keeps settled plan items unchanged when a rule changes', async () => {
    const rule = await recurringRepo.create(ruleInput());
    await planRepo.getOrCreate('2026-10' as MonthKey);
    const [item] = await planRepo.ensureItems('2026-10' as MonthKey);

    await planRepo.payItem(
      item!.id,
      { amountCents: asCents(38000), date: '2026-10-05' as ISODate },
      { expectedUpdatedAt: item!.updatedAt },
    );
    await recurringRepo.update(rule.id, { amountCents: asCents(40000) }, ctx(rule));

    const settled = await db.planItems.get(item!.id);
    expect(settled).toMatchObject({ status: 'settled', amountCents: 38000 });
  });

  it('rejects a stale update', async () => {
    const rule = await recurringRepo.create(ruleInput());
    await recurringRepo.update(rule.id, { amountCents: asCents(40000) }, ctx(rule));

    await expect(
      recurringRepo.update(rule.id, { amountCents: asCents(41000) }, ctx(rule)),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('rejects a category that no longer matches the rule kind', async () => {
    const rule = await recurringRepo.create(ruleInput());

    await expect(
      recurringRepo.update(rule.id, { categoryId: comida.id }, ctx(rule)),
    ).rejects.toThrow(/categoría/i);
  });
});

describe('recurringRepo.pause', () => {
  it('pauses future generation', async () => {
    const rule = await recurringRepo.create(ruleInput());
    await recurringRepo.pause(rule.id);

    await planRepo.getOrCreate('2026-11' as MonthKey);
    const items = await planRepo.ensureItems('2026-11' as MonthKey);

    expect(items.some((item) => item.recurringRuleId === rule.id)).toBe(false);
    expect((await recurringRepo.list()).find((entry) => entry.id === rule.id)?.active).toBe(0);
  });
});

describe('recurringRepo.resume', () => {
  it('reactivates a paused rule so it generates again', async () => {
    const rule = await recurringRepo.create(ruleInput());
    await recurringRepo.pause(rule.id);
    await recurringRepo.resume(rule.id);

    expect((await recurringRepo.list()).find((entry) => entry.id === rule.id)?.active).toBe(1);

    await planRepo.getOrCreate('2026-11' as MonthKey);
    const items = await planRepo.ensureItems('2026-11' as MonthKey);

    expect(items.some((item) => item.recurringRuleId === rule.id)).toBe(true);
  });
});

describe('recurringRepo.remove', () => {
  it('removes the rule and its pending plan items, keeping settled history', async () => {
    const rule = await recurringRepo.create(ruleInput());
    await planRepo.getOrCreate('2026-10' as MonthKey);
    const [octoberItem] = await planRepo.ensureItems('2026-10' as MonthKey);
    await planRepo.getOrCreate('2026-11' as MonthKey);
    const [novemberItem] = await planRepo.ensureItems('2026-11' as MonthKey);

    await planRepo.payItem(
      octoberItem!.id,
      { amountCents: asCents(38000), date: '2026-10-05' as ISODate },
      { expectedUpdatedAt: octoberItem!.updatedAt },
    );
    await reminderStateRepo.hide(novemberItem!.id);

    await recurringRepo.remove(rule.id);

    expect(await db.recurringRules.get(rule.id)).toBeUndefined();
    expect(await db.planItems.get(octoberItem!.id)).toMatchObject({ status: 'settled' });
    expect(await db.planItems.get(novemberItem!.id)).toBeUndefined();
    expect(await db.reminderStates.get(novemberItem!.id)).toBeUndefined();
    expect(await db.transactions.where('planItemId').equals(octoberItem!.id).count()).toBe(1);
  });
});

describe('recurringRepo.list', () => {
  it('returns every rule including paused ones', async () => {
    const first = await recurringRepo.create(ruleInput());
    const second = await recurringRepo.create(
      ruleInput({ name: 'Internet', categoryId: servicios.id, amountCents: asCents(12000) }),
    );
    await recurringRepo.pause(second.id);

    const rules = await recurringRepo.list();

    expect(rules.map((rule) => rule.id)).toEqual([first.id, second.id]);
  });
});
