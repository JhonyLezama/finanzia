import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { Providers } from '@/app/providers';
import { db } from '@/db/db';
import { categoryRepo } from '@/db/repositories/categories';
import { recurringRepo } from '@/db/repositories/recurring';
import { settingsRepo } from '@/db/repositories/settings';
import { transactionRepo } from '@/db/repositories/transactions';
import { resetDb } from '@/db/test-utils';
import { currentMonth, todayInLima } from '@/domain/dates';
import { asCents } from '@/domain/money';
import SettingsPage from './SettingsPage';

function renderSettings() {
  return render(
    <Providers>
      <MemoryRouter initialEntries={['/ajustes']}>
        <SettingsPage />
      </MemoryRouter>
    </Providers>,
  );
}

beforeEach(async () => {
  await resetDb();
  await categoryRepo.ensureDefaults();
});

describe('settings screen', () => {
  it('archives a category and hides it from new budgets', async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.click(screen.getByRole('button', { name: 'Categorías' }));

    const actions = await screen.findByRole('button', { name: 'Acciones de Ocio' });
    await user.click(actions);
    await user.click(await screen.findByRole('menuitem', { name: 'Archivar' }));

    await waitFor(async () => {
      const visible = await categoryRepo.list();
      expect(visible.some((category) => category.name === 'Ocio')).toBe(false);
    });

    const archived = await categoryRepo.list({ includeArchived: true });
    expect(archived.find((category) => category.name === 'Ocio')?.archived).toBe(1);
  });

  it('pauses a recurring rule', async () => {
    const user = userEvent.setup();
    const categories = await categoryRepo.list();
    const housing = categories.find((category) => category.name === 'Vivienda')!;

    await recurringRepo.create({
      name: 'Alquiler',
      kind: 'fixed_expense',
      amountCents: asCents(38000),
      categoryId: housing.id,
      dayOfMonth: 5,
      startMonth: currentMonth(),
    });

    renderSettings();

    await user.click(screen.getByRole('button', { name: 'Recurrentes' }));
    await user.click(await screen.findByRole('button', { name: 'Pausar Alquiler' }));

    await waitFor(async () => {
      const rule = (await recurringRepo.list()).find((item) => item.name === 'Alquiler');
      expect(rule?.active).toBe(0);
    });
  });

  it('saves the profile name', async () => {
    const user = userEvent.setup();
    renderSettings();

    const input = await screen.findByLabelText('Nombre');
    await user.clear(input);
    await user.type(input, 'Ana');

    await user.click(screen.getByRole('button', { name: 'Guardar perfil' }));

    await waitFor(async () => {
      expect((await settingsRepo.get()).displayName).toBe('Ana');
    });
    expect(await screen.findByRole('status')).toHaveTextContent('Perfil guardado');
  });

  it('filters the audit log by text', async () => {
    const user = userEvent.setup();
    const categories = await categoryRepo.list();
    const leisure = categories.find((category) => category.name === 'Ocio')!;
    await categoryRepo.archive(leisure.id);

    renderSettings();

    await user.click(screen.getByRole('button', { name: 'Auditoría' }));
    expect(await screen.findByText(/Categoría archivada: Ocio/)).toBeInTheDocument();

    await user.type(screen.getByLabelText('Buscar en auditoría'), 'no existe');
    expect(await screen.findByText('No hay eventos que coincidan.')).toBeInTheDocument();
  });

  it('edits a category from its actions menu', async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.click(screen.getByRole('button', { name: 'Categorías' }));
    await user.click(await screen.findByRole('button', { name: 'Acciones de Ocio' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Editar' }));

    const nameInput = await screen.findByLabelText('Nombre de la categoría');
    await user.clear(nameInput);
    await user.type(nameInput, 'Entretenimiento');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(async () => {
      const categories = await categoryRepo.list();
      expect(categories.some((category) => category.name === 'Entretenimiento')).toBe(true);
    });
  });

  it('locks the group selector for a category in use', async () => {
    const user = userEvent.setup();
    const custom = await categoryRepo.create({
      name: 'Mascotas',
      kind: 'expense',
      group: 'variable',
    });
    await transactionRepo.create({
      type: 'expense',
      direction: 'out',
      amountCents: asCents(1500),
      date: todayInLima(),
      categoryId: custom.id,
      description: 'Comida del perro',
      source: 'manual',
    });
    renderSettings();

    await user.click(screen.getByRole('button', { name: 'Categorías' }));
    await user.click(await screen.findByRole('button', { name: 'Acciones de Mascotas' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Editar' }));

    expect(await screen.findByLabelText('Grupo de la categoría')).toBeDisabled();
  });

  it('deletes an unused custom category after confirmation', async () => {
    const user = userEvent.setup();
    const custom = await categoryRepo.create({
      name: 'Mascotas',
      kind: 'expense',
      group: 'variable',
    });
    renderSettings();

    await user.click(screen.getByRole('button', { name: 'Categorías' }));
    await user.click(await screen.findByRole('button', { name: 'Acciones de Mascotas' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Borrar' }));
    await user.click(await screen.findByRole('button', { name: 'Borrar categoría' }));

    await waitFor(async () => {
      expect(await db.categories.get(custom.id)).toBeUndefined();
    });
  });

  it('keeps a category in use and explains why it cannot be deleted', async () => {
    const user = userEvent.setup();
    const custom = await categoryRepo.create({
      name: 'Mascotas',
      kind: 'expense',
      group: 'variable',
    });
    await transactionRepo.create({
      type: 'expense',
      direction: 'out',
      amountCents: asCents(1500),
      date: todayInLima(),
      categoryId: custom.id,
      description: 'Comida del perro',
      source: 'manual',
    });
    renderSettings();

    await user.click(screen.getByRole('button', { name: 'Categorías' }));
    await user.click(await screen.findByRole('button', { name: 'Acciones de Mascotas' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Borrar' }));
    await user.click(await screen.findByRole('button', { name: 'Borrar categoría' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/archivala|movimientos/i);
    expect(await db.categories.get(custom.id)).toBeTruthy();
  });

  it('reactivates an archived category', async () => {
    const user = userEvent.setup();
    const categories = await categoryRepo.list();
    const leisure = categories.find((category) => category.name === 'Ocio')!;
    await categoryRepo.archive(leisure.id);
    renderSettings();

    await user.click(screen.getByRole('button', { name: 'Categorías' }));
    await user.click(await screen.findByText(/Archivadas \(1\)/));
    await user.click(await screen.findByRole('button', { name: 'Reactivar Ocio' }));

    await waitFor(async () => {
      const all = await categoryRepo.list({ includeArchived: true });
      expect(all.find((category) => category.id === leisure.id)?.archived).toBe(0);
    });
  });
});
