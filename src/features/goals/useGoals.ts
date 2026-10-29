import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback } from 'react';
import { db } from '@/db/db';
import { goalRepo, type ArchiveGoalOptions, type CreateGoalInput, type GoalMovementInput } from '@/db/repositories/goals';
import { todayInLima } from '@/domain/dates';
import { goalSummary, type GoalSummary } from '@/domain/goals';
import type { Cents, Goal, Transaction, UUID } from '@/domain/models';

export interface GoalWithSummary {
  goal: Goal;
  summary: GoalSummary;
  movements: Transaction[];
}

export function useGoals() {
  const data = useLiveQuery(
    async () => {
      const [goals, transactions] = await Promise.all([
        db.goals.toArray(),
        db.transactions.toArray(),
      ]);

      const today = todayInLima();
      const activeGoals = goals.filter((g) => g.status === 'active');
      const archivedGoals = goals.filter((g) => g.status === 'archived');

      const goalsWithSummary: GoalWithSummary[] = activeGoals.map((goal) => {
        const summary = goalSummary(goal, transactions, today);
        const movements = transactions
          .filter((t) => !t.deleted && t.goalId === goal.id)
          .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

        return {
          goal,
          summary,
          movements,
        };
      });

      let totalSavedCents = 0;
      let totalTargetCents = 0;

      for (const item of goalsWithSummary) {
        totalSavedCents += item.summary.savedCents;
        totalTargetCents += item.summary.targetCents;
      }

      const totalProgress = totalTargetCents > 0 ? totalSavedCents / totalTargetCents : 0;

      return {
        goals: goalsWithSummary,
        archivedCount: archivedGoals.length,
        totalSavedCents: totalSavedCents as Cents,
        totalTargetCents: totalTargetCents as Cents,
        totalProgress,
      };
    },
    [],
    {
      goals: [] as GoalWithSummary[],
      archivedCount: 0,
      totalSavedCents: 0 as Cents,
      totalTargetCents: 0 as Cents,
      totalProgress: 0,
    },
  );

  const createGoal = useCallback(async (input: CreateGoalInput) => {
    return goalRepo.create(input);
  }, []);

  const updateGoal = useCallback(
    async (id: UUID, patch: Partial<Goal>, expectedUpdatedAt: string) => {
      return goalRepo.update(id, patch, { expectedUpdatedAt });
    },
    [],
  );

  const contribute = useCallback(
    async (id: UUID, input: GoalMovementInput) => {
      return goalRepo.contribute(id, input);
    },
    [],
  );

  const withdraw = useCallback(
    async (id: UUID, input: GoalMovementInput) => {
      return goalRepo.withdraw(id, input);
    },
    [],
  );

  const archiveGoal = useCallback(
    async (id: UUID, options: ArchiveGoalOptions) => {
      return goalRepo.archive(id, options);
    },
    [],
  );

  return {
    goals: data.goals,
    archivedCount: data.archivedCount,
    totalSavedCents: data.totalSavedCents,
    totalTargetCents: data.totalTargetCents,
    totalProgress: data.totalProgress,
    createGoal,
    updateGoal,
    contribute,
    withdraw,
    archiveGoal,
  };
}
