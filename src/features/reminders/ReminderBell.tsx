import { Bell } from 'lucide-react';
import { Popover } from 'radix-ui';
import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { categoryRepo } from '@/db/repositories/categories';
import { addDays, todayInLima } from '@/domain/dates';
import { formatDayMonth } from '@/domain/reminders';
import type { ISODate, PlanItem } from '@/domain/models';
import { PayItemDialog } from '@/features/budget/PayItemDialog';
import { ReminderDialog } from './ReminderDialog';
import { ReminderPanel } from './ReminderPanel';
import { useReminders } from './useReminders';

export function ReminderBell() {
  const { buckets, isLoading, pay, snooze, hide, restore, create } = useReminders();
  const [open, setOpen] = useState(false);
  const [payItem, setPayItem] = useState<PlanItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [showHidden, setShowHidden] = useState(false);

  const [snoozeTarget, setSnoozeTarget] = useState<PlanItem | null>(null);
  const [snoozeDate, setSnoozeDate] = useState<ISODate>(() => addDays(todayInLima(), 1));

  const bellRef = useRef<HTMLButtonElement>(null);
  const categories = useLiveQuery(() => categoryRepo.list(), []) ?? [];

  const count = buckets?.badgeCount ?? 0;

  const handlePay = (item: PlanItem) => {
    setOpen(false);
    setPayItem(item);
  };

  const handleChooseDate = (item: PlanItem) => {
    setOpen(false);
    setSnoozeDate(addDays(todayInLima(), 1));
    setSnoozeTarget(item);
  };

  const handleConfirmSnooze = async () => {
    if (!snoozeTarget) {
      return;
    }
    await snooze(
      snoozeTarget,
      snoozeDate,
      `Recordatorio pospuesto hasta el ${formatDayMonth(snoozeDate)}`,
    );
    setSnoozeTarget(null);
    bellRef.current?.focus();
  };

  return (
    <>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            ref={bellRef}
            type="button"
            aria-haspopup="dialog"
            aria-label={count > 0 ? `Pendientes: ${count}` : 'Pendientes'}
            className="relative inline-flex size-11 items-center justify-center rounded-full text-ink-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <Bell className="size-5" aria-hidden="true" />
            {!isLoading && count > 0 ? (
              <span
                aria-hidden="true"
                className="absolute right-2 top-2 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-ink"
              >
                {count > 9 ? '9+' : count}
              </span>
            ) : null}
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            role="dialog"
            align="end"
            sideOffset={8}
            collisionPadding={16}
            aria-label="Pendientes"
            className="z-50 w-[min(92vw,22rem)] max-h-[70dvh] overflow-y-auto rounded-[var(--radius-modal)] border border-line-strong bg-surface shadow-pop animate-in fade-in-0 zoom-in-95"
          >
            <ReminderPanel
              buckets={buckets}
              isLoading={isLoading}
              categories={categories}
              onPay={handlePay}
              onNavigate={() => setOpen(false)}
              onSnooze={(item, until, message) => void snooze(item, until, message)}
              onChooseDate={handleChooseDate}
              onHide={(item) => void hide(item)}
              onRestore={(item) => void restore(item)}
              showHidden={showHidden}
              onToggleHidden={() => setShowHidden((prev) => !prev)}
              onCreate={() => {
                setOpen(false);
                setCreateOpen(true);
              }}
            />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <PayItemDialog
        open={payItem !== null}
        onOpenChange={(next) => {
          if (!next) {
            setPayItem(null);
            bellRef.current?.focus();
          }
        }}
        item={payItem}
        onConfirm={async (input) => {
          if (payItem) {
            await pay(payItem, input);
          }
        }}
      />

      <ReminderDialog
        open={createOpen}
        onOpenChange={(next) => {
          setCreateOpen(next);
          if (!next) {
            bellRef.current?.focus();
          }
        }}
        onCreate={async (input) => {
          await create(input);
        }}
      />

      <Dialog
        open={snoozeTarget !== null}
        onOpenChange={(next) => {
          if (!next) {
            setSnoozeTarget(null);
            bellRef.current?.focus();
          }
        }}
        title="Posponer recordatorio"
        description="Elegí la fecha en la que querés que vuelva a aparecer este recordatorio."
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="snooze-custom-date" className="mb-1 block text-sm font-medium text-ink">
              Fecha
            </label>
            <Input
              id="snooze-custom-date"
              type="date"
              min={addDays(todayInLima(), 1)}
              value={snoozeDate}
              onChange={(e) => setSnoozeDate(e.target.value as ISODate)}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setSnoozeTarget(null);
                bellRef.current?.focus();
              }}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={() => void handleConfirmSnooze()}>
              Posponer
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
