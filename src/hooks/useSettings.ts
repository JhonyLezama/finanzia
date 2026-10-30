import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect, useRef, useState } from 'react';
import { db, resetDb } from '@/db/db';
import { settingsRepo, type SettingsPatch } from '@/db/repositories/settings';
import type { Settings } from '@/domain/models';
import { useTheme, type ThemePreference } from './useTheme';

export interface StorageState {
  usageCents: number | null;
  quotaCents: number | null;
  persisted: boolean | null;
}

function readStorageSupport(): boolean {
  return typeof navigator !== 'undefined' && Boolean(navigator.storage);
}

export function useSettings() {
  const settings = useLiveQuery(() => db.settings.get('app'), []);
  const { theme, setTheme } = useTheme();
  const themeSynced = useRef(false);
  const [storage, setStorage] = useState<StorageState>({
    usageCents: null,
    quotaCents: null,
    persisted: null,
  });

  useEffect(() => {
    // The repo opens a read-write transaction, so it cannot run inside liveQuery.
    void settingsRepo.get();
  }, []);

  useEffect(() => {
    if (!settings || themeSynced.current) {
      return;
    }
    themeSynced.current = true;
    if (settings.theme !== theme) {
      setTheme(settings.theme);
    }
  }, [settings, setTheme, theme]);

  const readStorage = useCallback(async (): Promise<StorageState> => {
    if (!readStorageSupport()) {
      return { usageCents: null, quotaCents: null, persisted: null };
    }
    const [estimate, persisted] = await Promise.all([
      navigator.storage.estimate?.() ?? Promise.resolve({ usage: undefined, quota: undefined }),
      navigator.storage.persisted?.() ?? Promise.resolve(false),
    ]);
    return {
      usageCents: estimate.usage ?? null,
      quotaCents: estimate.quota ?? null,
      persisted,
    };
  }, []);

  const refreshStorage = useCallback(async () => {
    setStorage(await readStorage());
  }, [readStorage]);

  useEffect(() => {
    let active = true;
    void readStorage().then((next) => {
      if (active) {
        setStorage(next);
      }
    });
    return () => {
      active = false;
    };
  }, [readStorage]);

  const update = useCallback(async (patch: SettingsPatch): Promise<Settings> => {
    return settingsRepo.update(patch);
  }, []);

  const updateTheme = useCallback(
    async (next: ThemePreference) => {
      setTheme(next);
      await settingsRepo.update({ theme: next });
    },
    [setTheme],
  );

  const requestPersistence = useCallback(async () => {
    if (!readStorageSupport() || !navigator.storage.persist) {
      return;
    }
    await navigator.storage.persist();
    await refreshStorage();
  }, [refreshStorage]);

  const resetAll = useCallback(async () => {
    await resetDb();
  }, []);

  const blockingCategoryIds = useLiveQuery(async () => {
    const [plans, planItems, rules] = await Promise.all([
      db.plans.where('status').equals('active').toArray(),
      db.planItems.toArray(),
      db.recurringRules.toArray(),
    ]);

    const activePlanIds = new Set(plans.map((plan) => plan.id));
    const ids = new Set<string>();

    for (const plan of plans) {
      for (const budget of plan.variableBudgets) {
        ids.add(budget.categoryId);
      }
    }
    for (const item of planItems) {
      if (item.status === 'pending' && activePlanIds.has(item.planId)) {
        ids.add(item.categoryId);
      }
    }
    for (const rule of rules) {
      if (rule.active === 1) {
        ids.add(rule.categoryId);
      }
    }

    return [...ids];
  }, []);

  return {
    settings,
    theme,
    update,
    updateTheme,
    storage,
    refreshStorage,
    requestPersistence,
    resetAll,
    blockingCategoryIds: blockingCategoryIds ?? [],
  };
}
