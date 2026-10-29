import { computeBudgetSnapshot } from '@/domain/budget';
import { addMonths, parseMonthKey, todayInLima, toMonthKey } from '@/domain/dates';
import type {
  Cents,
  ISODate,
  MonthlyPlan,
  MonthKey,
  PlanItem,
  Transaction,
  UUID,
  VariableBudget,
} from '@/domain/models';
import { generatePlanItemsForMonth } from '@/domain/recurring';
import { monthlyPlanSchema, planItemSchema } from '@/domain/schemas';
import { ConflictError, db, nextTimestamp, nowTimestamp, type Ctx } from '../db';
import { auditRepo } from './audit';
import { transactionRepo } from './transactions';

export interface PayItemInput {
  amountCents: Cents;
  date: ISODate;
  description?: string;
}

const PLAN_TABLES = [
  db.plans,
  db.planItems,
  db.recurringRules,
  db.transactions,
  db.categories,
  db.goals,
  db.auditLog,
] as const;

function withoutUndefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as Partial<T>;
}

async function assertVariableBudgets(budgets: VariableBudget[]): Promise<void> {
  const seen = new Set<string>();

  for (const budget of budgets) {
    if (seen.has(budget.categoryId)) {
      throw new Error('El presupuesto no admite categorías duplicadas.');
    }
    seen.add(budget.categoryId);

    const category = await db.categories.get(budget.categoryId);
    if (!category || category.kind !== 'expense' || category.group !== 'variable') {
      throw new Error('Solo se pueden presupuestar categorías variables de gasto.');
    }
  }
}

async function settleItem(
  itemId: UUID,
  input: PayItemInput,
  ctx: Ctx,
  expectedKind: PlanItem['kind'],
): Promise<{ item: PlanItem; transaction: Transaction }> {
  return db.transaction('rw', PLAN_TABLES, async () => {
    const item = await db.planItems.get(itemId);
    if (!item) {
      throw new Error('El compromiso no existe.');
    }
    if (item.status === 'settled') {
      throw new Error('Este compromiso ya está liquidado.');
    }
    if (item.status === 'skipped') {
      throw new Error('Este compromiso está omitido.');
    }
    if (ctx.expectedUpdatedAt && item.updatedAt !== ctx.expectedUpdatedAt) {
      throw new ConflictError();
    }
    if (item.kind !== expectedKind) {
      throw new Error('Este compromiso no corresponde a la acción solicitada.');
    }

    const isExpense = item.kind === 'fixed_expense';
    const transaction = await transactionRepo.create({
      type: isExpense ? 'expense' : 'income',
      direction: isExpense ? 'out' : 'in',
      amountCents: input.amountCents,
      date: input.date,
      categoryId: item.categoryId,
      description: input.description?.trim() || item.name,
      planItemId: item.id,
      source: 'recurring',
    });

    const updated: PlanItem = {
      ...item,
      status: 'settled',
      transactionId: transaction.id,
      updatedAt: nextTimestamp(item.updatedAt),
    };
    await db.planItems.put(updated);

    await auditRepo.log({
      action: 'update',
      entity: 'plan_item',
      entityId: updated.id,
      summary: `Compromiso liquidado: ${updated.name}`,
      before: item,
      after: updated,
    });

    return { item: updated, transaction };
  });
}

export const planRepo = {
  async getOrCreate(month: MonthKey): Promise<MonthlyPlan> {
    const parsed = parseMonthKey(month);

    return db.transaction('rw', db.plans, async () => {
      const existing = await db.plans.get(month);
      if (existing) {
        return existing;
      }

      const now = nowTimestamp();
      const plan = monthlyPlanSchema.parse({
        id: month,
        year: parsed.year,
        month: parsed.month,
        status: 'active',
        savingsTargetCents: 0,
        variableBudgets: [],
        createdAt: now,
        updatedAt: now,
      }) as MonthlyPlan;

      await db.plans.add(plan);
      return plan;
    });
  },

  async update(month: MonthKey, patch: Partial<MonthlyPlan>, ctx: Ctx): Promise<MonthlyPlan> {
    return db.transaction('rw', [db.plans, db.categories, db.auditLog], async () => {
      const current = await db.plans.get(month);
      if (!current) {
        throw new Error('El plan no existe.');
      }
      if (current.status === 'closed') {
        throw new Error('El mes está cerrado y no admite cambios.');
      }
      if (ctx.expectedUpdatedAt && current.updatedAt !== ctx.expectedUpdatedAt) {
        throw new ConflictError();
      }

      const definedPatch = withoutUndefined(patch);
      if (definedPatch.variableBudgets) {
        await assertVariableBudgets(definedPatch.variableBudgets);
      }

      const candidate = monthlyPlanSchema.parse({
        ...current,
        ...definedPatch,
        id: current.id,
        year: current.year,
        month: current.month,
        status: current.status,
        createdAt: current.createdAt,
        updatedAt: nextTimestamp(current.updatedAt),
      }) as MonthlyPlan;

      await db.plans.put(candidate);
      await auditRepo.log({
        action: 'update',
        entity: 'plan',
        entityId: candidate.id,
        summary: `Presupuesto actualizado: ${candidate.id}`,
        before: current,
        after: candidate,
      });

      return candidate;
    });
  },

  async copyFromPrevious(month: MonthKey): Promise<MonthlyPlan> {
    return db.transaction('rw', [db.plans, db.auditLog], async () => {
      const previousMonth = addMonths(month, -1);
      const previous = await db.plans.get(previousMonth);
      const current = await planRepo.getOrCreate(month);

      if (!previous) {
        return current;
      }
      if (current.status === 'closed') {
        throw new Error('El mes está cerrado y no admite cambios.');
      }

      const candidate: MonthlyPlan = {
        ...current,
        savingsTargetCents: previous.savingsTargetCents,
        variableBudgets: previous.variableBudgets.map((budget) => ({ ...budget })),
        updatedAt: nextTimestamp(current.updatedAt),
      };

      await db.plans.put(candidate);
      await auditRepo.log({
        action: 'update',
        entity: 'plan',
        entityId: candidate.id,
        summary: `Presupuesto copiado de ${previousMonth}`,
        before: current,
        after: candidate,
      });

      return candidate;
    });
  },

  async ensureItems(month: MonthKey): Promise<PlanItem[]> {
    return db.transaction(
      'rw',
      [db.plans, db.planItems, db.recurringRules, db.categories],
      async () => {
        await planRepo.getOrCreate(month);

        const rules = await db.recurringRules.where('active').equals(1).toArray();
        const existing = await db.planItems.where('planId').equals(month).toArray();
        const categories = await db.categories.toArray();
        const generated = generatePlanItemsForMonth({
          month,
          rules,
          existing,
          categories,
        });

        if (generated.length === 0) {
          return [];
        }

        const now = nowTimestamp();
        const items = generated.map(
          (item) =>
            planItemSchema.parse({
              ...item,
              id: crypto.randomUUID(),
              status: 'pending',
              createdAt: now,
              updatedAt: now,
            }) as PlanItem,
        );

        await db.planItems.bulkAdd(items);
        return items;
      },
    );
  },

  async payItem(
    itemId: UUID,
    input: PayItemInput,
    ctx: Ctx,
  ): Promise<{ item: PlanItem; transaction: Transaction }> {
    return settleItem(itemId, input, ctx, 'fixed_expense');
  },

  async receiveItem(
    itemId: UUID,
    input: PayItemInput,
    ctx: Ctx,
  ): Promise<{ item: PlanItem; transaction: Transaction }> {
    return settleItem(itemId, input, ctx, 'expected_income');
  },

  async skipItem(itemId: UUID, ctx: Ctx): Promise<PlanItem> {
    return db.transaction('rw', [db.planItems, db.auditLog], async () => {
      const item = await db.planItems.get(itemId);
      if (!item) {
        throw new Error('El compromiso no existe.');
      }
      if (item.status === 'settled') {
        throw new Error('Este compromiso ya está liquidado.');
      }
      if (ctx.expectedUpdatedAt && item.updatedAt !== ctx.expectedUpdatedAt) {
        throw new ConflictError();
      }
      if (item.status === 'skipped') {
        return item;
      }

      const skipped: PlanItem = {
        ...item,
        status: 'skipped',
        updatedAt: nextTimestamp(item.updatedAt),
      };

      await db.planItems.put(skipped);
      await auditRepo.log({
        action: 'update',
        entity: 'plan_item',
        entityId: skipped.id,
        summary: `Compromiso omitido: ${skipped.name}`,
        before: item,
        after: skipped,
      });

      return skipped;
    });
  },

  async close(month: MonthKey): Promise<MonthlyPlan> {
    return db.transaction(
      'rw',
      [db.plans, db.planItems, db.transactions, db.categories, db.auditLog],
      async () => {
        const plan = await planRepo.getOrCreate(month);
        if (plan.status === 'closed') {
          return plan;
        }

        if (month >= toMonthKey(todayInLima())) {
          throw new Error('Solo se puede cerrar un mes que ya terminó.');
        }

        const planItems = await db.planItems.where('planId').equals(month).toArray();
        if (planItems.some((item) => item.status === 'pending')) {
          throw new Error('No se puede cerrar el mes con compromisos pendientes.');
        }

        const transactions = await db.transactions.toArray();
        const categories = await db.categories.toArray();
        const snapshot = computeBudgetSnapshot({
          transactions,
          plan,
          planItems,
          categories,
          currentMonth: month,
        });

        const closedAt = nowTimestamp();
        const closed: MonthlyPlan = {
          ...plan,
          status: 'closed',
          closedAt,
          updatedAt: closedAt,
          snapshot: {
            closedAt,
            incomeCents: snapshot.monthIncomeCents,
            expenseCents: snapshot.monthExpenseCents,
            fixedCents: snapshot.fixedExpenseCents,
            variableCents: snapshot.variableExpenseCents,
            savingsCents: snapshot.monthlyGoalContribCents,
            availableCents: snapshot.availableCents,
            planExpenseCents: snapshot.planExpenseCents,
          },
        };

        await db.plans.put(closed);
        await auditRepo.log({
          action: 'close_month',
          entity: 'plan',
          entityId: closed.id,
          summary: `Mes cerrado: ${closed.id}`,
          before: plan,
          after: closed,
        });

        return closed;
      },
    );
  },

  async reopen(month: MonthKey): Promise<MonthlyPlan> {
    return db.transaction('rw', [db.plans, db.auditLog], async () => {
      const plan = await db.plans.get(month);
      if (!plan) {
        throw new Error('El plan no existe.');
      }
      if (plan.status === 'active') {
        return plan;
      }

      const reopened: MonthlyPlan = {
        ...plan,
        status: 'active',
        updatedAt: nextTimestamp(plan.updatedAt),
      };

      await db.plans.put(reopened);
      await auditRepo.log({
        action: 'reopen_month',
        entity: 'plan',
        entityId: reopened.id,
        summary: `Mes reabierto: ${reopened.id}`,
        before: plan,
        after: reopened,
      });

      return reopened;
    });
  },
};
