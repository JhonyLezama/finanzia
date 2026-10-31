import { db, nowTimestamp } from '../db';
import { reminderStateSchema } from '@/domain/schemas';
import type { ISODate, ReminderState, UUID } from '@/domain/models';

export const reminderStateRepo = {
  async list(): Promise<ReminderState[]> {
    return db.reminderStates.toArray();
  },

  async snooze(planItemId: UUID, until: ISODate): Promise<ReminderState> {
    const state = reminderStateSchema.parse({
      planItemId,
      snoozedUntil: until,
      updatedAt: nowTimestamp(),
    }) as ReminderState;
    await db.reminderStates.put(state);
    return state;
  },

  async hide(planItemId: UUID): Promise<ReminderState> {
    const state = reminderStateSchema.parse({
      planItemId,
      hiddenAt: nowTimestamp(),
      updatedAt: nowTimestamp(),
    }) as ReminderState;
    await db.reminderStates.put(state);
    return state;
  },

  async clear(planItemId: UUID): Promise<void> {
    await db.reminderStates.delete(planItemId);
  },
};

