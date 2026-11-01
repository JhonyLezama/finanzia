import { ArrowDownRight, ArrowUpRight, CheckCircle2, Lock, PiggyBank, Percent } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Money } from '@/components/ui/Money';
import { formatPercent } from '@/domain/money';
import type { MonthlyReport } from '@/domain/reports';

export interface KpiGridProps {
  report: MonthlyReport | null;
}

export function KpiGrid({ report }: KpiGridProps) {
  if (!report) {
    return null;
  }

  const {
    incomeCents,
    expenseCents,
    savingsCents,
    savingsRate,
    fixedCents,
    executionPct,
  } = report;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 print:grid-cols-3 print:gap-2 print:break-inside-avoid">
      {/* Ingresos */}
      <Card className="p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between text-ink-muted">
          <span className="text-xs font-medium">Ingresos</span>
          <ArrowDownRight className="size-4 text-primary" />
        </div>
        <p className="mt-2 text-lg font-semibold text-primary">
          <Money cents={incomeCents} />
        </p>
      </Card>

      {/* Gastos */}
      <Card className="p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between text-ink-muted">
          <span className="text-xs font-medium">Gastos</span>
          <ArrowUpRight className="size-4 text-ink-muted" />
        </div>
        <p className="mt-2 text-lg font-semibold text-ink">
          <Money cents={expenseCents} />
        </p>
      </Card>

      {/* Ahorro neto */}
      <Card className="p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between text-ink-muted">
          <span className="text-xs font-medium">Ahorro neto</span>
          <PiggyBank className="size-4 text-primary" />
        </div>
        <p className={`mt-2 text-lg font-semibold ${savingsCents >= 0 ? 'text-primary' : 'text-red'}`}>
          <Money cents={savingsCents} />
        </p>
      </Card>

      {/* Tasa de ahorro */}
      <Card className="p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between text-ink-muted">
          <span className="text-xs font-medium">Tasa de ahorro</span>
          <Percent className="size-4 text-primary" />
        </div>
        <p className="mt-2 text-lg font-semibold text-ink">
          {formatPercent(savingsRate)}
        </p>
      </Card>

      {/* Costo fijo */}
      <Card className="p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between text-ink-muted">
          <span className="text-xs font-medium">Costo fijo</span>
          <Lock className="size-4 text-ink-muted" />
        </div>
        <p className="mt-2 text-lg font-semibold text-ink">
          <Money cents={fixedCents} />
        </p>
      </Card>

      {/* Ejecución */}
      <Card className="p-3.5 flex flex-col justify-between">
        <div className="flex items-center justify-between text-ink-muted">
          <span className="text-xs font-medium">Ejecución plan</span>
          <CheckCircle2 className="size-4 text-ink-muted" />
        </div>
        <p className="mt-2 text-lg font-semibold text-ink">
          {formatPercent(executionPct)}
        </p>
      </Card>
    </div>
  );
}

