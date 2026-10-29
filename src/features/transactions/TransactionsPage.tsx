import { useState } from 'react';
import { Toaster } from 'sonner';
import { QuickAdd } from './QuickAdd';
import { TransactionDrawer } from './TransactionDrawer';
import { TransactionFilters } from './TransactionFilters';
import { TransactionList } from './TransactionList';
import { useTransactions, type TransactionWithBalance } from './useTransactions';
import type { TransactionInput } from '@/db/repositories/transactions';

export default function TransactionsPage() {
  const {
    month,
    setMonth,
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    categoryFilter,
    setCategoryFilter,
    categories,
    categoryMap,
    transactions,
    totalIncomeCents,
    totalExpenseCents,
    netSavingsCents,
    closingBalanceCents,
    isClosed,
    createTransaction,
    updateTransaction,
    deleteWithUndo,
  } = useTransactions();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithBalance | null>(null);

  const handleOpenNew = () => {
    setEditingTransaction(null);
    setDrawerOpen(true);
  };

  const handleEdit = (tx: TransactionWithBalance) => {
    setEditingTransaction(tx);
    setDrawerOpen(true);
  };

  const handleSubmit = async (input: TransactionInput) => {
    if (editingTransaction) {
      await updateTransaction(
        editingTransaction.id,
        input,
        editingTransaction.updatedAt,
      );
    } else {
      await createTransaction(input);
    }
  };

  return (
    <section className="space-y-6">
      <Toaster position="bottom-right" richColors />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink">
            Movimientos
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Registrá y revisá cada ingreso y gasto, con filtros por mes, tipo y categoría.
          </p>
        </div>

        <div>
          <QuickAdd isClosed={isClosed} onOpen={handleOpenNew} />
        </div>
      </div>

      {isClosed ? (
        <div className="rounded-lg border border-line bg-surface-2 p-3 text-sm text-ink-muted">
          Este mes está cerrado y se muestra en modo solo lectura.
        </div>
      ) : null}

      {/* Filters & KPI summary */}
      <TransactionFilters
        month={month}
        onMonthChange={setMonth}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        typeFilter={typeFilter}
        onTypeChange={setTypeFilter}
        categoryFilter={categoryFilter}
        onCategoryChange={setCategoryFilter}
        categories={categories}
        totalIncomeCents={totalIncomeCents}
        totalExpenseCents={totalExpenseCents}
        netSavingsCents={netSavingsCents}
        closingBalanceCents={closingBalanceCents}
      />

      {/* List */}
      <TransactionList
        transactions={transactions}
        categoryMap={categoryMap}
        isClosed={isClosed}
        onEdit={handleEdit}
        onDelete={deleteWithUndo}
      />

      {/* Drawer */}
      <TransactionDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        categories={categories}
        initialTransaction={editingTransaction}
        onSubmit={handleSubmit}
      />
    </section>
  );
}
