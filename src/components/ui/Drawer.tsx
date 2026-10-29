import { X } from 'lucide-react';
import { Dialog as RadixDialog } from 'radix-ui';
import type { ReactNode } from 'react';

export interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
}

export function Drawer({ open, onOpenChange, title, description, children, footer }: DrawerProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/45 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <RadixDialog.Content className="fixed inset-y-0 right-0 z-50 flex w-[min(100vw,28rem)] flex-col overflow-y-auto border-l border-line bg-surface p-5 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <RadixDialog.Title className="font-display text-xl font-semibold text-ink">
                {title}
              </RadixDialog.Title>
              {description ? (
                <RadixDialog.Description className="mt-1 text-sm text-ink-muted">
                  {description}
                </RadixDialog.Description>
              ) : (
                <RadixDialog.Description className="sr-only">{title}</RadixDialog.Description>
              )}
            </div>
            <RadixDialog.Close
              aria-label="Cerrar"
              className="flex size-11 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <X className="size-5" aria-hidden="true" />
            </RadixDialog.Close>
          </div>
          <div className="mt-5 flex-1">{children}</div>
          {footer ? <div className="mt-6 flex justify-end gap-2">{footer}</div> : null}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
