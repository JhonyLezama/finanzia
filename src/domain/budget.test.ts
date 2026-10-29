import { describe, expect, it } from 'vitest';
import { asCents } from './money';
import type { ISODate, MonthlyPlan, Transaction } from './models';
import { computeBudgetSnapshot, computeSavingsRate, computeVariance } from './budget';
import { fixtureOctober2026, fixtureTransactions } from '@/test/fixtures/october-2026';

describe('computeBudgetSnapshot', () => {
  const fixture = fixtureOctober2026();

  it('computes available, spendable, and variance for October 2026', () => {
    const snap = computeBudgetSnapshot(fixture);

    expect(snap.availableCents).toBe(227000);
    expect(snap.pendingFixedCents).toBe(12000);
    expect(snap.remainingSavingsCents).toBe(10000);
    expect(snap.spendableCents).toBe(205000);
    expect(snap.monthExpenseCents).toBe(63000);
    expect(snap.fixedExpenseCents).toBe(38000);
    expect(snap.variableExpenseCents).toBe(25000);
    expect(snap.varianceCents).toBe(-77000);
  });

  it('computes the monthly metrics from the spec', () => {
    const snap = computeBudgetSnapshot(fixture);

    expect(snap.monthIncomeCents).toBe(220000);
    expect(snap.fixedPlanCents).toBe(50000);
    expect(snap.variablePlanCents).toBe(90000);
    expect(snap.planExpenseCents).toBe(140000);
    expect(snap.variancePct).toBeCloseTo(-0.55, 6);
    expect(snap.executionPct).toBeCloseTo(0.45, 6);
    expect(snap.savingsRate).toBeCloseTo(0.713636, 6);
    expect(snap.fixedCostRatio).toBeCloseTo(0.172727, 6);
    expect(snap.goalFundingRate).toBeCloseTo(0.090909, 6);
    expect(snap.monthlyGoalContribCents).toBe(20000);
  });

  it('ignores deleted transactions', () => {
    const transactions: Transaction[] = fixture.transactions.map((tx) =>
      tx.id === 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
        ? { ...tx, deleted: 1 as const }
        : tx,
    );

    const snap = computeBudgetSnapshot({ ...fixture, transactions });

    expect(snap.monthExpenseCents).toBe(38000);
    expect(snap.variableExpenseCents).toBe(0);
  });

  it('treats an unlinked fixed-category expense as fixed and uncategorized as variable', () => {
    const extra = fixture.transactions[1] as Transaction;
    const unlinkedFixed: Transaction = {
      ...extra,
      id: '13131313-1313-4313-8313-131313131313',
      type: 'expense',
      direction: 'out',
      amountCents: asCents(5000),
      date: '2026-10-12' as ISODate,
      categoryId: '11111111-1111-4111-8111-111111111111',
      description: 'Reparación',
    };
    const uncategorized: Transaction = {
      ...extra,
      id: '14141414-1414-4414-8414-141414141414',
      type: 'expense',
      direction: 'out',
      amountCents: asCents(3000),
      date: '2026-10-13' as ISODate,
      categoryId: undefined,
      description: 'Varios',
    };

    const snap = computeBudgetSnapshot({
      ...fixture,
      transactions: [...fixture.transactions, unlinkedFixed, uncategorized],
    });

    expect(snap.fixedExpenseCents).toBe(43000);
    expect(snap.variableExpenseCents).toBe(28000);
  });

  it('returns null ratios when the month has no income', () => {
    const noIncome = fixture.transactions.filter((tx) => tx.type !== 'income');
    const snap = computeBudgetSnapshot({
      ...fixture,
      transactions: noIncome,
    });

    expect(snap.savingsRate).toBeNull();
    expect(snap.fixedCostRatio).toBeNull();
    expect(snap.goalFundingRate).toBeNull();
  });

  it('does not reserve savings already covered by goal deposits', () => {
    const plan: MonthlyPlan = {
      ...fixture.plan,
      savingsTargetCents: asCents(15000) as MonthlyPlan['savingsTargetCents'],
    };

    const snap = computeBudgetSnapshot({ ...fixture, plan });

    expect(snap.remainingSavingsCents).toBe(0);
    expect(snap.spendableCents).toBe(215000);
  });
});

describe('computeVariance', () => {
  it('returns an absolute and relative overspend', () => {
    expect(computeVariance(asCents(63000), asCents(140000))).toEqual({
      varianceCents: -77000,
      variancePct: -0.55,
    });
  });

  it('returns a null percentage when the plan is zero', () => {
    expect(computeVariance(asCents(5000), asCents(0))).toEqual({
      varianceCents: 5000,
      variancePct: null,
    });
  });
});

describe('computeSavingsRate', () => {
  it('computes income minus expense over income', () => {
    expect(computeSavingsRate(asCents(220000), asCents(63000))).toBeCloseTo(0.713636, 6);
  });

  it('returns null without income', () => {
    expect(computeSavingsRate(asCents(0), asCents(1000))).toBeNull();
  });
});

describe('fixture sanity', () => {
  it('keeps every stored amount as integer cents', () => {
    for (const tx of fixtureTransactions()) {
      expect(Number.isInteger(tx.amountCents)).toBe(true);
      expect(tx.amountCents).toBeGreaterThan(0);
    }
  });
});
