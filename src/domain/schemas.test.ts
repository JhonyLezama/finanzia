import { describe, expect, it } from 'vitest';
import { transactionSchema } from './schemas';

const baseTransaction = {
  id: '4f6f4f3e-5f7a-4b8d-9c1e-2a3b4c5d6e7f',
  type: 'expense',
  direction: 'out',
  amountCents: 6000,
  currency: 'PEN',
  date: '2026-10-28',
  categoryId: '6f6f4f3e-5f7a-4b8d-9c1e-2a3b4c5d6e7f',
  description: 'Cine',
  source: 'manual',
  createdAt: '2026-10-28T12:00:00.000Z',
  updatedAt: '2026-10-28T12:00:00.000Z',
  deleted: 0 as const,
};

describe('transactionSchema', () => {
  it('accepts a valid expense', () => {
    expect(transactionSchema.safeParse(baseTransaction).success).toBe(true);
  });

  it('rejects an expense with the wrong direction', () => {
    expect(
      transactionSchema.safeParse({ ...baseTransaction, direction: 'in' }).success,
    ).toBe(false);
  });

  it('rejects a goal deposit without a goalId', () => {
    expect(
      transactionSchema.safeParse({
        ...baseTransaction,
        type: 'goal_deposit',
        direction: 'out',
      }).success,
    ).toBe(false);
  });

  it('rejects a negative amount', () => {
    expect(
      transactionSchema.safeParse({ ...baseTransaction, amountCents: -6000 }).success,
    ).toBe(false);
  });

  it('rejects a malformed date', () => {
    expect(transactionSchema.safeParse({ ...baseTransaction, date: '28/10/2026' }).success).toBe(
      false,
    );
    expect(transactionSchema.safeParse({ ...baseTransaction, date: '2026-02-30' }).success).toBe(
      false,
    );
  });
});
