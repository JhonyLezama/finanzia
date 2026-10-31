import { Chip } from '@/components/ui/Chip';
import { Money } from '@/components/ui/Money';
import { formatDateShort } from '@/domain/dates';
import type { Category } from '@/domain/models';
import { TransactionActions } from './TransactionActions';
import type { TransactionWithBalance } from './useTransactions';

export interface TransactionCardProps {
  transaction: TransactionWithBalance;
  category?: Category;
  isClosed?: boolean;
  onEdit: (transaction: TransactionWithBalance) => void;
  onDelete: (transaction: TransactionWithBalance) => void;
}

export function TransactionCard({
  transaction,
  category,
  isClosed = false,
  onEdit,
  onDelete,
}: TransactionCardProps) {
  return (
    <li className="flex min-w-0 items-start gap-2 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
          <time dateTime={transaction.date}>{formatDateShort(transaction.date)}</time>
          {category ? (
            <Chip tone={category.kind === 'income' ? 'positive' : 'neutral'}>
              {category.name}
            </Chip>
          ) : null}
        </div>

        <p className="mt-1 truncate text-sm font-medium text-ink">{transaction.description}</p>
        {transaction.note ? (
          <p className="mt-0.5 line-clamp-1 text-xs text-ink-muted">{transaction.note}</p>
        ) : null}
        <p className="mt-1 text-xs text-ink-muted">
          Saldo{' '}
          <Money cents={Math.abs(transaction.runningBalanceCents)} signed={false} />
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <Money
          cents={transaction.amountCents}
          direction={transaction.direction}
          className={
            transaction.direction === 'in'
              ? 'text-sm font-semibold text-primary'
              : 'text-sm font-semibold text-ink'
          }
        />
        {!isClosed ? (
          <TransactionActions
            transaction={transaction}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ) : null}
      </div>
    </li>
  );
}
