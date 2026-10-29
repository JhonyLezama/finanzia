import { describe, expect, it } from 'vitest';
import { asCents } from './money';
import type { Goal, ISODate, ISOTimestamp, Transaction } from './models';
import { assertCanWithdraw, goalBalance, goalSummary } from './goals';

const timestamp = '2026-10-01T00:00:00.000Z' as ISOTimestamp;

const goal: Goal = {
  id: 'g1',
  name: 'Viaje a Cusco',
  targetCents: asCents(60000) as Goal['targetCents'],
  status: 'active',
  colorToken: 'goal-1',
  createdAt: timestamp,
  updatedAt: timestamp,
};

function transaction(
  partial: Pick<Transaction, 'type' | 'direction' | 'amountCents' | 'date'> & {
    goalId?: string;
    deleted?: 0 | 1;
    id?: string;
  },
): Transaction {
  return {
    id: partial.id ?? crypto.randomUUID(),
    type: partial.type,
    direction: partial.direction,
    amountCents: partial.amountCents,
    currency: 'PEN',
    date: partial.date,
    description: 'Meta',
    goalId: partial.goalId ?? 'g1',
    source: 'goal',
    createdAt: timestamp,
    updatedAt: timestamp,
    deleted: partial.deleted ?? 0,
  };
}

function deposit(amountCents: number, date: string = '2026-10-01'): Transaction {
  return transaction({
    type: 'goal_deposit',
    direction: 'out',
    amountCents: asCents(amountCents),
    date: date as ISODate,
  });
}

function withdrawal(amountCents: number, date: string = '2026-10-10'): Transaction {
  return transaction({
    type: 'goal_withdraw',
    direction: 'in',
    amountCents: asCents(amountCents),
    date: date as ISODate,
  });
}

function cadence(amounts: number[]): Transaction[] {
  return amounts.map((amount, index) =>
    deposit(amount, `2026-${String(8 + index).padStart(2, '0')}-29`),
  );
}

describe('goalBalance', () => {
  it('computes balance from deposits minus withdrawals', () => {
    expect(goalBalance('g1', [deposit(25000), withdrawal(5000)])).toBe(20000);
  });

  it('ignores deleted movements and other goals', () => {
    expect(
      goalBalance('g1', [
        deposit(25000),
        transaction({
          type: 'goal_deposit',
          direction: 'out',
          amountCents: asCents(9000),
          date: '2026-10-02' as ISODate,
          goalId: 'g2',
        }),
        transaction({
          type: 'goal_deposit',
          direction: 'out',
          amountCents: asCents(4000),
          date: '2026-10-03' as ISODate,
          deleted: 1,
        }),
      ]),
    ).toBe(25000);
  });
});

describe('assertCanWithdraw', () => {
  it('rejects a withdrawal above the goal balance', () => {
    expect(() => assertCanWithdraw(goal, [deposit(10000)], asCents(10001))).toThrow(/saldo/i);
  });

  it('allows a withdrawal equal to the balance', () => {
    expect(() => assertCanWithdraw(goal, [deposit(10000)], asCents(10000))).not.toThrow();
  });

  it('rejects a zero withdrawal', () => {
    expect(() => assertCanWithdraw(goal, [deposit(10000)], asCents(0))).toThrow(/monto/i);
  });
});

const TODAY = '2026-10-29' as ISODate;

describe('goalSummary', () => {
  it('reports progress, remaining, and projection from a three-month pace', () => {
    const summary = goalSummary(goal, cadence([10000, 10000, 10000]), TODAY);

    expect(summary.savedCents).toBe(30000);
    expect(summary.targetCents).toBe(60000);
    expect(summary.progress).toBeCloseTo(0.5, 6);
    expect(summary.remainingCents).toBe(30000);
    expect(summary.paceCents).toBe(10000);
    expect(summary.projectedDate).toBe('2027-01-29');
  });

  it('averages only the last three months with activity', () => {
    const summary = goalSummary(
      { ...goal, targetCents: asCents(150000) as Goal['targetCents'] },
      [
        deposit(1000, '2026-06-29'),
        deposit(10000, '2026-07-29'),
        deposit(10000, '2026-08-29'),
        deposit(10000, '2026-09-29'),
        deposit(10000, '2026-10-29'),
      ],
      TODAY,
    );

    expect(summary.paceCents).toBe(10000);
  });

  it('returns no projection without a positive pace', () => {
    const summary = goalSummary(goal, [], TODAY);

    expect(summary.paceCents).toBe(0);
    expect(summary.projectedDate).toBeNull();
  });

  it('returns no projection when withdrawals outweigh deposits', () => {
    const summary = goalSummary(goal, [withdrawal(5000)], TODAY);

    expect(summary.paceCents).toBe(0);
    expect(summary.projectedDate).toBeNull();
  });

  it('projects today when the goal is complete', () => {
    const summary = goalSummary(goal, [deposit(60000)], TODAY);

    expect(summary.remainingCents).toBe(0);
    expect(summary.progress).toBe(1);
    expect(summary.projectedDate).toBe('2026-10-29');
  });
});
