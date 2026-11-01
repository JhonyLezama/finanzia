import type { ReactNode } from 'react';
import {
  Wallet,
  Sparkles,
  TrendingUp,
  PiggyBank,
  ArrowUpRight,
  HelpCircle,
  CalendarDays,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Money } from '@/components/ui/Money';
import type { DailyAllowance } from '@/domain/budget';
import { daysInMonth, todayInLima } from '@/domain/dates';
import { asCents, formatPercent } from '@/domain/money';
import type { Cents, MonthKey } from '@/domain/models';
import { cn } from '@/lib/cn';

export interface KpiRowProps {
  month: MonthKey;
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
  badge?: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  cardClassName?: string;
  valueClassName?: string;
  children: ReactNode;
}

function KpiCard({
  label,
  badge,
  hint,
  icon,
  cardClassName,
  valueClassName,
  children,
}: KpiCardProps) {
  return (
    <Card
      role="group"
      aria-label={label}
      className={cn(
        'relative flex flex-col justify-between overflow-hidden rounded-[var(--radius-card)] border p-4 sm:p-5 transition-all',
        cardClassName || 'border-line bg-surface',
      )}
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
          <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold tracking-wide uppercase text-ink-muted sm:text-xs">
            <span className="shrink-0">{icon}</span>
            <span className="min-w-0 truncate">{label}</span>
          </span>
          {badge ? <span className="shrink-0 whitespace-nowrap">{badge}</span> : null}
        </div>

        <div className={cn('text-2xl sm:text-3xl font-bold tracking-tight', valueClassName || 'text-ink')}>
          {children}
        </div>
      </div>

      {hint ? <div className="mt-3 text-xs leading-relaxed text-ink-muted border-t border-line pt-2.5">{hint}</div> : null}
    </Card>
  );
}

export function KpiRow({
  month,
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
  const isOverSpent = executionPct !== null && executionPct > 1;
  const isHealthySpendable = spendableCents > 0;
  const today = todayInLima();
  const daysRemaining = Math.max(1, daysInMonth(month) - Number(today.slice(8, 10)) + 1);
  const realDailyCents =
    availableCents > 0 ? asCents(Math.floor(availableCents / daysRemaining)) : null;

  // Cálculo semanal estimado: solo tiene sentido mostrar "por semana" si quedan al menos 7 días de mes
  // y nunca debe sugerir un valor mayor a todo el disponible real.
  const showWeekly = dailyAllowance && dailyAllowance.amountCents > 0 && dailyAllowance.days >= 7;
  const weeklyAllowanceCents = showWeekly
    ? asCents(Math.min(dailyAllowance.amountCents * 7, Math.max(0, spendableCents)))
    : null;

  const executionHint =
    planExpenseCents > 0 ? (
      <div className="space-y-1">
        <p>
          Gastado <Money cents={monthExpenseCents} /> de <Money cents={planExpenseCents} /> del plan.
        </p>
        {isOverSpent ? (
          <p className="font-medium text-amber-700 dark:text-amber-400">
            ⚠️ Has superado el presupuesto planificado.
          </p>
        ) : (
          <p className="text-emerald-700 dark:text-emerald-400">
            ✓ Vas dentro de lo proyectado para el mes.
          </p>
        )}
      </div>
    ) : (
      'Sin plan de gastos configurado para este mes.'
    );

  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
      {/* 1. Saldo Real (Patrimonio Total en Mano) */}
      {isCurrentMonth ? (
        <KpiCard
          label="Saldo real"
          icon={<Wallet className="size-4 text-primary" aria-hidden="true" />}
          cardClassName="border-primary/40 bg-primary/[0.05] dark:bg-primary/[0.1]"
          valueClassName="text-ink"
          badge={
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              Total en mano
            </span>
          }
          hint={
            <div className="space-y-1">
              <p>Todo tu dinero actual, incluyendo lo guardado en tus metas de ahorro.</p>
              {remainingSavingsCents > 0 || pendingFixedCents > 0 ? (
                <p className="text-[11px] text-ink-muted">
                  Compromisos del mes: <Money cents={asCents(pendingFixedCents + remainingSavingsCents)} />
                </p>
              ) : null}
            </div>
          }
        >
          <div className="space-y-2">
            <div>
              <Money cents={availableCents} />
            </div>
            {realDailyCents !== null ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-gold px-2.5 py-1 text-[11px] font-semibold leading-none text-[#102a24] shadow-sm">
                  <CalendarDays className="size-3" aria-hidden="true" />≈{' '}
                  <Money cents={realDailyCents} /> por día
                </span>
                <span className="text-[10px] font-medium leading-none text-ink-muted">
                  {daysRemaining === 1 ? 'queda 1 día' : `quedan ${daysRemaining} días`}
                </span>
              </div>
            ) : null}
          </div>
        </KpiCard>
      ) : (
        <KpiCard
          label="Saldo del mes"
          icon={<Wallet className="size-4 text-ink-muted" aria-hidden="true" />}
          hint="Acumulado al último día del mes."
        >
          <Money cents={balanceAtMonthEndCents} />
        </KpiCard>
      )}

      {/* 2. Disponible para Gastar (¡El más importante!) */}
      {isCurrentMonth ? (
        <KpiCard
          label="Disponible para gastar"
          icon={<Sparkles className={cn('size-4', isHealthySpendable ? 'text-emerald-600 dark:text-emerald-400' : 'text-red')} aria-hidden="true" />}
          cardClassName={cn(
            isHealthySpendable
              ? 'border-emerald-500/45 bg-emerald-500/[0.08] dark:bg-emerald-500/[0.12]'
              : 'border-red/60 bg-red-soft',
          )}
          valueClassName={isHealthySpendable ? 'text-emerald-800 dark:text-emerald-300' : 'text-red'}
          badge={
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                isHealthySpendable
                  ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
                  : 'bg-surface text-red',
              )}
            >
              {isHealthySpendable ? 'Libre para gastar' : 'Ajustado / Negativo'}
            </span>
          }
          hint={
            <div className="space-y-1.5">
              {dailyAllowance && dailyAllowance.amountCents > 0 ? (
                <div className="space-y-1 text-ink">
                  <p className="font-semibold text-xs">
                    Podés gastar <Money cents={dailyAllowance.amountCents} /> por día
                    {weeklyAllowanceCents ? (
                      <span className="block font-normal text-ink-muted">
                        (~<Money cents={weeklyAllowanceCents} /> por semana)
                      </span>
                    ) : null}
                  </p>
                  <p className="text-[11px] text-ink-muted">
                    {dailyAllowance.days === 1
                      ? 'Queda 1 día de mes'
                      : `Quedan ${dailyAllowance.days} días de mes`}
                    {dailyAllowance.basis === 'available' ? ' · calculado sobre tu saldo libre' : ' · según tu plan variable'}
                  </p>
                </div>
              ) : (
                <p className="font-medium text-ink">Sin margen diario por ahora.</p>
              )}

              <details className="text-[11px] text-ink-muted group pt-1">
                <summary className="cursor-pointer select-none font-medium hover:text-ink inline-flex items-center gap-1">
                  <HelpCircle className="size-3" />
                  ¿Cómo se calcula este monto?
                </summary>
                <div className="mt-1.5 space-y-1 rounded bg-surface p-2 text-ink border border-line">
                  <p>
                    <strong>Saldo real</strong> (<Money cents={availableCents} />)
                    <br />
                    − <strong>Fijos pendientes:</strong> <Money cents={pendingFixedCents} />
                    <br />
                    − <strong>Ahorro protegido:</strong> <Money cents={remainingSavingsCents} />
                  </p>
                  <p className="text-[10px] text-ink-muted italic border-t border-line pt-1">
                    💡 Si necesitas más disponible, puedes retirar de tus metas de ahorro en cualquier momento.
                  </p>
                </div>
              </details>
            </div>
          }
        >
          <Money cents={spendableCents} />
        </KpiCard>
      ) : (
        <KpiCard
          label="Ahorro aportado"
          icon={<PiggyBank className="size-4 text-primary" aria-hidden="true" />}
          hint="Aportes netos a metas durante el mes."
        >
          <Money cents={monthlyGoalContribCents} />
        </KpiCard>
      )}

      {/* 3. Ejecutado del mes (Ritmo de Gasto) */}
      <KpiCard
        label="Ejecutado del mes"
        icon={<TrendingUp className="size-4 text-ink-muted" aria-hidden="true" />}
        cardClassName={cn(
          isOverSpent
            ? 'border-amber-500/45 bg-amber-500/[0.07] dark:bg-amber-500/[0.12]'
            : 'border-line bg-surface',
        )}
        valueClassName={isOverSpent ? 'text-amber-800 dark:text-amber-300' : 'text-ink'}
        badge={
          executionPct !== null ? (
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                isOverSpent
                  ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
                  : 'bg-surface-2 text-ink-muted',
              )}
            >
              {isOverSpent ? 'Excedido' : 'En rango'}
            </span>
          ) : null
        }
        hint={executionHint}
      >
        {formatPercent(executionPct)}
      </KpiCard>

      {/* 4. Tasa de ahorro */}
      <KpiCard
        label="Tasa de ahorro"
        icon={<PiggyBank className="size-4 text-primary" aria-hidden="true" />}
        cardClassName="border-line bg-surface"
        valueClassName={savingsRate !== null && savingsRate > 0 ? 'text-primary' : 'text-ink'}
        badge={
          savingsRate !== null && savingsRate > 0 ? (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary inline-flex items-center gap-0.5">
              <ArrowUpRight className="size-3" /> Positivo
            </span>
          ) : null
        }
        hint={
          <div className="space-y-1">
            <p>Ingresos menos gastos sobre tus ingresos totales.</p>
            {monthlyGoalContribCents > 0 ? (
              <p className="text-primary font-medium text-[11px]">
                🎯 Apartaste <Money cents={monthlyGoalContribCents} /> para tus metas este mes.
              </p>
            ) : null}
          </div>
        }
      >
        {formatPercent(savingsRate)}
      </KpiCard>
    </div>
  );
}
