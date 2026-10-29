import { isDateInMonth } from './dates';
import type { Category, Cents, MonthlyPlan, MonthKey, PlanItem, Transaction } from './models';

export interface BudgetSnapshot {
  availableCents: Cents;
  pendingFixedCents: Cents;
  remainingSavingsCents: Cents;
  spendableCents: Cents;
  monthIncomeCents: Cents;
  monthExpenseCents: Cents;
  fixedExpenseCents: Cents;
  variableExpenseCents: Cents;
  fixedPlanCents: Cents;
  variablePlanCents: Cents;
  planExpenseCents: Cents;
  varianceCents: number;
  variancePct: number | null;
  executionPct: number | null;
  savingsRate: number | null;
  fixedCostRatio: number | null;
  goalFundingRate: number | null;
  monthlyGoalContribCents: Cents;
}

export interface BudgetSnapshotInput {
  transactions: Transaction[];
  plan: MonthlyPlan;
  planItems: PlanItem[];
  categories: Category[];
  currentMonth: MonthKey;
}

function toCents(value: number): Cents {
  return value as Cents;
}

function signedAmount(transaction: Transaction): number {
  return transaction.direction === 'in' ? transaction.amountCents : -transaction.amountCents;
}

export function computeBudgetSnapshot({
  transactions,
  plan,
  planItems,
  categories,
}: BudgetSnapshotInput): BudgetSnapshot {
  const activeTransactions = transactions.filter((transaction) => !transaction.deleted);
  const categoryById = new Map(categories.map((category) => [category.id, category]));

  const availableCents = activeTransactions.reduce(
    (sum, transaction) => sum + signedAmount(transaction),
    0,
  );

  const monthTransactions = activeTransactions.filter((transaction) =>
    isDateInMonth(transaction.date, plan.id),
  );

  const pendingFixedCents = planItems
    .filter(
      (item) =>
        item.planId === plan.id &&
        item.kind === 'fixed_expense' &&
        item.status === 'pending',
    )
    .reduce((sum, item) => sum + item.amountCents, 0);

  const monthlyGoalContribCents = monthTransactions.reduce((sum, transaction) => {
    if (transaction.type === 'goal_deposit') {
      return sum + transaction.amountCents;
    }
    if (transaction.type === 'goal_withdraw') {
      return sum - transaction.amountCents;
    }
    return sum;
  }, 0);

  const remainingSavingsCents = Math.max(
    0,
    plan.savingsTargetCents - Math.max(0, monthlyGoalContribCents),
  );

  const spendableCents = availableCents - pendingFixedCents - remainingSavingsCents;

  const monthIncomeCents = monthTransactions
    .filter((transaction) => transaction.type === 'income')
    .reduce((sum, transaction) => sum + transaction.amountCents, 0);

  const monthExpenseCents = monthTransactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((sum, transaction) => sum + transaction.amountCents, 0);

  const fixedExpenseCents = monthTransactions
    .filter((transaction) => {
      if (transaction.type !== 'expense' || !transaction.categoryId) {
        return false;
      }
      return categoryById.get(transaction.categoryId)?.group === 'fixed';
    })
    .reduce((sum, transaction) => sum + transaction.amountCents, 0);

  const variableExpenseCents = monthExpenseCents - fixedExpenseCents;

  const fixedPlanCents = planItems
    .filter(
      (item) =>
        item.planId === plan.id && item.kind === 'fixed_expense' && item.status !== 'skipped',
    )
    .reduce((sum, item) => sum + item.amountCents, 0);

  const variablePlanCents = plan.variableBudgets.reduce(
    (sum, budget) => sum + budget.plannedCents,
    0,
  );

  const planExpenseCents = fixedPlanCents + variablePlanCents;
  const { varianceCents, variancePct } = computeVariance(
    toCents(monthExpenseCents),
    toCents(planExpenseCents),
  );
  const executionPct = planExpenseCents > 0 ? monthExpenseCents / planExpenseCents : null;
  const savingsRate = computeSavingsRate(
    toCents(monthIncomeCents),
    toCents(monthExpenseCents),
  );
  const fixedCostRatio = monthIncomeCents > 0 ? fixedExpenseCents / monthIncomeCents : null;
  const goalFundingRate =
    monthIncomeCents > 0 ? monthlyGoalContribCents / monthIncomeCents : null;

  return {
    availableCents: toCents(availableCents),
    pendingFixedCents: toCents(pendingFixedCents),
    remainingSavingsCents: toCents(remainingSavingsCents),
    spendableCents: toCents(spendableCents),
    monthIncomeCents: toCents(monthIncomeCents),
    monthExpenseCents: toCents(monthExpenseCents),
    fixedExpenseCents: toCents(fixedExpenseCents),
    variableExpenseCents: toCents(variableExpenseCents),
    fixedPlanCents: toCents(fixedPlanCents),
    variablePlanCents: toCents(variablePlanCents),
    planExpenseCents: toCents(planExpenseCents),
    varianceCents,
    variancePct,
    executionPct,
    savingsRate,
    fixedCostRatio,
    goalFundingRate,
    monthlyGoalContribCents: toCents(monthlyGoalContribCents),
  };
}

export function computeVariance(
  actualCents: Cents,
  planCents: Cents,
): { varianceCents: number; variancePct: number | null } {
  const varianceCents = actualCents - planCents;
  return {
    varianceCents,
    variancePct: planCents > 0 ? varianceCents / planCents : null,
  };
}

export function computeSavingsRate(incomeCents: Cents, expenseCents: Cents): number | null {
  if (incomeCents <= 0) {
    return null;
  }
  return (incomeCents - expenseCents) / incomeCents;
}
