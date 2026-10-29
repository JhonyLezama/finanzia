import { beforeEach, describe, expect, it } from 'vitest';
import { ConflictError } from '../db';
import { resetDb } from '../test-utils';
import { categoryRepo } from './categories';

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
