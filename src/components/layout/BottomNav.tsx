import { NavLink } from 'react-router';
import { cn } from '@/lib/cn';
import { navItems } from './nav-items';

export function BottomNav() {
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-5">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium transition-colors',
                    isActive ? 'text-primary' : 'text-ink-muted hover:text-ink',
                  )
                }
              >
                <Icon className="size-5" aria-hidden="true" />
                {item.label}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
