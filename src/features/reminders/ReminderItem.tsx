import { MoreHorizontal } from 'lucide-react';
import { DropdownMenu } from 'radix-ui';
import { Link } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Money } from '@/components/ui/Money';
import { addDays, todayInLima } from '@/domain/dates';
import type { Category, ISODate, PlanItem } from '@/domain/models';
import type { Reminder } from '@/domain/reminders';

export interface ReminderItemProps {
  reminder: Reminder;
  category?: Category;
  onPay: (item: PlanItem) => void;
  onNavigate: () => void;
  onSnooze: (item: PlanItem, until: ISODate, message: string) => void;
  onChooseDate: (item: PlanItem) => void;
  onHide: (item: PlanItem) => void;
  onRestore?: (item: PlanItem) => void;
  isHiddenView?: boolean;
}

const menuContentClass =
  'z-50 min-w-44 overflow-hidden rounded-[var(--radius-control)] border border-line bg-surface p-1 shadow-lg animate-in fade-in-0 zoom-in-95';
const menuItemClass =
  'flex w-full cursor-pointer select-none items-center gap-2 rounded px-2.5 py-2 text-sm text-ink outline-none hover:bg-surface-2 focus:bg-surface-2';

export function ReminderItem({
  reminder,
  category,
  onPay,
  onNavigate,
  onSnooze,
  onChooseDate,
  onHide,
  onRestore,
  isHiddenView,
}: ReminderItemProps) {
  const item = reminder.item;

  return (
    <li className="flex min-w-0 items-start justify-between gap-3 border-b border-line/60 px-4 py-3 last:border-b-0 hover:bg-surface-2/40">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <time dateTime={item.dueDate} className="font-medium text-ink-muted">
            {reminder.dueLabel}
          </time>
          {category ? <Chip tone="neutral">{category.name}</Chip> : null}
        </div>
        <Link
          to={`/presupuesto?mes=${item.planId}`}
          onClick={onNavigate}
          className="block truncate text-sm font-medium text-ink hover:text-primary transition-colors"
        >
          {item.name}
        </Link>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Money cents={item.amountCents} direction="out" className="text-sm font-semibold text-ink" />

        {isHiddenView ? (
          <Button size="sm" variant="secondary" onClick={() => onRestore?.(item)}>
            Restaurar
          </Button>
        ) : (
          <>
            <Button size="sm" variant="secondary" onClick={() => onPay(item)}>
              Pagar
            </Button>

            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  aria-label={`Acciones de ${item.name}`}
                  className="flex size-9 items-center justify-center rounded-[var(--radius-control)] text-ink-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  <MoreHorizontal className="size-4" aria-hidden="true" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content align="end" className={menuContentClass}>
                  <DropdownMenu.Item
                    className={menuItemClass}
                    onSelect={() =>
                      onSnooze(
                        item,
                        addDays(todayInLima(), 1),
                        'Recordatorio pospuesto hasta mañana',
                      )
                    }
                  >
                    Recordar mañana
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    className={menuItemClass}
                    onSelect={() =>
                      onSnooze(
                        item,
                        addDays(todayInLima(), 3),
                        'Recordatorio pospuesto 3 días',
                      )
                    }
                  >
                    Posponer 3 días
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    className={menuItemClass}
                    onSelect={() =>
                      onSnooze(
                        item,
                        addDays(todayInLima(), 7),
                        'Recordatorio pospuesto 1 semana',
                      )
                    }
                  >
                    Posponer 1 semana
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    className={menuItemClass}
                    onSelect={() => onChooseDate(item)}
                  >
                    Elegir fecha…
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    className={`${menuItemClass} text-red hover:bg-red-soft focus:bg-red-soft`}
                    onSelect={() => onHide(item)}
                  >
                    Ocultar
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </>
        )}
      </div>
    </li>
  );
}
