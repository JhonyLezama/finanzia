import { expect, test } from '@playwright/test';

test('loads the app shell offline after the service worker installs', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Inicio' })).toBeVisible();

  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) => {
        navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), {
          once: true,
        });
      });
    }
  });

  await context.setOffline(true);
  await page.reload();

  await expect(page.getByRole('heading', { name: 'Inicio' })).toBeVisible();
  await expect(page.getByText(/sin conexión/i).first()).toBeVisible();

  await context.setOffline(false);
});
