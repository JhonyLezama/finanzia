import { useNavigate } from 'react-router';
import { Card } from '@/components/ui/Card';
import { DoneStep } from './steps/DoneStep';
import { FixedStep } from './steps/FixedStep';
import { GoalStep } from './steps/GoalStep';
import { IncomeStep } from './steps/IncomeStep';
import { ProfileStep } from './steps/ProfileStep';
import { WelcomeStep } from './steps/WelcomeStep';
import { useOnboarding } from './useOnboarding';

const STEP_LABELS = ['Bienvenida', 'Perfil', 'Ingreso', 'Gastos fijos', 'Meta', 'Listo'];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const onboarding = useOnboarding(() => navigate('/', { replace: true }));

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center px-4 py-10 sm:px-6">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-lg font-semibold tracking-tight text-ink">Alcancía</p>
          <p className="text-xs text-ink-muted">Tu dinero, claro.</p>
        </div>
        {onboarding.step > 0 && onboarding.step < 5 ? (
          <p className="text-sm font-medium text-ink-muted" aria-live="polite">
            Paso {onboarding.step} de 4 · {STEP_LABELS[onboarding.step]}
          </p>
        ) : null}
      </header>

      {onboarding.step > 0 && onboarding.step < 5 ? (
        <div
          className="mb-6 h-1.5 overflow-hidden rounded-full bg-surface-2"
          role="progressbar"
          aria-label="Progreso del onboarding"
          aria-valuemin={1}
          aria-valuemax={4}
          aria-valuenow={onboarding.step}
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${(onboarding.step / 4) * 100}%` }}
          />
        </div>
      ) : null}

      <Card className="p-6 sm:p-8">
        {onboarding.loading ? (
          <div aria-live="polite" className="py-10 text-center">
            <p className="text-base font-medium text-ink">Preparando tu espacio…</p>
            <p className="mt-1 text-sm text-ink-muted">Un momento, estamos cargando tus datos.</p>
          </div>
        ) : null}

        {!onboarding.loading && onboarding.step === 0 ? (
          <WelcomeStep
            busy={onboarding.saving}
            error={onboarding.error}
            onStartFresh={onboarding.startFresh}
            onSample={onboarding.loadSample}
          />
        ) : null}

        {!onboarding.loading && onboarding.step === 1 ? (
          <ProfileStep
            displayName={onboarding.displayName}
            busy={onboarding.saving}
            error={onboarding.error}
            onDisplayNameChange={onboarding.setDisplayName}
            onSubmit={onboarding.submitProfile}
          />
        ) : null}

        {!onboarding.loading && onboarding.step === 2 ? (
          <IncomeStep
            busy={onboarding.saving}
            error={onboarding.error}
            onSubmit={onboarding.submitIncome}
            onSkip={onboarding.skipIncome}
            onBack={onboarding.back}
          />
        ) : null}

        {!onboarding.loading && onboarding.step === 3 ? (
          <FixedStep
            busy={onboarding.saving}
            error={onboarding.error}
            categories={onboarding.fixedCategories}
            onSubmit={onboarding.submitFixed}
            onSkip={onboarding.skipFixed}
            onBack={onboarding.back}
          />
        ) : null}

        {!onboarding.loading && onboarding.step === 4 ? (
          <GoalStep
            busy={onboarding.saving}
            error={onboarding.error}
            onSubmit={onboarding.submitGoal}
            onSkip={onboarding.skipGoal}
            onBack={onboarding.back}
          />
        ) : null}

        {!onboarding.loading && onboarding.step === 5 ? (
          <DoneStep
            displayName={onboarding.displayName}
            summary={onboarding.summary}
            busy={onboarding.saving}
            error={onboarding.error}
            onFinish={onboarding.finish}
          />
        ) : null}
      </Card>

      <p className="mt-5 text-center text-xs text-ink-muted">
        Tus datos se guardan solo en este dispositivo. Sin cuentas, sin servidores.
      </p>
    </main>
  );
}
