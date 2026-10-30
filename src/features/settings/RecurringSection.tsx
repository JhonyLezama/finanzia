import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { RecurringRuleInput } from '@/db/repositories/recurring';
import { currentMonth } from '@/domain/dates';
import { formatPEN, parseAmountInput } from '@/domain/money';
import type { Category, RecurringRule } from '@/domain/models';

export interface RecurringSectionProps {
  rules: RecurringRule[];
  categories: Category[];
  onCreate: (input: RecurringRuleInput) => Promise<void>;
  onPause: (id: string) => Promise<void>;
}

export function RecurringSection({ rules, categories, onCreate, onPause }: RecurringSectionProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<RecurringRule['kind']>('fixed_expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState('5');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const eligible = categories.filter((category) => {
    if (category.archived === 1) {
      return false;
    }
    return kind === 'fixed_expense'
      ? category.kind === 'expense' && category.group === 'fixed'
      : category.kind === 'income' && category.group === 'income';
  });

  const create = async () => {
    setBusy('create');
    setError(null);
    try {
      const amountCents = parseAmountInput(amount);
      const day = Number.parseInt(dayOfMonth, 10);
      if (!categoryId) {
        throw new Error('Elegí una categoría.');
      }
      if (!Number.isInteger(day) || day < 1 || day > 31) {
        throw new Error('El día debe estar entre 1 y 31.');
      }
      await onCreate({
        name,
        kind,
        amountCents,
        categoryId,
        dayOfMonth: day,
        startMonth: currentMonth(),
      });
      setName('');
      setAmount('');
      setCategoryId('');
      setOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo crear la regla.');
    } finally {
      setBusy(null);
    }
  };

  const pause = async (rule: RecurringRule) => {
    setBusy(rule.id);
    setError(null);
    try {
      await onPause(rule.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo pausar la regla.');
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
        <Button variant="secondary" size="sm" onClick={() => setOpen((value) => !value)}>
          {open ? 'Cancelar' : 'Nueva regla'}
        </Button>
      </div>

      {open ? (
        <div className="space-y-3 rounded-[var(--radius-control)] border border-line bg-surface-2 p-4">
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
          <Button
            onClick={() => void create()}
            loading={busy === 'create'}
            disabled={name.trim().length === 0 || amount.trim().length === 0}
          >
            Crear recurrente
          </Button>
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
            <li key={rule.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
              <div>
                <p className="text-sm font-medium text-ink">{rule.name}</p>
                <p className="text-xs text-ink-muted">
                  {categoryName(rule.categoryId)} · día {rule.dayOfMonth} ·{' '}
                  {rule.kind === 'fixed_expense' ? 'Gasto fijo' : 'Ingreso previsto'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-ink">
                  {formatPEN(rule.amountCents)}
                </span>
                <Chip tone={rule.active === 1 ? 'positive' : 'neutral'}>
                  {rule.active === 1 ? 'Activa' : 'Pausada'}
                </Chip>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Pausar ${rule.name}`}
                  disabled={rule.active === 0 || busy === rule.id}
                  onClick={() => void pause(rule)}
                >
                  Pausar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
