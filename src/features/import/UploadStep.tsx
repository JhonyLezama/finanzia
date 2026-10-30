import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export interface UploadStepProps {
  busy: boolean;
  error: string | null;
  onFile: (file: File) => void;
}

export function UploadStep({ busy, error, onFile }: UploadStepProps) {
  return (
    <Card className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-semibold text-ink">Archivo</h2>
        <p className="mt-1 text-sm text-ink-muted">
          CSV, TXT o Excel (.xlsx), hasta 10 MB. Las filas se revisan antes de guardar.
        </p>
      </div>

      <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius-card)] border border-dashed border-line bg-surface-2 px-4 py-6 text-center">
        <Upload className="size-6 text-ink-muted" aria-hidden="true" />
        <span className="text-sm font-medium text-ink">Elegí un archivo</span>
        <span className="text-xs text-ink-muted">o arrastralo a esta zona</span>
        <input
          type="file"
          accept=".csv,.txt,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          aria-label="Archivo"
          className="sr-only"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              onFile(file);
            }
          }}
        />
      </label>

      {error ? (
        <p role="alert" className="text-sm text-red">
          {error}
        </p>
      ) : null}

      <Button loading={busy} disabled className="hidden">
        Leyendo
      </Button>
    </Card>
  );
}
