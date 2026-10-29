import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Money } from '@/components/ui/Money';
import { todayInLima } from '@/domain/dates';
import type { Goal, ISODate } from '@/domain/models';
import { parseAmountInput } from '@/domain/money';
import type { GoalMovementInput } from '@/db/repositories/goals';

export interface WithdrawDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: Goal | null;
  currentBalanceCents: number;
  onConfirm: (input: GoalMovementInput) => Promise<void>;
}

interface FormProps {
  currentBalanceCents: number;
  onConfirm: (input: GoalMovementInput) => Promise<void>;
  onClose: () => void;
}

function WithdrawForm({
  currentBalanceCents,
  onConfirm,
  onClose,
}: FormProps) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState<ISODate>(todayInLima());
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doSubmit = async () => {
    setError(null);

    let cents;
    try {
      cents = parseAmountInput(amount);
    } catch {
      setError('Ingresá un monto válido mayor a 0.');
      return;
    }

    if (cents > currentBalanceCents) {
      setError('El retiro no puede superar el saldo de la meta.');
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
      setError(err instanceof Error ? err.message : 'Error al registrar el retiro.');
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await doSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {error ? (
        <div role="alert" className="rounded-lg border border-red/30 bg-red-soft p-3 text-sm text-red">
          {error}
        </div>
      ) : null}

      <div className="rounded-lg border border-line bg-surface-2 p-3 text-xs text-ink-muted flex justify-between">
        <span>Saldo disponible en la meta:</span>
        <span className="font-semibold text-ink">
          <Money cents={currentBalanceCents} />
        </span>
      </div>

      <div>
        <label htmlFor="withdraw-amount" className="mb-1 block text-sm font-medium text-ink">
          Monto
        </label>
        <Input
          id="withdraw-amount"
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </div>

      <div>
        <label htmlFor="withdraw-date" className="mb-1 block text-sm font-medium text-ink">
          Fecha
        </label>
        <Input
          id="withdraw-date"
          type="date"
          max={todayInLima()}
          value={date}
          onChange={(e) => setDate(e.target.value as ISODate)}
          required
        />
      </div>

      <div>
        <label htmlFor="withdraw-note" className="mb-1 block text-sm font-medium text-ink">
          Nota (opcional)
        </label>
        <Input
          id="withdraw-note"
          placeholder="Motivo del retiro..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={busy}
          onClick={(e) => {
            e.preventDefault();
            void doSubmit();
          }}
        >
          {busy ? 'Guardando…' : 'Confirmar retiro'}
        </Button>
      </div>
    </form>
  );
}

export function WithdrawDialog({
  open,
  onOpenChange,
  goal,
  currentBalanceCents,
  onConfirm,
}: WithdrawDialogProps) {
  if (!goal) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Retirar de ${goal.name}`}
      description="El dinero retirado volverá a estar disponible para tus gastos cotidianos."
    >
      <WithdrawForm
        key={goal.id}
        currentBalanceCents={currentBalanceCents}
        onConfirm={onConfirm}
        onClose={() => onOpenChange(false)}
      />
    </Dialog>
  );
}
