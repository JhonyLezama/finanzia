import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { parseAmountInput } from '@/domain/money';
import type { IncomePayload } from '../useOnboarding';

export interface IncomeStepProps {
  busy: boolean;
  error: string | null;
  onSubmit: (payload: IncomePayload) => void;
  onSkip: () => void;
  onBack: () => void;
}

const days = Array.from({ length: 31 }, (_, index) => index + 1);

export function IncomeStep({ busy, error, onSubmit, onSkip, onBack }: IncomeStepProps) {
  const [amount, setAmount] = useState('');
  const [name, setName] = useState('Sueldo');
  const [day, setDay] = useState('1');
  const [localError, setLocalError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);

    if (!name.trim()) {
      setLocalError('Ponele un nombre a tu ingreso.');
      return;
    }

    try {
      onSubmit({
        name: name.trim(),
        amountCents: parseAmountInput(amount),
        dayOfMonth: Number(day),
      });
    } catch (cause) {
      setLocalError(cause instanceof Error ? cause.message : 'Ingresá un monto válido.');
    }
  }

  const message = localError ?? error;

  return (
    <section aria-labelledby="onboarding-income">
      <h1 id="onboarding-income" className="text-2xl font-semibold tracking-tight text-ink">
        Tu ingreso principal
      </h1>
      <p className="mt-2 text-sm text-ink-muted">
        Lo usamos para proyectar el mes y avisarte si tu presupuesto se pasa de lo que
        entra. Es un ingreso previsto: lo confirmás cuando lo recibís.
      </p>

      <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="income-amount" className="mb-1.5 block text-sm font-medium text-ink">
            Ingreso mensual
          </label>
          <Input
            id="income-amount"
            name="incomeAmount"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="2200.00"
          />
        </div>

        <div>
          <label htmlFor="income-name" className="mb-1.5 block text-sm font-medium text-ink">
            Descripción
          </label>
          <Input
            id="income-name"
            name="incomeName"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Sueldo"
          />
        </div>

        <div>
          <label htmlFor="income-day" className="mb-1.5 block text-sm font-medium text-ink">
            Día del mes en que lo recibís
          </label>
          <Select
            id="income-day"
            name="incomeDay"
            value={day}
            onChange={(event) => setDay(event.target.value)}
          >
            {days.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </div>

        {message ? (
          <p role="alert" className="rounded-[var(--radius-control)] bg-red-soft px-3 py-2 text-sm text-red">
            {message}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          <Button type="submit" loading={busy} className="sm:flex-1">
            Continuar
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onSkip}
            disabled={busy}
            className="sm:flex-1"
          >
            Omitir por ahora
          </Button>
          <Button type="button" variant="ghost" onClick={onBack} disabled={busy}>
            Atrás
          </Button>
        </div>
      </form>
    </section>
  );
}
