import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Money } from '@/components/ui/Money';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { asCents } from '@/domain/money';
import type { BudgetSnapshot } from '@/domain/budget';
import type { Cents, MonthlyPlan } from '@/domain/models';

export interface SavingsSectionProps {
  plan: MonthlyPlan | null;
  snapshot: BudgetSnapshot | null;
  isClosed?: boolean;
  onUpdateTarget: (targetCents: Cents) => Promise<void>;
}

export function SavingsSection({
  plan,
  snapshot,
  isClosed = false,
  onUpdateTarget,
}: SavingsSectionProps) {
  const targetCents = plan?.savingsTargetCents ?? 0;
  const [value, setValue] = useState(() => (targetCents > 0 ? (targetCents / 100).toString() : ''));

  const handleBlur = async () => {
    const num = parseFloat(value);
    const cents = Number.isNaN(num) || num < 0 ? 0 : Math.round(num * 100);
    if (cents !== targetCents) {
      await onUpdateTarget(asCents(cents));
    }
  };

  const contributed = snapshot?.monthlyGoalContribCents ?? 0;
  const remaining = snapshot?.remainingSavingsCents ?? Math.max(0, targetCents - contributed);
  const pct = targetCents > 0 ? Math.min(100, Math.round((contributed / targetCents) * 100)) : 0;

  return (
    <Card className="p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-line pb-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">Ahorro planificado</h2>
          <p className="text-xs text-ink-muted">Objetivo de aportes a metas en este mes</p>
        </div>
        <div className="text-sm">
          <span className="text-ink-muted">Aportado: </span>
          <span className="font-semibold text-primary">
            <Money cents={contributed} />
          </span>
          <span className="text-ink-muted"> de </span>
          <span className="font-medium text-ink">
            <Money cents={targetCents} />
          </span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="font-medium text-sm text-ink">Meta de ahorro del mes</p>
          <p className="text-xs text-ink-muted">
            {remaining > 0 ? (
              <span>Resta aportar <Money cents={remaining} /> para cumplir la meta</span>
            ) : targetCents > 0 ? (
              <span className="text-primary font-medium">¡Objetivo de ahorro alcanzado!</span>
            ) : (
              <span>Definí cuánto pensás ahorrar este mes</span>
            )}
          </p>
        </div>

        <div className="w-36">
          <Input
            id="savings-target"
            inputMode="decimal"
            placeholder="0"
            value={value}
            disabled={isClosed}
            aria-label="Objetivo de ahorro"
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleBlur}
            className="text-right"
          />
        </div>
      </div>

      {targetCents > 0 ? <ProgressBar value={pct} tone="ok" /> : null}
    </Card>
  );
}
