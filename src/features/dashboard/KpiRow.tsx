import type { ReactNode } from 'react';
import { Card } from '@/components/ui/Card';
import { Money } from '@/components/ui/Money';
import type { DailyAllowance } from '@/domain/budget';
import { formatPercent } from '@/domain/money';
import type { Cents } from '@/domain/models';
import { cn } from '@/lib/cn';

export interface KpiRowProps {
  isCurrentMonth: boolean;
  availableCents: Cents;
  spendableCents: Cents;
  pendingFixedCents: Cents;
  remainingSavingsCents: Cents;
  balanceAtMonthEndCents: Cents;
  monthExpenseCents: Cents;
  planExpenseCents: Cents;
  executionPct: number | null;
  savingsRate: number | null;
  monthlyGoalContribCents: Cents;
  dailyAllowance: DailyAllowance | null;
}

interface KpiCardProps {
  label: string;
  hint?: ReactNode;
  tone?: 'default' | 'negative';
  children: ReactNode;
}

function KpiCard({ label, hint, tone = 'default', children }: KpiCardProps) {
  return (
    <Card role="group" aria-label={label} className="flex flex-col justify-between gap-2 p-4">
      <p className="text-xs font-medium text-ink-muted">{label}</p>
      <p
        className={cn(
          'text-xl font-semibold sm:text-2xl',
          tone === 'negative' ? 'text-red' : 'text-ink',
        )}
      >
        {children}
      </p>
      {hint ? <div className="text-xs text-ink-muted">{hint}</div> : null}
    </Card>
  );
}

export function KpiRow({
  isCurrentMonth,
  availableCents,
  spendableCents,
  pendingFixedCents,
  remainingSavingsCents,
  balanceAtMonthEndCents,
  monthExpenseCents,
  planExpenseCents,
  executionPct,
  savingsRate,
  monthlyGoalContribCents,
  dailyAllowance,
}: KpiRowProps) {
  const executionHint =
    planExpenseCents > 0 ? (
      <>
        Gastado <Money cents={monthExpenseCents} /> de <Money cents={planExpenseCents} /> del
        plan.
      </>
    ) : (
      'Sin plan de gastos para este mes.'
    );

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {isCurrentMonth ? (
        <KpiCard
          label="Saldo real"
          hint="Todo lo que tenés, incluido lo ahorrado en metas."
        >
          <Money cents={availableCents} />
        </KpiCard>
      ) : (
        <KpiCard label="Saldo del mes" hint="Acumulado al último día del mes.">
          <Money cents={balanceAtMonthEndCents} />
        </KpiCard>
      )}

      {isCurrentMonth ? (
        <KpiCard
          label="Disponible para gastar"
          tone={spendableCents < 0 ? 'negative' : 'default'}
          hint={
            <div className="space-y-1">
              {dailyAllowance ? (
                dailyAllowance.amountCents > 0 ? (
                  <p className="font-medium text-ink">
                    Podés gastar <Money cents={dailyAllowance.amountCents} /> por día
                    <span className="block text-ink-muted">
                      {dailyAllowance.days === 1
                        ? 'Queda 1 día'
                        : `Quedan ${dailyAllowance.days} días`}
                      {' · '}
                      {dailyAllowance.basis === 'budget'
                        ? 'según tu presupuesto variable'
                        : 'según tu saldo disponible'}
                    </span>
                  </p>
                ) : (
                  <p className="font-medium text-ink">Sin margen diario por ahora.</p>
                )
              ) : null}
              <details>
                <summary className="cursor-pointer select-none">¿Cómo se calcula?</summary>
                <p className="mt-1">
                  Saldo real <Money cents={availableCents} /> − fijos pendientes{' '}
                  <Money cents={pendingFixedCents} /> − ahorro pendiente{' '}
                  <Money cents={remainingSavingsCents} />
                </p>
              </details>
            </div>
          }
        >
          <Money cents={spendableCents} />
        </KpiCard>
      ) : (
        <KpiCard label="Ahorro aportado" hint="Aportes netos a metas durante el mes.">
          <Money cents={monthlyGoalContribCents} />
        </KpiCard>
      )}

      <KpiCard label="Ejecutado del mes" hint={executionHint}>
        {formatPercent(executionPct)}
      </KpiCard>

      <KpiCard label="Tasa de ahorro" hint="Ingresos menos gastos sobre ingresos.">
        {formatPercent(savingsRate)}
      </KpiCard>
    </div>
  );
}
