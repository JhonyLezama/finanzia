import { Plus, Target, TrendingUp, Trophy } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Money } from '@/components/ui/Money';
import { ProgressBar } from '@/components/ui/ProgressBar';
import type { Goal } from '@/domain/models';
import { ContributeDialog } from './ContributeDialog';
import { GoalCard } from './GoalCard';
import { GoalDetail } from './GoalDetail';
import { GoalDialog } from './GoalDialog';
import { useGoals, type GoalWithSummary } from './useGoals';
import { WithdrawDialog } from './WithdrawDialog';

export default function GoalsPage() {
  const {
    goals,
    totalSavedCents,
    totalTargetCents,
    totalProgress,
    createGoal,
    contribute,
    withdraw,
    archiveGoal,
  } = useGoals();

  const [newGoalOpen, setNewGoalOpen] = useState(false);
  const [contributeGoal, setContributeGoal] = useState<Goal | null>(null);
  const [withdrawGoal, setWithdrawGoal] = useState<{ goal: Goal; balanceCents: number } | null>(null);
  const [detailItem, setDetailItem] = useState<GoalWithSummary | null>(null);

  const globalPct = Math.min(100, Math.round(totalProgress * 100));

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink">
            Metas de ahorro
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Separá dinero de verdad para tus objetivos y hacé un seguimiento claro de tu progreso.
          </p>
        </div>

        <Button variant="primary" onClick={() => setNewGoalOpen(true)}>
          <Plus className="size-4 mr-1.5" />
          Nueva meta
        </Button>
      </div>

      {/* Summary KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4 flex items-center gap-3">
          <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Trophy className="size-5" />
          </div>
          <div>
            <p className="text-xs text-ink-muted font-medium">Total ahorrado</p>
            <p className="text-lg font-semibold text-primary">
              <Money cents={totalSavedCents} />
            </p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="size-10 rounded-full bg-surface-2 text-ink flex items-center justify-center shrink-0">
            <Target className="size-5" />
          </div>
          <div>
            <p className="text-xs text-ink-muted font-medium">Objetivo global</p>
            <p className="text-lg font-semibold text-ink">
              <Money cents={totalTargetCents} />
            </p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="size-10 rounded-full bg-surface-2 text-ink flex items-center justify-center shrink-0">
            <TrendingUp className="size-5" />
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-baseline mb-1">
              <p className="text-xs text-ink-muted font-medium">Cumplimiento</p>
              <span className="text-xs font-semibold text-ink">{globalPct}%</span>
            </div>
            <ProgressBar value={globalPct} tone="ok" />
          </div>
        </Card>
      </div>

      {/* Goals Grid */}
      {goals.length === 0 ? (
        <EmptyState
          title="No tenés metas activas"
          description="Creá tu primera meta para empezar a destinar fondos a tus proyectos."
          action={
            <Button variant="primary" onClick={() => setNewGoalOpen(true)}>
              <Plus className="size-4 mr-1.5" />
              Crear primera meta
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((item) => (
            <GoalCard
              key={item.goal.id}
              item={item}
              onContribute={(g) => setContributeGoal(g)}
              onWithdraw={(g, bal) => setWithdrawGoal({ goal: g, balanceCents: bal })}
              onDetail={(it) => setDetailItem(it)}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <GoalDialog
        open={newGoalOpen}
        onOpenChange={setNewGoalOpen}
        onSubmit={async (input) => {
          await createGoal(input);
        }}
      />

      <ContributeDialog
        open={Boolean(contributeGoal)}
        onOpenChange={(open) => {
          if (!open) setContributeGoal(null);
        }}
        goal={contributeGoal}
        onConfirm={async (input) => {
          if (!contributeGoal) return;
          await contribute(contributeGoal.id, input);
        }}
      />

      <WithdrawDialog
        open={Boolean(withdrawGoal)}
        onOpenChange={(open) => {
          if (!open) setWithdrawGoal(null);
        }}
        goal={withdrawGoal?.goal ?? null}
        currentBalanceCents={withdrawGoal?.balanceCents ?? 0}
        onConfirm={async (input) => {
          if (!withdrawGoal) return;
          await withdraw(withdrawGoal.goal.id, input);
        }}
      />

      <GoalDetail
        open={Boolean(detailItem)}
        onOpenChange={(open) => {
          if (!open) setDetailItem(null);
        }}
        item={detailItem}
        onArchive={async (goalId, withdrawToAvailable) => {
          await archiveGoal(goalId, { withdrawToAvailable });
        }}
      />
    </section>
  );
}
