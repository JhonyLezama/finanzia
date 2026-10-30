import { computeBudgetSnapshot, computeSavingsRate, computeVariance } from './budget';
import { isDateInMonth, monthKeyFromParts, parseMonthKey } from './dates';
import type {
  Category,
  Cents,
  MonthKey,
  MonthlyPlan,
  PlanItem,
  Transaction,
  UUID,
} from './models';

export interface ReportInput {
  transactions: Transaction[];
  plan: MonthlyPlan;
  planItems: PlanItem[];
  categories: Category[];
  currentMonth: MonthKey;
}

export interface BudgetVarianceRow {
  categoryId: UUID | null;
  categoryName: string;
  group: 'fixed' | 'variable' | 'uncategorized';
  planCents: Cents;
  actualCents: Cents;
  varianceCents: number;
  variancePct: number | null;
}

export interface MonthlyReport {
  month: MonthKey;
  incomeCents: Cents;
  expenseCents: Cents;
  savingsCents: number;
  savingsRate: number | null;
  fixedCents: Cents;
  variableCents: Cents;
  goalContribCents: Cents;
  budgetVariance: { varianceCents: number; variancePct: number | null };
  executionPct: number | null;
  rows: BudgetVarianceRow[];
}

export interface AnnualReportRow {
  month: MonthKey;
  incomeCents: Cents;
  expenseCents: Cents;
  savingsCents: number;
  savingsRate: number | null;
}

export interface AnnualReport {
  year: number;
  rows: AnnualReportRow[];
  totals: Omit<AnnualReportRow, 'month'>;
}

export interface CategoryBreakdownRow {
  categoryId: UUID | null;
  categoryName: string;
  amountCents: Cents;
  share: number;
}

const UNCATEGORIZED_KEY = '__uncategorized__';
const TOP_CATEGORIES = 8;

function asCents(value: number): Cents {
  return value as Cents;
}

function monthTransactions(input: ReportInput): Transaction[] {
  return input.transactions.filter(
    (transaction) => !transaction.deleted && isDateInMonth(transaction.date, input.plan.id),
  );
}

function expenseTransactions(input: ReportInput): Transaction[] {
  return monthTransactions(input).filter((transaction) => transaction.type === 'expense');
}

function buildVarianceRows(input: ReportInput): BudgetVarianceRow[] {
  const categoryById = new Map(input.categories.map((category) => [category.id, category]));
  const planByCategory = new Map<string, number>();

  for (const item of input.planItems) {
    if (item.planId !== input.plan.id || item.kind !== 'fixed_expense' || item.status === 'skipped') {
      continue;
    }
    planByCategory.set(
      item.categoryId,
      (planByCategory.get(item.categoryId) ?? 0) + item.amountCents,
    );
  }

  for (const budget of input.plan.variableBudgets) {
    planByCategory.set(
      budget.categoryId,
      (planByCategory.get(budget.categoryId) ?? 0) + budget.plannedCents,
    );
  }

  const actualByCategory = new Map<string, number>();
  for (const transaction of expenseTransactions(input)) {
    const key = transaction.categoryId ?? UNCATEGORIZED_KEY;
    actualByCategory.set(key, (actualByCategory.get(key) ?? 0) + transaction.amountCents);
  }

  const keys = new Set([...planByCategory.keys(), ...actualByCategory.keys()]);

  return [...keys]
    .map((key) => {
      const category = categoryById.get(key);
      const planCents = planByCategory.get(key) ?? 0;
      const actualCents = actualByCategory.get(key) ?? 0;
      const { varianceCents, variancePct } = computeVariance(
        asCents(actualCents),
        asCents(planCents),
      );

      const group: BudgetVarianceRow['group'] =
        category?.group === 'fixed' || category?.group === 'variable'
          ? category.group
          : 'uncategorized';

      return {
        categoryId: category?.id ?? null,
        categoryName: category?.name ?? 'Sin categoría',
        group,
        planCents: asCents(planCents),
        actualCents: asCents(actualCents),
        varianceCents,
        variancePct,
      };
    })
    .sort(
      (a, b) =>
        b.actualCents - a.actualCents ||
        b.planCents - a.planCents ||
        a.categoryName.localeCompare(b.categoryName, 'es'),
    );
}

export function buildMonthlyReport(input: ReportInput): MonthlyReport {
  const snapshot = computeBudgetSnapshot(input);
  const savingsCents = snapshot.monthIncomeCents - snapshot.monthExpenseCents;

  return {
    month: input.plan.id,
    incomeCents: snapshot.monthIncomeCents,
    expenseCents: snapshot.monthExpenseCents,
    savingsCents,
    savingsRate: computeSavingsRate(
      asCents(snapshot.monthIncomeCents),
      asCents(snapshot.monthExpenseCents),
    ),
    fixedCents: snapshot.fixedExpenseCents,
    variableCents: snapshot.variableExpenseCents,
    goalContribCents: snapshot.monthlyGoalContribCents,
    budgetVariance: {
      varianceCents: snapshot.varianceCents,
      variancePct: snapshot.variancePct,
    },
    executionPct: snapshot.executionPct,
    rows: buildVarianceRows(input),
  };
}

export function buildAnnualReport(input: ReportInput): AnnualReport {
  const { year } = parseMonthKey(input.currentMonth);
  const activeTransactions = input.transactions.filter((transaction) => !transaction.deleted);

  const rows: AnnualReportRow[] = [];

  for (let month = 1; month <= 12; month += 1) {
    const key = monthKeyFromParts(year, month);
    const monthTransactions = activeTransactions.filter((transaction) =>
      isDateInMonth(transaction.date, key),
    );

    const incomeCents = monthTransactions
      .filter((transaction) => transaction.type === 'income')
      .reduce((sum, transaction) => sum + transaction.amountCents, 0);
    const expenseCents = monthTransactions
      .filter((transaction) => transaction.type === 'expense')
      .reduce((sum, transaction) => sum + transaction.amountCents, 0);

    rows.push({
      month: key,
      incomeCents: asCents(incomeCents),
      expenseCents: asCents(expenseCents),
      savingsCents: incomeCents - expenseCents,
      savingsRate: computeSavingsRate(asCents(incomeCents), asCents(expenseCents)),
    });
  }

  const incomeTotal = rows.reduce((sum, row) => sum + row.incomeCents, 0);
  const expenseTotal = rows.reduce((sum, row) => sum + row.expenseCents, 0);

  return {
    year,
    rows,
    totals: {
      incomeCents: asCents(incomeTotal),
      expenseCents: asCents(expenseTotal),
      savingsCents: incomeTotal - expenseTotal,
      savingsRate: computeSavingsRate(asCents(incomeTotal), asCents(expenseTotal)),
    },
  };
}

export function buildCategoryBreakdown(input: ReportInput): CategoryBreakdownRow[] {
  const categoryById = new Map(input.categories.map((category) => [category.id, category]));
  const totals = new Map<string, number>();
  let grandTotal = 0;

  for (const transaction of expenseTransactions(input)) {
    const key = transaction.categoryId ?? UNCATEGORIZED_KEY;
    totals.set(key, (totals.get(key) ?? 0) + transaction.amountCents);
    grandTotal += transaction.amountCents;
  }

  const sorted = [...totals.entries()]
    .map(([key, amountCents]) => ({
      categoryId: categoryById.get(key)?.id ?? null,
      categoryName: categoryById.get(key)?.name ?? 'Sin categoría',
      amountCents,
    }))
    .sort(
      (a, b) =>
        b.amountCents - a.amountCents ||
        a.categoryName.localeCompare(b.categoryName, 'es'),
    );

  const visible = sorted.slice(0, TOP_CATEGORIES);
  const rest = sorted.slice(TOP_CATEGORIES);
  if (rest.length > 0) {
    visible.push({
      categoryId: null,
      categoryName: 'Otros',
      amountCents: rest.reduce((sum, row) => sum + row.amountCents, 0),
    });
  }

  return visible.map((row) => ({
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    amountCents: asCents(row.amountCents),
    share: grandTotal > 0 ? row.amountCents / grandTotal : 0,
  }));
}

export type CsvInput =
  | ReportInput
  | { transactions: Transaction[]; categories?: Category[] }
  | Transaction[];

const TYPE_LABELS: Record<Transaction['type'], string> = {
  expense: 'gasto',
  income: 'ingreso',
  goal_deposit: 'aporte_meta',
  goal_withdraw: 'retiro_meta',
  opening: 'saldo_inicial',
};

function escapeCsv(val: unknown): string {
  if (val == null) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildTransactionsCsv(input: CsvInput): Blob {
  const transactions: Transaction[] = Array.isArray(input)
    ? input
    : input.transactions;

  const categories: Category[] = Array.isArray(input) ? [] : (input.categories ?? []);
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  const headers = ['fecha', 'descripcion', 'categoria', 'tipo', 'monto', 'moneda', 'origen', 'nota'];

  const rows = transactions
    .filter((t) => !t.deleted)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    .map((t) => {
      const categoryName = t.categoryId ? (categoryMap.get(t.categoryId) ?? '') : '';
      const tipo = TYPE_LABELS[t.type] ?? t.type;
      const monto = (t.amountCents / 100).toFixed(2);
      const moneda = t.currency || 'PEN';
      const origen = t.source || 'manual';
      const nota = t.note || '';

      return [
        t.date,
        escapeCsv(t.description),
        escapeCsv(categoryName),
        escapeCsv(tipo),
        monto,
        moneda,
        escapeCsv(origen),
        escapeCsv(nota),
      ].join(',');
    });

  const text = [headers.join(','), ...rows].join('\n');
  const body = new TextEncoder().encode(text);
  const bytes = new Uint8Array(3 + body.length);
  bytes.set([0xef, 0xbb, 0xbf]);
  bytes.set(body, 3);
  return new Blob([bytes], { type: 'text/csv;charset=utf-8;' });
}
