import { AlertOctagon, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';
import { Card } from '@/components/ui/Card';

export default function TermsPage() {
  return (
    <section className="mx-auto max-w-4xl space-y-8">
      <header className="space-y-3">
        <Link
          to="/acerca-de"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="size-4" /> Volver a Acerca de
        </Link>
        <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">
          Términos de Uso
        </h1>
        <p className="text-sm text-ink-muted">
          Última actualización: 30 de octubre de 2026 • Finanzia (https://finanzia-sandy.vercel.app/) by SysJoL
        </p>
      </header>

      <div className="space-y-6 text-sm leading-relaxed text-ink-muted">
        <Card className="space-y-3 border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <AlertOctagon className="size-5 shrink-0" />
            <h2 className="font-display text-base font-semibold">
              1. Descargo de Responsabilidad Financiera y Asesoramiento
            </h2>
          </div>
          <p className="text-amber-900/90 dark:text-amber-100/90">
            Finanzia es un software utilitario para registro contable doméstico y presupuesto personal.
            <strong> El servicio no proporciona asesoramiento financiero, crediticio, contable, tributario, legal ni de inversión profesional.</strong>
          </p>
          <p className="text-amber-900/90 dark:text-amber-100/90">
            SysJoL no asume responsabilidad alguna por decisiones comerciales, de endeudamiento o de inversión tomadas a partir de cálculos, gráficos o estimaciones presentados en la aplicación.
          </p>
        </Card>

        <Card className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-ink">2. Responsabilidad sobre la custodia de datos</h2>
          <p>
            Al tratarse de una solución de almacenamiento local (Local-First), el usuario es el único custodio y responsable de sus datos. SysJoL no posee copias remotas de su base de datos.
          </p>
          <p>
            Recomendamos enfáticamente descargar periódicamente una copia de seguridad (formato JSON) mediante la funcionalidad provista en el apartado de Ajustes, especialmente antes de realizar limpiezas de navegador, formateos o cambios de dispositivo.
          </p>
        </Card>

        <Card className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-ink">3. Licencia de uso y propiedad intelectual</h2>
          <p>
            Finanzia y su código, diseño de interfaces y componentes son propiedad de SysJoL. Se concede una licencia personal, no exclusiva, gratuita y revocable para utilizar la aplicación con fines personales o de gestión interna de presupuesto.
          </p>
        </Card>

        <Card className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-ink">4. Garantía del software</h2>
          <p>
            La aplicación se entrega "tal cual" (as is) y "según disponibilidad", sin garantías expresas o implícitas sobre continuidad ininterrumpida o ausencia total de errores. SysJoL efectúa pruebas constantes para garantizar la mayor estabilidad y precisión matemática en los balances.
          </p>
        </Card>

        <Card className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-ink">5. Modificaciones de los términos</h2>
          <p>
            SysJoL se reserva el derecho de actualizar estos términos cuando se introduzcan nuevas características. Las modificaciones serán notificadas de forma transparente en este mismo apartado.
          </p>
        </Card>

        <Card className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-ink">6. Titularidad y Contacto</h2>
          <p>
            Para consultas legales o de soporte técnico dirigirse a{' '}
            <a
              href="https://sysjol.onrender.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline"
            >
              SysJoL (https://sysjol.onrender.com/)
            </a>.
          </p>
        </Card>
      </div>
    </section>
  );
}
