import { PiggyBank, Info, HardDrive } from 'lucide-react';
import { Link, NavLink } from 'react-router';
import { cn } from '@/lib/cn';
import { navItems } from './nav-items';

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-line bg-surface">
      <Link
        to="/"
        className="flex min-h-16 items-center gap-2 border-b border-line px-5 font-display text-lg font-semibold text-ink"
      >
        <PiggyBank className="size-6 text-gold" aria-hidden="true" />
        Finanzia
      </Link>

      <nav aria-label="Principal" className="flex flex-1 flex-col gap-1 p-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex min-h-11 items-center gap-3 rounded-[var(--radius-control)] px-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-ink-muted hover:bg-surface-2 hover:text-ink',
                )
              }
            >
              <Icon className="size-5 shrink-0" aria-hidden="true" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Enlaces de Transparencia & Legal */}
      <div className="border-t border-line px-4 py-3 space-y-2.5 text-xs">
        <div className="flex flex-col gap-1 text-ink-muted">
          <Link to="/acerca-de" className="hover:text-primary transition-colors flex items-center gap-1.5 font-medium">
            <Info className="size-3.5" />
            Acerca de Finanzia
          </Link>
          <div className="flex items-center gap-2 text-[11px] text-ink-muted">
            <Link to="/privacidad" className="hover:underline">Privacidad</Link>
            <span>•</span>
            <Link to="/terminos" className="hover:underline">Términos</Link>
          </div>
        </div>

        <div className="pt-2 border-t border-line space-y-1.5">
          <p className="text-[11px] text-ink-muted">
            Desarrollado por{' '}
            <a
              href="https://sysjol.onrender.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary hover:underline"
            >
              SysJoL
            </a>
          </p>
          <div>
            <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-2 px-2 py-0.5 text-[10px] font-medium text-ink-muted">
              <HardDrive className="size-3 text-primary" aria-hidden="true" />
              Datos 100% locales en tu equipo
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
