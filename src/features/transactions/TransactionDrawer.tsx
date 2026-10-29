import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { Input } from '@/components/ui/Input';
import { todayInLima } from '@/domain/dates';
import type { Category, ISODate, Transaction } from '@/domain/models';
import { parseAmountInput } from '@/domain/money';
import type { TransactionInput } from '@/db/repositories/transactions';

export interface TransactionDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  initialTransaction?: Transaction | null;
  onSubmit: (input: TransactionInput) => Promise<void>;
}

interface TransactionFormProps {
  categories: Category[];
  initialTransaction?: Transaction | null;
  onSubmit: (input: TransactionInput) => Promise<void>;
  onClose: () => void;
}

function TransactionForm({
  categories,
  initialTransaction,
  onSubmit,
  onClose,
}: TransactionFormProps) {
  const [type, setType] = useState<'expense' | 'income'>(() =>
    initialTransaction?.type === 'income' ? 'income' : 'expense',
  );
  const [amount, setAmount] = useState(() =>
    initialTransaction ? (initialTransaction.amountCents / 100).toFixed(2) : '',
  );
  const [description, setDescription] = useState(
    () => initialTransaction?.description ?? '',
  );
  const [categoryId, setCategoryId] = useState<string>(
    () => initialTransaction?.categoryId ?? '',
  );
  const [date, setDate] = useState<ISODate>(
    () => initialTransaction?.date ?? todayInLima(),
  );
  const [note, setNote] = useState(() => initialTransaction?.note ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const availableCategories = categories.filter(
    (c) => !c.archived && (type === 'expense' ? c.kind === 'expense' : c.kind === 'income'),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let cents;
    try {
      cents = parseAmountInput(amount);
    } catch {
      setError('Ingresá un monto válido mayor a 0.');
      return;
    }

    if (!description.trim()) {
      setError('La descripción es obligatoria.');
      return;
    }

    if (date > todayInLima()) {
      setError('La fecha no puede ser futura.');
      return;
    }

    setBusy(true);
    try {
      await onSubmit({
        type,
        direction: type === 'expense' ? 'out' : 'in',
        amountCents: cents,
        date,
        description: description.trim(),
        categoryId: categoryId || undefined,
        note: note.trim() || undefined,
        source: 'manual',
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el movimiento.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {error ? (
        <div role="alert" className="rounded-lg border border-red/30 bg-red-soft p-3 text-sm text-red">
          {error}
        </div>
      ) : null}

      <div>
        <span className="mb-1.5 block text-sm font-medium text-ink">Tipo de movimiento</span>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className={`min-h-11 rounded-[var(--radius-control)] border text-sm font-medium transition ${
              type === 'expense'
                ? 'border-red bg-red-soft text-red'
                : 'border-line bg-surface text-ink-muted hover:bg-surface-2'
            }`}
            onClick={() => {
              setType('expense');
              setCategoryId('');
            }}
          >
            Gasto
          </button>
          <button
            type="button"
            className={`min-h-11 rounded-[var(--radius-control)] border text-sm font-medium transition ${
              type === 'income'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-line bg-surface text-ink-muted hover:bg-surface-2'
            }`}
            onClick={() => {
              setType('income');
              setCategoryId('');
            }}
          >
            Ingreso
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="transaction-amount" className="mb-1.5 block text-sm font-medium text-ink">
          Monto
        </label>
        <Input
          id="transaction-amount"
          name="amount"
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-ink">Categoría</span>
        <div className="flex flex-wrap gap-2">
          {availableCategories.map((cat) => {
            const isSelected = categoryId === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setCategoryId(isSelected ? '' : cat.id)}
                className={`inline-flex min-h-9 items-center rounded-full border px-3 py-1 text-xs font-medium transition ${
                  isSelected
                    ? 'border-primary bg-primary text-primary-ink'
                    : 'border-line bg-surface text-ink hover:bg-surface-2'
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label htmlFor="transaction-description" className="mb-1.5 block text-sm font-medium text-ink">
          Descripción
        </label>
        <Input
          id="transaction-description"
          name="description"
          placeholder="Ej: Cine, Almuerzo..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>

      <div>
        <label htmlFor="transaction-date" className="mb-1.5 block text-sm font-medium text-ink">
          Fecha
        </label>
        <Input
          id="transaction-date"
          name="date"
          type="date"
          max={todayInLima()}
          value={date}
          onChange={(e) => setDate(e.target.value as ISODate)}
          required
        />
      </div>

      <div>
        <label htmlFor="transaction-note" className="mb-1.5 block text-sm font-medium text-ink">
          Nota (opcional)
        </label>
        <Input
          id="transaction-note"
          name="note"
          placeholder="Detalles adicionales..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <div className="pt-4">
        <Button type="submit" variant="primary" className="w-full" disabled={busy}>
          {busy ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
    </form>
  );
}

export function TransactionDrawer({
  open,
  onOpenChange,
  categories,
  initialTransaction,
  onSubmit,
}: TransactionDrawerProps) {
  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={initialTransaction ? 'Editar movimiento' : 'Nuevo movimiento'}
      description="Ingresá los detalles del movimiento."
    >
      {open ? (
        <TransactionForm
          key={initialTransaction?.id ?? 'new'}
          categories={categories}
          initialTransaction={initialTransaction}
          onSubmit={onSubmit}
          onClose={() => onOpenChange(false)}
        />
      ) : null}
    </Drawer>
  );
}
