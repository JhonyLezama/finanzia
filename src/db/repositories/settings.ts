import type { Settings } from '@/domain/models';
import { settingsSchema } from '@/domain/schemas';
import { ConflictError, db, nextTimestamp, nowTimestamp, type Ctx } from '../db';

export type SettingsPatch = Partial<Omit<Settings, 'id' | 'createdAt' | 'updatedAt'>>;

function defaultSettings(): Settings {
  const now = nowTimestamp();
  return settingsSchema.parse({
    id: 'app',
    currency: 'PEN',
    locale: 'es-PE',
    timezone: 'America/Lima',
    theme: 'system',
    onboardingStep: 0,
    createdAt: now,
    updatedAt: now,
  }) as Settings;
}

async function getOrCreate(): Promise<Settings> {
  const existing = await db.settings.get('app');
  if (existing) {
    return existing;
  }

  const settings = defaultSettings();
  await db.settings.add(settings);
  return settings;
}

export const settingsRepo = {
  async get(): Promise<Settings> {
    return db.transaction('rw', db.settings, getOrCreate);
  },

  async update(patch: SettingsPatch, ctx?: Ctx): Promise<Settings> {
    return db.transaction('rw', db.settings, async () => {
      const current = await getOrCreate();

      if (ctx?.expectedUpdatedAt && current.updatedAt !== ctx.expectedUpdatedAt) {
        throw new ConflictError();
      }

      const candidate = settingsSchema.parse({
        ...current,
        ...patch,
        id: 'app',
        createdAt: current.createdAt,
        updatedAt: nextTimestamp(current.updatedAt),
      }) as Settings;

      await db.settings.put(candidate);
      return candidate;
    });
  },

  async completeOnboarding(): Promise<Settings> {
    return settingsRepo.update({
      onboardingStep: 5,
      onboardingCompletedAt: nowTimestamp(),
    });
  },
};
