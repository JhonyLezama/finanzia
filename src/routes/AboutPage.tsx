import { Shield, Info, ExternalLink, HardDrive, Lock, RefreshCw, Globe } from 'lucide-react';
import { Card } from '@/components/ui/Card';

export default function AboutPage() {
  return (
    <section className="mx-auto max-w-4xl space-y-8">
      {/* Encabezado */}
      <header className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-2 px-3 py-1 text-xs font-semibold text-primary">
          <span>SysJoL Software</span>
          <span>•</span>
          <span>Versión 0.1.0</span>
        </div>
        <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">
          Acerca de Finanzia
        </h1>
        <p className="text-base text-ink-muted">
          Una aplicación de finanzas personales diseñada para darte control total sobre tu dinero,
          con privacidad absoluta y sin intermediarios.
        </p>
      </header>

      {/* Quienes somos */}
      <Card className="space-y-4 border-l-4 border-l-primary">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Info className="size-6" />
          </div>
          <div className="space-y-2">
            <h2 className="font-display text-xl font-semibold text-ink">¿Quiénes somos?</h2>
            <p className="text-sm leading-relaxed text-ink-muted">
              <strong>Finanzia</strong> (<a href="https://finanzia-sandy.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">finanzia-sandy.vercel.app</a>) es desarrollada y mantenida por <strong className="text-ink">SysJoL</strong>,
              un equipo enfocado en construir software útil, ético, seguro y centrado en la privacidad y experiencia de las personas.
            </p>
            <div className="pt-2 flex flex-wrap gap-3">
              <a
                href="https://sysjol.onrender.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline text-sm"
              >
                <Globe className="size-4" aria-hidden="true" />
                Sitio oficial de SysJoL
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
              <span className="text-ink-muted">•</span>
              <a
                href="https://finanzia-sandy.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline text-sm"
              >
                App en vivo (Vercel)
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </Card>

      {/* Arquitectura de privacidad y datos */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="space-y-3">
          <div className="flex items-center gap-2 text-primary">
            <HardDrive className="size-5" />
            <h3 className="font-display text-base font-semibold text-ink">100% Local y Privado</h3>
          </div>
          <p className="text-sm text-ink-muted">
            Tus presupuestos, ingresos y movimientos se guardan exclusivamente en el almacenamiento
            local de tu propio dispositivo (IndexedDB). Ningún servidor de SysJoL ni de terceros
            almacena o tiene acceso a tus finanzas.
          </p>
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center gap-2 text-primary">
            <Lock className="size-5" />
            <h3 className="font-display text-base font-semibold text-ink">Sin Rastreo Ni Venta de Datos</h3>
          </div>
          <p className="text-sm text-ink-muted">
            No comercializamos tu información, no insertamos rastreadores publicitarios ni vendemos tus
            hábitos de consumo. Tus datos son exclusivamente tuyos.
          </p>
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center gap-2 text-primary">
            <RefreshCw className="size-5" />
            <h3 className="font-display text-base font-semibold text-ink">Copia de Seguridad y Portabilidad</h3>
          </div>
          <p className="text-sm text-ink-muted">
            No te dejamos atrapado: puedes exportar tus datos en JSON o CSV en cualquier momento desde
            la sección de Ajustes y restaurarlos cuando lo necesites.
          </p>
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center gap-2 text-primary">
            <Shield className="size-5" />
            <h3 className="font-display text-base font-semibold text-ink">Cifrado en Tránsito</h3>
          </div>
          <p className="text-sm text-ink-muted">
            Toda la entrega de la aplicación se realiza bajo protocolo seguro HTTPS a través de Vercel,
            asegurando la integridad del código fuente que descargas en tu navegador.
          </p>
        </Card>
      </div>

      {/* Aviso importante: no es asesoría financiera */}
      <Card className="space-y-3 border-amber-500/20 bg-amber-500/5">
        <h3 className="font-display text-base font-semibold text-amber-700 dark:text-amber-300">
          Aviso importante de responsabilidad financiera
        </h3>
        <p className="text-sm text-amber-900/90 dark:text-amber-100/90">
          Finanzia es una herramienta organizativa y de planificación de finanzas personales. 
          No provee ni constituye asesoría financiera, legal, tributaria ni de inversión profesional.
          Cada usuario es responsable de verificar sus cálculos y tomar decisiones financieras con el
          debido asesoramiento calificado.
        </p>
      </Card>

      {/* Contacto y Enlaces */}
      <Card className="space-y-4">
        <h3 className="font-display text-lg font-semibold text-ink">Contacto y Soporte</h3>
        <p className="text-sm text-ink-muted">
          ¿Tienes sugerencias, preguntas o encontraste un problema? Nos encantaría escucharte.
        </p>
        <div className="flex flex-wrap gap-4 pt-1">
          <a
            href="https://sysjol.onrender.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] bg-primary px-4 text-sm font-medium text-primary-ink shadow hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <ExternalLink className="size-4" aria-hidden="true" />
            Contacto en SysJoL
          </a>
        </div>
      </Card>
    </section>
  );
}
