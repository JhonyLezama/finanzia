import { Card } from '@/components/ui/Card';
import { Money } from '@/components/ui/Money';
import { ProgressBar } from '@/components/ui/ProgressBar';
import type { BudgetSnapshot } from '@/domain/budget';

export interface PlanSummaryProps {
  snapshot: BudgetSnapshot | null;
}

export function PlanSummary({ snapshot }: PlanSummaryProps) {
  if (!snapshot) {
    return null;
  }

  const executionPct = snapshot.executionPct ?? 0;
  const tone = executionPct > 100 ? 'bad' : executionPct >= 80 ? 'warn' : 'ok';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-xs text-ink-muted font-medium">Presupuesto total</p>
          <p className="mt-1 text-lg font-semibold text-ink">
            <Money cents={snapshot.planExpenseCents} />
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">Fijos + variables</p>
        </Card>

        <Card className="p-4">
          <p className="text-xs text-ink-muted font-medium">Gastos ejecutados</p>
          <p className="mt-1 text-lg font-semibold text-ink">
            <Money cents={snapshot.monthExpenseCents} direction="out" />
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">{executionPct.toFixed(1)}% del plan</p>
        </Card>

        <Card className="p-4">
          <p className="text-xs text-ink-muted font-medium">Desvío del mes</p>
          <p
            className={`mt-1 text-lg font-semibold ${
              snapshot.varianceCents < 0 ? 'text-primary' : snapshot.varianceCents > 0 ? 'text-red' : 'text-ink'
            }`}
          >
            <Money
              cents={Math.abs(snapshot.varianceCents)}
              direction={snapshot.varianceCents > 0 ? 'out' : undefined}
            />
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">
            {snapshot.varianceCents <= 0 ? 'Dentro de lo planificado' : 'Sobrepresupuesto'}
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-xs text-ink-muted font-medium">Disponible para gastar</p>
          <p
            className={`mt-1 text-lg font-semibold ${
              snapshot.spendableCents >= 0 ? 'text-primary' : 'text-red'
            }`}
          >
            <Money
              cents={Math.abs(snapshot.spendableCents)}
              direction={snapshot.spendableCents < 0 ? 'out' : undefined}
            />
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">Descontando fijos y metas</p>
        </Card>
      </div>

      <div className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
        <div className="flex items-center justify-between text-xs font-medium text-ink mb-1.5">
          <span>Ejecución del presupuesto de gastos</span>
          <span>{executionPct.toFixed(1)}%</span>
        </div>
        <ProgressBar value={executionPct} tone={tone} />
      </div>
    </div>
  );
}
