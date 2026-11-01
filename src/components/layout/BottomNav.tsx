import { NavLink } from 'react-router';
import { cn } from '@/lib/cn';
import { navItems } from './nav-items';

export function BottomNav() {
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line-strong bg-surface pb-[env(safe-area-inset-bottom)] shadow-bar print:hidden"
    >
      <ul className="grid grid-cols-5 px-1.5 pt-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'relative flex min-h-16 flex-col items-center justify-center gap-1 whitespace-nowrap rounded-xl px-0.5 text-[10px] font-medium leading-tight tracking-tighter transition-colors min-[360px]:px-1 min-[360px]:text-[11px] min-[360px]:tracking-normal',
                    isActive
                      ? 'bg-primary/10 text-primary after:absolute after:inset-x-4 after:top-1 after:h-0.5 after:rounded-full after:bg-primary'
                      : 'text-ink-muted hover:bg-surface-2 hover:text-ink',
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
