import { describe, expect, it } from 'vitest';
import { asCents } from './money';
import type {
  ISODate,
  ISOTimestamp,
  MonthlyPlan,
  PlanItem,
  ReminderState,
} from './models';
import { buildReminderBuckets, formatDayMonth } from './reminders';

const TODAY = '2026-10-30' as ISODate;
const STAMP = '2026-10-01T00:00:00.000Z' as ISOTimestamp;

function plan(id: string, status: MonthlyPlan['status'] = 'active'): MonthlyPlan {
  return {
    id: id as MonthlyPlan['id'],
    year: 2026,
    month: 10,
    status,
    savingsTargetCents: asCents(0),
    variableBudgets: [],
    createdAt: STAMP,
    updatedAt: STAMP,
  };
}

function item(
  partial: Partial<PlanItem> & Pick<PlanItem, 'id' | 'name' | 'dueDate'>,
): PlanItem {
  return {
    planId: '2026-10' as PlanItem['planId'],
    kind: 'fixed_expense',
    categoryId: 'cat',
    amountCents: asCents(10000),
    status: 'pending',
    createdAt: STAMP,
    updatedAt: STAMP,
    ...partial,
  };
}

function state(
  planItemId: string,
  partial: Partial<ReminderState> = {},
): ReminderState {
  return {
    planItemId: planItemId as ReminderState['planItemId'],
    updatedAt: STAMP,
    ...partial,
  };
}

describe('buildReminderBuckets', () => {
  it('separates overdue, today, and upcoming items', () => {
    const buckets = buildReminderBuckets({
      today: TODAY,
      plans: [plan('2026-10')],
      planItems: [
        item({ id: 'today', name: 'Hoy', dueDate: '2026-10-30' as ISODate }),
        item({ id: 'overdue', name: 'Vencido', dueDate: '2026-10-28' as ISODate }),
        item({ id: 'soon', name: 'Pronto', dueDate: '2026-11-02' as ISODate }),
        item({ id: 'far', name: 'Lejos', dueDate: '2026-11-20' as ISODate }),
      ],
      states: [],
    });

    expect(buckets.due.map((reminder) => reminder.item.id)).toEqual(['overdue', 'today']);
    expect(buckets.upcoming.map((reminder) => reminder.item.id)).toEqual(['soon']);
    expect(buckets.badgeCount).toBe(2);
  });

  it('excludes settled, skipped, income, and closed-plan items', () => {
    const buckets = buildReminderBuckets({
      today: TODAY,
      plans: [plan('2026-10'), plan('2026-09', 'closed')],
      planItems: [
        item({ id: 'settled', name: 'Pagado', dueDate: TODAY, status: 'settled' }),
        item({ id: 'skipped', name: 'Omitido', dueDate: TODAY, status: 'skipped' }),
        item({
          id: 'income',
          name: 'Sueldo',
          dueDate: TODAY,
          kind: 'expected_income',
        }),
        item({
          id: 'closed',
          name: 'Viejo',
          dueDate: '2026-09-15' as ISODate,
          planId: '2026-09' as PlanItem['planId'],
        }),
      ],
      states: [],
    });

    expect(buckets.due).toEqual([]);
    expect(buckets.badgeCount).toBe(0);
  });

  it('includes a pending item from an open previous month', () => {
    const buckets = buildReminderBuckets({
      today: TODAY,
      plans: [plan('2026-10'), plan('2026-09')],
      planItems: [
        item({
          id: 'september',
          name: 'Septiembre',
          dueDate: '2026-09-15' as ISODate,
          planId: '2026-09' as PlanItem['planId'],
        }),
      ],
      states: [],
    });

    expect(buckets.due.map((reminder) => reminder.item.id)).toEqual(['september']);
  });

  it('moves snoozed and hidden items out of due/upcoming and into hidden', () => {
    const buckets = buildReminderBuckets({
      today: TODAY,
      plans: [plan('2026-10')],
      planItems: [
        item({ id: 'snoozed', name: 'Pospuesto', dueDate: TODAY }),
        item({ id: 'hidden', name: 'Oculto', dueDate: TODAY }),
      ],
      states: [
        state('snoozed', { snoozedUntil: '2026-10-31' as ISODate }),
        state('hidden', { hiddenAt: STAMP }),
      ],
    });

    expect(buckets.due).toEqual([]);
    expect(buckets.hidden.map((reminder) => reminder.item.id)).toEqual([
      'snoozed',
      'hidden',
    ]);
  });

  it('shows a snoozed item again when the snooze date arrives', () => {
    const buckets = buildReminderBuckets({
      today: TODAY,
      plans: [plan('2026-10')],
      planItems: [item({ id: 'snoozed', name: 'Pospuesto', dueDate: TODAY })],
      states: [state('snoozed', { snoozedUntil: TODAY })],
    });

    expect(buckets.due.map((reminder) => reminder.item.id)).toEqual(['snoozed']);
  });

  it('sorts due items by date and then by amount descending', () => {
    const buckets = buildReminderBuckets({
      today: TODAY,
      plans: [plan('2026-10')],
      planItems: [
        item({ id: 'small', name: 'Chico', dueDate: '2026-10-28' as ISODate }),
        item({
          id: 'big',
          name: 'Grande',
          dueDate: '2026-10-28' as ISODate,
          amountCents: asCents(50000),
        }),
        item({ id: 'today', name: 'Hoy', dueDate: TODAY }),
      ],
      states: [],
    });

    expect(buckets.due.map((reminder) => reminder.item.id)).toEqual([
      'big',
      'small',
      'today',
    ]);
  });

  it('labels overdue, today, and upcoming dates', () => {
    const buckets = buildReminderBuckets({
      today: TODAY,
      plans: [plan('2026-10')],
      planItems: [
        item({ id: 'overdue', name: 'Vencido', dueDate: '2026-10-28' as ISODate }),
        item({ id: 'today', name: 'Hoy', dueDate: TODAY }),
        item({ id: 'tomorrow', name: 'Mañana', dueDate: '2026-10-31' as ISODate }),
        item({ id: 'later', name: 'Luego', dueDate: '2026-11-02' as ISODate }),
      ],
      states: [],
    });

    expect(buckets.due[0].dueLabel).toBe('Vencido hace 2 días');
    expect(buckets.due[1].dueLabel).toBe('Vence hoy');
    expect(buckets.upcoming[0].dueLabel).toBe('Vence mañana');
    expect(buckets.upcoming[1].dueLabel).toBe('Vence el 02/11');
  });

  it('formats a day and month', () => {
    expect(formatDayMonth('2026-11-02' as ISODate)).toBe('02/11');
  });
});
