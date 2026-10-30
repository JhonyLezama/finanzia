import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useState } from 'react';
import { db } from '@/db/db';
import { addMonths, todayInLima, toMonthKey } from '@/domain/dates';
import type { Cents, ISOTimestamp, MonthKey, MonthlyPlan, Transaction, Category } from '@/domain/models';
import {
  buildAnnualReport,
  buildCategoryBreakdown,
  buildMonthlyReport,
  buildTransactionsCsv,
  type AnnualReport,
  type CategoryBreakdownRow,
  type MonthlyReport,
  type ReportInput,
} from '@/domain/reports';
import { buildCsv } from '@/lib/csv';
import { downloadBlob } from '@/lib/download';

export interface TrendPoint {
  month: MonthKey;
  label: string;
  incomeCents: Cents;
  expenseCents: Cents;
  savingsCents: number;
  savingsRate: number | null;
}

export function useReports(initialMonth?: MonthKey) {
  const currentLimaMonth = toMonthKey(todayInLima());
  const [selectedMonth, setSelectedMonth] = useState<MonthKey>(() => initialMonth || currentLimaMonth);

  const data = useLiveQuery(
    async () => {
      const [transactions, plans, planItems, categories] = await Promise.all([
        db.transactions.toArray(),
        db.plans.toArray(),
        db.planItems.toArray(),
        db.categories.toArray(),
      ]);

      const plan: MonthlyPlan =
        plans.find((p) => p.id === selectedMonth) ?? {
          id: selectedMonth,
          year: parseInt(selectedMonth.slice(0, 4), 10),
          month: parseInt(selectedMonth.slice(5, 7), 10),
          status: 'active',
          savingsTargetCents: 0 as Cents,
          variableBudgets: [],
          createdAt: '1970-01-01T00:00:00.000Z' as ISOTimestamp,
          updatedAt: '1970-01-01T00:00:00.000Z' as ISOTimestamp,
        };

      const reportInput: ReportInput = {
        transactions,
        plan,
        planItems,
        categories,
        currentMonth: selectedMonth,
      };

      const monthly = buildMonthlyReport(reportInput);
      const annual = buildAnnualReport(reportInput);
      const categoryBreakdown = buildCategoryBreakdown(reportInput);

      // Compute 12-month rolling trend ending at selectedMonth
      const trend: TrendPoint[] = [];
      const activeTx = transactions.filter((t) => !t.deleted);

      for (let offset = -11; offset <= 0; offset += 1) {
        const mKey = addMonths(selectedMonth, offset);
        const mTx = activeTx.filter((t) => t.date.startsWith(mKey));
        const inc = mTx
          .filter((t) => t.type === 'income')
          .reduce((sum, t) => sum + t.amountCents, 0);
        const exp = mTx
          .filter((t) => t.type === 'expense')
          .reduce((sum, t) => sum + t.amountCents, 0);

        trend.push({
          month: mKey,
          label: mKey,
          incomeCents: inc as Cents,
          expenseCents: exp as Cents,
          savingsCents: inc - exp,
          savingsRate: inc > 0 ? (inc - exp) / inc : null,
        });
      }

      return {
        transactions,
        categories,
        monthly,
        annual,
        categoryBreakdown,
        trend,
      };
    },
    [selectedMonth],
    {
      transactions: [] as Transaction[],
      categories: [] as Category[],
      monthly: null as MonthlyReport | null,
      annual: null as AnnualReport | null,
      categoryBreakdown: [] as CategoryBreakdownRow[],
      trend: [] as TrendPoint[],
    },
  );

  const exportMonthlyCsv = useCallback(() => {
    if (!data.transactions.length) return;
    const monthTx = data.transactions.filter(
      (t) => !t.deleted && t.date.startsWith(selectedMonth),
    );
    const blob = buildTransactionsCsv({
      transactions: monthTx,
      categories: data.categories,
    });
    downloadBlob(blob, `alcancia-movimientos-${selectedMonth}.csv`);
  }, [data.transactions, data.categories, selectedMonth]);

  const exportAnnualCsv = useCallback(() => {
    if (!data.annual) return;
    const headers = ['mes', 'ingresos', 'gastos', 'ahorro', 'tasa_ahorro'];
    const rows = data.annual.rows.map((r) => [
      r.month,
      (r.incomeCents / 100).toFixed(2),
      (r.expenseCents / 100).toFixed(2),
      (r.savingsCents / 100).toFixed(2),
      r.savingsRate != null ? (r.savingsRate * 100).toFixed(1) + '%' : '—',
    ]);
    const csv = buildCsv(headers, rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `alcancia-anual-${selectedMonth.slice(0, 4)}.csv`);
  }, [data.annual, selectedMonth]);

  return {
    selectedMonth,
    setSelectedMonth,
    monthly: data.monthly,
    annual: data.annual,
    categoryBreakdown: data.categoryBreakdown,
    trend: data.trend,
    rawTransactions: data.transactions,
    exportMonthlyCsv,
    exportAnnualCsv,
  };
}

