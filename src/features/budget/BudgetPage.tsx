import { ChevronLeft, ChevronRight, Copy, Lock, Unlock } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { addMonths, formatMonthLong } from '@/domain/dates';
import type { PlanItem } from '@/domain/models';
import { CloseMonthDialog } from './CloseMonthDialog';
import { CopyMonthDialog } from './CopyMonthDialog';
import { FixedSection } from './FixedSection';
import { IncomeSection } from './IncomeSection';
import { PayItemDialog } from './PayItemDialog';
import { PlanSummary } from './PlanSummary';
import { SavingsSection } from './SavingsSection';
import { useBudget } from './useBudget';
import { VariableSection } from './VariableSection';
import type { PayItemInput } from '@/db/repositories/plans';

export default function BudgetPage() {
  const {
    month,
    setMonth,
    plan,
    incomeItems,
    fixedItems,
    variableCategories,
    transactions,
    snapshot,
    isClosed,
    dailyAllowance,
    payFixed,
    receiveIncome,
    skipItem,
    updateVariableBudget,
    updateSavingsTarget,
    copyFromPrevious,
    closeMonth,
    reopenMonth,
  } = useBudget();

  const [payDialogItem, setPayDialogItem] = useState<PlanItem | null>(null);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);

  const prevMonth = addMonths(month, -1);
  const nextMonth = addMonths(month, 1);

  const handlePayConfirm = async (input: PayItemInput) => {
    if (!payDialogItem) return;
    if (payDialogItem.kind === 'fixed_expense') {
      await payFixed(payDialogItem.id, input);
    } else {
      await receiveIncome(payDialogItem.id, input);
    }
  };

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink">
            Presupuesto
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Planificá ingresos, compromisos fijos, gastos variables y ahorro del mes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isClosed ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCopyDialogOpen(true)}
            >
              <Copy className="size-4 mr-1.5" aria-hidden="true" />
              Copiar mes anterior
            </Button>
          ) : null}

          <Button
            variant={isClosed ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setCloseDialogOpen(true)}
          >
            {isClosed ? (
              <>
                <Unlock className="size-4 mr-1.5" aria-hidden="true" />
                Reabrir mes
              </>
            ) : (
              <>
                <Lock className="size-4 mr-1.5" aria-hidden="true" />
                Cerrar mes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Month Navigator */}
      <div className="flex items-center justify-between border-b border-line pb-4">
        <div className="inline-flex items-center gap-1 rounded-[var(--radius-control)] border border-line bg-surface p-1">
          <Button
            variant="ghost"
            size="sm"
            aria-label="Mes anterior"
            onClick={() => setMonth(prevMonth)}
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
            onClick={() => setMonth(nextMonth)}
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
        </div>

        {isClosed ? (
          <div className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-3 py-1 text-xs font-semibold text-ink">
            <Lock className="size-3 text-ink-muted" aria-hidden="true" />
            Mes cerrado
          </div>
        ) : null}
      </div>

      {/* Plan Summary */}
      <PlanSummary snapshot={snapshot} dailyAllowance={dailyAllowance} />

      {/* Sections */}
      <IncomeSection
        items={incomeItems}
        isClosed={isClosed}
        onReceive={(item) => setPayDialogItem(item)}
      />

      <FixedSection
        items={fixedItems}
        isClosed={isClosed}
        onPay={(item) => setPayDialogItem(item)}
        onSkip={(item) => skipItem(item.id)}
      />

      <VariableSection
        categories={variableCategories}
        plan={plan}
        transactions={transactions}
        isClosed={isClosed}
        onUpdateBudget={updateVariableBudget}
      />

      <SavingsSection
        plan={plan}
        snapshot={snapshot}
        isClosed={isClosed}
        onUpdateTarget={updateSavingsTarget}
      />

      {/* Dialogs */}
      <PayItemDialog
        open={Boolean(payDialogItem)}
        onOpenChange={(open) => {
          if (!open) setPayDialogItem(null);
        }}
        item={payDialogItem}
        onConfirm={handlePayConfirm}
      />

      <CopyMonthDialog
        open={copyDialogOpen}
        onOpenChange={setCopyDialogOpen}
        onConfirm={async () => {
          await copyFromPrevious();
        }}
      />

      <CloseMonthDialog
        open={closeDialogOpen}
        onOpenChange={setCloseDialogOpen}
        isClosed={isClosed}
        onCloseMonth={async () => {
          await closeMonth();
        }}
        onReopenMonth={async () => {
          await reopenMonth();
        }}
      />
    </section>
  );
}
