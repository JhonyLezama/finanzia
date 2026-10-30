import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/db';
import { categoryRepo } from '@/db/repositories/categories';
import { planRepo } from '@/db/repositories/plans';
import { recurringRepo } from '@/db/repositories/recurring';
import { transactionRepo } from '@/db/repositories/transactions';
import { resetDb } from '@/db/test-utils';
import { addMonths, currentMonth } from '@/domain/dates';
import { asCents } from '@/domain/money';
import BudgetPage from './BudgetPage';

function renderBudget(initialEntry = '/presupuesto') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/presupuesto" element={<BudgetPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(async () => {
  await resetDb();
  await categoryRepo.ensureDefaults();
});

describe('budget screen', () => {
  it('pays a fixed item and updates executed and available', async () => {
    const categories = await categoryRepo.list();
    const housing = categories.find((c) => c.name === 'Vivienda')!;
    const month = currentMonth();

    await recurringRepo.create({
      name: 'Alquiler',
      kind: 'fixed_expense',
      amountCents: asCents(38000),
      categoryId: housing.id,
      dayOfMonth: 5,
      startMonth: month,
    });

    renderBudget();

    const payButton = await screen.findByRole('button', { name: /pagar alquiler/i });
    await userEvent.click(payButton);

    const confirmButton = await screen.findByRole('button', { name: /confirmar pago/i });
    await userEvent.click(confirmButton);

    expect(await screen.findByText(/pagado/i)).toBeInTheDocument();
    expect(screen.getByText('−S/ 380.00')).toBeInTheDocument();
  });

  it('edits a variable budget inline and persists it', async () => {
    const categories = await categoryRepo.list();
    const food = categories.find((c) => c.name === 'Comida')!;

    renderBudget();

    const input = await screen.findByLabelText(/presupuesto de comida/i);
    await userEvent.clear(input);
    await userEvent.type(input, '300');
    await userEvent.tab();

    await waitFor(async () => {
      const plan = await db.plans.get(currentMonth());
      expect(plan).toMatchObject({
        variableBudgets: expect.arrayContaining([
          { categoryId: food.id, plannedCents: 30000 },
        ]),
      });
    });

    expect(await screen.findByText(/por día/i)).toBeInTheDocument();
  });

  it('shows a closed month as read-only', async () => {
    const pastMonth = addMonths(currentMonth(), -1);
    await planRepo.getOrCreate(pastMonth);
    await planRepo.close(pastMonth);

    renderBudget(`/presupuesto?mes=${pastMonth}`);

    expect(await screen.findByText(/mes cerrado/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^pagar/i })).not.toBeInTheDocument();
  });

  it('verifies paying a fixed item is excluded from variable expenses and appears once in ledger', async () => {
    const categories = await categoryRepo.list();
    const housing = categories.find((c) => c.name === 'Vivienda')!;
    const month = currentMonth();

    await recurringRepo.create({
      name: 'Alquiler',
      kind: 'fixed_expense',
      amountCents: asCents(38000),
      categoryId: housing.id,
      dayOfMonth: 5,
      startMonth: month,
    });

    renderBudget();

    await userEvent.click(await screen.findByRole('button', { name: /pagar alquiler/i }));
    await userEvent.click(await screen.findByRole('button', { name: /confirmar pago/i }));

    await screen.findByText(/pagado/i);

    const transactions = await transactionRepo.listByMonth(month);
    const rentTx = transactions.filter((t) => t.description === 'Alquiler');
    expect(rentTx).toHaveLength(1);
    expect(rentTx[0]?.type).toBe('expense');

    // Vivienda category is fixed, not variable
    const category = categories.find((c) => c.id === rentTx[0]?.categoryId);
    expect(category?.group).toBe('fixed');
  });
});
