import { PiggyBank } from 'lucide-react';
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
        Alcancía
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

      <p className="border-t border-line p-4 text-xs leading-relaxed text-ink-muted">
        Tus datos quedan en este dispositivo.
      </p>
    </aside>
  );
}
