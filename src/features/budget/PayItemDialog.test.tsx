import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { addDays, todayInLima } from '@/domain/dates';
import { asCents } from '@/domain/money';
import type { ISOTimestamp, PlanItem } from '@/domain/models';
import { PayItemDialog } from './PayItemDialog';

const STAMP = '2026-10-01T00:00:00.000Z' as ISOTimestamp;

function item(dueDate: PlanItem['dueDate']): PlanItem {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    planId: '2026-10' as PlanItem['planId'],
    kind: 'fixed_expense',
    name: 'Alquiler',
    categoryId: '22222222-2222-4222-8222-222222222222',
    amountCents: asCents(38000),
    dueDate,
    status: 'pending',
    createdAt: STAMP,
    updatedAt: STAMP,
  };
}

describe('PayItemDialog', () => {
  it('defaults a future due date to today and blocks future dates', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const tomorrow = addDays(todayInLima(), 1);

    render(
      <PayItemDialog
        open
        onOpenChange={() => {}}
        item={item(tomorrow)}
        onConfirm={onConfirm}
      />,
    );

    const date = screen.getByLabelText('Fecha');
    expect(date).toHaveValue(todayInLima());
    expect(date).toHaveAttribute('max', todayInLima());

    fireEvent.change(date, { target: { value: tomorrow } });
    await userEvent.click(screen.getByRole('button', { name: /confirmar pago/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/no puede ser futura/i);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('keeps a past due date', () => {
    const yesterday = addDays(todayInLima(), -1);

    render(
      <PayItemDialog
        open
        onOpenChange={() => {}}
        item={item(yesterday)}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Fecha')).toHaveValue(yesterday);
  });
});

