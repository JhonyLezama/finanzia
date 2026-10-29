import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { db } from '@/db/db';
import { transactionRepo, type TransactionInput } from '@/db/repositories/transactions';
import { currentMonth } from '@/domain/dates';
import type { Category, Cents, MonthKey, Transaction, UUID } from '@/domain/models';

export interface TransactionWithBalance extends Transaction {
  runningBalanceCents: number;
}

export type TransactionTypeFilter = 'all' | 'expense' | 'income' | 'goal';

export function useTransactions() {
  const [searchParams, setSearchParams] = useSearchParams();

  const month = (searchParams.get('mes') as MonthKey) || currentMonth();
  const searchQuery = searchParams.get('q') ?? '';
  const typeFilter = (searchParams.get('tipo') as TransactionTypeFilter) || 'all';
  const categoryFilter = searchParams.get('categoria') || 'all';

  const setMonth = useCallback(
    (nextMonth: MonthKey) => {
      setSearchParams((params) => {
        const next = new URLSearchParams(params);
        next.set('mes', nextMonth);
        return next;
      });
    },
    [setSearchParams],
  );

  const setSearchQuery = useCallback(
    (q: string) => {
      setSearchParams((params) => {
        const next = new URLSearchParams(params);
        if (q.trim()) {
          next.set('q', q.trim());
        } else {
          next.delete('q');
        }
        return next;
      });
    },
    [setSearchParams],
  );

  const setTypeFilter = useCallback(
    (tipo: TransactionTypeFilter) => {
      setSearchParams((params) => {
        const next = new URLSearchParams(params);
        if (tipo === 'all') {
          next.delete('tipo');
        } else {
          next.set('tipo', tipo);
        }
        return next;
      });
    },
    [setSearchParams],
  );

  const setCategoryFilter = useCallback(
    (categoria: string) => {
      setSearchParams((params) => {
        const next = new URLSearchParams(params);
        if (categoria === 'all') {
          next.delete('categoria');
        } else {
          next.set('categoria', categoria);
        }
        return next;
      });
    },
    [setSearchParams],
  );

  const data = useLiveQuery(
    async () => {
      const [allTransactions, allCategories, plan] = await Promise.all([
        db.transactions.toArray(),
        db.categories.toArray(),
        db.plans.get(month),
      ]);

      const activeTransactions = allTransactions.filter((tx) => !tx.deleted);
      const isClosed = plan?.status === 'closed';

      const monthStart = `${month}-01`;
      const monthEnd = `${month}-31`;

      let running = 0;
      for (const tx of activeTransactions) {
        if (tx.date < monthStart) {
          running += tx.direction === 'in' ? tx.amountCents : -tx.amountCents;
        }
      }

      const startingBalanceCents = running;

      const inMonth = activeTransactions
        .filter((tx) => tx.date >= monthStart && tx.date <= monthEnd)
        .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));

      let currentRunning = startingBalanceCents;
      const withBalances: TransactionWithBalance[] = inMonth.map((tx) => {
        currentRunning += tx.direction === 'in' ? tx.amountCents : -tx.amountCents;
        return {
          ...tx,
          runningBalanceCents: currentRunning,
        };
      });

      let totalIncomeCents = 0;
      let totalExpenseCents = 0;

      for (const tx of inMonth) {
        if (tx.direction === 'in') {
          totalIncomeCents += tx.amountCents;
        } else {
          totalExpenseCents += tx.amountCents;
        }
      }

      return {
        categories: allCategories,
        transactions: withBalances,
        startingBalanceCents,
        closingBalanceCents: currentRunning,
        totalIncomeCents: totalIncomeCents as Cents,
        totalExpenseCents: totalExpenseCents as Cents,
        netSavingsCents: totalIncomeCents - totalExpenseCents,
        isClosed,
      };
    },
    [month],
    {
      categories: [],
      transactions: [],
      startingBalanceCents: 0,
      closingBalanceCents: 0,
      totalIncomeCents: 0 as Cents,
      totalExpenseCents: 0 as Cents,
      netSavingsCents: 0,
      isClosed: false,
    },
  );

  const categoryMap = useMemo(() => {
    const map = new Map<UUID, Category>();
    for (const cat of data.categories) {
      map.set(cat.id, cat);
    }
    return map;
  }, [data.categories]);

  const filteredTransactions = useMemo(() => {
    let list = data.transactions;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (tx) =>
          tx.description.toLowerCase().includes(q) ||
          (tx.note && tx.note.toLowerCase().includes(q)),
      );
    }

    if (typeFilter !== 'all') {
      if (typeFilter === 'expense') {
        list = list.filter((tx) => tx.type === 'expense');
      } else if (typeFilter === 'income') {
        list = list.filter((tx) => tx.type === 'income');
      } else if (typeFilter === 'goal') {
        list = list.filter((tx) => tx.type === 'goal_deposit' || tx.type === 'goal_withdraw');
      }
    }

    if (categoryFilter !== 'all') {
      list = list.filter((tx) => tx.categoryId === categoryFilter);
    }

    return [...list].reverse();
  }, [data.transactions, searchQuery, typeFilter, categoryFilter]);

  const deleteWithUndo = useCallback(
    async (transaction: Transaction) => {
      await transactionRepo.softDelete(transaction.id, {
        expectedUpdatedAt: transaction.updatedAt,
      });

      toast(`Movimiento eliminado: ${transaction.description}`, {
        action: {
          label: 'Deshacer',
          onClick: () => {
            void transactionRepo.restore(transaction.id);
          },
        },
        duration: 5000,
      });
    },
    [],
  );

  const createTransaction = useCallback(async (input: TransactionInput) => {
    return transactionRepo.create(input);
  }, []);

  const updateTransaction = useCallback(
    async (id: UUID, patch: Partial<TransactionInput>, expectedUpdatedAt: string) => {
      return transactionRepo.update(id, patch, { expectedUpdatedAt });
    },
    [],
  );

  return {
    month,
    setMonth,
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    categoryFilter,
    setCategoryFilter,
    categories: data.categories,
    categoryMap,
    transactions: filteredTransactions,
    totalCount: data.transactions.length,
    startingBalanceCents: data.startingBalanceCents,
    closingBalanceCents: data.closingBalanceCents,
    totalIncomeCents: data.totalIncomeCents,
    totalExpenseCents: data.totalExpenseCents,
    netSavingsCents: data.netSavingsCents,
    isClosed: data.isClosed,
    createTransaction,
    updateTransaction,
    deleteWithUndo,
  };
}
