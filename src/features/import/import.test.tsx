import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import bankCsv from '@/test/fixtures/bank-october-2026.csv?raw';
import { db, resetDb } from '@/db/test-utils';
import ImportPage from './ImportPage';

beforeEach(async () => {
  await resetDb();
});

async function uploadBank(fileName = 'bank.csv') {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <ImportPage />
    </MemoryRouter>,
  );

  const input = screen.getByLabelText('Archivo');
  await user.upload(input, new File([bankCsv], fileName, { type: 'text/csv' }));

  expect(await screen.findByRole('heading', { name: 'Mapeo de columnas' })).toBeInTheDocument();
  return user;
}

describe('import screen', () => {
  it('imports a CSV, shows the summary, and undoes the batch', async () => {
    const user = await uploadBank();

    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(await screen.findByRole('heading', { name: 'Vista previa' })).toBeInTheDocument();
    expect(screen.getByText(/2 listas para importar/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Confirmar importación' }));

    expect(await screen.findByRole('heading', { name: 'Importación lista' })).toBeInTheDocument();
    expect((await db.transactions.toArray()).filter((row) => !row.deleted)).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: 'Deshacer importación' }));

    expect(await screen.findByRole('heading', { name: 'Importación deshecha' })).toBeInTheDocument();
    expect((await db.transactions.toArray()).filter((row) => !row.deleted)).toHaveLength(0);
  });

  it('skips duplicates when the same file is imported twice', async () => {
    const user = await uploadBank();

    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    await screen.findByRole('heading', { name: 'Vista previa' });
    await user.click(screen.getByRole('button', { name: 'Confirmar importación' }));
    await screen.findByRole('heading', { name: 'Importación lista' });

    await user.click(screen.getByRole('button', { name: 'Importar otro archivo' }));
    const input = await screen.findByLabelText('Archivo');
    await user.upload(input, new File([bankCsv], 'bank.csv', { type: 'text/csv' }));
    await screen.findByRole('heading', { name: 'Mapeo de columnas' });
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(await screen.findByRole('heading', { name: 'Vista previa' })).toBeInTheDocument();
    expect(screen.getByText(/2 duplicadas/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar importación' })).toBeDisabled();
  });
});
