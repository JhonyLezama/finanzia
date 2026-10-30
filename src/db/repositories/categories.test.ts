import { beforeEach, describe, expect, it } from 'vitest';
import { currentMonth, todayInLima } from '@/domain/dates';
import { asCents } from '@/domain/money';
import { ConflictError, db } from '../db';
import { resetDb } from '../test-utils';
import { categoryRepo } from './categories';
import { planRepo } from './plans';
import { recurringRepo } from './recurring';
import { transactionRepo } from './transactions';

beforeEach(async () => {
  await resetDb();
});

describe('categoryRepo.ensureDefaults', () => {
  it('creates the 13 default categories once', async () => {
    await categoryRepo.ensureDefaults();
    await categoryRepo.ensureDefaults();

    const categories = await categoryRepo.list();

    expect(categories).toHaveLength(13);
    expect(categories.filter((category) => category.group === 'fixed')).toHaveLength(3);
    expect(categories.filter((category) => category.group === 'variable')).toHaveLength(6);
    expect(categories.filter((category) => category.group === 'income')).toHaveLength(4);
  });

  it('keeps a stable order and marks the defaults', async () => {
    await categoryRepo.ensureDefaults();

    const categories = await categoryRepo.list();

    expect(categories.map((category) => category.order)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,
    ]);
    expect(categories.every((category) => category.isDefault === 1)).toBe(true);
  });
});

describe('categoryRepo.create', () => {
  it('creates an expense category with defaults and appends it to the order', async () => {
    await categoryRepo.ensureDefaults();

    const created = await categoryRepo.create({
      name: 'Mascotas',
      kind: 'expense',
      group: 'variable',
    });

    expect(created).toMatchObject({
      name: 'Mascotas',
      kind: 'expense',
      group: 'variable',
      archived: 0,
      isDefault: 0,
      order: 14,
    });
    expect(created.colorToken).toBeTruthy();
    expect(created.createdAt).toBe(created.updatedAt);
  });

  it('assigns the income group automatically', async () => {
    const created = await categoryRepo.create({ name: 'Alquileres', kind: 'income' });

    expect(created.group).toBe('income');
  });

  it('rejects a duplicate name regardless of case', async () => {
    await categoryRepo.ensureDefaults();

    await expect(
      categoryRepo.create({ name: 'comida', kind: 'expense', group: 'variable' }),
    ).rejects.toThrow(/existe/i);
  });

  it('allows the same name for a different kind', async () => {
    await categoryRepo.ensureDefaults();

    const created = await categoryRepo.create({ name: 'Comida', kind: 'income' });

    expect(created.group).toBe('income');
  });
});

describe('categoryRepo.update', () => {
  it('rejects a stale update', async () => {
    const created = await categoryRepo.create({
      name: 'Mascotas',
      kind: 'expense',
      group: 'variable',
    });
    await categoryRepo.update(
      created.id,
      { name: 'Pets' },
      { expectedUpdatedAt: created.updatedAt },
    );

    await expect(
      categoryRepo.update(
        created.id,
        { name: 'Otra' },
        { expectedUpdatedAt: created.updatedAt },
      ),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('updates the category and advances updatedAt', async () => {
    const created = await categoryRepo.create({
      name: 'Mascotas',
      kind: 'expense',
      group: 'variable',
    });

    const updated = await categoryRepo.update(created.id, { name: 'Pets' });

    expect(updated.name).toBe('Pets');
    expect(updated.updatedAt > created.updatedAt).toBe(true);
    expect(updated.createdAt).toBe(created.createdAt);
  });
});

describe('categoryRepo.archive', () => {
  it('archives instead of deleting and hides it from the default list', async () => {
    const created = await categoryRepo.create({
      name: 'Mascotas',
      kind: 'expense',
      group: 'variable',
    });

    await categoryRepo.archive(created.id);

    expect(await categoryRepo.list()).toHaveLength(0);
    const all = await categoryRepo.list({ includeArchived: true });
    expect(all.find((category) => category.id === created.id)?.archived).toBe(1);
  });
});

describe('categoryRepo.unarchive', () => {
  it('restores an archived category', async () => {
    const created = await categoryRepo.create({
      name: 'Mascotas',
      kind: 'expense',
      group: 'variable',
    });
    await categoryRepo.archive(created.id);

    const restored = await categoryRepo.unarchive(created.id);

    expect(restored.archived).toBe(0);
    expect(
      (await categoryRepo.list()).some((category) => category.id === created.id),
    ).toBe(true);
  });

  it('rejects restoring when another active category uses the name', async () => {
    const first = await categoryRepo.create({
      name: 'Mascotas',
      kind: 'expense',
      group: 'variable',
    });
    await categoryRepo.archive(first.id);
    await categoryRepo.create({
      name: 'Mascotas',
      kind: 'expense',
      group: 'variable',
    });

    await expect(categoryRepo.unarchive(first.id)).rejects.toThrow(/existe/i);
  });
});

describe('categoryRepo.remove', () => {
  it('deletes an unused custom category', async () => {
    const created = await categoryRepo.create({
      name: 'Mascotas',
      kind: 'expense',
      group: 'variable',
    });

    await categoryRepo.remove(created.id);

    expect(await db.categories.get(created.id)).toBeUndefined();
  });

  it('rejects deleting a default category', async () => {
    await categoryRepo.ensureDefaults();
    const food = (await categoryRepo.list()).find((category) => category.name === 'Comida')!;

    await expect(categoryRepo.remove(food.id)).rejects.toThrow(/por defecto/i);
  });

  it('rejects deleting a category with movements', async () => {
    const created = await categoryRepo.create({
      name: 'Mascotas',
      kind: 'expense',
      group: 'variable',
    });
    await transactionRepo.create({
      type: 'expense',
      direction: 'out',
      amountCents: asCents(1500),
      date: todayInLima(),
      categoryId: created.id,
      description: 'Comida del perro',
      source: 'manual',
    });

    await expect(categoryRepo.remove(created.id)).rejects.toThrow(/movimientos|en uso/i);
    expect(await db.categories.get(created.id)).toBeTruthy();
  });

  it('rejects deleting a category used by a recurring rule', async () => {
    const created = await categoryRepo.create({
      name: 'Mascotas',
      kind: 'expense',
      group: 'fixed',
    });
    await recurringRepo.create({
      name: 'Comida del perro',
      kind: 'fixed_expense',
      amountCents: asCents(5000),
      categoryId: created.id,
      dayOfMonth: 1,
      startMonth: currentMonth(),
    });

    await expect(categoryRepo.remove(created.id)).rejects.toThrow(/en uso|recurrente/i);
  });

  it('rejects deleting a category budgeted in a plan', async () => {
    const created = await categoryRepo.create({
      name: 'Mascotas',
      kind: 'expense',
      group: 'variable',
    });
    const plan = await planRepo.getOrCreate(currentMonth());
    await planRepo.update(
      currentMonth(),
      { variableBudgets: [{ categoryId: created.id, plannedCents: asCents(10000) }] },
      { expectedUpdatedAt: plan.updatedAt },
    );

    await expect(categoryRepo.remove(created.id)).rejects.toThrow(/presupuesto|en uso/i);
  });
});

describe('categoryRepo.update group guard', () => {
  it('rejects changing the group of a category in use', async () => {
    const created = await categoryRepo.create({
      name: 'Mascotas',
      kind: 'expense',
      group: 'variable',
    });
    await transactionRepo.create({
      type: 'expense',
      direction: 'out',
      amountCents: asCents(1500),
      date: todayInLima(),
      categoryId: created.id,
      description: 'Comida del perro',
      source: 'manual',
    });

    await expect(
      categoryRepo.update(created.id, { group: 'fixed' }),
    ).rejects.toThrow(/grupo|en uso/i);
  });

  it('allows changing the group when the category is unused', async () => {
    const created = await categoryRepo.create({
      name: 'Mascotas',
      kind: 'expense',
      group: 'variable',
    });

    const updated = await categoryRepo.update(created.id, { group: 'fixed' });

    expect(updated.group).toBe('fixed');
  });
});
