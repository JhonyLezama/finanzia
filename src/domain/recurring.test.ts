import { describe, expect, it } from 'vitest';
import type { MonthKey, PlanItem, RecurringRule } from './models';
import { generatePlanItemsForMonth } from './recurring';
import { octoberCategories } from '@/test/fixtures/october-2026';

const createdAt = '2026-01-01T00:00:00.000Z' as RecurringRule['createdAt'];

const rent: RecurringRule = {
  id: 'rent',
  name: 'Alquiler',
  kind: 'fixed_expense',
  amountCents: 38000 as RecurringRule['amountCents'],
  categoryId: '11111111-1111-4111-8111-111111111111',
  dayOfMonth: 31,
  startMonth: '2026-01' as MonthKey,
  active: 1,
  createdAt,
  updatedAt: createdAt,
};

const internet: RecurringRule = {
  id: 'internet',
  name: 'Internet',
  kind: 'fixed_expense',
  amountCents: 12000 as RecurringRule['amountCents'],
  categoryId: '22222222-2222-4222-8222-222222222222',
  dayOfMonth: 15,
  startMonth: '2026-01' as MonthKey,
  active: 1,
  createdAt,
  updatedAt: createdAt,
};

const inactive: RecurringRule = {
  ...internet,
  id: 'inactive',
  name: 'Gimnasio',
  active: 0,
  categoryId: '33333333-3333-4333-8333-333333333333',
};

const future: RecurringRule = {
  ...internet,
  id: 'future',
  name: 'Seguro',
  startMonth: '2027-01' as MonthKey,
};

const finished: RecurringRule = {
  ...internet,
  id: 'finished',
  name: 'Curso',
  endMonth: '2026-01' as MonthKey,
};

const wrongCategory: RecurringRule = {
  ...internet,
  id: 'wrong-category',
  name: 'Comida',
  categoryId: '44444444-4444-4444-8444-444444444444',
};

const rules: RecurringRule[] = [rent, internet, inactive, future, finished, wrongCategory];

function asItems(
  generated: Array<Omit<PlanItem, 'id' | 'createdAt' | 'updatedAt' | 'status'>>,
): PlanItem[] {
  return generated.map((item, index) => ({
    ...item,
    id: `generated-${index}`,
    status: 'pending' as const,
    createdAt,
    updatedAt: createdAt,
  }));
}

describe('generatePlanItemsForMonth', () => {
  it('generates one item per active rule and is idempotent', () => {
    const first = generatePlanItemsForMonth({
      month: '2026-10' as MonthKey,
      rules,
      existing: [],
      categories: octoberCategories,
    });
    const second = generatePlanItemsForMonth({
      month: '2026-10' as MonthKey,
      rules,
      existing: asItems(first),
      categories: octoberCategories,
    });

    expect(first).toHaveLength(2);
    expect(second).toHaveLength(0);
    expect(first.map((item) => item.recurringRuleId).sort()).toEqual(['internet', 'rent']);
  });

  it('clamps day 31 to the last day of the month', () => {
    const items = generatePlanItemsForMonth({
      month: '2026-04' as MonthKey,
      rules,
      existing: [],
      categories: octoberCategories,
    });

    expect(items.find((item) => item.recurringRuleId === 'rent')?.dueDate).toBe('2026-04-30');
    expect(items.find((item) => item.recurringRuleId === 'internet')?.dueDate).toBe('2026-04-15');
  });

  it('skips inactive, out-of-range, and mismatched-category rules', () => {
    const items = generatePlanItemsForMonth({
      month: '2026-02' as MonthKey,
      rules,
      existing: [],
      categories: octoberCategories,
    });

    expect(items).toHaveLength(2);
    expect(items.some((item) => item.recurringRuleId === 'inactive')).toBe(false);
    expect(items.some((item) => item.recurringRuleId === 'future')).toBe(false);
    expect(items.some((item) => item.recurringRuleId === 'wrong-category')).toBe(false);
  });

  it('excludes a rule after its end month', () => {
    const items = generatePlanItemsForMonth({
      month: '2026-04' as MonthKey,
      rules,
      existing: [],
      categories: octoberCategories,
    });

    expect(items.some((item) => item.recurringRuleId === 'finished')).toBe(false);
  });

  it('generates expected income with the income category', () => {
    const salary: RecurringRule = {
      ...rent,
      id: 'salary',
      name: 'Sueldo',
      kind: 'expected_income',
      categoryId: '66666666-6666-4666-8666-666666666666',
      amountCents: 220000 as RecurringRule['amountCents'],
      dayOfMonth: 1,
    };

    const items = generatePlanItemsForMonth({
      month: '2026-10' as MonthKey,
      rules: [salary],
      existing: [],
      categories: octoberCategories,
    });

    expect(items).toEqual([
      expect.objectContaining({
        planId: '2026-10',
        kind: 'expected_income',
        name: 'Sueldo',
        amountCents: 220000,
        dueDate: '2026-10-01',
        recurringRuleId: 'salary',
      }),
    ]);
  });
});
