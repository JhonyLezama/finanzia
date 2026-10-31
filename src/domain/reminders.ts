import { addDays } from './dates';
import type {
  ISODate,
  MonthlyPlan,
  PlanItem,
  ReminderState,
} from './models';

export type ReminderStatus = 'overdue' | 'today' | 'upcoming';

export interface Reminder {
  item: PlanItem;
  status: ReminderStatus;
  dueLabel: string;
  daysOverdue: number;
  state?: ReminderState;
}

export interface ReminderBuckets {
  due: Reminder[];
  upcoming: Reminder[];
  hidden: Reminder[];
  badgeCount: number;
}

export interface BuildReminderBucketsInput {
  planItems: PlanItem[];
  plans: MonthlyPlan[];
  states: ReminderState[];
  today: ISODate;
  upcomingDays?: number;
}

function daysBetween(from: ISODate, to: ISODate): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000,
  );
}

export function formatDayMonth(date: ISODate): string {
  return `${date.slice(8, 10)}/${date.slice(5, 7)}`;
}

function dueLabel(date: ISODate, today: ISODate): string {
  const diff = daysBetween(date, today);
  if (diff > 0) {
    return `Vencido hace ${diff} ${diff === 1 ? 'día' : 'días'}`;
  }
  if (diff === 0) {
    return 'Vence hoy';
  }
  if (diff === -1) {
    return 'Vence mañana';
  }
  return `Vence el ${formatDayMonth(date)}`;
}

function isHidden(state: ReminderState | undefined, today: ISODate): boolean {
  if (!state) {
    return false;
  }
  return Boolean(state.hiddenAt) || Boolean(state.snoozedUntil && today < state.snoozedUntil);
}

export function buildReminderBuckets({
  planItems,
  plans,
  states,
  today,
  upcomingDays = 7,
}: BuildReminderBucketsInput): ReminderBuckets {
  const stateByItem = new Map(
    states.map((state) => [state.planItemId, state] as const),
  );
  const openPlanIds = new Set(
    plans.filter((plan) => plan.status !== 'closed').map((plan) => plan.id),
  );
  const horizon = addDays(today, upcomingDays);

  const candidates = planItems.filter(
    (item) =>
      item.kind === 'fixed_expense' &&
      item.status === 'pending' &&
      openPlanIds.has(item.planId),
  );

  const due: Reminder[] = [];
  const upcoming: Reminder[] = [];
  const hidden: Reminder[] = [];

  for (const item of candidates) {
    const state = stateByItem.get(item.id);
    if (isHidden(state, today)) {
      hidden.push({
        item,
        state,
        status:
          item.dueDate === today
            ? 'today'
            : item.dueDate < today
              ? 'overdue'
              : 'upcoming',
        daysOverdue: Math.max(daysBetween(item.dueDate, today), 0),
        dueLabel: dueLabel(item.dueDate, today),
      });
      continue;
    }

    if (item.dueDate <= today) {
      due.push({
        item,
        state,
        status: item.dueDate === today ? 'today' : 'overdue',
        daysOverdue: Math.max(daysBetween(item.dueDate, today), 0),
        dueLabel: dueLabel(item.dueDate, today),
      });
    } else if (item.dueDate <= horizon) {
      upcoming.push({
        item,
        state,
        status: 'upcoming',
        daysOverdue: 0,
        dueLabel: dueLabel(item.dueDate, today),
      });
    }
  }

  const byDateThenAmount = (a: Reminder, b: Reminder) =>
    a.item.dueDate.localeCompare(b.item.dueDate) ||
    b.item.amountCents - a.item.amountCents;

  due.sort(byDateThenAmount);
  upcoming.sort(byDateThenAmount);
  hidden.sort(byDateThenAmount);

  return { due, upcoming, hidden, badgeCount: due.length };
}
