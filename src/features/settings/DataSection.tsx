import { Download, HardDrive, ShieldCheck, Upload } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import type { Settings } from '@/domain/models';
import type { StorageState } from '@/hooks/useSettings';

export interface DataSectionProps {
  settings: Settings | undefined;
  storage: StorageState;
  onExportJson: () => Promise<void>;
  onExportCsv: () => Promise<void>;
  onRequestPersistence: () => Promise<void>;
  onResetAll: () => Promise<void>;
}

function formatBytes(bytes: number | null): string {
  if (bytes === null) {
    return 'No disponible';
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DataSection({
  settings,
  storage,
  onExportJson,
  onExportCsv,
  onRequestPersistence,
  onResetAll,
}: DataSectionProps) {
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (key: string, action: () => Promise<void>) => {
    setBusy(key);
    setError(null);
    try {
      await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'La operación falló.');
    } finally {
      setBusy(null);
    }
  };

  const reset = async () => {
    await run('reset', async () => {
      await onExportJson();
      await onResetAll();
      setConfirmation('');
      window.location.reload();
    });
  };

  const lastBackup = settings?.lastBackupAt
    ? new Date(settings.lastBackupAt).toLocaleString('es-PE')
    : 'Nunca';

  return (
    <div className="space-y-5">
      <Card className="space-y-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">Datos</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Tus datos viven en este dispositivo. Exportá una copia antes de cambiar de equipo.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => void run('json', onExportJson)}
            loading={busy === 'json'}
          >
            <Download className="mr-1.5 size-4" aria-hidden="true" />
            Exportar JSON
          </Button>
          <Button
            variant="secondary"
            onClick={() => void run('csv', onExportCsv)}
            loading={busy === 'csv'}
          >
            <Download className="mr-1.5 size-4" aria-hidden="true" />
            Exportar CSV
          </Button>
          <Link
            to="/importar"
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[var(--radius-control)] border border-line bg-surface-2 px-3 text-sm font-medium text-ink hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <Upload className="size-4" aria-hidden="true" />
            Importar o restaurar
          </Link>
        </div>

        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-[var(--radius-control)] bg-surface-2 p-3">
            <dt className="text-xs text-ink-muted">Uso de almacenamiento</dt>
            <dd className="mt-1 font-medium text-ink">{formatBytes(storage.usageCents)}</dd>
          </div>
          <div className="rounded-[var(--radius-control)] bg-surface-2 p-3">
            <dt className="text-xs text-ink-muted">Disponible</dt>
            <dd className="mt-1 font-medium text-ink">{formatBytes(storage.quotaCents)}</dd>
          </div>
          <div className="rounded-[var(--radius-control)] bg-surface-2 p-3">
            <dt className="text-xs text-ink-muted">Último respaldo</dt>
            <dd className="mt-1 font-medium text-ink">{lastBackup}</dd>
          </div>
        </dl>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-control)] border border-line p-3">
          <span className="inline-flex items-center gap-2 text-sm text-ink">
            <HardDrive className="size-4 text-ink-muted" aria-hidden="true" />
            Almacenamiento persistente
            <Chip tone={storage.persisted ? 'positive' : 'neutral'}>
              {storage.persisted ? 'Activo' : 'No solicitado'}
            </Chip>
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void run('persist', onRequestPersistence)}
            loading={busy === 'persist'}
            disabled={storage.persisted === true}
          >
            <ShieldCheck className="mr-1.5 size-4" aria-hidden="true" />
            Pedir persistencia
          </Button>
        </div>

        {error ? (
          <p role="alert" className="text-sm text-red">
            {error}
          </p>
        ) : null}
      </Card>

      <Card className="space-y-3 border-red/40">
        <div>
          <h2 className="font-display text-lg font-semibold text-red">Zona peligrosa</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Borra todos los datos de este dispositivo. Se descarga un respaldo antes de borrar y no
            se puede deshacer.
          </p>
        </div>
        <div className="max-w-sm">
          <label htmlFor="reset-confirmation" className="mb-1 block text-sm font-medium text-ink">
            Escribí BORRAR para confirmar
          </label>
          <Input
            id="reset-confirmation"
            aria-label="Confirmación para borrar todo"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
          />
        </div>
        <Button
          variant="danger"
          disabled={confirmation !== 'BORRAR'}
          loading={busy === 'reset'}
          onClick={() => void reset()}
        >
          Exportar y borrar todo
        </Button>
      </Card>
    </div>
  );
}
