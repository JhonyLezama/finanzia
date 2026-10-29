import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { db } from '@/db/db';
import { categoryRepo } from '@/db/repositories/categories';
import { planRepo, type PayItemInput } from '@/db/repositories/plans';
import { computeBudgetSnapshot } from '@/domain/budget';
import { currentMonth } from '@/domain/dates';
import type { Cents, MonthKey, UUID, VariableBudget } from '@/domain/models';

export function useBudget() {
  const [searchParams, setSearchParams] = useSearchParams();
  const month = (searchParams.get('mes') as MonthKey) || currentMonth();

  const setMonth = useCallback(
    (nextMonth: MonthKey) => {
      setSearchParams((params) => {
        const next = new URLSearchParams(params);
        next.set('mes', nextMonth);
        return next;
      });
    },
    [setSearchParams],
  );

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        await categoryRepo.ensureDefaults();
        if (cancelled) return;
        await planRepo.getOrCreate(month);
        if (cancelled) return;
        await planRepo.ensureItems(month);
      } catch {
        // ignore if unmounted
      }
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, [month]);

  const budgetData = useLiveQuery(
    async () => {
      const plan = await db.plans.get(month);
      if (!plan) {
        return null;
      }

      const [planItems, transactions, categories] = await Promise.all([
        db.planItems.where('planId').equals(month).toArray(),
        db.transactions.toArray(),
        db.categories.toArray(),
      ]);

      const snapshot = computeBudgetSnapshot({
        transactions,
        plan,
        planItems,
        categories,
        currentMonth: month,
      });

      const incomeItems = planItems.filter((i) => i.kind === 'expected_income');
      const fixedItems = planItems.filter((i) => i.kind === 'fixed_expense');
      const variableCategories = categories.filter(
        (c) => !c.archived && c.kind === 'expense' && c.group === 'variable',
      );

      return {
        plan,
        planItems,
        incomeItems,
        fixedItems,
        categories,
        variableCategories,
        transactions,
        snapshot,
        isClosed: plan.status === 'closed',
      };
    },
    [month],
    null,
  );

  const payFixed = useCallback(
    async (itemId: UUID, input: PayItemInput) => {
      const item = await db.planItems.get(itemId);
      if (!item) {
        throw new Error('El compromiso no existe.');
      }
      return planRepo.payItem(itemId, input, { expectedUpdatedAt: item.updatedAt });
    },
    [],
  );

  const receiveIncome = useCallback(
    async (itemId: UUID, input: PayItemInput) => {
      const item = await db.planItems.get(itemId);
      if (!item) {
        throw new Error('El ingreso no existe.');
      }
      return planRepo.receiveItem(itemId, input, { expectedUpdatedAt: item.updatedAt });
    },
    [],
  );

  const skipItem = useCallback(
    async (itemId: UUID) => {
      const item = await db.planItems.get(itemId);
      if (!item) {
        throw new Error('El compromiso no existe.');
      }
      return planRepo.skipItem(itemId, { expectedUpdatedAt: item.updatedAt });
    },
    [],
  );

  const updateVariableBudget = useCallback(
    async (categoryId: UUID, plannedCents: Cents) => {
      const currentPlan = await planRepo.getOrCreate(month);
      const existing = currentPlan.variableBudgets ?? [];
      const index = existing.findIndex((b) => b.categoryId === categoryId);

      let nextBudgets: VariableBudget[];
      if (index >= 0) {
        nextBudgets = existing.map((b, i) =>
          i === index ? { ...b, plannedCents } : b,
        );
      } else {
        nextBudgets = [...existing, { categoryId, plannedCents }];
      }

      await planRepo.update(
        month,
        { variableBudgets: nextBudgets },
        { expectedUpdatedAt: currentPlan.updatedAt },
      );
    },
    [month],
  );

  const updateSavingsTarget = useCallback(
    async (targetCents: Cents) => {
      const currentPlan = await planRepo.getOrCreate(month);
      await planRepo.update(
        month,
        { savingsTargetCents: targetCents },
        { expectedUpdatedAt: currentPlan.updatedAt },
      );
    },
    [month],
  );

  const copyFromPrevious = useCallback(async () => {
    return planRepo.copyFromPrevious(month);
  }, [month]);

  const closeMonth = useCallback(async () => {
    return planRepo.close(month);
  }, [month]);

  const reopenMonth = useCallback(async () => {
    return planRepo.reopen(month);
  }, [month]);

  return {
    month,
    setMonth,
    plan: budgetData?.plan ?? null,
    planItems: budgetData?.planItems ?? [],
    incomeItems: budgetData?.incomeItems ?? [],
    fixedItems: budgetData?.fixedItems ?? [],
    categories: budgetData?.categories ?? [],
    variableCategories: budgetData?.variableCategories ?? [],
    transactions: budgetData?.transactions ?? [],
    snapshot: budgetData?.snapshot ?? null,
    isClosed: budgetData?.isClosed ?? false,
    payFixed,
    receiveIncome,
    skipItem,
    updateVariableBudget,
    updateSavingsTarget,
    copyFromPrevious,
    closeMonth,
    reopenMonth,
  };
}
