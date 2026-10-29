import { addMonths, dueDateForMonth, toMonthKey } from './dates';
import type { Cents, Goal, ISODate, MonthKey, Transaction, UUID } from './models';

export interface GoalSummary {
  savedCents: Cents;
  targetCents: Cents;
  progress: number;
  remainingCents: Cents;
  paceCents: Cents;
  projectedDate: ISODate | null;
}

const PACE_MONTHS = 3;

function isGoalMovement(transaction: Transaction): boolean {
  return transaction.type === 'goal_deposit' || transaction.type === 'goal_withdraw';
}

function goalMovements(goalId: UUID, transactions: Transaction[]): Transaction[] {
  return transactions.filter(
    (transaction) =>
      !transaction.deleted && transaction.goalId === goalId && isGoalMovement(transaction),
  );
}

function signedGoalAmount(transaction: Transaction): number {
  return transaction.type === 'goal_deposit'
    ? transaction.amountCents
    : -transaction.amountCents;
}

function asCents(value: number): Cents {
  return value as Cents;
}

export function goalBalance(goalId: UUID, transactions: Transaction[]): Cents {
  return asCents(goalMovements(goalId, transactions).reduce((sum, tx) => sum + signedGoalAmount(tx), 0));
}

function computePace(transactions: Transaction[], today: ISODate): Cents {
  const currentMonth = toMonthKey(today);
  const netByMonth = new Map<MonthKey, number>();

  for (const transaction of transactions) {
    const month = toMonthKey(transaction.date);
    if (month > currentMonth) {
      continue;
    }
    netByMonth.set(month, (netByMonth.get(month) ?? 0) + signedGoalAmount(transaction));
  }

  const activeMonths = [...netByMonth.keys()].sort().reverse().slice(0, PACE_MONTHS);
  if (activeMonths.length === 0) {
    return asCents(0);
  }

  const total = activeMonths.reduce((sum, month) => sum + (netByMonth.get(month) ?? 0), 0);
  return asCents(Math.max(0, Math.round(total / activeMonths.length)));
}

function projectDate(
  today: ISODate,
  remainingCents: number,
  paceCents: number,
): ISODate | null {
  if (remainingCents === 0) {
    return today;
  }
  if (paceCents <= 0) {
    return null;
  }

  const monthsNeeded = Math.ceil(remainingCents / paceCents);
  const targetMonth = addMonths(toMonthKey(today), monthsNeeded);
  return dueDateForMonth(targetMonth, Number(today.slice(8, 10)));
}

export function goalSummary(
  goal: Goal,
  transactions: Transaction[],
  today: ISODate,
): GoalSummary {
  const movements = goalMovements(goal.id, transactions);
  const savedCents = goalBalance(goal.id, transactions);
  const targetCents = goal.targetCents;
  const remainingCents = asCents(Math.max(0, targetCents - savedCents));
  const paceCents = computePace(movements, today);

  return {
    savedCents,
    targetCents,
    progress: targetCents > 0 ? savedCents / targetCents : 0,
    remainingCents,
    paceCents,
    projectedDate: projectDate(today, remainingCents, paceCents),
  };
}

export function assertCanWithdraw(
  goal: Goal,
  transactions: Transaction[],
  amountCents: Cents,
): void {
  if (amountCents <= 0) {
    throw new RangeError('El monto del retiro debe ser mayor a cero.');
  }

  const balance = goalBalance(goal.id, transactions);
  if (amountCents > balance) {
    throw new RangeError('El retiro no puede superar el saldo de la meta.');
  }
}
