import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useMemo } from 'react';
import { db, nowTimestamp } from '@/db/db';
import { settingsRepo } from '@/db/repositories/settings';
import { currentMonth, todayInLima } from '@/domain/dates';
import { goalSummary, type GoalSummary } from '@/domain/goals';
import type { Cents, Goal, MonthKey, PlanItem } from '@/domain/models';
import { useBudget } from '@/features/budget/useBudget';
import { shouldShowBackupReminder } from './backup-reminder';

export interface DashboardGoal {
  goal: Goal;
  summary: GoalSummary;
}

export interface OverdueCommitments {
  month: MonthKey;
  count: number;
  totalCents: Cents;
}

export function useDashboard() {
  const budget = useBudget();

  const settings = useLiveQuery(() => db.settings.get('app'), []);

  const goals = useLiveQuery(
    async () => {
      const [goalRows, transactions] = await Promise.all([
        db.goals.toArray(),
        db.transactions.toArray(),
      ]);
      const today = todayInLima();

      return goalRows
        .filter((goal) => goal.status === 'active')
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map<DashboardGoal>((goal) => ({
          goal,
          summary: goalSummary(goal, transactions, today),
        }));
    },
    [],
    [] as DashboardGoal[],
  );

  const pendingItems = useLiveQuery(
    () => db.planItems.where('status').equals('pending').toArray(),
    [],
    [] as PlanItem[],
  );

  const month = budget.month;
  const isCurrentMonth = month === currentMonth();

  const upcoming = useMemo(
    () =>
      budget.planItems
        .filter((item) => item.kind === 'fixed_expense' && item.status === 'pending')
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        .slice(0, 5),
    [budget.planItems],
  );

  const overdue = useMemo<OverdueCommitments[]>(() => {
    const current = currentMonth();
    const grouped = new Map<MonthKey, { count: number; totalCents: number }>();

    for (const item of pendingItems) {
      if (item.kind !== 'fixed_expense' || item.planId >= current) {
        continue;
      }

      const previous = grouped.get(item.planId) ?? { count: 0, totalCents: 0 };
      grouped.set(item.planId, {
        count: previous.count + 1,
        totalCents: previous.totalCents + item.amountCents,
      });
    }

    return [...grouped.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([overdueMonth, value]) => ({
        month: overdueMonth,
        count: value.count,
        totalCents: value.totalCents as Cents,
      }));
  }, [pendingItems]);

  const recent = useMemo(
    () =>
      [...budget.transactions]
        .filter((transaction) => !transaction.deleted)
        .sort(
          (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
        )
        .slice(0, 5),
    [budget.transactions],
  );

  const dismissBackupReminder = useCallback(async () => {
    await settingsRepo.update({
      backupReminderDismissedAt: nowTimestamp(),
    });
  }, []);

  return {
    ...budget,
    isCurrentMonth,
    settings,
    goals,
    upcoming,
    overdue,
    recent,
    showBackupReminder: shouldShowBackupReminder(settings),
    dismissBackupReminder,
  };
}
