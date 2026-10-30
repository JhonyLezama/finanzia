import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { ImportBatch } from '@/domain/models';

export interface SummaryStepProps {
  batch: ImportBatch;
  busy: boolean;
  error: string | null;
  onUndo: () => void;
  onReset: () => void;
}

export function SummaryStep({ batch, busy, error, onUndo, onReset }: SummaryStepProps) {
  const navigate = useNavigate();
  const undone = batch.status === 'undone';

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-semibold text-ink">
          {undone ? 'Importación deshecha' : 'Importación lista'}
        </h2>
        <p className="mt-1 text-sm text-ink-muted">{batch.filename}</p>
      </div>

      <dl className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-[var(--radius-control)] bg-surface-2 p-3">
          <dt className="text-xs text-ink-muted">Importados</dt>
          <dd className="text-lg font-semibold text-ink">{batch.importedCount}</dd>
        </div>
        <div className="rounded-[var(--radius-control)] bg-surface-2 p-3">
          <dt className="text-xs text-ink-muted">Omitidos</dt>
          <dd className="text-lg font-semibold text-ink">{batch.skippedCount}</dd>
        </div>
        <div className="rounded-[var(--radius-control)] bg-surface-2 p-3">
          <dt className="text-xs text-ink-muted">Errores</dt>
          <dd className="text-lg font-semibold text-ink">{batch.errorCount}</dd>
        </div>
      </dl>

      {error ? (
        <p role="alert" className="text-sm text-red">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => navigate('/movimientos')}>
          Ver movimientos
        </Button>
        {!undone ? (
          <Button variant="danger" onClick={onUndo} loading={busy}>
            Deshacer importación
          </Button>
        ) : null}
        <Button variant="ghost" onClick={onReset} disabled={busy}>
          Importar otro archivo
        </Button>
      </div>
    </Card>
  );
}
