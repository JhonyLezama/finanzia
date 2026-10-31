import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useLiveQuery } from 'dexie-react-hooks';
import { categoryRepo } from '@/db/repositories/categories';
import type { CreatePlanItemInput } from '@/db/repositories/plans';
import { currentMonth, monthRange, todayInLima } from '@/domain/dates';
import type { ISODate, UUID } from '@/domain/models';
import { parseAmountInput } from '@/domain/money';

export interface ReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: CreatePlanItemInput) => Promise<void>;
}

export function ReminderDialog({ open, onOpenChange, onCreate }: ReminderDialogProps) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<UUID>('' as UUID);
  const [dueDate, setDueDate] = useState<ISODate>(todayInLima());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories =
    useLiveQuery(async () => {
      const list = await categoryRepo.list();
      return list.filter((cat) => cat.kind === 'expense' && cat.archived === 0);
    }, []) ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('El nombre es obligatorio.');
      return;
    }

    let amountCents;
    try {
      amountCents = parseAmountInput(amount);
    } catch {
      setError('Ingresá un monto válido.');
      return;
    }

    if (!categoryId) {
      setError('Elegí una categoría.');
      return;
    }

    if (!dueDate) {
      setError('Elegí una fecha.');
      return;
    }

    setBusy(true);
    try {
      await onCreate({
        name: trimmedName,
        amountCents,
        categoryId,
        dueDate,
      });
      setName('');
      setAmount('');
      setCategoryId('' as UUID);
      setDueDate(todayInLima());
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar el recordatorio.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Nuevo recordatorio"
      description="Creá un recordatorio puntual de gasto fijo sin crear una regla recurrente."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error ? (
          <div role="alert" className="rounded-lg border border-red/30 bg-red-soft p-3 text-sm text-red">
            {error}
          </div>
        ) : null}

        <div>
          <label htmlFor="reminder-name" className="mb-1 block text-sm font-medium text-ink">
            Nombre
          </label>
          <Input
            id="reminder-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Ej. Internet adicional, Cena de aniversario"
          />
        </div>

        <div>
          <label htmlFor="reminder-amount" className="mb-1 block text-sm font-medium text-ink">
            Monto
          </label>
          <Input
            id="reminder-amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            placeholder="0.00"
          />
        </div>

        <div>
          <label htmlFor="reminder-category" className="mb-1 block text-sm font-medium text-ink">
            Categoría
          </label>
          <Select
            id="reminder-category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value as UUID)}
            required
          >
            <option value="">Elegí una categoría</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label htmlFor="reminder-date" className="mb-1 block text-sm font-medium text-ink">
            Fecha
          </label>
          <Input
            id="reminder-date"
            type="date"
            min={monthRange(currentMonth()).start}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value as ISODate)}
            required
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button type="submit" loading={busy} disabled={busy}>
            Guardar recordatorio
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

