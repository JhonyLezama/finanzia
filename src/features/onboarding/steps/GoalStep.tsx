import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { isValidISODate } from '@/domain/dates';
import type { ISODate } from '@/domain/models';
import { parseAmountInput } from '@/domain/money';
import type { GoalPayload } from '../useOnboarding';

export interface GoalStepProps {
  busy: boolean;
  error: string | null;
  onSubmit: (payload: GoalPayload) => void;
  onSkip: () => void;
  onBack: () => void;
}

export function GoalStep({ busy, error, onSubmit, onSkip, onBack }: GoalStepProps) {
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);

    if (!name.trim()) {
      setLocalError('Ponele un nombre a tu meta.');
      return;
    }

    if (targetDate && !isValidISODate(targetDate)) {
      setLocalError('La fecha objetivo no es válida.');
      return;
    }

    try {
      onSubmit({
        name: name.trim(),
        targetCents: parseAmountInput(target),
        ...(targetDate ? { targetDate: targetDate as ISODate } : {}),
      });
    } catch (cause) {
      setLocalError(cause instanceof Error ? cause.message : 'Ingresá un objetivo válido.');
    }
  }

  const message = localError ?? error;

  return (
    <section aria-labelledby="onboarding-goal">
      <h1 id="onboarding-goal" className="text-2xl font-semibold tracking-tight text-ink">
        Tu primera meta
      </h1>
      <p className="mt-2 text-sm text-ink-muted">
        Una meta es dinero que separás de tu disponible. Podés crear más después y
        aportar o retirar cuando quieras.
      </p>

      <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="goal-name" className="mb-1.5 block text-sm font-medium text-ink">
            Nombre de la meta
          </label>
          <Input
            id="goal-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Fondo de emergencia"
          />
        </div>

        <div>
          <label htmlFor="goal-target" className="mb-1.5 block text-sm font-medium text-ink">
            Objetivo
          </label>
          <Input
            id="goal-target"
            inputMode="decimal"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            placeholder="3000.00"
          />
        </div>

        <div>
          <label
            htmlFor="goal-target-date"
            className="mb-1.5 block text-sm font-medium text-ink"
          >
            Fecha objetivo <span className="font-normal text-ink-muted">(opcional)</span>
          </label>
          <Input
            id="goal-target-date"
            type="date"
            value={targetDate}
            onChange={(event) => setTargetDate(event.target.value)}
          />
        </div>

        {message ? (
          <p role="alert" className="rounded-[var(--radius-control)] bg-red-soft px-3 py-2 text-sm text-red">
            {message}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          <Button type="submit" loading={busy} className="sm:flex-1">
            Crear meta
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
