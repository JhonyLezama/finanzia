import { beforeEach, describe, expect, it } from 'vitest';
import type { ISODate, UUID } from '@/domain/models';
import { resetDb } from '../test-utils';
import { reminderStateRepo } from './reminder-states';

const ITEM_ID = '11111111-1111-4111-8111-111111111111' as UUID;
const TOMORROW = '2026-10-31' as ISODate;

beforeEach(async () => {
  await resetDb();
});

describe('reminderStateRepo', () => {
  it('snoozes an item until a date', async () => {
    const state = await reminderStateRepo.snooze(ITEM_ID, TOMORROW);
    expect(state).toMatchObject({ planItemId: ITEM_ID, snoozedUntil: TOMORROW });
    expect(await reminderStateRepo.list()).toHaveLength(1);
  });

  it('hides an item and clears a previous snooze', async () => {
    await reminderStateRepo.snooze(ITEM_ID, TOMORROW);
    const state = await reminderStateRepo.hide(ITEM_ID);
    expect(state.hiddenAt).toBeTruthy();
    expect(state.snoozedUntil).toBeUndefined();
  });

  it('snoozing clears a previous hide', async () => {
    await reminderStateRepo.hide(ITEM_ID);
    const state = await reminderStateRepo.snooze(ITEM_ID, TOMORROW);
    expect(state.snoozedUntil).toBe(TOMORROW);
    expect(state.hiddenAt).toBeUndefined();
  });

  it('clears the state', async () => {
    await reminderStateRepo.hide(ITEM_ID);
    await reminderStateRepo.clear(ITEM_ID);
    expect(await reminderStateRepo.list()).toEqual([]);
  });
});
