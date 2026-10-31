import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { todayInLima } from '@/domain/dates';
import type { ISODate, PlanItem } from '@/domain/models';
import { parseAmountInput } from '@/domain/money';
import type { PayItemInput } from '@/db/repositories/plans';

export interface PayItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: PlanItem | null;
  onConfirm: (input: PayItemInput) => Promise<void>;
}

interface PayItemFormProps {
  item: PlanItem;
  onConfirm: (input: PayItemInput) => Promise<void>;
  onClose: () => void;
}

function PayItemForm({ item, onConfirm, onClose }: PayItemFormProps) {
  const today = todayInLima();
  const [amount, setAmount] = useState(() => (item.amountCents / 100).toFixed(2));
  const [date, setDate] = useState<ISODate>(() => {
    const initial = item.dueDate || today;
    return initial > today ? today : initial;
  });
  const [description, setDescription] = useState(() => item.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let cents;
    try {
      cents = parseAmountInput(amount);
    } catch {
      setError('Ingresá un monto válido.');
      return;
    }

    if (date > today) {
      setError('La fecha no puede ser futura.');
      return;
    }

    setBusy(true);
    try {
      await onConfirm({
        amountCents: cents,
        date,
        description: description.trim() || item.name,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar el pago.');
    } finally {
      setBusy(false);
    }
  };

  const isIncome = item.kind === 'expected_income';

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {error ? (
        <div role="alert" className="rounded-lg border border-red/30 bg-red-soft p-3 text-sm text-red">
          {error}
        </div>
      ) : null}

      <div>
        <label htmlFor="pay-item-amount" className="mb-1 block text-sm font-medium text-ink">
          Monto
        </label>
        <Input
          id="pay-item-amount"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </div>

      <div>
        <label htmlFor="pay-item-date" className="mb-1 block text-sm font-medium text-ink">
          Fecha
        </label>
        <Input
          id="pay-item-date"
          type="date"
          max={todayInLima()}
          value={date}
          onChange={(e) => setDate(e.target.value as ISODate)}
          required
        />
      </div>

      <div>
        <label htmlFor="pay-item-desc" className="mb-1 block text-sm font-medium text-ink">
          Descripción
        </label>
        <Input
          id="pay-item-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" disabled={busy}>
          {busy
            ? 'Confirmando…'
            : isIncome
              ? 'Confirmar ingreso'
              : 'Confirmar pago'}
        </Button>
      </div>
    </form>
  );
}

export function PayItemDialog({
  open,
  onOpenChange,
  item,
  onConfirm,
}: PayItemDialogProps) {
  if (!item) {
    return null;
  }

  const isIncome = item.kind === 'expected_income';
  const title = isIncome ? `Registrar ${item.name}` : `Pagar ${item.name}`;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={
        isIncome
          ? 'Confirmá la fecha y el monto recibido.'
          : 'Confirmá la fecha y el monto para registrar el gasto en el ledger.'
      }
    >
      <PayItemForm
        key={item.id}
        item={item}
        onConfirm={onConfirm}
        onClose={() => onOpenChange(false)}
      />
    </Dialog>
  );
}
