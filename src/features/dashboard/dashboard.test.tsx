import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/db';
import { categoryRepo } from '@/db/repositories/categories';
import { goalRepo } from '@/db/repositories/goals';
import { planRepo } from '@/db/repositories/plans';
import { recurringRepo } from '@/db/repositories/recurring';
import { settingsRepo } from '@/db/repositories/settings';
import { transactionRepo } from '@/db/repositories/transactions';
import { resetDb } from '@/db/test-utils';
import { addMonths, currentMonth, dueDateForMonth, todayInLima } from '@/domain/dates';
import { asCents } from '@/domain/money';
import type { ISOTimestamp, PlanItem } from '@/domain/models';
import DashboardPage from './DashboardPage';

function renderDashboard(initialEntry = '/') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(async () => {
  await resetDb();
  await categoryRepo.ensureDefaults();
});

describe('dashboard screen', () => {
  it('shows the month KPIs reconciled with the ledger', async () => {
    const categories = await categoryRepo.list();
    const food = categories.find((category) => category.name === 'Comida')!;
    const salary = categories.find((category) => category.name === 'Sueldo')!;
    const month = currentMonth();
    const today = todayInLima();

    await settingsRepo.update({ displayName: 'Ana' });

    await transactionRepo.create({
      type: 'opening',
      direction: 'in',
      amountCents: asCents(100000),
      date: today,
      description: 'Saldo inicial',
      source: 'opening',
    });
    await transactionRepo.create({
      type: 'income',
      direction: 'in',
      amountCents: asCents(220000),
      date: today,
      categoryId: salary.id,
      description: 'Sueldo',
      source: 'manual',
    });
    await transactionRepo.create({
      type: 'expense',
      direction: 'out',
      amountCents: asCents(25000),
      date: today,
      categoryId: food.id,
      description: 'Almuerzo',
      source: 'manual',
    });

    const plan = await planRepo.getOrCreate(month);
    await planRepo.update(
      month,
      {
        savingsTargetCents: asCents(30000),
        variableBudgets: [{ categoryId: food.id, plannedCents: asCents(60000) }],
      },
      { expectedUpdatedAt: plan.updatedAt },
    );

    renderDashboard(`/?mes=${month}`);

    expect(await screen.findByRole('heading', { level: 1, name: 'Inicio' })).toBeInTheDocument();
    expect(await screen.findByText(/hola, ana/i)).toBeInTheDocument();

    const available = screen.getByRole('group', { name: 'Saldo real' });
    expect(await within(available).findByText('S/ 2,950.00')).toBeInTheDocument();

    const spendable = screen.getByRole('group', { name: 'Disponible para gastar' });
    expect(await within(spendable).findByText('S/ 2,650.00')).toBeInTheDocument();
    expect(within(spendable).getByText(/por día/i)).toBeInTheDocument();

    const executed = screen.getByRole('group', { name: 'Ejecutado del mes' });
    expect(await within(executed).findByText(/41[.,]7\s*%/)).toBeInTheDocument();

    const savingsRate = screen.getByRole('group', { name: 'Tasa de ahorro' });
    expect(await within(savingsRate).findByText(/88[.,]6\s*%/)).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Plan del mes' })).toBeInTheDocument();
    expect(screen.getByText('Variable ejecutado')).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Últimos movimientos' })).toBeInTheDocument();
    expect(await screen.findByText('Almuerzo')).toBeInTheDocument();
  });

  it('pays a pending commitment from Inicio', async () => {
    const categories = await categoryRepo.list();
    const housing = categories.find((category) => category.name === 'Vivienda')!;

    await recurringRepo.create({
      name: 'Alquiler',
      kind: 'fixed_expense',
      amountCents: asCents(38000),
      categoryId: housing.id,
      dayOfMonth: 1,
      startMonth: currentMonth(),
    });

    renderDashboard();

    await userEvent.click(await screen.findByRole('button', { name: /pagar alquiler/i }));
    await userEvent.click(await screen.findByRole('button', { name: /confirmar pago/i }));

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /pagar alquiler/i })).not.toBeInTheDocument(),
    );
    expect(await screen.findByText(/no hay compromisos pendientes/i)).toBeInTheDocument();

    const transactions = await transactionRepo.listByMonth(currentMonth());
    expect(
      transactions.some(
        (transaction) =>
          transaction.description === 'Alquiler' && transaction.amountCents === 38000,
      ),
    ).toBe(true);
  });

  it('shows pending commitments from previous months as overdue', async () => {
    const categories = await categoryRepo.list();
    const housing = categories.find((category) => category.name === 'Vivienda')!;
    const previous = addMonths(currentMonth(), -1);
    const timestamp = new Date().toISOString();

    await planRepo.getOrCreate(previous);
    await db.planItems.add({
      id: crypto.randomUUID(),
      planId: previous,
      kind: 'fixed_expense',
      name: 'Internet',
      categoryId: housing.id,
      amountCents: asCents(12000),
      dueDate: dueDateForMonth(previous, 15),
      status: 'pending',
      createdAt: timestamp,
      updatedAt: timestamp,
    } as PlanItem);

    renderDashboard();

    expect(await screen.findByText(/atrasados/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /revisar/i })).toHaveAttribute(
      'href',
      `/presupuesto?mes=${previous}`,
    );
  });

  it('shows the month-end balance instead of spendable for past months', async () => {
    const categories = await categoryRepo.list();
    const food = categories.find((category) => category.name === 'Comida')!;
    const salary = categories.find((category) => category.name === 'Sueldo')!;
    const previous = addMonths(currentMonth(), -1);
    const previousDate = dueDateForMonth(previous, 15);

    await transactionRepo.create({
      type: 'opening',
      direction: 'in',
      amountCents: asCents(100000),
      date: previousDate,
      description: 'Saldo inicial',
      source: 'opening',
    });
    await transactionRepo.create({
      type: 'income',
      direction: 'in',
      amountCents: asCents(220000),
      date: previousDate,
      categoryId: salary.id,
      description: 'Sueldo anterior',
      source: 'manual',
    });
    await transactionRepo.create({
      type: 'expense',
      direction: 'out',
      amountCents: asCents(25000),
      date: previousDate,
      categoryId: food.id,
      description: 'Comida anterior',
      source: 'manual',
    });
    await transactionRepo.create({
      type: 'income',
      direction: 'in',
      amountCents: asCents(50000),
      date: todayInLima(),
      categoryId: salary.id,
      description: 'Ingreso del mes actual',
      source: 'manual',
    });
    await planRepo.getOrCreate(previous);

    renderDashboard(`/?mes=${previous}`);

    const balance = await screen.findByRole('group', { name: 'Saldo del mes' });
    expect(await within(balance).findByText('S/ 2,950.00')).toBeInTheDocument();
    expect(screen.queryByText(/por día/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('group', { name: 'Disponible para gastar' }),
    ).not.toBeInTheDocument();
  });

  it('previews active goals with their progress', async () => {
    const goal = await goalRepo.create({
      name: 'Viaje a Cusco',
      targetCents: asCents(200000),
    });
    await goalRepo.contribute(goal.id, {
      amountCents: asCents(50000),
      date: todayInLima(),
    });

    renderDashboard();

    expect(await screen.findByRole('heading', { name: 'Metas activas' })).toBeInTheDocument();
    expect(await screen.findByText('Viaje a Cusco')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ver todas/i })).toHaveAttribute('href', '/metas');
    expect(
      await screen.findByRole('progressbar', { name: /progreso de viaje a cusco/i }),
    ).toBeInTheDocument();
  });

  it('shows a starting checklist when there is no data yet', async () => {
    renderDashboard();

    expect(
      await screen.findByRole('heading', { name: /empezá por acá/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /registrar tu primer movimiento/i }),
    ).toHaveAttribute('href', '/movimientos');
    expect(
      screen
        .getAllByRole('link', { name: /crear una meta/i })
        .some((link) => link.getAttribute('href') === '/metas'),
    ).toBe(true);
  });

  it('reminds the user to export a backup after 30 days', async () => {
    await settingsRepo.update({
      onboardingCompletedAt: new Date(
        Date.now() - 40 * 24 * 60 * 60 * 1000,
      ).toISOString() as ISOTimestamp,
    });

    renderDashboard();

    expect(await screen.findByText(/más de 30 días sin backup/i)).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: /descartar recordatorio/i }),
    );

    await waitFor(() =>
      expect(screen.queryByText(/más de 30 días sin backup/i)).not.toBeInTheDocument(),
    );
  });
});
