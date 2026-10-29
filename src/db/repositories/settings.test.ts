import { beforeEach, describe, expect, it } from 'vitest';
import { db, ConflictError } from '../db';
import { resetDb } from '../test-utils';
import { settingsRepo } from './settings';

beforeEach(async () => {
  await resetDb();
});

describe('settingsRepo.get', () => {
  it('creates the singleton on first access', async () => {
    const settings = await settingsRepo.get();

    expect(settings).toMatchObject({
      id: 'app',
      currency: 'PEN',
      locale: 'es-PE',
      timezone: 'America/Lima',
      theme: 'system',
      onboardingStep: 0,
    });
    expect(await db.settings.count()).toBe(1);
  });

  it('returns the stored settings afterwards', async () => {
    const first = await settingsRepo.get();
    const second = await settingsRepo.get();

    expect(second).toEqual(first);
    expect(await db.settings.count()).toBe(1);
  });
});

describe('settingsRepo.update', () => {
  it('applies a patch and advances updatedAt', async () => {
    const created = await settingsRepo.get();

    const updated = await settingsRepo.update({ displayName: 'Jhony', theme: 'dark' });

    expect(updated.displayName).toBe('Jhony');
    expect(updated.theme).toBe('dark');
    expect(updated.updatedAt > created.updatedAt).toBe(true);
  });

  it('rejects a stale update', async () => {
    const created = await settingsRepo.get();
    await settingsRepo.update({ displayName: 'Jhony' }, { expectedUpdatedAt: created.updatedAt });

    await expect(
      settingsRepo.update({ displayName: 'Otra' }, { expectedUpdatedAt: created.updatedAt }),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});

describe('settingsRepo.completeOnboarding', () => {
  it('marks the onboarding as completed', async () => {
    const settings = await settingsRepo.completeOnboarding();

    expect(settings.onboardingStep).toBe(5);
    expect(settings.onboardingCompletedAt).toBeTruthy();
  });
});
