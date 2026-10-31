import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { db, nowTimestamp } from '@/db/db';
import { categoryRepo } from '@/db/repositories/categories';
import { planRepo } from '@/db/repositories/plans';
import { settingsRepo } from '@/db/repositories/settings';
import { resetDb } from '@/db/test-utils';
import { addDays, todayInLima } from '@/domain/dates';
import { asCents } from '@/domain/money';
import { useReminders } from './useReminders';

function wrapper({ children }: { children: ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>;
}

async function seedItem(name = 'Cena') {
  const categories = await categoryRepo.list();
  const food = categories.find((category) => category.name === 'Comida')!;
  return planRepo.createItem({
    name,
    amountCents: asCents(6000),
    categoryId: food.id,
    dueDate: todayInLima(),
  });
}

beforeEach(async () => {
  await resetDb();
  await categoryRepo.ensureDefaults();
  await settingsRepo.update({
    onboardingCompletedAt: nowTimestamp(),
  });
});

describe('useReminders', () => {
  it('loads due items and snoozes them', async () => {
    const item = await seedItem();
    const { result } = renderHook(() => useReminders(), { wrapper });

    await waitFor(() => expect(result.current.buckets?.due).toHaveLength(1));
    expect(result.current.buckets?.badgeCount).toBe(1);

    await act(async () => {
      await result.current.snooze(item, addDays(todayInLima(), 1), 'Pospuesto');
    });

    await waitFor(() => expect(result.current.buckets?.due).toHaveLength(0));
    expect(result.current.buckets?.hidden).toHaveLength(1);

    await act(async () => {
      await result.current.restore(item);
    });

    await waitFor(() => expect(result.current.buckets?.due).toHaveLength(1));
  });

  it('hides an item and pays it', async () => {
    const item = await seedItem();
    const { result } = renderHook(() => useReminders(), { wrapper });

    await waitFor(() => expect(result.current.buckets?.due).toHaveLength(1));

    await act(async () => {
      await result.current.hide(item);
    });
    await waitFor(() => expect(result.current.buckets?.due).toHaveLength(0));

    await act(async () => {
      await result.current.pay(item, {
        amountCents: item.amountCents,
        date: todayInLima(),
      });
    });

    await waitFor(() => expect(result.current.buckets?.hidden).toHaveLength(0));
    expect(await db.transactions.count()).toBe(1);
  });

  it('creates a one-off reminder', async () => {
    const categories = await categoryRepo.list();
    const food = categories.find((category) => category.name === 'Comida')!;
    const { result } = renderHook(() => useReminders(), { wrapper });

    await act(async () => {
      await result.current.create({
        name: 'Cine',
        amountCents: asCents(6000),
        categoryId: food.id,
        dueDate: todayInLima(),
      });
    });

    await waitFor(() => expect(result.current.buckets?.due).toHaveLength(1));
    expect(result.current.buckets?.due[0]?.item.name).toBe('Cine');
  });
});
