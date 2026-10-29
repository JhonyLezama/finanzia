import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import type { Goal, ISODate } from '@/domain/models';
import { parseAmountInput } from '@/domain/money';
import type { CreateGoalInput } from '@/db/repositories/goals';

export interface GoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialGoal?: Goal | null;
  onSubmit: (input: CreateGoalInput) => Promise<void>;
}

interface FormProps {
  initialGoal?: Goal | null;
  onSubmit: (input: CreateGoalInput) => Promise<void>;
  onClose: () => void;
}

function GoalForm({ initialGoal, onSubmit, onClose }: FormProps) {
  const [name, setName] = useState(() => initialGoal?.name ?? '');
  const [amount, setAmount] = useState(() =>
    initialGoal ? (initialGoal.targetCents / 100).toString() : '',
  );
  const [targetDate, setTargetDate] = useState<string>(() => initialGoal?.targetDate ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('El nombre de la meta es obligatorio.');
      return;
    }

    let cents;
    try {
      cents = parseAmountInput(amount);
    } catch {
      setError('Ingresá un monto objetivo válido mayor a 0.');
      return;
    }

    setBusy(true);
    try {
      await onSubmit({
        name: name.trim(),
        targetCents: cents,
        targetDate: targetDate ? (targetDate as ISODate) : undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar la meta.');
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
        <label htmlFor="goal-name" className="mb-1 block text-sm font-medium text-ink">
          Nombre
        </label>
        <Input
          id="goal-name"
          placeholder="Ej: Fondo de emergencia, Viaje..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div>
        <label htmlFor="goal-target" className="mb-1 block text-sm font-medium text-ink">
          Monto objetivo
        </label>
        <Input
          id="goal-target"
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </div>

      <div>
        <label htmlFor="goal-date" className="mb-1 block text-sm font-medium text-ink">
          Fecha objetivo (opcional)
        </label>
        <Input
          id="goal-date"
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
    </form>
  );
}

export function GoalDialog({
  open,
  onOpenChange,
  initialGoal,
  onSubmit,
}: GoalDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={initialGoal ? 'Editar meta' : 'Nueva meta de ahorro'}
      description="Establecé un objetivo financiero para separar dinero de forma real."
    >
      {open ? (
        <GoalForm
          key={initialGoal?.id ?? 'new'}
          initialGoal={initialGoal}
          onSubmit={onSubmit}
          onClose={() => onOpenChange(false)}
        />
      ) : null}
    </Dialog>
  );
}
