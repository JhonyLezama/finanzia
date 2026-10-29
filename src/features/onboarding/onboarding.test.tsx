import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/db';
import { auditRepo } from '@/db/repositories/audit';
import { goalRepo } from '@/db/repositories/goals';
import { planRepo } from '@/db/repositories/plans';
import { recurringRepo } from '@/db/repositories/recurring';
import { settingsRepo } from '@/db/repositories/settings';
import { transactionRepo } from '@/db/repositories/transactions';
import { resetDb } from '@/db/test-utils';
import { addMonths, currentMonth } from '@/domain/dates';
import OnboardingPage from './OnboardingPage';

function renderOnboarding() {
  return render(
    <MemoryRouter initialEntries={['/onboarding']}>
      <OnboardingPage />
    </MemoryRouter>,
  );
}

async function clickButton(name: RegExp) {
  const button = await screen.findByRole('button', { name });
  await waitFor(() => expect(button).toBeEnabled());
  await userEvent.click(button);
}

beforeEach(async () => {
  await resetDb();
});

describe('onboarding', () => {
  it('completes onboarding and creates the opening balance, rules, goal, and plan', async () => {
    renderOnboarding();

    await clickButton(/empezar de cero/i);
    await userEvent.type(await screen.findByLabelText(/nombre/i), 'Ana');
    await userEvent.type(screen.getByLabelText(/saldo inicial/i), '1000');
    await clickButton(/continuar/i);

    await userEvent.type(await screen.findByLabelText(/ingreso mensual/i), '2200');
    await clickButton(/continuar/i);

    await screen.findByRole('heading', { name: /tus gastos fijos/i });
    await clickButton(/omitir/i);

    await screen.findByRole('heading', { name: /tu primera meta/i });
    await clickButton(/omitir/i);

    await screen.findByRole('heading', { name: /todo listo/i });
    await clickButton(/ir al inicio/i);

    await waitFor(async () => {
      expect((await settingsRepo.get()).onboardingCompletedAt).toEqual(expect.any(String));
    });

    const transactions = await transactionRepo.listAll();
    const opening = transactions.find((transaction) => transaction.type === 'opening');
    expect(opening).toMatchObject({
      direction: 'in',
      amountCents: 100000,
      source: 'opening',
    });

    expect(await recurringRepo.list()).toHaveLength(1);
    const settings = await settingsRepo.get();
    expect(settings.displayName).toBe('Ana');
    expect(settings.onboardingStep).toBe(5);

    const plan = await planRepo.getOrCreate(currentMonth());
    expect(plan).toBeTruthy();
    expect(await db.planItems.where('planId').equals(currentMonth()).count()).toBe(1);
  });

  it('records a debt as an outgoing opening balance', async () => {
    renderOnboarding();

    await clickButton(/empezar de cero/i);
    await userEvent.type(await screen.findByLabelText(/saldo inicial/i), '250');
    await userEvent.click(screen.getByRole('radio', { name: /deuda/i }));
    await clickButton(/continuar/i);

    await screen.findByRole('heading', { name: /tu ingreso principal/i });
    await clickButton(/omitir/i);

    await screen.findByRole('heading', { name: /tus gastos fijos/i });
    await clickButton(/omitir/i);

    await screen.findByRole('heading', { name: /tu primera meta/i });
    await clickButton(/omitir/i);

    await screen.findByRole('heading', { name: /todo listo/i });
    await clickButton(/ir al inicio/i);

    await waitFor(async () => {
      const transactions = await transactionRepo.listAll();
      expect(transactions.some((transaction) => transaction.type === 'opening')).toBe(true);
    });

    const opening = (await transactionRepo.listAll()).find(
      (transaction) => transaction.type === 'opening',
    );
    expect(opening).toMatchObject({ direction: 'out', amountCents: 25000 });
  });

  it('seeds three months of sample data with goals, rules, and a single audit entry', async () => {
    renderOnboarding();

    await clickButton(/probar con datos de ejemplo/i);

    await waitFor(async () => {
      expect((await settingsRepo.get()).onboardingCompletedAt).toEqual(expect.any(String));
    });

    const current = currentMonth();
    const months = [addMonths(current, -2), addMonths(current, -1), current];
    const transactions = await transactionRepo.listAll();

    for (const month of months) {
      expect(
        transactions.some((transaction) => transaction.date.startsWith(month)),
      ).toBe(true);
    }

    const rules = await recurringRepo.list();
    expect(rules.filter((rule) => rule.kind === 'fixed_expense')).toHaveLength(3);
    expect(rules.filter((rule) => rule.kind === 'expected_income')).toHaveLength(1);
    expect(await goalRepo.list({ includeArchived: true })).toHaveLength(2);
    expect((await planRepo.getOrCreate(current)).variableBudgets.length).toBeGreaterThan(0);

    const entries = await auditRepo.list(100);
    expect(entries.filter((entry) => entry.action === 'seed_data')).toHaveLength(1);
  });

  it('resumes at the step persisted in settings', async () => {
    await settingsRepo.update({ onboardingStep: 2, displayName: 'Ana' });

    renderOnboarding();

    expect(await screen.findByLabelText(/ingreso mensual/i)).toBeInTheDocument();
  });
});
