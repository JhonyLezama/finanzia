import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/db';
import { resetDb } from '@/db/test-utils';
import type { MonthKey } from '@/domain/models';
import { buildTransactionsCsv } from '@/domain/reports';
import { fixtureOctober2026 } from '@/test/fixtures/october-2026';
import ReportsPage from './ReportsPage';

beforeEach(async () => {
  await resetDb();
  const fixture = fixtureOctober2026();
  await db.categories.bulkAdd(fixture.categories);
  await db.plans.add(fixture.plan);
  await db.planItems.bulkAdd(fixture.planItems);
  await db.transactions.bulkAdd(fixture.transactions);
});

describe('reports screen', () => {
  it('shows monthly KPIs and a table alternative for the chart', async () => {
    render(<ReportsPage initialMonth={'2026-10' as MonthKey} />);

    expect(await screen.findByText(/tasa de ahorro/i)).toBeInTheDocument();

    const tableButtons = screen.getAllByRole('button', { name: /ver tabla/i });
    expect(tableButtons.length).toBeGreaterThan(0);
    await userEvent.click(tableButtons[0]!);

    expect(screen.getByRole('table', { name: /tendencia/i })).toBeInTheDocument();
  });

  it('exports a CSV with BOM and comma delimiter', async () => {
    const blob = await buildTransactionsCsv(fixtureOctober2026());
    const bytes = new Uint8Array(await blob.arrayBuffer());

    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(new TextDecoder().decode(bytes.slice(3)).split('\n')[0]).toBe(
      'fecha,descripcion,categoria,tipo,monto,moneda,origen,nota',
    );
  });

  it('switches between monthly and annual views', async () => {
    render(<ReportsPage initialMonth={'2026-10' as MonthKey} />);

    expect(await screen.findByText(/tasa de ahorro/i)).toBeInTheDocument();

    const annualBtn = screen.getByRole('button', { name: /anual/i });
    await userEvent.click(annualBtn);

    expect(await screen.findByText(/resumen anual 2026/i)).toBeInTheDocument();
  });
});

