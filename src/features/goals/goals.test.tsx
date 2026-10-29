import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { goalRepo } from '@/db/repositories/goals';
import { resetDb } from '@/db/test-utils';
import { todayInLima } from '@/domain/dates';
import { asCents } from '@/domain/money';
import GoalsPage from './GoalsPage';

function renderGoals() {
  return render(
    <MemoryRouter initialEntries={['/metas']}>
      <Routes>
        <Route path="/metas" element={<GoalsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(async () => {
  await resetDb();
});

describe('goals screen', () => {
  it('contributes to a goal and updates progress', async () => {
    const goal = await goalRepo.create({
      name: 'Viaje a Cusco',
      targetCents: asCents(200000),
    });

    await goalRepo.contribute(goal.id, {
      amountCents: asCents(12000),
      date: todayInLima(),
      note: 'Aporte inicial',
    });

    renderGoals();

    const contributeBtn = await screen.findByRole('button', {
      name: /aportar a viaje a cusco/i,
    });
    await userEvent.click(contributeBtn);

    const amountInput = await screen.findByLabelText(/monto/i);
    await userEvent.type(amountInput, '50');

    const confirmBtn = await screen.findByRole('button', { name: /confirmar aporte/i });
    await userEvent.click(confirmBtn);

    const matches = await screen.findAllByText(/S\/ 170.00/);
    expect(matches[0]).toBeInTheDocument();
  });

  it('prevents withdrawing more than the goal balance', async () => {
    const goal = await goalRepo.create({
      name: 'Viaje a Cusco',
      targetCents: asCents(200000),
    });

    await goalRepo.contribute(goal.id, {
      amountCents: asCents(12000),
      date: todayInLima(),
    });

    renderGoals();

    const withdrawBtn = await screen.findByRole('button', {
      name: /retirar de viaje a cusco/i,
    });
    await userEvent.click(withdrawBtn);

    const amountInput = await screen.findByLabelText(/monto/i);
    await userEvent.type(amountInput, '999');

    const confirmBtn = await screen.findByRole('button', { name: /confirmar retiro/i });
    await userEvent.click(confirmBtn);

    expect(await screen.findByText(/superar el saldo/i)).toBeInTheDocument();
  });

  it('creates a new savings goal', async () => {
    renderGoals();

    await userEvent.click(await screen.findByRole('button', { name: /nueva meta/i }));
    await userEvent.type(await screen.findByLabelText(/nombre/i), 'Fondo de emergencia');
    await userEvent.type(screen.getByLabelText(/monto objetivo/i), '3000');
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));

    expect(await screen.findByText('Fondo de emergencia')).toBeInTheDocument();
  });
});
