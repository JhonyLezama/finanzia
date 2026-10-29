import { useCallback, useEffect, useRef, useState } from 'react';
import { categoryRepo } from '@/db/repositories/categories';
import { goalRepo } from '@/db/repositories/goals';
import { planRepo } from '@/db/repositories/plans';
import { recurringRepo } from '@/db/repositories/recurring';
import { seedSampleData } from '@/db/repositories/sample';
import { settingsRepo } from '@/db/repositories/settings';
import { transactionRepo } from '@/db/repositories/transactions';
import { currentMonth, todayInLima } from '@/domain/dates';
import type { Category, Cents, ISODate } from '@/domain/models';

export type OnboardingStep = 0 | 1 | 2 | 3 | 4 | 5;

export interface ProfilePayload {
  displayName: string;
  openingCents: Cents | null;
  direction: 'in' | 'out';
}

export interface IncomePayload {
  name: string;
  amountCents: Cents;
  dayOfMonth: number;
}

export interface FixedPayload {
  name: string;
  amountCents: Cents;
  dayOfMonth: number;
  categoryId: string;
}

export interface GoalPayload {
  name: string;
  targetCents: Cents;
  targetDate?: ISODate;
}

export interface OnboardingSummary {
  income: boolean;
  fixedCount: number;
  goal: boolean;
}

function toStep(value: number): OnboardingStep {
  return Math.min(5, Math.max(0, Math.trunc(value))) as OnboardingStep;
}

function errorMessage(cause: unknown): string {
  if (cause instanceof Error && cause.message) {
    return cause.message;
  }
  return 'No se pudo guardar. Intentá de nuevo.';
}

export function useOnboarding(onComplete: () => void) {
  const [step, setStep] = useState<OnboardingStep>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [incomeCategories, setIncomeCategories] = useState<Category[]>([]);
  const [fixedCategories, setFixedCategories] = useState<Category[]>([]);
  const [summary, setSummary] = useState<OnboardingSummary>({
    income: false,
    fixedCount: 0,
    goal: false,
  });

  const completeRef = useRef(onComplete);
  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        await categoryRepo.ensureDefaults();
        const [settings, categories] = await Promise.all([
          settingsRepo.get(),
          categoryRepo.list(),
        ]);

        if (cancelled) {
          return;
        }

        setDisplayName(settings.displayName ?? '');
        setIncomeCategories(categories.filter((category) => category.kind === 'income'));
        setFixedCategories(
          categories.filter(
            (category) => category.kind === 'expense' && category.group === 'fixed',
          ),
        );
        setStep(toStep(settings.onboardingStep));
      } catch (cause) {
        if (!cancelled) {
          setError(errorMessage(cause));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const run = useCallback(async (operation: () => Promise<void>): Promise<boolean> => {
    setSaving(true);
    setError(null);

    try {
      await operation();
      return true;
    } catch (cause) {
      setError(errorMessage(cause));
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const persistStep = useCallback(async (next: OnboardingStep) => {
    await settingsRepo.update({ onboardingStep: next });
    setStep(next);
  }, []);

  const startFresh = useCallback(async () => {
    await run(() => persistStep(1));
  }, [persistStep, run]);

  const loadSample = useCallback(async () => {
    await run(async () => {
      await seedSampleData();
      await settingsRepo.completeOnboarding();
      const month = currentMonth();
      await planRepo.getOrCreate(month);
      await planRepo.ensureItems(month);
      completeRef.current();
    });
  }, [run]);

  const submitProfile = useCallback(
    async (payload: ProfilePayload) => {
      await run(async () => {
        if (payload.displayName.trim()) {
          await settingsRepo.update({ displayName: payload.displayName.trim() });
        }

        if (payload.openingCents) {
          await transactionRepo.create({
            type: 'opening',
            direction: payload.direction,
            amountCents: payload.openingCents,
            date: todayInLima(),
            description:
              payload.direction === 'out' ? 'Saldo inicial (deuda)' : 'Saldo inicial',
            source: 'opening',
          });
        }

        await persistStep(2);
      });
    },
    [persistStep, run],
  );

  const submitIncome = useCallback(
    async (payload: IncomePayload) => {
      await run(async () => {
        const category =
          incomeCategories.find((entry) => entry.name === 'Sueldo') ?? incomeCategories[0];

        if (!category) {
          throw new Error('No hay una categoría de ingreso disponible.');
        }

        await recurringRepo.create({
          name: payload.name,
          kind: 'expected_income',
          amountCents: payload.amountCents,
          categoryId: category.id,
          dayOfMonth: payload.dayOfMonth,
          startMonth: currentMonth(),
        });

        setSummary((current) => ({ ...current, income: true }));
        await persistStep(3);
      });
    },
    [incomeCategories, persistStep, run],
  );

  const skipIncome = useCallback(async () => {
    await run(() => persistStep(3));
  }, [persistStep, run]);

  const submitFixed = useCallback(
    async (rows: FixedPayload[]) => {
      await run(async () => {
        for (const row of rows) {
          await recurringRepo.create({
            name: row.name,
            kind: 'fixed_expense',
            amountCents: row.amountCents,
            categoryId: row.categoryId,
            dayOfMonth: row.dayOfMonth,
            startMonth: currentMonth(),
          });
        }

        setSummary((current) => ({ ...current, fixedCount: rows.length }));
        await persistStep(4);
      });
    },
    [persistStep, run],
  );

  const skipFixed = useCallback(async () => {
    await run(() => persistStep(4));
  }, [persistStep, run]);

  const submitGoal = useCallback(
    async (payload: GoalPayload) => {
      await run(async () => {
        await goalRepo.create({
          name: payload.name,
          targetCents: payload.targetCents,
          ...(payload.targetDate ? { targetDate: payload.targetDate } : {}),
        });

        setSummary((current) => ({ ...current, goal: true }));
        await persistStep(5);
      });
    },
    [persistStep, run],
  );

  const skipGoal = useCallback(async () => {
    await run(() => persistStep(5));
  }, [persistStep, run]);

  const finish = useCallback(async () => {
    await run(async () => {
      await settingsRepo.completeOnboarding();
      const month = currentMonth();
      await planRepo.getOrCreate(month);
      await planRepo.ensureItems(month);
      completeRef.current();
    });
  }, [run]);

  const back = useCallback(async () => {
    if (step <= 1) {
      return;
    }
    await run(() => persistStep((step - 1) as OnboardingStep));
  }, [persistStep, run, step]);

  return {
    step,
    loading,
    saving,
    error,
    displayName,
    setDisplayName,
    incomeCategories,
    fixedCategories,
    summary,
    startFresh,
    loadSample,
    submitProfile,
    submitIncome,
    skipIncome,
    submitFixed,
    skipFixed,
    submitGoal,
    skipGoal,
    finish,
    back,
  };
}
