import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { CreateCategoryInput } from '@/db/repositories/categories';
import type { Category } from '@/domain/models';

export interface CategoriesSectionProps {
  categories: Category[];
  blockingIds: string[];
  onCreate: (input: CreateCategoryInput) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
}

const GROUP_LABELS: Record<Category['group'], string> = {
  fixed: 'Fijos',
  variable: 'Variables',
  income: 'Ingresos',
};

const GROUP_ORDER: Category['group'][] = ['fixed', 'variable', 'income'];

export function CategoriesSection({
  categories,
  blockingIds,
  onCreate,
  onArchive,
}: CategoriesSectionProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<Category['kind']>('expense');
  const [group, setGroup] = useState<Category['group']>('variable');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setBusy('create');
    setError(null);
    try {
      await onCreate({ name, kind, group: kind === 'income' ? 'income' : group });
      setName('');
      setOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo crear la categoría.');
    } finally {
      setBusy(null);
    }
  };

  const archive = async (category: Category) => {
    setBusy(category.id);
    setError(null);
    try {
      await onArchive(category.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo archivar la categoría.');
    } finally {
      setBusy(null);
    }
  };

  const visible = categories.filter((category) => category.archived === 0);
  const archived = categories.filter((category) => category.archived === 1);

  return (
    <Card className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">Categorías</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Las categorías con movimientos no se borran: se archivan y el historial se conserva.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setOpen((value) => !value)}>
          {open ? 'Cancelar' : 'Nueva categoría'}
        </Button>
      </div>

      {open ? (
        <div className="space-y-3 rounded-[var(--radius-control)] border border-line bg-surface-2 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="new-category-name" className="mb-1 block text-sm font-medium text-ink">
                Nombre
              </label>
              <Input
                id="new-category-name"
                aria-label="Nombre de la categoría"
                value={name}
                maxLength={40}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div>
              <label htmlFor="new-category-kind" className="mb-1 block text-sm font-medium text-ink">
                Tipo
              </label>
              <Select
                id="new-category-kind"
                aria-label="Tipo de categoría"
                value={kind}
                onChange={(event) => {
                  const next = event.target.value as Category['kind'];
                  setKind(next);
                  setGroup(next === 'income' ? 'income' : 'variable');
                }}
              >
                <option value="expense">Gasto</option>
                <option value="income">Ingreso</option>
              </Select>
            </div>
            {kind === 'expense' ? (
              <div>
                <label
                  htmlFor="new-category-group"
                  className="mb-1 block text-sm font-medium text-ink"
                >
                  Grupo
                </label>
                <Select
                  id="new-category-group"
                  aria-label="Grupo de la categoría"
                  value={group}
                  onChange={(event) => setGroup(event.target.value as Category['group'])}
                >
                  <option value="fixed">Fijo</option>
                  <option value="variable">Variable</option>
                </Select>
              </div>
            ) : null}
          </div>
          <Button
            onClick={() => void create()}
            loading={busy === 'create'}
            disabled={name.trim().length === 0}
          >
            Crear categoría
          </Button>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-red">
          {error}
        </p>
      ) : null}

      {GROUP_ORDER.map((groupKey) => {
        const rows = visible.filter((category) => category.group === groupKey);
        if (rows.length === 0) {
          return null;
        }
        return (
          <div key={groupKey} className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              {GROUP_LABELS[groupKey]}
            </h3>
            <ul className="divide-y divide-line rounded-[var(--radius-control)] border border-line">
              {rows.map((category) => {
                const blocked = blockingIds.includes(category.id);
                return (
                  <li
                    key={category.id}
                    className="flex items-center justify-between gap-3 px-3 py-2"
                  >
                    <span className="text-sm text-ink">{category.name}</span>
                    <span className="flex items-center gap-2">
                      {blocked ? (
                        <Chip tone="neutral">En uso</Chip>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Archivar ${category.name}`}
                        disabled={blocked || busy === category.id}
                        title={
                          blocked
                            ? 'Quitala del plan abierto o pausá su regla recurrente antes de archivarla.'
                            : undefined
                        }
                        onClick={() => void archive(category)}
                      >
                        Archivar
                      </Button>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}

      {archived.length > 0 ? (
        <details className="text-sm text-ink-muted">
          <summary className="cursor-pointer font-medium">Archivadas ({archived.length})</summary>
          <ul className="mt-2 space-y-1">
            {archived.map((category) => (
              <li key={category.id}>{category.name}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </Card>
  );
}
