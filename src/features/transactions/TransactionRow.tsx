import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { DropdownMenu } from 'radix-ui';
import { Chip } from '@/components/ui/Chip';
import { Money } from '@/components/ui/Money';
import { formatDateShort } from '@/domain/dates';
import type { Category } from '@/domain/models';
import type { TransactionWithBalance } from './useTransactions';

export interface TransactionRowProps {
  transaction: TransactionWithBalance;
  category?: Category;
  isClosed?: boolean;
  onEdit: (transaction: TransactionWithBalance) => void;
  onDelete: (transaction: TransactionWithBalance) => void;
}

export function TransactionRow({
  transaction,
  category,
  isClosed = false,
  onEdit,
  onDelete,
}: TransactionRowProps) {
  return (
    <tr className="border-b border-line hover:bg-surface-2/50 transition-colors">
      <td className="px-4 py-3 text-sm text-ink-muted whitespace-nowrap">
        {formatDateShort(transaction.date)}
      </td>
      <td className="px-4 py-3">
        <div className="font-medium text-ink">{transaction.description}</div>
        {transaction.note ? (
          <div className="text-xs text-ink-muted line-clamp-1">{transaction.note}</div>
        ) : null}
      </td>
      <td className="px-4 py-3 text-sm">
        {category ? (
          <Chip tone={category.kind === 'income' ? 'positive' : 'neutral'}>
            {category.name}
          </Chip>
        ) : (
          <span className="text-xs text-ink-muted">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-right font-medium">
        <Money
          cents={transaction.amountCents}
          direction={transaction.direction}
          className={transaction.direction === 'in' ? 'text-primary' : 'text-ink'}
        />
      </td>
      <td className="px-4 py-3 text-sm text-right text-ink-muted hidden sm:table-cell">
        <Money cents={Math.abs(transaction.runningBalanceCents)} signed={false} />
      </td>
      <td className="px-4 py-3 text-right">
        {!isClosed ? (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                aria-label={`Acciones de ${transaction.description}`}
                className="inline-flex size-9 items-center justify-center rounded-full text-ink-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
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
        ) : null}
      </td>
    </tr>
  );
}
