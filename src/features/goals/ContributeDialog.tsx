import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { todayInLima } from '@/domain/dates';
import type { Goal, ISODate } from '@/domain/models';
import { parseAmountInput } from '@/domain/money';
import type { GoalMovementInput } from '@/db/repositories/goals';

export interface ContributeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: Goal | null;
  onConfirm: (input: GoalMovementInput) => Promise<void>;
}

interface FormProps {
  onConfirm: (input: GoalMovementInput) => Promise<void>;
  onClose: () => void;
}

function ContributeForm({ onConfirm, onClose }: FormProps) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState<ISODate>(todayInLima());
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    if (date > todayInLima()) {
      setError('La fecha no puede ser futura.');
      return;
    }

    setBusy(true);
    try {
      await onConfirm({
        amountCents: cents,
        date,
        note: note.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar el aporte.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? (
        <div role="alert" className="rounded-lg border border-red/30 bg-red-soft p-3 text-sm text-red">
          {error}
        </div>
      ) : null}

      <div>
        <label htmlFor="contribute-amount" className="mb-1 block text-sm font-medium text-ink">
          Monto
        </label>
        <Input
          id="contribute-amount"
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </div>

      <div>
        <label htmlFor="contribute-date" className="mb-1 block text-sm font-medium text-ink">
          Fecha
        </label>
        <Input
          id="contribute-date"
          type="date"
          max={todayInLima()}
          value={date}
          onChange={(e) => setDate(e.target.value as ISODate)}
          required
        />
      </div>

      <div>
        <label htmlFor="contribute-note" className="mb-1 block text-sm font-medium text-ink">
          Nota (opcional)
        </label>
        <Input
          id="contribute-note"
          placeholder="Motivo del aporte..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? 'Guardando…' : 'Confirmar aporte'}
        </Button>
      </div>
    </form>
  );
}

export function ContributeDialog({
  open,
  onOpenChange,
  goal,
  onConfirm,
}: ContributeDialogProps) {
  if (!goal) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Aportar a ${goal.name}`}
      description="El monto se descontará de tu saldo disponible y aumentará el progreso de esta meta."
    >
      <ContributeForm
        key={goal.id}
        onConfirm={onConfirm}
        onClose={() => onOpenChange(false)}
      />
    </Dialog>
  );
}
