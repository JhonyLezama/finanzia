import { beforeEach, describe, expect, it } from 'vitest';
import { goalBalance } from '@/domain/goals';
import { asCents } from '@/domain/money';
import type { Category, Goal, ISODate } from '@/domain/models';
import { ConflictError, db } from '../db';
import { resetDb } from '../test-utils';
import { auditRepo } from './audit';
import { categoryRepo } from './categories';
import { goalRepo } from './goals';
import { transactionRepo } from './transactions';

function ctx(goal: { updatedAt: string }) {
  return { expectedUpdatedAt: goal.updatedAt };
}

let sueldo: Category;
let goal: Goal;

async function availableCents(): Promise<number> {
  const transactions = await transactionRepo.listAll();
  return transactions.reduce(
    (sum, transaction) =>
      sum + (transaction.direction === 'in' ? transaction.amountCents : -transaction.amountCents),
    0,
  );
}

beforeEach(async () => {
  await resetDb();
  await categoryRepo.ensureDefaults();
  const categories = await categoryRepo.list();
  sueldo = categories.find((category) => category.name === 'Sueldo') as Category;

  await transactionRepo.create({
    type: 'income',
    direction: 'in',
    amountCents: asCents(220000),
    date: '2026-10-01' as ISODate,
    categoryId: sueldo.id,
    description: 'Sueldo',
    source: 'manual',
  });

  goal = await goalRepo.create({
    name: 'Viaje a Cusco',
    targetCents: asCents(60000),
    targetDate: '2027-06-01' as ISODate,
  });
});

describe('goalRepo.create', () => {
  it('creates an active goal and writes audit', async () => {
    expect(goal).toMatchObject({
      name: 'Viaje a Cusco',
      targetCents: 60000,
      status: 'active',
    });
    expect(goal.colorToken).toBeTruthy();
    expect((await auditRepo.list())[0]).toMatchObject({
      action: 'create',
      entity: 'goal',
      entityId: goal.id,
    });
  });

  it('rejects a goal without a positive target', async () => {
    await expect(
      goalRepo.create({ name: 'Vacía', targetCents: asCents(0) }),
    ).rejects.toThrow();
  });
});

describe('goalRepo.contribute', () => {
  it('contributes to a goal and reduces available', async () => {
    const before = await availableCents();

    const { goal: contributed, transaction } = await goalRepo.contribute(goal.id, {
      amountCents: asCents(30000),
      date: '2026-10-20' as ISODate,
    });

    expect(await availableCents()).toBe(before - 30000);
    expect(goalBalance(goal.id, await transactionRepo.listAll())).toBe(30000);
    expect(transaction.type).toBe('goal_deposit');
    expect(transaction.direction).toBe('out');
    expect(contributed.updatedAt > goal.updatedAt).toBe(true);
    expect(contributed.completedAt).toBeUndefined();
  });

  it('marks the goal complete when the target is reached', async () => {
    const { goal: completed } = await goalRepo.contribute(goal.id, {
      amountCents: asCents(60000),
      date: '2026-10-20' as ISODate,
    });

    expect(completed.completedAt).toBeTruthy();
  });

  it('rejects contributions to an archived goal', async () => {
    await goalRepo.archive(goal.id, { withdrawToAvailable: false });

    await expect(
      goalRepo.contribute(goal.id, {
        amountCents: asCents(10000),
        date: '2026-10-20' as ISODate,
      }),
    ).rejects.toThrow(/archivada/i);
  });
});

describe('goalRepo.withdraw', () => {
  beforeEach(async () => {
    await goalRepo.contribute(goal.id, {
      amountCents: asCents(30000),
      date: '2026-10-20' as ISODate,
    });
    goal = (await goalRepo.get(goal.id)) as Goal;
  });

  it('withdraws from a goal and raises available', async () => {
    const before = await availableCents();

    const { goal: withdrawn, transaction } = await goalRepo.withdraw(goal.id, {
      amountCents: asCents(10000),
      date: '2026-10-21' as ISODate,
    });

    expect(await availableCents()).toBe(before + 10000);
    expect(goalBalance(goal.id, await transactionRepo.listAll())).toBe(20000);
    expect(transaction.type).toBe('goal_withdraw');
    expect(transaction.direction).toBe('in');
    expect(withdrawn.completedAt).toBeUndefined();
  });

  it('rejects withdrawing more than the goal balance', async () => {
    await expect(
      goalRepo.withdraw(goal.id, {
        amountCents: asCents(30001),
        date: '2026-10-21' as ISODate,
      }),
    ).rejects.toThrow(/saldo/i);
  });

  it('clears completedAt when the balance falls below the target', async () => {
    await goalRepo.contribute(goal.id, {
      amountCents: asCents(30000),
      date: '2026-10-22' as ISODate,
    });
    expect((await goalRepo.get(goal.id)).completedAt).toBeTruthy();

    const { goal: withdrawn } = await goalRepo.withdraw(goal.id, {
      amountCents: asCents(1000),
      date: '2026-10-23' as ISODate,
    });

    expect(withdrawn.completedAt).toBeUndefined();
  });
});

describe('goalRepo.archive', () => {
  it('archives a goal with balance by withdrawing to available', async () => {
    await goalRepo.contribute(goal.id, {
      amountCents: asCents(30000),
      date: '2026-10-20' as ISODate,
    });

    const archived = await goalRepo.archive(goal.id, { withdrawToAvailable: true });

    expect(archived.status).toBe('archived');
    expect(await availableCents()).toBe(220000);
    expect(goalBalance(goal.id, await transactionRepo.listAll())).toBe(0);
    expect((await auditRepo.list())[0]?.action).toBe('goal_archive');
  });

  it('rejects archiving a goal with balance without withdrawing', async () => {
    await goalRepo.contribute(goal.id, {
      amountCents: asCents(30000),
      date: '2026-10-20' as ISODate,
    });

    await expect(
      goalRepo.archive(goal.id, { withdrawToAvailable: false }),
    ).rejects.toThrow(/saldo/i);
  });

  it('archives an empty goal without a withdrawal', async () => {
    const archived = await goalRepo.archive(goal.id, { withdrawToAvailable: false });

    expect(archived.status).toBe('archived');
    expect(await availableCents()).toBe(220000);
  });
});

describe('goalRepo.update', () => {
  it('updates the name and target and advances updatedAt', async () => {
    const updated = await goalRepo.update(
      goal.id,
      { name: 'Viaje a Arequipa', targetCents: asCents(80000) },
      ctx(goal),
    );

    expect(updated.name).toBe('Viaje a Arequipa');
    expect(updated.targetCents).toBe(80000);
    expect(updated.updatedAt > goal.updatedAt).toBe(true);
  });

  it('rejects a stale update', async () => {
    await goalRepo.update(goal.id, { name: 'Otro' }, ctx(goal));

    await expect(
      goalRepo.update(goal.id, { name: 'Tercero' }, ctx(goal)),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});

describe('goalRepo queries', () => {
  it('lists active goals by default and includes archived on request', async () => {
    const other = await goalRepo.create({
      name: 'Emergencias',
      targetCents: asCents(100000),
    });
    await goalRepo.archive(other.id, { withdrawToAvailable: false });

    expect((await goalRepo.list()).map((entry) => entry.id)).toEqual([goal.id]);
    expect(await goalRepo.list({ includeArchived: true })).toHaveLength(2);
  });

  it('throws when a goal does not exist', async () => {
    await expect(goalRepo.get('00000000-0000-4000-8000-000000000000')).rejects.toThrow(
      /meta/i,
    );
    expect(await db.goals.count()).toBe(1);
  });
});
