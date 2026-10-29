import { describe, expect, it } from 'vitest';
import { asCents } from './money';
import type { Category, ISODate, ISOTimestamp, Transaction } from './models';
import { buildAnnualReport, buildCategoryBreakdown, buildMonthlyReport } from './reports';
import { fixtureOctober2026, octoberFixtureIds } from '@/test/fixtures/october-2026';

const timestamp = '2026-10-01T00:00:00.000Z' as ISOTimestamp;

function expense(
  id: string,
  categoryId: string,
  amountCents: number,
  date: string,
): Transaction {
  return {
    id,
    type: 'expense',
    direction: 'out',
    amountCents: asCents(amountCents),
    currency: 'PEN',
    date: date as ISODate,
    categoryId,
    description: `Gasto ${id}`,
    source: 'manual',
    createdAt: timestamp,
    updatedAt: timestamp,
    deleted: 0,
  };
}

describe('buildMonthlyReport', () => {
  it('builds a monthly report with fixed and variable splits', () => {
    const report = buildMonthlyReport(fixtureOctober2026());

    expect(report.month).toBe('2026-10');
    expect(report.incomeCents).toBe(220000);
    expect(report.expenseCents).toBe(63000);
    expect(report.savingsCents).toBe(157000);
    expect(report.fixedCents).toBe(38000);
    expect(report.variableCents).toBe(25000);
    expect(report.savingsRate).toBeCloseTo(0.7136, 4);
  });

  it('compares budget and actual per category', () => {
    const report = buildMonthlyReport(fixtureOctober2026());
    const byName = new Map(report.rows.map((row) => [row.categoryName, row]));

    expect(report.budgetVariance).toEqual({ varianceCents: -77000, variancePct: -0.55 });
    expect(report.executionPct).toBeCloseTo(0.45, 6);

    expect(byName.get('Vivienda')).toMatchObject({
      categoryId: octoberFixtureIds.alquiler,
      group: 'fixed',
      planCents: 38000,
      actualCents: 38000,
      varianceCents: 0,
      variancePct: 0,
    });
    expect(byName.get('Comida')).toMatchObject({
      group: 'variable',
      planCents: 60000,
      actualCents: 25000,
      varianceCents: -35000,
    });
    expect(byName.get('Comida')?.variancePct).toBeCloseTo(-35000 / 60000, 6);
    expect(byName.get('Transporte')).toMatchObject({
      planCents: 30000,
      actualCents: 0,
      varianceCents: -30000,
      variancePct: -1,
    });
    expect(byName.get('Servicios')).toMatchObject({
      planCents: 12000,
      actualCents: 0,
      varianceCents: -12000,
    });
    expect(byName.has('Suscripciones')).toBe(false);
  });

  it('does not count goal deposits as expenses or savings', () => {
    const report = buildMonthlyReport(fixtureOctober2026());

    expect(report.expenseCents).toBe(63000);
    expect(report.goalContribCents).toBe(20000);
  });
});

describe('buildAnnualReport', () => {
  it('aggregates every month of the selected year', () => {
    const report = buildAnnualReport(fixtureOctober2026());

    expect(report.year).toBe(2026);
    expect(report.rows).toHaveLength(12);
    expect(report.rows.map((row) => row.month)).toEqual([
      '2026-01',
      '2026-02',
      '2026-03',
      '2026-04',
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
      '2026-11',
      '2026-12',
    ]);

    const october = report.rows.find((row) => row.month === '2026-10');
    expect(october).toMatchObject({
      incomeCents: 220000,
      expenseCents: 63000,
      savingsCents: 157000,
    });
    expect(october?.savingsRate).toBeCloseTo(0.7136, 4);

    expect(report.totals).toMatchObject({
      incomeCents: 220000,
      expenseCents: 63000,
      savingsCents: 157000,
    });
    expect(report.totals.savingsRate).toBeCloseTo(0.7136, 4);
  });

  it('returns a null rate for months without income', () => {
    const report = buildAnnualReport(fixtureOctober2026());

    expect(report.rows[0]?.savingsRate).toBeNull();
    expect(report.rows[0]?.expenseCents).toBe(0);
  });
});

describe('buildCategoryBreakdown', () => {
  it('sorts expenses by amount and computes their share', () => {
    const rows = buildCategoryBreakdown(fixtureOctober2026());

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      categoryId: octoberFixtureIds.alquiler,
      categoryName: 'Vivienda',
      amountCents: 38000,
    });
    expect(rows[0]?.share).toBeCloseTo(38000 / 63000, 6);
    expect(rows[1]).toMatchObject({
      categoryId: octoberFixtureIds.comida,
      categoryName: 'Comida',
      amountCents: 25000,
    });
    expect(rows[1]?.share).toBeCloseTo(25000 / 63000, 6);
  });

  it('groups everything after the top eight into Otros', () => {
    const categories: Category[] = [];
    const transactions: Transaction[] = [];

    for (let index = 1; index <= 10; index += 1) {
      const categoryId = `00000000-0000-4000-8000-0000000000${String(index).padStart(2, '0')}`;
      categories.push({
        id: categoryId,
        name: `Categoría ${index}`,
        kind: 'expense',
        group: 'variable',
        colorToken: `token-${index}`,
        order: index,
        archived: 0,
        isDefault: 0,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      transactions.push(
        expense(
          `10000000-0000-4000-8000-0000000000${String(index).padStart(2, '0')}`,
          categoryId,
          index * 1000,
          `2026-10-${String(index).padStart(2, '0')}`,
        ),
      );
    }

    const rows = buildCategoryBreakdown({
      ...fixtureOctober2026(),
      transactions,
      categories,
      planItems: [],
    });

    expect(rows).toHaveLength(9);
    expect(rows[0]?.categoryName).toBe('Categoría 10');
    expect(rows[0]?.amountCents).toBe(10000);
    expect(rows[8]).toMatchObject({
      categoryId: null,
      categoryName: 'Otros',
      amountCents: 3000,
    });
    expect(rows.reduce((sum, row) => sum + row.share, 0)).toBeCloseTo(1, 6);
  });
});
