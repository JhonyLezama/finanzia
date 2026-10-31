import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Money } from '@/components/ui/Money';
import { Select } from '@/components/ui/Select';
import { addMonths, formatMonthLong } from '@/domain/dates';
import type { Category, MonthKey } from '@/domain/models';
import type { TransactionTypeFilter } from './useTransactions';

export interface TransactionFiltersProps {
  month: MonthKey;
  onMonthChange: (month: MonthKey) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  typeFilter: TransactionTypeFilter;
  onTypeChange: (tipo: TransactionTypeFilter) => void;
  categoryFilter: string;
  onCategoryChange: (cat: string) => void;
  categories: Category[];
  totalIncomeCents: number;
  totalExpenseCents: number;
  netSavingsCents: number;
  closingBalanceCents: number;
}

export function TransactionFilters({
  month,
  onMonthChange,
  searchQuery,
  onSearchChange,
  typeFilter,
  onTypeChange,
  categoryFilter,
  onCategoryChange,
  categories,
  totalIncomeCents,
  totalExpenseCents,
  netSavingsCents,
  closingBalanceCents,
}: TransactionFiltersProps) {
  const prevMonth = addMonths(month, -1);
  const nextMonth = addMonths(month, 1);

  return (
    <div className="space-y-4">
      {/* Month switcher & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 rounded-[var(--radius-control)] border border-line bg-surface p-1">
          <Button
            variant="ghost"
            size="sm"
            aria-label="Mes anterior"
            onClick={() => onMonthChange(prevMonth)}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </Button>
          <span className="min-w-32 text-center text-sm font-semibold capitalize text-ink">
            {formatMonthLong(month)}
          </span>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Mes siguiente"
            onClick={() => onMonthChange(nextMonth)}
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por descripción..."
            className="pl-9"
            aria-label="Buscar movimientos"
          />
        </div>
      </div>

      {/* Type & Category filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-[var(--radius-control)] border border-line bg-surface p-0.5">
          {(
            [
              { key: 'all', label: 'Todos' },
              { key: 'expense', label: 'Gastos' },
              { key: 'income', label: 'Ingresos' },
              { key: 'goal', label: 'Metas' },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => onTypeChange(t.key)}
              className={`rounded px-3 py-1.5 text-xs font-medium transition ${
                typeFilter === t.key
                  ? 'bg-primary text-primary-ink'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-44">
          <Select
            value={categoryFilter}
            onChange={(e) => onCategoryChange(e.target.value)}
            aria-label="Filtrar por categoría"
          >
            <option value="all">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3">
          <p className="text-xs text-ink-muted font-medium">Ingresos del mes</p>
          <p className="mt-1 text-base font-semibold text-primary">
            <Money cents={totalIncomeCents} />
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-ink-muted font-medium">Gastos del mes</p>
          <p className="mt-1 text-base font-semibold text-ink">
            <Money cents={totalExpenseCents} />
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-ink-muted font-medium">
            {netSavingsCents < 0 ? 'Déficit del mes' : 'Ahorro neto'}
          </p>
          <p className="mt-1 text-base font-semibold text-ink">
            <Money cents={Math.abs(netSavingsCents)} />
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-ink-muted font-medium">Saldo al cierre</p>
          <p className="mt-1 text-base font-semibold text-ink">
            <Money cents={Math.abs(closingBalanceCents)} />
          </p>
        </Card>
      </div>
    </div>
  );
}
