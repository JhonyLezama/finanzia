import { EmptyState } from '@/components/ui/EmptyState';
import type { Category, UUID } from '@/domain/models';
import { TransactionRow } from './TransactionRow';
import type { TransactionWithBalance } from './useTransactions';

export interface TransactionListProps {
  transactions: TransactionWithBalance[];
  categoryMap: Map<UUID, Category>;
  isClosed?: boolean;
  onEdit: (transaction: TransactionWithBalance) => void;
  onDelete: (transaction: TransactionWithBalance) => void;
}

export function TransactionList({
  transactions,
  categoryMap,
  isClosed = false,
  onEdit,
  onDelete,
}: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <EmptyState
        title="No hay movimientos"
        description={
          isClosed
            ? 'Este mes está cerrado y no tiene movimientos.'
            : 'Empezá registrando tu primer ingreso o gasto del mes.'
        }
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-[var(--radius-card)] border border-line bg-surface">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-line bg-surface-2/40 text-xs font-semibold text-ink-muted uppercase tracking-wider">
            <th scope="col" className="px-4 py-3">Fecha</th>
            <th scope="col" className="px-4 py-3">Descripción</th>
            <th scope="col" className="px-4 py-3">Categoría</th>
            <th scope="col" className="px-4 py-3 text-right">Monto</th>
            <th scope="col" className="px-4 py-3 text-right hidden sm:table-cell">Saldo acumulado</th>
            <th scope="col" className="px-4 py-3 text-right"><span className="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {transactions.map((tx) => (
            <TransactionRow
              key={tx.id}
              transaction={tx}
              category={tx.categoryId ? categoryMap.get(tx.categoryId) : undefined}
              isClosed={isClosed}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
