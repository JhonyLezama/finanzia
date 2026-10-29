import { Archive, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { Money } from '@/components/ui/Money';
import { formatDateShort } from '@/domain/dates';
import type { GoalWithSummary } from './useGoals';

export interface GoalDetailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: GoalWithSummary | null;
  onArchive: (goalId: string, withdrawToAvailable: boolean) => Promise<void>;
}

export function GoalDetail({
  open,
  onOpenChange,
  item,
  onArchive,
}: GoalDetailProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!item) return null;
  const { goal, summary, movements } = item;

  const handleArchive = async () => {
    if (!window.confirm(`¿Seguro que querés archivar la meta "${goal.name}"?`)) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await onArchive(goal.id, true);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al archivar la meta.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={goal.name}
      description="Historial de movimientos y opciones de la meta."
    >
      <div className="space-y-6">
        {error ? (
          <div role="alert" className="rounded-lg border border-red/30 bg-red-soft p-3 text-sm text-red">
            {error}
          </div>
        ) : null}

        {/* Summary card */}
        <div className="rounded-[var(--radius-card)] border border-line bg-surface-2 p-4 space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-ink-muted">Ahorrado</span>
            <span className="text-base font-semibold text-primary">
              <Money cents={summary.savedCents} />
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-ink-muted">Objetivo</span>
            <span className="text-sm font-medium text-ink">
              <Money cents={summary.targetCents} />
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-ink-muted">Resta aportar</span>
            <span className="text-sm text-ink-muted">
              <Money cents={summary.remainingCents} />
            </span>
          </div>
        </div>

        {/* History */}
        <div>
          <h4 className="text-sm font-semibold text-ink mb-3">Historial de aportes y retiros</h4>
          {movements.length === 0 ? (
            <p className="text-xs text-ink-muted py-4 text-center">
              Aún no hay movimientos registrados para esta meta.
            </p>
          ) : (
            <div className="divide-y divide-line border border-line rounded-[var(--radius-card)] overflow-hidden">
              {movements.map((tx) => {
                const isDeposit = tx.type === 'goal_deposit';

                return (
                  <div key={tx.id} className="p-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className={`size-6 rounded-full flex items-center justify-center ${
                          isDeposit ? 'bg-primary/10 text-primary' : 'bg-red-soft text-red'
                        }`}
                      >
                        {isDeposit ? (
                          <ArrowDownLeft className="size-3.5" />
                        ) : (
                          <ArrowUpRight className="size-3.5" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-ink">
                          {isDeposit ? 'Aporte' : 'Retiro'}
                        </p>
                        <p className="text-ink-muted">{formatDateShort(tx.date)}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className={`font-semibold ${isDeposit ? 'text-primary' : 'text-red'}`}>
                        {isDeposit ? '+' : '−'}
                        <Money cents={tx.amountCents} />
                      </p>
                      {tx.note ? <p className="text-ink-muted truncate max-w-32">{tx.note}</p> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Danger zone / Archive */}
        <div className="pt-4 border-t border-line">
          <Button
            type="button"
            variant="ghost"
            className="w-full text-red hover:bg-red-soft"
            disabled={busy}
            onClick={handleArchive}
          >
            <Archive className="size-4 mr-2" />
            Archivar meta (devuelve saldo a disponible)
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
