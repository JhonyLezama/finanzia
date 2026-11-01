import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { asCents } from '@/domain/money';
import type { MonthKey, RecurringRule } from '@/domain/models';
import { octoberCategories } from '@/test/fixtures/october-2026';
import { RecurringSection } from './RecurringSection';

vi.mock('@/domain/dates', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/domain/dates')>();
  return { ...actual, startMonthForDay: () => '2099-01' as MonthKey };
});

const createdAt = '2026-01-01T00:00:00.000Z' as RecurringRule['createdAt'];

const rent: RecurringRule = {
  id: 'rent',
  name: 'Alquiler',
  kind: 'fixed_expense',
  amountCents: asCents(38000),
  categoryId: octoberCategories[0]!.id,
  dayOfMonth: 5,
  startMonth: '2026-01' as MonthKey,
  active: 1,
  createdAt,
  updatedAt: createdAt,
};

const paused: RecurringRule = {
  ...rent,
  id: 'paused',
  name: 'Gimnasio',
  active: 0,
  categoryId: octoberCategories[2]!.id,
};

function setup(overrides: Partial<Parameters<typeof RecurringSection>[0]> = {}) {
  const props = {
    rules: [rent, paused],
    categories: octoberCategories,
    onCreate: vi.fn(async () => {}),
    onUpdate: vi.fn(async () => {}),
    onPause: vi.fn(async () => {}),
    onResume: vi.fn(async () => {}),
    onDelete: vi.fn(async () => {}),
    ...overrides,
  };
  render(<RecurringSection {...props} />);
  return props;
}

describe('RecurringSection', () => {
  it('creates a rule starting on the month returned by the date helper', async () => {
    const user = userEvent.setup();
    const props = setup();

    await user.click(screen.getByRole('button', { name: 'Nueva regla' }));
    await user.type(screen.getByLabelText('Nombre de la regla'), 'Internet');
    await user.type(screen.getByLabelText('Monto de la regla'), '120');
    await user.selectOptions(screen.getByLabelText('Categoría de la regla'), octoberCategories[1]!.id);
    await user.clear(screen.getByLabelText('Día de la regla'));
    await user.type(screen.getByLabelText('Día de la regla'), '15');
    await user.click(screen.getByRole('button', { name: 'Crear recurrente' }));

    expect(props.onCreate).toHaveBeenCalledWith({
      name: 'Internet',
      kind: 'fixed_expense',
      amountCents: asCents(12000),
      categoryId: octoberCategories[1]!.id,
      dayOfMonth: 15,
      startMonth: '2099-01',
    });
  });

  it('prefills the form and updates an existing rule', async () => {
    const user = userEvent.setup();
    const props = setup();

    await user.click(screen.getByRole('button', { name: 'Editar Alquiler' }));
    const nameInput = screen.getByLabelText('Nombre de la regla');
    expect(nameInput).toHaveValue('Alquiler');
    expect(screen.getByLabelText('Monto de la regla')).toHaveValue('380');

    await user.clear(nameInput);
    await user.type(nameInput, 'Alquiler casa');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    expect(props.onUpdate).toHaveBeenCalledWith('rent', {
      name: 'Alquiler casa',
      kind: 'fixed_expense',
      amountCents: asCents(38000),
      categoryId: octoberCategories[0]!.id,
      dayOfMonth: 5,
    });
    expect(props.onCreate).not.toHaveBeenCalled();
  });

  it('pauses an active rule and reactivates a paused one', async () => {
    const user = userEvent.setup();
    const props = setup();

    await user.click(screen.getByRole('button', { name: 'Pausar Alquiler' }));
    expect(props.onPause).toHaveBeenCalledWith('rent');

    await user.click(screen.getByRole('button', { name: 'Reactivar Gimnasio' }));
    expect(props.onResume).toHaveBeenCalledWith('paused');
  });

  it('deletes a rule after confirmation', async () => {
    const user = userEvent.setup();
    const props = setup();

    await user.click(screen.getByRole('button', { name: 'Eliminar Alquiler' }));
    await user.click(await screen.findByRole('button', { name: 'Eliminar regla' }));

    expect(props.onDelete).toHaveBeenCalledWith('rent');
  });
});
