import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { DropdownMenu } from 'radix-ui';
import type { TransactionWithBalance } from './useTransactions';

export interface TransactionActionsProps {
  transaction: TransactionWithBalance;
  onEdit: (transaction: TransactionWithBalance) => void;
  onDelete: (transaction: TransactionWithBalance) => void;
}

export function TransactionActions({
  transaction,
  onEdit,
  onDelete,
}: TransactionActionsProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={`Acciones de ${transaction.description}`}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <MoreHorizontal className="size-4" aria-hidden="true" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          className="z-50 min-w-36 rounded-[var(--radius-control)] border border-line bg-surface p-1 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out"
        >
          <DropdownMenu.Item
            onSelect={() => onEdit(transaction)}
            className="flex cursor-pointer items-center gap-2 rounded px-2.5 py-1.5 text-sm text-ink outline-none hover:bg-surface-2 focus:bg-surface-2"
          >
            <Pencil className="size-4 text-ink-muted" aria-hidden="true" />
            Editar
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={() => onDelete(transaction)}
            className="flex cursor-pointer items-center gap-2 rounded px-2.5 py-1.5 text-sm text-red outline-none hover:bg-red-soft focus:bg-red-soft"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Eliminar
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
