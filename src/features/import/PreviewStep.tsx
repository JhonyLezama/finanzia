import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Money } from '@/components/ui/Money';
import { formatDateShort } from '@/domain/dates';
import type { ImportError, ImportRow } from '@/domain/import';

export interface PreviewStepProps {
  valid: ImportRow[];
  errors: ImportError[];
  duplicates: ImportRow[];
  importDuplicates: boolean;
  busy: boolean;
  error: string | null;
  onImportDuplicatesChange: (value: boolean) => void;
  onConfirm: () => void;
  onBack: () => void;
}

function Table({ title, rows }: { title: string; rows: ImportRow[] }) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm" aria-label={title}>
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wider text-ink-muted">
              <th className="py-2 pr-3">Fila</th>
              <th className="py-2 pr-3">Fecha</th>
              <th className="py-2 pr-3">Descripción</th>
              <th className="py-2 text-right">Monto</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 20).map((row) => (
              <tr key={`${row.rowNumber}-${row.description}`} className="border-b border-line/70">
                <td className="py-2 pr-3 text-ink-muted">{row.rowNumber}</td>
                <td className="py-2 pr-3">{formatDateShort(row.date)}</td>
                <td className="py-2 pr-3">{row.description}</td>
                <td className="py-2 text-right">
                  <Money cents={row.amountCents} direction={row.direction} signed />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 20 ? (
        <p className="text-xs text-ink-muted">Mostrando 20 de {rows.length} filas.</p>
      ) : null}
    </div>
  );
}

export function PreviewStep({
  valid,
  errors,
  duplicates,
  importDuplicates,
  busy,
  error,
  onImportDuplicatesChange,
  onConfirm,
  onBack,
}: PreviewStepProps) {
  return (
    <Card className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-semibold text-ink">Vista previa</h2>
        <p className="mt-1 text-sm text-ink-muted">
          {valid.length} listas para importar, {duplicates.length} duplicadas, {errors.length} con error.
        </p>
      </div>

      <Table title="Válidas" rows={valid} />
      <Table title="Duplicadas" rows={duplicates} />

      {errors.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-ink">Errores</h3>
          <ul className="space-y-1 text-sm text-red">
            {errors.slice(0, 20).map((item) => (
              <li key={item.rowNumber}>
                Fila {item.rowNumber}: {item.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {duplicates.length > 0 ? (
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            className="size-4"
            checked={importDuplicates}
            onChange={(event) => onImportDuplicatesChange(event.target.checked)}
          />
          Importar duplicados también
        </label>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-red">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onBack} disabled={busy}>
          Atrás
        </Button>
        <Button onClick={onConfirm} loading={busy} disabled={valid.length === 0 && !importDuplicates}>
          Confirmar importación
        </Button>
      </div>
    </Card>
  );
}
