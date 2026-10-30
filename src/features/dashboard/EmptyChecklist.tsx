import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import { Card } from '@/components/ui/Card';

const steps = [
  {
    to: '/movimientos',
    label: 'Registrar tu primer movimiento',
    detail: 'Un gasto o un ingreso para empezar el ledger.',
  },
  {
    to: '/presupuesto',
    label: 'Planificar el mes',
    detail: 'Fijá ingresos previstos, gastos fijos y variables.',
  },
  {
    to: '/metas',
    label: 'Crear una meta',
    detail: 'Separá dinero para tu próximo objetivo.',
  },
];

export function EmptyChecklist() {
  return (
    <Card className="space-y-3">
      <div>
        <h2 className="font-display text-lg font-semibold text-ink">Empezá por acá</h2>
        <p className="text-xs text-ink-muted">
          Tres pasos para que Inicio empiece a mostrar tus números.
        </p>
      </div>

      <ul className="divide-y divide-line">
        {steps.map((step) => (
          <li key={step.to}>
            <Link
              to={step.to}
              className="flex items-center justify-between gap-3 py-3 text-sm hover:text-primary"
            >
              <span>
                <span className="font-medium text-ink">{step.label}</span>
                <span className="block text-xs text-ink-muted">{step.detail}</span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
