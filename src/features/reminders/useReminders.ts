import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { db } from '@/db/db';
import { planRepo, type CreatePlanItemInput, type PayItemInput } from '@/db/repositories/plans';
import { reminderStateRepo } from '@/db/repositories/reminder-states';
import { currentMonth, todayInLima, toMonthKey } from '@/domain/dates';
import type { ISODate, PlanItem } from '@/domain/models';
import { buildReminderBuckets, formatDayMonth, type ReminderBuckets } from '@/domain/reminders';

export interface UseRemindersResult {
  buckets: ReminderBuckets | null;
  isLoading: boolean;
  snooze: (item: PlanItem, until: ISODate, message: string) => Promise<void>;
  hide: (item: PlanItem) => Promise<void>;
  restore: (item: PlanItem) => Promise<void>;
  pay: (item: PlanItem, input: PayItemInput) => Promise<void>;
  create: (input: CreatePlanItemInput) => Promise<PlanItem>;
}

export function useReminders(): UseRemindersResult {
  const navigate = useNavigate();
  const ensured = useRef(false);

  useEffect(() => {
    if (ensured.current) {
      return;
    }
    ensured.current = true;

    void (async () => {
      try {
        const settings = await db.settings.get('app');
        if (!settings?.onboardingCompletedAt) {
          return;
        }
        const month = currentMonth();
        await planRepo.getOrCreate(month);
        await planRepo.ensureItems(month);
      } catch {
        // Ignorar errores durante inicialización en segundo plano
      }
    })();
  }, []);

  const buckets = useLiveQuery(
    async () => {
      const [planItems, plans, states] = await Promise.all([
        db.planItems.where('status').equals('pending').toArray(),
        db.plans.toArray(),
        db.reminderStates.toArray(),
      ]);

      return buildReminderBuckets({
        planItems,
        plans,
        states,
        today: todayInLima(),
      });
    },
    [],
    null,
  );

  const snooze = useCallback(async (item: PlanItem, until: ISODate, message: string) => {
    await reminderStateRepo.snooze(item.id, until);
    toast(message, {
      action: {
        label: 'Deshacer',
        onClick: () => {
          void reminderStateRepo.clear(item.id);
        },
      },
    });
  }, []);

  const hide = useCallback(async (item: PlanItem) => {
    await reminderStateRepo.hide(item.id);
    toast('Recordatorio oculto', {
      action: {
        label: 'Deshacer',
        onClick: () => {
          void reminderStateRepo.clear(item.id);
        },
      },
    });
  }, []);

  const restore = useCallback(async (item: PlanItem) => {
    await reminderStateRepo.clear(item.id);
  }, []);

  const pay = useCallback(async (item: PlanItem, input: PayItemInput) => {
    await planRepo.payItem(item.id, input, { expectedUpdatedAt: item.updatedAt });
    toast('Pago registrado');
  }, []);

  const create = useCallback(
    async (input: CreatePlanItemInput) => {
      const item = await planRepo.createItem(input);
      toast(`Recordatorio creado para ${formatDayMonth(input.dueDate)}`, {
        action: {
          label: 'Ver en Presupuesto',
          onClick: () => {
            navigate(`/presupuesto?mes=${toMonthKey(input.dueDate)}`);
          },
        },
      });
      return item;
    },
    [navigate],
  );

  return {
    buckets,
    isLoading: buckets === null,
    snooze,
    hide,
    restore,
    pay,
    create,
  };
}
