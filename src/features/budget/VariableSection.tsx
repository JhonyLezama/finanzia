import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Money } from '@/components/ui/Money';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { asCents } from '@/domain/money';
import type { Category, Cents, MonthlyPlan, Transaction, UUID } from '@/domain/models';

export interface VariableSectionProps {
  categories: Category[];
  plan: MonthlyPlan | null;
  transactions: Transaction[];
  isClosed?: boolean;
  onUpdateBudget: (categoryId: UUID, plannedCents: Cents) => Promise<void>;
}

interface CategoryRowProps {
  category: Category;
  plannedCents: number;
  spentCents: number;
  isClosed?: boolean;
  onUpdateBudget: (categoryId: UUID, plannedCents: Cents) => Promise<void>;
}

function CategoryRow({
  category,
  plannedCents,
  spentCents,
  isClosed = false,
  onUpdateBudget,
}: CategoryRowProps) {
  const [value, setValue] = useState(() => (plannedCents > 0 ? (plannedCents / 100).toString() : ''));

  const handleBlur = async () => {
    const num = parseFloat(value);
    const cents = Number.isNaN(num) || num < 0 ? 0 : Math.round(num * 100);
    if (cents !== plannedCents) {
      await onUpdateBudget(category.id, asCents(cents));
    }
  };

  const remaining = plannedCents - spentCents;
  const pct = plannedCents > 0 ? Math.round((spentCents / plannedCents) * 100) : spentCents > 0 ? 100 : 0;
  const tone = pct > 100 ? 'bad' : pct >= 80 ? 'warn' : 'ok';

  return (
    <div className="py-3 space-y-2 first:pt-1 last:pb-1">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex-1">
          <p className="font-medium text-sm text-ink">{category.name}</p>
          <div className="flex items-center gap-2 text-xs text-ink-muted">
            <span>Gastado: <Money cents={spentCents} /></span>
            <span>·</span>
            <span>
              {remaining >= 0 ? 'Disponible: ' : 'Excedido: '}
              <Money cents={Math.abs(remaining)} className={remaining < 0 ? 'text-red' : ''} />
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor={`budget-${category.id}`} className="sr-only">
            {`Presupuesto de ${category.name.toLowerCase()}`}
          </label>
          <div className="w-32">
            <Input
              id={`budget-${category.id}`}
              inputMode="decimal"
              placeholder="0"
              value={value}
              disabled={isClosed}
              aria-label={`Presupuesto de ${category.name.toLowerCase()}`}
              onChange={(e) => setValue(e.target.value)}
              onBlur={handleBlur}
              className="text-right h-9"
            />
          </div>
        </div>
      </div>

      {plannedCents > 0 ? <ProgressBar value={pct} tone={tone} /> : null}
    </div>
  );
}

export function VariableSection({
  categories,
  plan,
  transactions = [],
  isClosed = false,
  onUpdateBudget,
}: VariableSectionProps) {
  const budgets = plan?.variableBudgets ?? [];
  const monthKey = plan?.id;

  const categorySpentMap = new Map<UUID, number>();
  for (const tx of transactions) {
    if (
      !tx.deleted &&
      tx.type === 'expense' &&
      tx.categoryId &&
      (!monthKey || tx.date.startsWith(`${monthKey}-`))
    ) {
      const prev = categorySpentMap.get(tx.categoryId) ?? 0;
      categorySpentMap.set(tx.categoryId, prev + tx.amountCents);
    }
  }

  const totalPlanned = budgets.reduce((sum, b) => sum + b.plannedCents, 0);
  const totalSpent = categories.reduce((sum, c) => sum + (categorySpentMap.get(c.id) ?? 0), 0);

  return (
    <Card className="p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-line pb-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">Gastos variables</h2>
          <p className="text-xs text-ink-muted">Presupuestos por categoría para el día a día</p>
        </div>
        <div className="text-sm">
          <span className="text-ink-muted">Gastado: </span>
          <span className="font-semibold text-ink">
            <Money cents={totalSpent} />
          </span>
          <span className="text-ink-muted"> de </span>
          <span className="font-medium text-ink">
            <Money cents={totalPlanned} />
          </span>
        </div>
      </div>

      <div className="divide-y divide-line">
        {categories.map((cat) => {
          const planned = budgets.find((b) => b.categoryId === cat.id)?.plannedCents ?? 0;
          const spent = categorySpentMap.get(cat.id) ?? 0;

          return (
            <CategoryRow
              key={cat.id}
              category={cat}
              plannedCents={planned}
              spentCents={spent}
              isClosed={isClosed}
              onUpdateBudget={onUpdateBudget}
            />
          );
        })}
      </div>
    </Card>
  );
}
