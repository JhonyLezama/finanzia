import { Info, ShieldCheck, FileText, ExternalLink, HardDrive } from 'lucide-react';
import { Link } from 'react-router';
import { Card } from '@/components/ui/Card';

export function AboutSection() {
  return (
    <div className="space-y-5">
      <Card className="space-y-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2.5 py-0.5 text-xs font-semibold text-primary">
            <span>SysJoL Software</span>
            <span>•</span>
            <span>Versión 0.1.0</span>
          </div>
          <h2 className="mt-2 font-display text-lg font-semibold text-ink">Acerca de Finanzia</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Desarrollado y mantenido por <strong>SysJoL</strong>. Una app pensada para darte control de tus finanzas con privacidad total y sin intermediarios.
          </p>
        </div>

        {/* Insignia local-first */}
        <div className="rounded-[var(--radius-control)] border border-line bg-surface-2 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              <HardDrive className="size-3.5" aria-hidden="true" />
              Datos 100% locales en tu equipo
            </span>
          </div>
          <p className="text-xs text-ink-muted">
            Tus presupuestos y movimientos viven exclusivamente en el almacenamiento interno de tu navegador (IndexedDB). No se suben a ningún servidor central.
          </p>
        </div>

        {/* Tarjetas de navegación rápida a políticas y legales */}
        <div className="grid gap-3 sm:grid-cols-3">
          <Link
            to="/acerca-de"
            className="flex flex-col justify-between rounded-[var(--radius-control)] border border-line bg-surface-2 p-3.5 transition hover:border-primary/40 hover:bg-surface"
          >
            <div className="space-y-1">
              <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
                <Info className="size-4 text-primary" />
                Quiénes somos
              </span>
              <p className="text-xs text-ink-muted">
                Conoce la visión, misión y detalles del proyecto.
              </p>
            </div>
            <span className="mt-2 text-xs font-semibold text-primary">Ver detalles →</span>
          </Link>

          <Link
            to="/privacidad"
            className="flex flex-col justify-between rounded-[var(--radius-control)] border border-line bg-surface-2 p-3.5 transition hover:border-primary/40 hover:bg-surface"
          >
            <div className="space-y-1">
              <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
                <ShieldCheck className="size-4 text-primary" />
                Privacidad
              </span>
              <p className="text-xs text-ink-muted">
                Dónde se guardan los datos y cómo respaldarlos.
              </p>
            </div>
            <span className="mt-2 text-xs font-semibold text-primary">Leer política →</span>
          </Link>

          <Link
            to="/terminos"
            className="flex flex-col justify-between rounded-[var(--radius-control)] border border-line bg-surface-2 p-3.5 transition hover:border-primary/40 hover:bg-surface"
          >
            <div className="space-y-1">
              <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
                <FileText className="size-4 text-primary" />
                Términos de uso
              </span>
              <p className="text-xs text-ink-muted">
                Descargo de responsabilidad financiera y condiciones.
              </p>
            </div>
            <span className="mt-2 text-xs font-semibold text-primary">Leer términos →</span>
          </Link>
        </div>

        <div className="border-t border-line pt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs text-ink-muted">
          <div>
            Desarrollado por{' '}
            <a
              href="https://sysjol.onrender.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline inline-flex items-center gap-1"
            >
              SysJoL
              <ExternalLink className="size-3" />
            </a>
          </div>
          <div>
            App en producción:{' '}
            <a
              href="https://finanzia-sandy.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline inline-flex items-center gap-1"
            >
              finanzia-sandy.vercel.app
              <ExternalLink className="size-3" />
            </a>
          </div>
        </div>
      </Card>
    </div>
  );
}
