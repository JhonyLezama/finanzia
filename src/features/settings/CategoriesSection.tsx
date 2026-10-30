import { Archive, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { DropdownMenu } from 'radix-ui';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { CreateCategoryInput } from '@/db/repositories/categories';
import type { Category } from '@/domain/models';

export interface UpdateCategoryInput {
  name: string;
  group: Category['group'];
}

export interface CategoriesSectionProps {
  categories: Category[];
  blockingIds: string[];
  usedIds: string[];
  onCreate: (input: CreateCategoryInput) => Promise<void>;
  onUpdate: (id: string, input: UpdateCategoryInput) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
  onRestore: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const GROUP_LABELS: Record<Category['group'], string> = {
  fixed: 'Fijos',
  variable: 'Variables',
  income: 'Ingresos',
};

const GROUP_ORDER: Category['group'][] = ['fixed', 'variable', 'income'];

const menuContentClass =
  'z-50 min-w-40 rounded-[var(--radius-control)] border border-line bg-surface p-1 shadow-lg';

const menuItemClass =
  'flex cursor-pointer items-center gap-2 rounded px-2.5 py-1.5 text-sm text-ink outline-none hover:bg-surface-2 focus:bg-surface-2 data-[disabled]:pointer-events-none data-[disabled]:opacity-50';

export function CategoriesSection({
  categories,
  blockingIds,
  usedIds,
  onCreate,
  onUpdate,
  onArchive,
  onRestore,
  onDelete,
}: CategoriesSectionProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<Category['kind']>('expense');
  const [group, setGroup] = useState<Category['group']>('variable');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [editName, setEditName] = useState('');
  const [editGroup, setEditGroup] = useState<Category['group']>('variable');
  const [editError, setEditError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  const restore = async (category: Category) => {
    setBusy(category.id);
    setError(null);
    try {
      await onRestore(category.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo reactivar la categoría.');
    } finally {
      setBusy(null);
    }
  };

  const startEdit = (category: Category) => {
    setEditTarget(category);
    setEditName(category.name);
    setEditGroup(category.kind === 'income' ? 'income' : category.group);
    setEditError(null);
  };

  const saveEdit = async () => {
    if (!editTarget) {
      return;
    }
    setBusy('edit');
    setEditError(null);
    try {
      await onUpdate(editTarget.id, {
        name: editName,
        group: editTarget.kind === 'income' ? 'income' : editGroup,
      });
      setEditTarget(null);
    } catch (caught) {
      setEditError(caught instanceof Error ? caught.message : 'No se pudo guardar la categoría.');
    } finally {
      setBusy(null);
    }
  };

  const requestDelete = (category: Category) => {
    setDeleteTarget(category);
    setDeleteError(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }
    setBusy('delete');
    setDeleteError(null);
    try {
      await onDelete(deleteTarget.id);
      setDeleteTarget(null);
    } catch (caught) {
      setDeleteError(
        caught instanceof Error ? caught.message : 'No se pudo borrar la categoría.',
      );
    } finally {
      setBusy(null);
    }
  };

  const visible = categories.filter((category) => category.archived === 0);
  const archived = categories.filter((category) => category.archived === 1);
  const editGroupBlocked = editTarget ? usedIds.includes(editTarget.id) : false;

  return (
    <Card className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">Categorías</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Las categorías con movimientos o en uso no se borran: se archivan y el historial se
            conserva. Las categorías por defecto se pueden renombrar y archivar, pero no borrar.
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
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-ink">{category.name}</span>
                      {category.isDefault === 1 ? (
                        <span className="text-xs text-ink-muted">Por defecto</span>
                      ) : null}
                    </span>
                    <span className="flex items-center gap-2">
                      {blocked ? <Chip tone="neutral">En uso</Chip> : null}
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                          <button
                            type="button"
                            aria-label={`Acciones de ${category.name}`}
                            className="inline-flex size-9 items-center justify-center rounded-full text-ink-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                          >
                            <MoreHorizontal className="size-4" aria-hidden="true" />
                          </button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Portal>
                          <DropdownMenu.Content align="end" className={menuContentClass}>
                            <DropdownMenu.Item
                              className={menuItemClass}
                              onSelect={() => startEdit(category)}
                            >
                              <Pencil className="size-4 text-ink-muted" aria-hidden="true" />
                              Editar
                            </DropdownMenu.Item>
                            <DropdownMenu.Item
                              className={menuItemClass}
                              disabled={blocked || busy === category.id}
                              title={
                                blocked
                                  ? 'Quitala del plan abierto o pausá su regla recurrente antes de archivarla.'
                                  : undefined
                              }
                              onSelect={() => void archive(category)}
                            >
                              <Archive className="size-4 text-ink-muted" aria-hidden="true" />
                              Archivar
                            </DropdownMenu.Item>
                            <DropdownMenu.Item
                              className={`${menuItemClass} text-red hover:bg-red-soft focus:bg-red-soft`}
                              onSelect={() => requestDelete(category)}
                            >
                              <Trash2 className="size-4" aria-hidden="true" />
                              Borrar
                            </DropdownMenu.Item>
                          </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                      </DropdownMenu.Root>
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
          <ul className="mt-2 divide-y divide-line rounded-[var(--radius-control)] border border-line">
            {archived.map((category) => (
              <li
                key={category.id}
                className="flex items-center justify-between gap-3 px-3 py-2"
              >
                <span className="text-sm text-ink">{category.name}</span>
                <span className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Reactivar ${category.name}`}
                    disabled={busy === category.id}
                    onClick={() => void restore(category)}
                  >
                    Reactivar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Borrar ${category.name}`}
                    className="text-red hover:bg-red-soft"
                    onClick={() => requestDelete(category)}
                  >
                    Borrar
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <Dialog
        open={Boolean(editTarget)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setEditTarget(null);
        }}
        title={editTarget ? `Editar ${editTarget.name}` : 'Editar categoría'}
        description="El tipo (gasto o ingreso) no se puede cambiar."
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditTarget(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => void saveEdit()}
              loading={busy === 'edit'}
              disabled={editName.trim().length === 0}
            >
              Guardar cambios
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {editError ? (
            <p role="alert" className="rounded-lg border border-red/30 bg-red-soft p-3 text-sm text-red">
              {editError}
            </p>
          ) : null}

          <div>
            <label
              htmlFor="edit-category-name"
              className="mb-1 block text-sm font-medium text-ink"
            >
              Nombre de la categoría
            </label>
            <Input
              id="edit-category-name"
              value={editName}
              maxLength={40}
              onChange={(event) => setEditName(event.target.value)}
            />
          </div>

          {editTarget?.kind === 'expense' ? (
            <div>
              <label
                htmlFor="edit-category-group"
                className="mb-1 block text-sm font-medium text-ink"
              >
                Grupo de la categoría
              </label>
              <Select
                id="edit-category-group"
                value={editGroup}
                disabled={editGroupBlocked}
                onChange={(event) => setEditGroup(event.target.value as Category['group'])}
              >
                <option value="fixed">Fijo</option>
                <option value="variable">Variable</option>
              </Select>
              {editGroupBlocked ? (
                <p className="mt-1 text-xs text-ink-muted">
                  La categoría está en uso, así que el grupo no se puede cambiar. Si necesitás
                  otro grupo, creá una categoría nueva.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
        title={deleteTarget ? `Borrar ${deleteTarget.name}` : 'Borrar categoría'}
        description={
          deleteTarget?.isDefault === 1
            ? 'Las categorías por defecto no se pueden borrar; archivalas en su lugar.'
            : 'El borrado es definitivo. Solo se permite si la categoría no tiene movimientos, presupuestos ni reglas.'
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => void confirmDelete()}
              loading={busy === 'delete'}
              disabled={deleteTarget?.isDefault === 1}
            >
              Borrar categoría
            </Button>
          </>
        }
      >
        {deleteError ? (
          <p role="alert" className="rounded-lg border border-red/30 bg-red-soft p-3 text-sm text-red">
            {deleteError}
          </p>
        ) : deleteTarget?.isDefault === 1 ? (
          <p className="text-sm text-ink-muted">
            “{deleteTarget.name}” vino con la app. Podés renombrarla o archivarla, y el
            historial se conserva.
          </p>
        ) : (
          <p className="text-sm text-ink-muted">
            ¿Confirmás que querés borrar “{deleteTarget?.name}”? Esta acción no se puede
            deshacer.
          </p>
        )}
      </Dialog>
    </Card>
  );
}
