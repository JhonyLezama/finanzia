import { ChevronLeft, ChevronRight, Clock, Lock } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { addMonths, currentMonth, formatMonthLong } from '@/domain/dates';
import { computeBalanceAtMonthEnd, computeSavingsRate } from '@/domain/budget';
import { asCents } from '@/domain/money';
import type { PlanItem } from '@/domain/models';
import { PayItemDialog } from '@/features/budget/PayItemDialog';
import type { PayItemInput } from '@/db/repositories/plans';
import { BackupReminder } from './BackupReminder';
import { EmptyChecklist } from './EmptyChecklist';
import { GoalsPreview } from './GoalsPreview';
import { KpiRow } from './KpiRow';
import { PlanBreakdown } from './PlanBreakdown';
import { RecentMovements } from './RecentMovements';
import { UpcomingCommitments } from './UpcomingCommitments';
import { useDashboard } from './useDashboard';

export default function DashboardPage() {
  const {
    month,
    setMonth,
    plan,
    transactions,
    categories,
    snapshot,
    isClosed,
    isCurrentMonth,
    settings,
    goals,
    upcoming,
    overdue,
    recent,
    showBackupReminder,
    dismissBackupReminder,
    payFixed,
  } = useDashboard();

  const [payItem, setPayItem] = useState<PlanItem | null>(null);

  const closedSnapshot = plan?.status === 'closed' ? plan.snapshot : undefined;

  const availableCents = closedSnapshot?.availableCents ?? snapshot?.availableCents ?? asCents(0);
  const spendableCents = snapshot?.spendableCents ?? asCents(0);
  const pendingFixedCents = snapshot?.pendingFixedCents ?? asCents(0);
  const remainingSavingsCents = snapshot?.remainingSavingsCents ?? asCents(0);
  const balanceAtMonthEndCents = computeBalanceAtMonthEnd(transactions, month);

  const monthExpenseCents =
    closedSnapshot?.expenseCents ?? snapshot?.monthExpenseCents ?? asCents(0);
  const planExpenseCents =
    closedSnapshot?.planExpenseCents ?? snapshot?.planExpenseCents ?? asCents(0);
  const executionPct = closedSnapshot
    ? closedSnapshot.planExpenseCents > 0
      ? closedSnapshot.expenseCents / closedSnapshot.planExpenseCents
      : null
    : snapshot?.executionPct ?? null;
  const savingsRate = closedSnapshot
    ? computeSavingsRate(closedSnapshot.incomeCents, closedSnapshot.expenseCents)
    : snapshot?.savingsRate ?? null;
  const monthlyGoalContribCents =
    closedSnapshot?.savingsCents ?? snapshot?.monthlyGoalContribCents ?? asCents(0);
  const fixedPaidCents =
    closedSnapshot?.fixedCents ?? snapshot?.fixedExpenseCents ?? asCents(0);
  const variableCents =
    closedSnapshot?.variableCents ?? snapshot?.variableExpenseCents ?? asCents(0);
  const varianceCents = monthExpenseCents - planExpenseCents;

  const hasMovements = transactions.some((transaction) => !transaction.deleted);
  const isEmpty = !hasMovements && goals.length === 0;

  const previousMonth = addMonths(month, -1);
  const nextMonth = addMonths(month, 1);
  const canGoNext = month < currentMonth();
  const displayName = settings?.displayName?.trim();

  const handleConfirmPay = async (input: PayItemInput) => {
    if (!payItem) {
      return;
    }
    await payFixed(payItem.id, input);
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">Inicio</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {displayName ? `Hola, ${displayName}. ` : ''}Tu resumen de{' '}
            {formatMonthLong(month).toLowerCase()}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-[var(--radius-control)] border border-line bg-surface p-1">
            <Button
              variant="ghost"
              size="sm"
              aria-label="Mes anterior"
              onClick={() => setMonth(previousMonth)}
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
              disabled={!canGoNext}
              onClick={() => setMonth(nextMonth)}
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
          </div>

          {isClosed ? (
            <Chip tone="neutral" className="gap-1">
              <Lock className="size-3" aria-hidden="true" />
              Mes cerrado
            </Chip>
          ) : null}
        </div>
      </div>

      {showBackupReminder ? (
        <BackupReminder onDismiss={dismissBackupReminder} />
      ) : null}

      {overdue.length > 0 ? (
        <div
          role="status"
          className="flex items-start gap-3 rounded-[var(--radius-card)] border border-red/30 bg-red-soft p-4"
        >
          <Clock className="mt-0.5 size-5 shrink-0 text-red" aria-hidden="true" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-red">Atrasados</p>
            <ul className="space-y-1 text-xs text-ink-muted">
              {overdue.map((group) => (
                <li key={group.month}>
                  {group.count} compromiso{group.count === 1 ? '' : 's'} de{' '}
                  {formatMonthLong(group.month).toLowerCase()}.{' '}
                  <Link
                    to={`/presupuesto?mes=${group.month}`}
                    className="font-medium text-red underline underline-offset-2"
                  >
                    Revisar {formatMonthLong(group.month)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      <KpiRow
        isCurrentMonth={isCurrentMonth}
        availableCents={availableCents}
        spendableCents={spendableCents}
        pendingFixedCents={pendingFixedCents}
        remainingSavingsCents={remainingSavingsCents}
        balanceAtMonthEndCents={balanceAtMonthEndCents}
        monthExpenseCents={monthExpenseCents}
        planExpenseCents={planExpenseCents}
        executionPct={executionPct}
        savingsRate={savingsRate}
        monthlyGoalContribCents={monthlyGoalContribCents}
      />

      <PlanBreakdown
        fixedPaidCents={fixedPaidCents}
        pendingFixedCents={pendingFixedCents}
        variableCents={variableCents}
        savingsCents={monthlyGoalContribCents}
        planExpenseCents={planExpenseCents}
        monthExpenseCents={monthExpenseCents}
        varianceCents={varianceCents}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <UpcomingCommitments
          items={upcoming}
          month={month}
          isClosed={isClosed}
          onPay={setPayItem}
        />
        <GoalsPreview goals={goals.slice(0, 2)} />
      </div>

      <RecentMovements transactions={recent} categories={categories} />

      {isEmpty ? <EmptyChecklist /> : null}

      <PayItemDialog
        open={Boolean(payItem)}
        onOpenChange={(open) => {
          if (!open) setPayItem(null);
        }}
        item={payItem}
        onConfirm={handleConfirmPay}
      />
    </section>
  );
}
