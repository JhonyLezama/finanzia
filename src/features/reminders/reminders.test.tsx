import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { Toaster } from 'sonner';
import { beforeEach, describe, expect, it } from 'vitest';
import { Header } from '@/components/layout/Header';
import { db, nowTimestamp } from '@/db/db';
import { categoryRepo } from '@/db/repositories/categories';
import { planRepo } from '@/db/repositories/plans';
import { settingsRepo } from '@/db/repositories/settings';
import { resetDb } from '@/db/test-utils';
import { addDays, todayInLima } from '@/domain/dates';
import { asCents } from '@/domain/money';
import type { ISODate } from '@/domain/models';

async function seedItem(dueDate: ISODate = todayInLima(), name = 'Cena') {
  const categories = await categoryRepo.list();
  const food = categories.find((category) => category.name === 'Comida')!;
  return planRepo.createItem({
    name,
    amountCents: asCents(6000),
    categoryId: food.id,
    dueDate,
  });
}

function renderHeader() {
  return render(
    <MemoryRouter>
      <Toaster />
      <Header />
    </MemoryRouter>,
  );
}

beforeEach(async () => {
  await resetDb();
  await categoryRepo.ensureDefaults();
  await settingsRepo.update({
    onboardingCompletedAt: nowTimestamp(),
  });
});

describe('reminder bell', () => {
  it('shows the badge and the due item', async () => {
    await seedItem();
    renderHeader();

    const bell = await screen.findByRole('button', { name: 'Pendientes: 1' });
    await userEvent.click(bell);

    expect(await screen.findByRole('region', { name: 'Pendientes' })).toBeInTheDocument();
    expect(screen.getByText('Cena')).toBeInTheDocument();
    expect(screen.getByText('Vence hoy')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pagar' })).toBeInTheDocument();
  });

  it('shows an empty state when there is nothing due', async () => {
    renderHeader();

    await userEvent.click(await screen.findByRole('button', { name: 'Pendientes' }));
    expect(await screen.findByText('Todo al día')).toBeInTheDocument();
  });

  it('shows upcoming items without counting them in the badge', async () => {
    await seedItem(addDays(todayInLima(), 2), 'Internet');
    renderHeader();

    await userEvent.click(await screen.findByRole('button', { name: 'Pendientes' }));
    expect(await screen.findByText('Próximos 7 días (1)')).toBeInTheDocument();
    expect(screen.getByText('Internet')).toBeInTheDocument();
  });

  it('pays an item from the panel', async () => {
    const item = await seedItem();
    renderHeader();

    await userEvent.click(await screen.findByRole('button', { name: 'Pendientes: 1' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Pagar' }));

    expect(await screen.findByRole('heading', { name: /pagar cena/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /confirmar pago/i }));

    await waitFor(async () => {
      expect(await db.planItems.get(item.id)).toMatchObject({ status: 'settled' });
    });
    expect(await db.transactions.count()).toBe(1);
  });

  it('snoozes an item and undoes it', async () => {
    await seedItem();
    renderHeader();

    await userEvent.click(await screen.findByRole('button', { name: 'Pendientes: 1' }));
    await userEvent.click(screen.getByRole('button', { name: /acciones de cena/i }));
    await userEvent.click(await screen.findByRole('menuitem', { name: /recordar mañana/i }));

    expect(await screen.findByText(/pospuesto hasta mañana/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /deshacer/i }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Pendientes: 1' })).toBeInTheDocument(),
    );
  });

  it('hides an item, shows it in the hidden section, and restores it', async () => {
    await seedItem();
    renderHeader();

    await userEvent.click(await screen.findByRole('button', { name: 'Pendientes: 1' }));
    await userEvent.click(screen.getByRole('button', { name: /acciones de cena/i }));
    await userEvent.click(await screen.findByRole('menuitem', { name: /ocultar/i }));

    await userEvent.click(
      await screen.findByRole('button', { name: /ver pospuestos y ocultos \(1\)/i }),
    );
    expect(await screen.findByText('Cena')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /restaurar/i }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Pendientes: 1' })).toBeInTheDocument(),
    );
  });

  it('snoozes until a custom date', async () => {
    await seedItem();
    renderHeader();

    await userEvent.click(await screen.findByRole('button', { name: 'Pendientes: 1' }));
    await userEvent.click(screen.getByRole('button', { name: /acciones de cena/i }));
    await userEvent.click(await screen.findByRole('menuitem', { name: /elegir fecha/i }));

    const date = screen.getByLabelText('Fecha');
    fireEvent.change(date, { target: { value: addDays(todayInLima(), 3) } });
    await userEvent.click(screen.getByRole('button', { name: /posponer/i }));

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Pendientes: 1' })).not.toBeInTheDocument(),
    );
  });

  it('creates a one-off reminder from the panel', async () => {
    renderHeader();

    await userEvent.click(await screen.findByRole('button', { name: 'Pendientes' }));
    await userEvent.click(screen.getByRole('button', { name: /nuevo recordatorio/i }));

    await userEvent.type(screen.getByLabelText('Nombre'), 'Cine');
    await userEvent.type(screen.getByLabelText('Monto'), '60');
    await userEvent.selectOptions(
      screen.getByLabelText('Categoría'),
      screen.getByRole('option', { name: 'Comida' }),
    );
    await userEvent.click(screen.getByRole('button', { name: /guardar recordatorio/i }));

    expect(await screen.findByText(/recordatorio creado/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Pendientes: 1' }));
    expect(await screen.findByText('Cine')).toBeInTheDocument();
  });
});
