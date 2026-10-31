import { CheckCircle2, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { Category, PlanItem } from '@/domain/models';
import type { ReminderBuckets } from '@/domain/reminders';
import { ReminderItem, type ReminderItemProps } from './ReminderItem';

export interface ReminderPanelProps {
  buckets: ReminderBuckets | null;
  isLoading: boolean;
  categories: Category[];
  onPay: (item: PlanItem) => void;
  onNavigate: () => void;
  onSnooze: ReminderItemProps['onSnooze'];
  onChooseDate: ReminderItemProps['onChooseDate'];
  onHide: ReminderItemProps['onHide'];
  onRestore: (item: PlanItem) => void;
  showHidden: boolean;
  onToggleHidden: () => void;
  onCreate: () => void;
}

export function ReminderPanel({
  buckets,
  isLoading,
  categories,
  onPay,
  onNavigate,
  onSnooze,
  onChooseDate,
  onHide,
  onRestore,
  showHidden,
  onToggleHidden,
  onCreate,
}: ReminderPanelProps) {
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  if (isLoading) {
    return (
      <section aria-label="Pendientes" className="p-6 text-center text-sm text-ink-muted">
        Cargando…
      </section>
    );
  }

  const due = buckets?.due ?? [];
  const upcoming = buckets?.upcoming ?? [];
  const hidden = buckets?.hidden ?? [];
  const isEmpty = due.length === 0 && upcoming.length === 0;

  return (
    <section aria-label="Pendientes" className="flex flex-col">
      <div className="border-b border-line px-4 py-3">
        <h2 className="font-display text-base font-semibold text-ink">Pendientes</h2>
        <p className="text-xs text-ink-muted">Pagos fijos vencidos o para hoy</p>
      </div>

      <div className="max-h-[60vh] overflow-y-auto">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-2">
            <CheckCircle2 className="size-8 text-primary" aria-hidden="true" />
            <p className="text-sm font-medium text-ink">Todo al día</p>
            <p className="text-xs text-ink-muted">No tenés pagos fijos vencidos ni próximos en 7 días.</p>
          </div>
        ) : null}

        {due.length > 0 ? (
          <div>
            <div className="bg-surface-2/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Vencidos y de hoy ({due.length})
            </div>
            <ul aria-label="Vencidos y de hoy" className="divide-y divide-line/40">
              {due.map((reminder) => (
                <ReminderItem
                  key={reminder.item.id}
                  reminder={reminder}
                  category={categoryMap.get(reminder.item.categoryId)}
                  onPay={onPay}
                  onNavigate={onNavigate}
                  onSnooze={onSnooze}
                  onChooseDate={onChooseDate}
                  onHide={onHide}
                />
              ))}
            </ul>
          </div>
        ) : null}

        {upcoming.length > 0 ? (
          <div>
            <div className="bg-surface-2/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Próximos 7 días ({upcoming.length})
            </div>
            <ul aria-label="Próximos 7 días" className="divide-y divide-line/40">
              {upcoming.map((reminder) => (
                <ReminderItem
                  key={reminder.item.id}
                  reminder={reminder}
                  category={categoryMap.get(reminder.item.categoryId)}
                  onPay={onPay}
                  onNavigate={onNavigate}
                  onSnooze={onSnooze}
                  onChooseDate={onChooseDate}
                  onHide={onHide}
                />
              ))}
            </ul>
          </div>
        ) : null}

        {hidden.length > 0 ? (
          <div className="border-t border-line/60">
            <button
              type="button"
              onClick={onToggleHidden}
              className="flex w-full items-center justify-between px-4 py-2 text-xs font-medium text-ink-muted hover:bg-surface-2"
            >
              <span>Ver pospuestos y ocultos ({hidden.length})</span>
              {showHidden ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
            </button>

            {showHidden ? (
              <ul aria-label="Pospuestos y ocultos" className="divide-y divide-line/40 bg-surface-2/20">
                {hidden.map((reminder) => (
                  <ReminderItem
                    key={reminder.item.id}
                    reminder={reminder}
                    category={categoryMap.get(reminder.item.categoryId)}
                    onPay={onPay}
                    onNavigate={onNavigate}
                    onSnooze={onSnooze}
                    onChooseDate={onChooseDate}
                    onHide={onHide}
                    onRestore={onRestore}
                    isHiddenView
                  />
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="border-t border-line p-3">
        <Button variant="secondary" className="w-full justify-center" onClick={onCreate}>
          <Plus className="mr-1.5 size-4" />
          Nuevo recordatorio
        </Button>
      </div>
    </section>
  );
}
