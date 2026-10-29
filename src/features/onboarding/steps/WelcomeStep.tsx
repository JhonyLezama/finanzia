import { Button } from '@/components/ui/Button';

export interface WelcomeStepProps {
  busy: boolean;
  error: string | null;
  onStartFresh: () => void;
  onSample: () => void;
}

const promises = [
  'Sabé cuánto podés gastar hoy sin romper tu presupuesto.',
  'Separá tus gastos fijos, tus variables y tu ahorro.',
  'Todo queda en tu dispositivo, sin cuentas ni servidores.',
];

export function WelcomeStep({ busy, error, onStartFresh, onSample }: WelcomeStepProps) {
  return (
    <section aria-labelledby="onboarding-welcome">
      <p className="text-sm font-medium uppercase tracking-wide text-primary">
        Tu dinero, claro
      </p>
      <h1
        id="onboarding-welcome"
        className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl"
      >
        Bienvenido a Alcancía
      </h1>
      <p className="mt-3 text-base text-ink-muted">
        En pocos pasos vas a tener tu saldo, tus ingresos y tus gastos fijos listos para
        empezar el mes con calma.
      </p>

      <ul className="mt-6 space-y-3">
        {promises.map((promise) => (
          <li key={promise} className="flex gap-3 text-sm text-ink-muted">
            <span aria-hidden="true" className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
            <span>{promise}</span>
          </li>
        ))}
      </ul>

      {error ? (
        <p role="alert" className="mt-5 rounded-[var(--radius-control)] bg-red-soft px-3 py-2 text-sm text-red">
          {error}
        </p>
      ) : null}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button onClick={onStartFresh} disabled={busy} className="sm:flex-1">
          Empezar de cero
        </Button>
        <Button
          variant="secondary"
          onClick={onSample}
          disabled={busy}
          loading={busy}
          className="sm:flex-1"
        >
          Probar con datos de ejemplo
        </Button>
      </div>
    </section>
  );
}
