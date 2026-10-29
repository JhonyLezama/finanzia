import { Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { OnboardingSummary } from '../useOnboarding';

export interface DoneStepProps {
  displayName: string;
  summary: OnboardingSummary;
  busy: boolean;
  error: string | null;
  onFinish: () => void;
}

export function DoneStep({ displayName, summary, busy, error, onFinish }: DoneStepProps) {
  const items = [
    {
      label: 'Saldo inicial registrado',
      detail: 'Tu disponible parte de una base real.',
    },
    {
      label: summary.income ? 'Ingreso previsto configurado' : 'Ingreso previsto pendiente',
      detail: summary.income
        ? 'Vas a verlo cada mes en tu presupuesto.'
        : 'Podés agregarlo desde Presupuesto cuando quieras.',
    },
    {
      label:
        summary.fixedCount > 0
          ? `${summary.fixedCount} gasto${summary.fixedCount === 1 ? '' : 's'} fijo${summary.fixedCount === 1 ? '' : 's'} configurado${summary.fixedCount === 1 ? '' : 's'}`
          : 'Sin gastos fijos por ahora',
      detail:
        summary.fixedCount > 0
          ? 'Quedan reservados al inicio de cada mes.'
          : 'Podés sumarlos cuando aparezcan.',
    },
    {
      label: summary.goal ? 'Primera meta creada' : 'Sin meta por ahora',
      detail: summary.goal
        ? 'Tu ahorro ya tiene un destino.'
        : 'Creá una meta cuando quieras separar dinero.',
    },
  ];

  return (
    <section aria-labelledby="onboarding-done">
      <p className="text-sm font-medium uppercase tracking-wide text-primary">Paso final</p>
      <h1
        id="onboarding-done"
        className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl"
      >
        Todo listo{displayName.trim() ? `, ${displayName.trim()}` : ''}
      </h1>
      <p className="mt-3 text-base text-ink-muted">
        Tu espacio está configurado. Estos son los próximos pasos que ya podés usar.
      </p>

      <ul className="mt-6 space-y-3">
        {items.map((item) => (
          <li
            key={item.label}
            className="flex gap-3 rounded-[var(--radius-card)] border border-line bg-surface-2 p-4"
          >
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-ink">
              <Check aria-hidden="true" className="size-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">{item.label}</p>
              <p className="mt-0.5 text-sm text-ink-muted">{item.detail}</p>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-sm text-ink-muted">
        Tip: registrá tus gastos del día desde el botón de nuevo movimiento. Todo queda
        guardado en este dispositivo.
      </p>

      {error ? (
        <p role="alert" className="mt-5 rounded-[var(--radius-control)] bg-red-soft px-3 py-2 text-sm text-red">
          {error}
        </p>
      ) : null}

      <Button onClick={onFinish} loading={busy} className="mt-8 w-full">
        Ir al inicio
      </Button>
    </section>
  );
}
