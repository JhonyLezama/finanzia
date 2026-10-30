import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import type { AuditEntry } from '@/domain/models';
import { buildCsv } from '@/lib/csv';
import { downloadBlob } from '@/lib/download';

export interface AuditSectionProps {
  entries: AuditEntry[];
}

const ACTION_LABELS: Record<AuditEntry['action'], string> = {
  create: 'Creación',
  update: 'Actualización',
  delete: 'Borrado',
  restore: 'Restauración',
  import: 'Importación',
  undo_import: 'Importación deshecha',
  seed_data: 'Datos de ejemplo',
  close_month: 'Cierre de mes',
  reopen_month: 'Reapertura de mes',
  goal_archive: 'Meta archivada',
  category_archive: 'Categoría archivada',
  backup_export: 'Respaldo exportado',
  backup_import: 'Respaldo restaurado',
  reset: 'Datos borrados',
};

const ENTITY_LABELS: Record<AuditEntry['entity'], string> = {
  transaction: 'Movimiento',
  plan: 'Plan',
  plan_item: 'Ítem del plan',
  goal: 'Meta',
  category: 'Categoría',
  recurring_rule: 'Recurrente',
  import_batch: 'Lote de importación',
  settings: 'Ajustes',
};

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' });
}

export function AuditSection({ entries }: AuditSectionProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('es');
    if (!needle) {
      return entries;
    }
    return entries.filter((entry) => {
      const haystack = [
        entry.summary,
        ACTION_LABELS[entry.action],
        ENTITY_LABELS[entry.entity],
        entry.entityId,
      ]
        .join(' ')
        .toLocaleLowerCase('es');
      return haystack.includes(needle);
    });
  }, [entries, query]);

  const exportCsv = () => {
    const headers = ['fecha', 'accion', 'entidad', 'id', 'resumen'];
    const rows = filtered.map((entry) => [
      entry.at,
      ACTION_LABELS[entry.action],
      ENTITY_LABELS[entry.entity],
      entry.entityId,
      entry.summary,
    ]);
    downloadBlob(
      new Blob([buildCsv(headers, rows)], { type: 'text/csv;charset=utf-8;' }),
      'alcancia-auditoria.csv',
    );
  };

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">Auditoría</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Últimos {entries.length} eventos. Cada cambio relevante deja un registro.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={exportCsv} disabled={filtered.length === 0}>
          Exportar CSV
        </Button>
      </div>

      <div className="relative">
        <label htmlFor="audit-search" className="sr-only">
          Buscar en auditoría
        </label>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
          aria-hidden="true"
        />
        <Input
          id="audit-search"
          className="pl-9"
          placeholder="Buscar por acción, entidad o resumen"
          aria-label="Buscar en auditoría"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-ink-muted">No hay eventos que coincidan.</p>
      ) : (
        <ul className="divide-y divide-line rounded-[var(--radius-control)] border border-line">
          {filtered.map((entry) => (
            <li key={entry.id} className="px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-ink">{entry.summary}</span>
                <span className="text-xs text-ink-muted">{formatTimestamp(entry.at)}</span>
              </div>
              <p className="mt-0.5 text-xs text-ink-muted">
                {ACTION_LABELS[entry.action]} · {ENTITY_LABELS[entry.entity]}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
