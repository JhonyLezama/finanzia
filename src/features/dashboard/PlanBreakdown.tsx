import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Money } from '@/components/ui/Money';
import { formatPEN } from '@/domain/money';
import type { Cents } from '@/domain/models';

export interface PlanBreakdownProps {
  fixedPaidCents: Cents;
  pendingFixedCents: Cents;
  variableCents: Cents;
  savingsCents: Cents;
  planExpenseCents: Cents;
  monthExpenseCents: Cents;
  varianceCents: number;
}

interface Segment {
  label: string;
  cents: Cents;
  className: string;
}

export function PlanBreakdown({
  fixedPaidCents,
  pendingFixedCents,
  variableCents,
  savingsCents,
  planExpenseCents,
  monthExpenseCents,
  varianceCents,
}: PlanBreakdownProps) {
  const segments: Segment[] = [
    { label: 'Fijos pagados', cents: fixedPaidCents, className: 'bg-primary' },
    { label: 'Fijos pendientes', cents: pendingFixedCents, className: 'bg-gold' },
    { label: 'Variable ejecutado', cents: variableCents, className: 'bg-ink/40' },
    { label: 'Ahorro aportado', cents: Math.max(0, savingsCents) as Cents, className: 'bg-primary/40' },
  ];

  const total = segments.reduce((sum, segment) => sum + segment.cents, 0);
  const summary = segments
    .map((segment) => `${segment.label}: ${formatPEN(segment.cents)}`)
    .join('. ');

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-semibold text-ink">Plan del mes</h2>
        <p className="text-xs text-ink-muted">
          Cómo se reparte el dinero entre fijos, variables y ahorro.
        </p>
      </div>

      <div
        role="img"
        aria-label={`Composición del plan del mes. ${summary}`}
        className="flex h-3 w-full overflow-hidden rounded-full bg-surface-2"
      >
        {total > 0
          ? segments.map((segment) =>
              segment.cents > 0 ? (
                <div
                  key={segment.label}
                  className={segment.className}
                  style={{ width: `${(segment.cents / total) * 100}%` }}
                />
              ) : null,
            )
          : null}
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {segments.map((segment) => (
          <li key={segment.label} className="flex items-start gap-2">
            <span
              className={`mt-1.5 size-2 shrink-0 rounded-full ${segment.className}`}
              aria-hidden="true"
            />
            <div>
              <p className="text-xs text-ink-muted">{segment.label}</p>
              <p className="text-sm font-semibold text-ink">
                <Money cents={segment.cents} />
              </p>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2 border-t border-line pt-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-muted">
          Plan de gastos <Money cents={planExpenseCents} /> · Ejecutado{' '}
          <Money cents={monthExpenseCents} />
        </p>
        <Chip tone={varianceCents > 0 ? 'danger' : 'positive'}>
          Desvío <Money cents={varianceCents} />
        </Chip>
      </div>
    </Card>
  );
}
