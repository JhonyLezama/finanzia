import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { Providers } from '@/app/providers';
import { categoryRepo } from '@/db/repositories/categories';
import { recurringRepo } from '@/db/repositories/recurring';
import { settingsRepo } from '@/db/repositories/settings';
import { resetDb } from '@/db/test-utils';
import { currentMonth } from '@/domain/dates';
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

    const archive = await screen.findByRole('button', { name: 'Archivar Ocio' });
    await user.click(archive);

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
});
