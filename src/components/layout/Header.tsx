import { CalendarDays, Settings } from 'lucide-react';
import { Link } from 'react-router';

const monthFormatter = new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric' });

export function Header() {
  const monthLabel = monthFormatter.format(new Date());

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/95 backdrop-blur">
      <div className="mx-auto flex min-h-14 w-full max-w-[1200px] items-center justify-between gap-3 px-4 sm:px-6 lg:min-h-16 lg:px-8">
        <span className="font-display text-lg font-semibold text-ink lg:hidden">Alcancía</span>
        <span className="hidden text-sm text-ink-muted lg:inline">Presupuesto personal</span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled
            className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] border border-line bg-surface px-3 text-sm text-ink-muted"
          >
            <CalendarDays className="size-4" aria-hidden="true" />
            <span className="sr-only">Cambiar mes (próximamente): </span>
            <span className="capitalize">{monthLabel}</span>
          </button>
          <Link
            to="/ajustes"
            aria-label="Ajustes"
            className="inline-flex size-11 items-center justify-center rounded-full text-ink-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <Settings className="size-5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </header>
  );
}
