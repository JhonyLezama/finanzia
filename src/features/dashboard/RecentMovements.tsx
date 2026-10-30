import { Link } from 'react-router';
import { Card } from '@/components/ui/Card';
import { Money } from '@/components/ui/Money';
import { formatDateShort } from '@/domain/dates';
import type { Category, Transaction } from '@/domain/models';

export interface RecentMovementsProps {
  transactions: Transaction[];
  categories: Category[];
}

export function RecentMovements({ transactions, categories }: RecentMovementsProps) {
  const categoryById = new Map(categories.map((category) => [category.id, category]));

  return (
    <Card className="space-y-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">Últimos movimientos</h2>
          <p className="text-xs text-ink-muted">Los cinco registros más recientes.</p>
        </div>
        <Link to="/movimientos" className="text-sm font-medium text-primary hover:underline">
          Ver todos
        </Link>
      </div>

      {transactions.length === 0 ? (
        <p className="py-2 text-sm text-ink-muted">Todavía no registraste movimientos.</p>
      ) : (
        <ul className="divide-y divide-line">
          {transactions.map((transaction) => {
            const category = transaction.categoryId
              ? categoryById.get(transaction.categoryId)
              : undefined;

            return (
              <li
                key={transaction.id}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">
                    {transaction.description}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {formatDateShort(transaction.date)}
                    {category ? ` · ${category.name}` : ''}
                  </p>
                </div>
                <p
                  className={`shrink-0 text-sm font-semibold ${
                    transaction.direction === 'in' ? 'text-primary' : 'text-ink'
                  }`}
                >
                  <Money
                    cents={transaction.amountCents}
                    direction={transaction.direction}
                    signed={transaction.direction === 'in'}
                  />
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
