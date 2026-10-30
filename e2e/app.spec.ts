import { expect, test } from '@playwright/test';

test('completes onboarding and records a persisted expense', async ({ page }) => {
  await page.goto('/onboarding');

  await page.getByRole('button', { name: 'Empezar de cero' }).click();
  await page.getByLabel(/tu nombre/i).fill('Ana');
  await page.getByLabel('Saldo inicial').fill('1000');
  await page.getByRole('button', { name: 'Continuar' }).click();

  await page.getByLabel('Ingreso mensual').fill('2200');
  await page.getByRole('button', { name: 'Continuar' }).click();

  await page.getByRole('button', { name: 'Omitir por ahora' }).click();
  await page.getByRole('button', { name: 'Omitir por ahora' }).click();
  await page.getByRole('button', { name: 'Ir al inicio' }).click();

  await expect(page.getByRole('heading', { name: 'Inicio' })).toBeVisible();

  await page.getByRole('link', { name: 'Movimientos' }).click();
  await page.getByRole('button', { name: 'Nuevo movimiento' }).click();
  await page.getByLabel('Monto').fill('60');
  await page.getByLabel('Descripción').fill('Cine');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();

  await expect(page.getByText('Cine')).toBeVisible();

  await page.reload();
  await expect(page.getByText('Cine')).toBeVisible();
});

test('imports a CSV and undoes the batch', async ({ page }) => {
  await page.goto('/importar');

  await uploadBankCsv(page);
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByText(/2 listas para importar/)).toBeVisible();
  await page.getByRole('button', { name: 'Confirmar importación' }).click();
  await expect(page.getByRole('heading', { name: 'Importación lista' })).toBeVisible();

  await page.getByRole('button', { name: 'Deshacer importación' }).click();
  await expect(page.getByRole('heading', { name: 'Importación deshecha' })).toBeVisible();
});

test('flags duplicated rows on a second import', async ({ page }) => {
  await page.goto('/importar');

  await uploadBankCsv(page);
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Confirmar importación' }).click();
  await expect(page.getByRole('heading', { name: 'Importación lista' })).toBeVisible();

  await page.getByRole('button', { name: 'Importar otro archivo' }).click();
  await uploadBankCsv(page);
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page.getByText(/2 duplicadas/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirmar importación' })).toBeDisabled();
});

async function uploadBankCsv(page: import('@playwright/test').Page) {
  const csv = ['fecha,descripcion,monto', '28/10/2026,Cine,-60.00', '27/10/2026,Sueldo,2500.00'].join(
    '\n',
  );
  await page.getByLabel('Archivo', { exact: true }).setInputFiles({
    name: 'banco.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv, 'utf8'),
  });
  await expect(page.getByRole('heading', { name: 'Mapeo de columnas' })).toBeVisible();
}

