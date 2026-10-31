import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { Toaster } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { categoryRepo } from '@/db/repositories/categories';
import { planRepo } from '@/db/repositories/plans';
import { transactionRepo } from '@/db/repositories/transactions';
import { resetDb } from '@/db/test-utils';
import { todayInLima } from '@/domain/dates';
import { asCents } from '@/domain/money';
import type { MonthKey } from '@/domain/models';
import TransactionsPage from './TransactionsPage';

function mockViewport(isWide: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: isWide,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}

async function seedExpense(description = 'Cine') {
  const categories = await categoryRepo.list();
  const food = categories.find((category) => category.name === 'Comida')!;

  await transactionRepo.create({
    type: 'expense',
    direction: 'out',
    amountCents: asCents(6000),
    date: todayInLima(),
    categoryId: food.id,
    description,
    source: 'manual',
  });
}

function renderTransactions(initialEntry = '/movimientos') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Toaster />
      <Routes>
        <Route path="/movimientos" element={<TransactionsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(async () => {
  await resetDb();
  await categoryRepo.ensureDefaults();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('transactions screen', () => {
  it('adds an expense and shows it in the list', async () => {
    renderTransactions();

    await userEvent.click(await screen.findByRole('button', { name: /nuevo movimiento/i }));
    await userEvent.type(await screen.findByLabelText(/monto/i), '60');
    await userEvent.click(await screen.findByRole('button', { name: /ocio/i }));
    await userEvent.type(screen.getByLabelText(/descripción/i), 'Cine');
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));

    expect(await screen.findByText('Cine')).toBeInTheDocument();
    expect(screen.getByText('−S/ 60.00')).toBeInTheDocument();
  });

  it('deletes with undo', async () => {
    renderTransactions();

    await userEvent.click(await screen.findByRole('button', { name: /nuevo movimiento/i }));
    await userEvent.type(await screen.findByLabelText(/monto/i), '60');
    await userEvent.click(await screen.findByRole('button', { name: /ocio/i }));
    await userEvent.type(screen.getByLabelText(/descripción/i), 'Cine');
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));

    expect(await screen.findByText('Cine')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /acciones de cine/i }));
    await userEvent.click(await screen.findByRole('menuitem', { name: /eliminar/i }));

    const undoButton = await screen.findByRole('button', { name: /deshacer/i });
    await userEvent.click(undoButton);

    expect(await screen.findByText('Cine')).toBeInTheDocument();
  });

  it('shows a closed month as read-only and hides new transaction action', async () => {
    const month = '2026-09' as MonthKey;
    await planRepo.getOrCreate(month);
    await planRepo.close(month);

    renderTransactions(`/movimientos?mes=${month}`);

    expect(await screen.findByText(/mes cerrado/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /nuevo movimiento/i })).not.toBeInTheDocument();
  });

  it('renders compact cards instead of a table on narrow screens', async () => {
    await seedExpense('Cine');
    mockViewport(false);

    renderTransactions();

    const list = await screen.findByRole('list', { name: /movimientos/i });
    expect(list).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText('Cine')).toBeInTheDocument();
    expect(screen.getByText('−S/ 60.00')).toBeInTheDocument();
  });

  it('edits and deletes from a mobile card', async () => {
    await seedExpense('Cine');
    mockViewport(false);

    renderTransactions();

    const list = await screen.findByRole('list', { name: /movimientos/i });

    await userEvent.click(within(list).getByRole('button', { name: /acciones de cine/i }));
    await userEvent.click(await screen.findByRole('menuitem', { name: /editar/i }));

    expect(await screen.findByRole('heading', { name: /editar movimiento/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }));

    await userEvent.click(within(list).getByRole('button', { name: /acciones de cine/i }));
    await userEvent.click(await screen.findByRole('menuitem', { name: /eliminar/i }));

    expect(await screen.findByRole('button', { name: /deshacer/i })).toBeInTheDocument();
  });
});
