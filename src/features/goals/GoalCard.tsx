import { ArrowDownLeft, ArrowUpRight, Calendar, Info, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Money } from '@/components/ui/Money';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatDateShort } from '@/domain/dates';
import type { Goal } from '@/domain/models';
import type { GoalWithSummary } from './useGoals';

export interface GoalCardProps {
  item: GoalWithSummary;
  onContribute: (goal: Goal) => void;
  onWithdraw: (goal: Goal, currentBalanceCents: number) => void;
  onDetail: (item: GoalWithSummary) => void;
}

export function GoalCard({
  item,
  onContribute,
  onWithdraw,
  onDetail,
}: GoalCardProps) {
  const { goal, summary } = item;
  const pct = Math.min(100, Math.round(summary.progress * 100));
  const tone = pct >= 100 ? 'ok' : 'ok';

  return (
    <Card className="p-5 flex flex-col justify-between space-y-4 hover:border-line-strong transition-colors">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display font-semibold text-base text-ink">{goal.name}</h3>
            {goal.targetDate ? (
              <p className="text-xs text-ink-muted flex items-center gap-1 mt-0.5">
                <Calendar className="size-3" />
                Meta: {formatDateShort(goal.targetDate)}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            aria-label={`Detalles de ${goal.name}`}
            onClick={() => onDetail(item)}
            className="text-ink-muted hover:text-ink p-1 rounded-full hover:bg-surface-2 transition"
          >
            <Info className="size-4" />
          </button>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between text-xs">
            <span className="font-medium text-ink">
              <Money cents={summary.savedCents} />
            </span>
            <span className="text-ink-muted">
              de <Money cents={summary.targetCents} /> ({pct}%)
            </span>
          </div>
          <ProgressBar value={pct} tone={tone} />
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-line text-xs text-ink-muted">
          <div className="flex items-center gap-1">
            <TrendingUp className="size-3 text-primary shrink-0" />
            <span>
              {summary.paceCents > 0 ? (
                <>
                  <Money cents={summary.paceCents} />
                  /mes
                </>
              ) : (
                'Sin aportes'
              )}
            </span>
          </div>
          <div className="text-right truncate">
            {summary.projectedDate ? (
              <span>Est: {formatDateShort(summary.projectedDate)}</span>
            ) : (
              <span>Sin proyección</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Button
          variant="primary"
          size="sm"
          className="flex-1"
          aria-label={`Aportar a ${goal.name}`}
          onClick={() => onContribute(goal)}
        >
          <ArrowDownLeft className="size-3.5 mr-1" />
          Aportar
        </Button>

        <Button
          variant="secondary"
          size="sm"
          className="flex-1"
          disabled={summary.savedCents <= 0}
          aria-label={`Retirar de ${goal.name}`}
          onClick={() => onWithdraw(goal, summary.savedCents)}
        >
          <ArrowUpRight className="size-3.5 mr-1" />
          Retirar
        </Button>
      </div>
    </Card>
  );
}

