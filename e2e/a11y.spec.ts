import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const routes = [
  { path: '/', name: 'Inicio' },
  { path: '/movimientos', name: 'Movimientos' },
  { path: '/presupuesto', name: 'Presupuesto' },
  { path: '/reportes', name: 'Reportes' },
  { path: '/metas', name: 'Metas' },
  { path: '/ajustes', name: 'Ajustes' },
];

for (const route of routes) {
  test(`has no axe violations on ${route.path}`, async ({ page }) => {
    await page.goto(route.path);
    await expect(page.getByRole('heading', { level: 1, name: route.name })).toBeVisible();
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
}

test('opens the quick-add drawer with the keyboard and closes it with Escape', async ({ page }) => {
  await page.goto('/movimientos');

  const trigger = page.getByRole('button', { name: 'Nuevo movimiento' });
  await trigger.focus();
  await page.keyboard.press('Enter');

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Monto')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});
