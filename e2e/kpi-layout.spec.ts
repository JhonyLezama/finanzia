import { expect, test } from '@playwright/test';

const WIDTHS = [320, 640, 768, 1024, 1280, 1440];

async function completeOnboarding(page: import('@playwright/test').Page) {
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
}

async function lineHeightOf(element: import('@playwright/test').Locator) {
  return element.evaluate((node) => {
    const style = getComputedStyle(node);
    const parsed = Number.parseFloat(style.lineHeight);
    return Number.isFinite(parsed) ? parsed : Number.parseFloat(style.fontSize) * 1.2;
  });
}

for (const width of WIDTHS) {
  test.describe(`viewport ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });

    test('keeps KPI labels and badges readable', async ({ page }) => {
      await completeOnboarding(page);
      await expect(page.getByRole('heading', { name: 'Inicio' })).toBeVisible();

      for (const phrase of ['Total en mano', 'Libre para gastar']) {
        const badge = page.getByText(phrase, { exact: true });
        await expect(badge).toBeVisible();

        const lineHeight = await lineHeightOf(badge);
        const box = await badge.boundingBox();
        expect(box, `"${phrase}" should be visible`).not.toBeNull();
        expect(
          box!.height,
          `"${phrase}" should stay on one line instead of wrapping`,
        ).toBeLessThan(lineHeight * 1.8);
      }

      for (const label of [
        'Saldo real',
        'Disponible para gastar',
        'Ejecutado del mes',
        'Tasa de ahorro',
      ]) {
        const card = page.getByRole('group', { name: label });
        const labelElement = card.getByText(label, { exact: true });
        await expect(labelElement).toBeVisible();

        const clipped = await labelElement.evaluate(
          (node) => node.scrollWidth > node.clientWidth + 1,
        );
        expect(clipped, `"${label}" should not be clipped`).toBe(false);
      }

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  });
}
