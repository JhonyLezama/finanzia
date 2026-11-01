import { Chip } from '@/components/ui/Chip';
import { Money } from '@/components/ui/Money';
import { formatDateShort } from '@/domain/dates';
import type { Category } from '@/domain/models';
import { TransactionActions } from './TransactionActions';
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
    <tr className="border-b border-line hover:bg-surface-2 transition-colors">
      <td className="px-4 py-3 text-sm text-ink-muted whitespace-nowrap">
        {formatDateShort(transaction.date)}
      </td>
      <td className="px-4 py-3">
        <div className="break-words font-medium text-ink">{transaction.description}</div>
        {transaction.note ? (
          <div className="line-clamp-1 break-words text-xs text-ink-muted">{transaction.note}</div>
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
          <TransactionActions
            transaction={transaction}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ) : null}
      </td>
    </tr>
  );
}
