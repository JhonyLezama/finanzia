import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { RecurringRuleInput } from '@/db/repositories/recurring';
import { formatMonthLong, startMonthForDay } from '@/domain/dates';
import { formatPEN, parseAmountInput } from '@/domain/money';
import type { Category, MonthKey, RecurringRule } from '@/domain/models';

export type RecurringRuleDraft = Omit<RecurringRuleInput, 'startMonth'>;

export interface RecurringSectionProps {
  rules: RecurringRule[];
  categories: Category[];
  onCreate: (input: RecurringRuleInput) => Promise<void>;
  onUpdate: (id: string, input: RecurringRuleDraft) => Promise<void>;
  onPause: (id: string) => Promise<void>;
  onResume: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function RecurringSection({
  rules,
  categories,
  onCreate,
  onUpdate,
  onPause,
  onResume,
  onDelete,
}: RecurringSectionProps) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingStartMonth, setEditingStartMonth] = useState<MonthKey | null>(null);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<RecurringRule['kind']>('fixed_expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState('5');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RecurringRule | null>(null);

  const eligible = categories.filter((category) => {
    if (category.archived === 1) {
      return false;
    }
    return kind === 'fixed_expense'
      ? category.kind === 'expense' && category.group === 'fixed'
      : category.kind === 'income' && category.group === 'income';
  });

  const parsedDay = Number.parseInt(dayOfMonth, 10);
  const validDay = Number.isInteger(parsedDay) && parsedDay >= 1 && parsedDay <= 31;
  const firstMonth = validDay ? startMonthForDay(parsedDay) : null;

  const resetForm = () => {
    setName('');
    setAmount('');
    setCategoryId('');
    setDayOfMonth('5');
    setKind('fixed_expense');
    setEditingId(null);
    setEditingStartMonth(null);
    setOpen(false);
  };

  const startEdit = (rule: RecurringRule) => {
    setName(rule.name);
    setAmount((rule.amountCents / 100).toString());
    setKind(rule.kind);
    setCategoryId(rule.categoryId);
    setDayOfMonth(String(rule.dayOfMonth));
    setEditingId(rule.id);
    setEditingStartMonth(rule.startMonth);
    setError(null);
    setOpen(true);
  };

  const submit = async () => {
    setBusy('save');
    setError(null);
    try {
      const amountCents = parseAmountInput(amount);
      if (!categoryId) {
        throw new Error('Elegí una categoría.');
      }
      if (!validDay) {
        throw new Error('El día debe estar entre 1 y 31.');
      }
      const draft: RecurringRuleDraft = {
        name,
        kind,
        amountCents,
        categoryId,
        dayOfMonth: parsedDay,
      };
      if (editingId) {
        await onUpdate(editingId, draft);
      } else {
        await onCreate({ ...draft, startMonth: startMonthForDay(parsedDay) });
      }
      resetForm();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo guardar la regla.');
    } finally {
      setBusy(null);
    }
  };

  const toggleActive = async (rule: RecurringRule) => {
    setBusy(rule.id);
    setError(null);
    try {
      if (rule.active === 1) {
        await onPause(rule.id);
      } else {
        await onResume(rule.id);
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : `No se pudo ${rule.active === 1 ? 'pausar' : 'reactivar'} la regla.`,
      );
    } finally {
      setBusy(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }
    setBusy(deleteTarget.id);
    setError(null);
    try {
      await onDelete(deleteTarget.id);
      setDeleteTarget(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo eliminar la regla.');
    } finally {
      setBusy(null);
    }
  };

  const categoryName = (id: string) =>
    categories.find((category) => category.id === id)?.name ?? 'Sin categoría';

  return (
    <Card className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">Recurrentes</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Ingresos y gastos fijos que se generan cada mes. Pausar deja de reservarlos.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            if (open) {
              resetForm();
            } else {
              setError(null);
              setOpen(true);
            }
          }}
        >
          {open ? 'Cancelar' : 'Nueva regla'}
        </Button>
      </div>

      {open ? (
        <div className="space-y-3 rounded-[var(--radius-control)] border border-line bg-surface-2 p-4">
          <h3 className="font-display text-base font-semibold text-ink">
            {editingId ? 'Editar regla recurrente' : 'Nueva regla recurrente'}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="new-rule-name" className="mb-1 block text-sm font-medium text-ink">
                Nombre
              </label>
              <Input
                id="new-rule-name"
                aria-label="Nombre de la regla"
                value={name}
                maxLength={80}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div>
              <label htmlFor="new-rule-kind" className="mb-1 block text-sm font-medium text-ink">
                Tipo
              </label>
              <Select
                id="new-rule-kind"
                aria-label="Tipo de regla"
                value={kind}
                onChange={(event) => {
                  setKind(event.target.value as RecurringRule['kind']);
                  setCategoryId('');
                }}
              >
                <option value="fixed_expense">Gasto fijo</option>
                <option value="expected_income">Ingreso previsto</option>
              </Select>
            </div>
            <div>
              <label htmlFor="new-rule-amount" className="mb-1 block text-sm font-medium text-ink">
                Monto
              </label>
              <Input
                id="new-rule-amount"
                inputMode="decimal"
                aria-label="Monto de la regla"
                value={amount}
                placeholder="0.00"
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>
            <div>
              <label htmlFor="new-rule-day" className="mb-1 block text-sm font-medium text-ink">
                Día del mes
              </label>
              <Input
                id="new-rule-day"
                type="number"
                min={1}
                max={31}
                aria-label="Día de la regla"
                value={dayOfMonth}
                onChange={(event) => setDayOfMonth(event.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="new-rule-category" className="mb-1 block text-sm font-medium text-ink">
                Categoría
              </label>
              <Select
                id="new-rule-category"
                aria-label="Categoría de la regla"
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
              >
                <option value="">Elegí una categoría</option>
                {eligible.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <p className="text-xs text-ink-muted">
            {editingId
              ? editingStartMonth
                ? `Esta regla se genera desde ${formatMonthLong(editingStartMonth)}.`
                : null
              : firstMonth
                ? `Primera aparición: ${formatMonthLong(firstMonth)}. Si el día ya pasó este mes, empieza el próximo.`
                : null}
          </p>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => void submit()}
              loading={busy === 'save'}
              disabled={name.trim().length === 0 || amount.trim().length === 0}
            >
              {editingId ? 'Guardar cambios' : 'Crear recurrente'}
            </Button>
            {editingId ? (
              <Button variant="ghost" onClick={resetForm} disabled={busy === 'save'}>
                Cancelar edición
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-red">
          {error}
        </p>
      ) : null}

      {rules.length === 0 ? (
        <p className="text-sm text-ink-muted">Todavía no hay reglas recurrentes.</p>
      ) : (
        <ul className="divide-y divide-line rounded-[var(--radius-control)] border border-line">
          {rules.map((rule) => (
            <li
              key={rule.id}
              className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{rule.name}</p>
                <p className="text-xs text-ink-muted">
                  {categoryName(rule.categoryId)} · día {rule.dayOfMonth} ·{' '}
                  {rule.kind === 'fixed_expense' ? 'Gasto fijo' : 'Ingreso previsto'} · desde{' '}
                  {formatMonthLong(rule.startMonth)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <span className="text-sm font-semibold text-ink">
                  {formatPEN(rule.amountCents)}
                </span>
                <Chip tone={rule.active === 1 ? 'positive' : 'neutral'}>
                  {rule.active === 1 ? 'Activa' : 'Pausada'}
                </Chip>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Editar ${rule.name}`}
                    disabled={busy === rule.id}
                    onClick={() => startEdit(rule)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`${rule.active === 1 ? 'Pausar' : 'Reactivar'} ${rule.name}`}
                    disabled={busy === rule.id}
                    onClick={() => void toggleActive(rule)}
                  >
                    {rule.active === 1 ? 'Pausar' : 'Reactivar'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red hover:bg-red-soft"
                    aria-label={`Eliminar ${rule.name}`}
                    disabled={busy === rule.id}
                    onClick={() => setDeleteTarget(rule)}
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(next) => {
          if (!next) {
            setDeleteTarget(null);
          }
        }}
        title={deleteTarget ? `Eliminar ${deleteTarget.name}` : 'Eliminar regla'}
        description="La regla dejará de generar movimientos futuros. Los movimientos ya generados se conservan."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              loading={busy === deleteTarget?.id}
              onClick={() => void confirmDelete()}
            >
              Eliminar regla
            </Button>
          </>
        }
      />
    </Card>
  );
}
