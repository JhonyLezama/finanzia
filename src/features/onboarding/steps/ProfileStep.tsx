import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { parseAmountInput } from '@/domain/money';
import type { ProfilePayload } from '../useOnboarding';

export interface ProfileStepProps {
  displayName: string;
  busy: boolean;
  error: string | null;
  onDisplayNameChange: (value: string) => void;
  onSubmit: (payload: ProfilePayload) => void;
}

export function ProfileStep({
  displayName,
  busy,
  error,
  onDisplayNameChange,
  onSubmit,
}: ProfileStepProps) {
  const [balance, setBalance] = useState('');
  const [direction, setDirection] = useState<'in' | 'out'>('in');
  const [localError, setLocalError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);

    if (displayName.trim().length > 60) {
      setLocalError('El nombre admite hasta 60 caracteres.');
      return;
    }

    if (!balance.trim()) {
      onSubmit({ displayName, openingCents: null, direction });
      return;
    }

    try {
      const openingCents = parseAmountInput(balance);
      onSubmit({ displayName, openingCents, direction });
    } catch (cause) {
      setLocalError(cause instanceof Error ? cause.message : 'Ingresá un saldo válido.');
    }
  }

  const message = localError ?? error;

  return (
    <section aria-labelledby="onboarding-profile">
      <h1 id="onboarding-profile" className="text-2xl font-semibold tracking-tight text-ink">
        Contanos dónde estás hoy
      </h1>
      <p className="mt-2 text-sm text-ink-muted">
        El saldo inicial es lo que tenés disponible ahora. Podés dejarlo en blanco si
        preferís empezar desde cero.
      </p>

      <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="profile-name" className="mb-1.5 block text-sm font-medium text-ink">
            Tu nombre <span className="font-normal text-ink-muted">(opcional)</span>
          </label>
          <Input
            id="profile-name"
            name="displayName"
            autoComplete="given-name"
            value={displayName}
            onChange={(event) => onDisplayNameChange(event.target.value)}
            placeholder="Ana"
          />
        </div>

        <div>
          <label htmlFor="profile-balance" className="mb-1.5 block text-sm font-medium text-ink">
            Saldo inicial
          </label>
          <Input
            id="profile-balance"
            name="openingBalance"
            inputMode="decimal"
            value={balance}
            onChange={(event) => setBalance(event.target.value)}
            placeholder="0.00"
            aria-describedby="profile-balance-help"
          />
          <p id="profile-balance-help" className="mt-1.5 text-xs text-ink-muted">
            Monto en soles. Podés usar coma o punto para los decimales.
          </p>
        </div>

        <fieldset>
          <legend className="mb-2 block text-sm font-medium text-ink">
            ¿Ese saldo está a tu favor o es una deuda?
          </legend>
          <div className="flex flex-wrap gap-3">
            <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--radius-control)] border border-line bg-surface-2 px-3 text-sm text-ink">
              <input
                type="radio"
                name="direction"
                value="in"
                checked={direction === 'in'}
                onChange={() => setDirection('in')}
                className="size-4 accent-[var(--primary)]"
              />
              A favor
            </label>
            <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--radius-control)] border border-line bg-surface-2 px-3 text-sm text-ink">
              <input
                type="radio"
                name="direction"
                value="out"
                checked={direction === 'out'}
                onChange={() => setDirection('out')}
                className="size-4 accent-[var(--primary)]"
              />
              Deuda
            </label>
          </div>
        </fieldset>

        {message ? (
          <p role="alert" className="rounded-[var(--radius-control)] bg-red-soft px-3 py-2 text-sm text-red">
            {message}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          <Button type="submit" loading={busy} className="sm:flex-1">
            Continuar
          </Button>
        </div>
      </form>
    </section>
  );
}
