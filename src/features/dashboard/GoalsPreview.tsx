import { Link } from 'react-router';
import { Card } from '@/components/ui/Card';
import { Money } from '@/components/ui/Money';
import { ProgressBar } from '@/components/ui/ProgressBar';
import type { DashboardGoal } from './useDashboard';

export interface GoalsPreviewProps {
  goals: DashboardGoal[];
}

export function GoalsPreview({ goals }: GoalsPreviewProps) {
  return (
    <Card className="space-y-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">Metas activas</h2>
          <p className="text-xs text-ink-muted">Tu progreso hacia lo que estás ahorrando.</p>
        </div>
        <Link to="/metas" className="text-sm font-medium text-primary hover:underline">
          Ver todas
        </Link>
      </div>

      {goals.length === 0 ? (
        <p className="py-2 text-sm text-ink-muted">
          Sin metas activas.{' '}
          <Link to="/metas" className="font-medium text-primary hover:underline">
            Crear una meta
          </Link>
          .
        </p>
      ) : (
        <ul className="space-y-4">
          {goals.map(({ goal, summary }) => {
            const progress = Math.min(100, Math.round(summary.progress * 100));

            return (
              <li key={goal.id} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-medium text-ink">{goal.name}</p>
                  <p className="text-sm text-ink-muted">
                    <Money cents={summary.savedCents} /> de{' '}
                    <Money cents={summary.targetCents} />
                  </p>
                </div>
                <ProgressBar
                  value={progress}
                  label={`Progreso de ${goal.name}`}
                  tone={progress >= 100 ? 'ok' : undefined}
                />
                <p className="text-right text-xs text-ink-muted">{progress}%</p>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
