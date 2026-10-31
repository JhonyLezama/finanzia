import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 320, height: 720 } });

test('keeps Movimientos inside the mobile viewport', async ({ page }) => {
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

  await page.getByRole('link', { name: 'Movimientos' }).click();
  await page.getByRole('button', { name: 'Nuevo movimiento' }).click();
  await page.getByLabel('Monto').fill('1234567.89');
  await page
    .getByLabel('Descripción')
    .fill('Una descripción extremadamente larga que antes desbordaba la tabla en el celular');
  await page.getByRole('button', { name: 'Guardar', exact: true }).click();

  await expect(page.getByRole('list', { name: 'Movimientos' })).toBeVisible();
  await expect(page.getByRole('table')).toHaveCount(0);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('scrolls the settings tabs and keeps the active one visible', async ({ page }) => {
  await page.goto('/ajustes');

  const nav = page.getByRole('navigation', { name: 'Secciones de ajustes' });
  await expect(nav).toBeVisible();

  const scrollsHorizontally = await nav.evaluate(
    (element) => element.scrollWidth > element.clientWidth,
  );
  expect(scrollsHorizontally).toBe(true);

  const appTab = page.getByRole('button', { name: 'App', exact: true });
  await appTab.click();
  await expect(appTab).toHaveAttribute('aria-pressed', 'true');

  await expect
    .poll(async () => {
      const navBox = await nav.boundingBox();
      const tabBox = await appTab.boundingBox();
      if (!navBox || !tabBox) {
        return false;
      }
      return (
        tabBox.x >= navBox.x - 1 &&
        tabBox.x + tabBox.width <= navBox.x + navBox.width + 1
      );
    })
    .toBe(true);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
