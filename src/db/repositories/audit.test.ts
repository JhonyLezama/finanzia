import { beforeEach, describe, expect, it } from 'vitest';
import { resetDb } from '../test-utils';
import { auditRepo } from './audit';
import { categoryRepo } from './categories';

beforeEach(async () => {
  await resetDb();
});

describe('auditRepo', () => {
  it('writes an audit entry for category creation', async () => {
    const category = await categoryRepo.create({
      name: 'Mascotas',
      kind: 'expense',
      group: 'variable',
    });

    const entries = await auditRepo.list();

    expect(entries[0]).toMatchObject({
      action: 'create',
      entity: 'category',
      entityId: category.id,
    });
  });

  it('returns the newest entries first and respects the limit', async () => {
    await categoryRepo.create({ name: 'Mascotas', kind: 'expense', group: 'variable' });
    const second = await categoryRepo.create({
      name: 'Viajes',
      kind: 'expense',
      group: 'variable',
    });

    const entries = await auditRepo.list(1);

    expect(entries).toHaveLength(1);
    expect(entries[0]?.entityId).toBe(second.id);
  });

  it('records an archive action', async () => {
    const category = await categoryRepo.create({
      name: 'Mascotas',
      kind: 'expense',
      group: 'variable',
    });

    await categoryRepo.archive(category.id);

    const entries = await auditRepo.list();
    expect(entries[0]).toMatchObject({
      action: 'category_archive',
      entity: 'category',
      entityId: category.id,
    });
  });
});
