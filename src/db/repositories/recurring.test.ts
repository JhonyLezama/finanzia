import { beforeEach, describe, expect, it } from 'vitest';
import { asCents } from '@/domain/money';
import type { Category, MonthKey } from '@/domain/models';
import { ConflictError, db } from '../db';
import { resetDb } from '../test-utils';
import { auditRepo } from './audit';
import { categoryRepo } from './categories';
import { planRepo } from './plans';
import { recurringRepo, type RecurringRuleInput } from './recurring';

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
  it('does not alter existing plan items when a rule changes', async () => {
    const rule = await recurringRepo.create(ruleInput());
    await planRepo.getOrCreate('2026-10' as MonthKey);
    const items = await planRepo.ensureItems('2026-10' as MonthKey);
    const before = items[0];

    await recurringRepo.update(rule.id, { amountCents: asCents(40000) }, ctx(rule));

    const after = await db.planItems.get(before!.id);
    expect(after?.amountCents).toBe(before?.amountCents);
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

describe('recurringRepo.remove', () => {
  it('removes the rule but keeps its historical plan items', async () => {
    const rule = await recurringRepo.create(ruleInput());
    await planRepo.getOrCreate('2026-10' as MonthKey);
    const items = await planRepo.ensureItems('2026-10' as MonthKey);

    await recurringRepo.remove(rule.id);

    expect(await db.recurringRules.get(rule.id)).toBeUndefined();
    expect(await db.planItems.get(items[0]!.id)).toBeDefined();
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
