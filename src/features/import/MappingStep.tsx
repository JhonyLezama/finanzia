import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import type { ImportMapping } from '@/domain/import';

export interface MappingStepProps {
  headers: string[];
  mapping: ImportMapping;
  busy: boolean;
  error: string | null;
  onChange: (mapping: ImportMapping) => void;
  onContinue: () => void;
  onBack: () => void;
}

const FIELDS: Array<{ key: keyof ImportMapping; label: string; required?: boolean }> = [
  { key: 'date', label: 'Fecha', required: true },
  { key: 'description', label: 'Descripción', required: true },
  { key: 'amount', label: 'Monto con signo' },
  { key: 'debit', label: 'Débito' },
  { key: 'credit', label: 'Crédito' },
  { key: 'category', label: 'Categoría' },
  { key: 'externalId', label: 'ID externo' },
  { key: 'note', label: 'Nota' },
];

export function MappingStep({
  headers,
  mapping,
  busy,
  error,
  onChange,
  onContinue,
  onBack,
}: MappingStepProps) {
  return (
    <Card className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-semibold text-ink">Mapeo de columnas</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Asociá cada campo con una columna del archivo. El monto puede ir con signo o en débito y crédito.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <label key={field.key} className="block text-sm font-medium text-ink">
            {field.label}
            <Select
              className="mt-1"
              value={mapping[field.key] ?? ''}
              aria-label={field.label}
              onChange={(event) => {
                const value = event.target.value;
                const next = { ...mapping };
                if (value) {
                  next[field.key] = value;
                } else {
                  delete next[field.key];
                }
                if (field.key === 'date' || field.key === 'description') {
                  next[field.key] = value || mapping[field.key];
                }
                onChange(next);
              }}
            >
              <option value="">{field.required ? 'Elegí una columna' : 'Sin asignar'}</option>
              {headers.map((header) => (
                <option key={header} value={header}>
                  {header}
                </option>
              ))}
            </Select>
          </label>
        ))}
      </div>

      {error ? (
        <p role="alert" className="text-sm text-red">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onBack} disabled={busy}>
          Atrás
        </Button>
        <Button onClick={onContinue} loading={busy}>
          Continuar
        </Button>
      </div>
    </Card>
  );
}
