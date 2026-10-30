import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { backupRepo } from '@/db/repositories/backup';
import { downloadBlob } from '@/lib/download';
import { useBackupRestore } from './useImport';

export function BackupSection() {
  const restore = useBackupRestore();

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-semibold text-ink">Respaldo JSON</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Exportá una copia completa o restaurá un archivo. Restaurar reemplaza todos los datos.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          onClick={async () => {
            const backup = await backupRepo.exportAll('0.1.0');
            downloadBlob(
              new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }),
              `alcancia-backup-${backup.exportedAt.slice(0, 10)}.json`,
            );
          }}
        >
          Exportar JSON
        </Button>
        <label className="inline-flex min-h-11 cursor-pointer items-center rounded-[var(--radius-control)] border border-line bg-surface-2 px-4 text-sm font-medium text-ink">
          Importar JSON
          <input
            type="file"
            accept="application/json,.json"
            aria-label="Archivo de respaldo JSON"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void restore.loadBackup(file);
              }
            }}
          />
        </label>
      </div>

      {restore.preview ? (
        <div className="space-y-3 rounded-[var(--radius-control)] border border-line bg-surface-2 p-4">
          <p className="text-sm text-ink">
            Se restaurarán {restore.preview.counts.movimientos} movimientos,{' '}
            {restore.preview.counts.categorias} categorías, {restore.preview.counts.metas} metas y{' '}
            {restore.preview.counts.planes} planes. Escribí REEMPLAZAR para confirmar.
          </p>
          <Input
            aria-label="Confirmación"
            value={restore.confirmation}
            onChange={(event) => restore.setConfirmation(event.target.value)}
            placeholder="REEMPLAZAR"
          />
          <Button variant="danger" loading={restore.busy} onClick={() => void restore.replace()}>
            Reemplazar datos
          </Button>
        </div>
      ) : null}

      {restore.error ? (
        <p role="alert" className="text-sm text-red">
          {restore.error}
        </p>
      ) : null}
    </Card>
  );
}
