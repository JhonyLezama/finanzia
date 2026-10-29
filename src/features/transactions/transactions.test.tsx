import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { categoryRepo } from '@/db/repositories/categories';
import { planRepo } from '@/db/repositories/plans';
import { resetDb } from '@/db/test-utils';
import type { MonthKey } from '@/domain/models';
import TransactionsPage from './TransactionsPage';

function renderTransactions(initialEntry = '/movimientos') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
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
});
