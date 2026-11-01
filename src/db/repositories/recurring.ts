import { dueDateForMonth } from '@/domain/dates';
import type { Cents, MonthKey, PlanItem, RecurringRule, UUID } from '@/domain/models';
import { recurringRuleSchema } from '@/domain/schemas';
import { ConflictError, db, nextTimestamp, type Ctx } from '../db';
import { auditRepo } from './audit';

export interface RecurringRuleInput {
  name: string;
  kind: PlanItem['kind'];
  amountCents: Cents;
  categoryId: UUID;
  dayOfMonth: number;
  startMonth: MonthKey;
  endMonth?: MonthKey;
  note?: string;
}

let lastCreatedAt = 0;

function createTimestamp() {
  const current = Date.now();
  lastCreatedAt = current > lastCreatedAt ? current : lastCreatedAt + 1;
  return new Date(lastCreatedAt).toISOString() as RecurringRule['createdAt'];
}

function withoutUndefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as Partial<T>;
}

async function pendingItemsForRule(ruleId: UUID): Promise<PlanItem[]> {
  const [items, plans] = await Promise.all([
    db.planItems.where('recurringRuleId').equals(ruleId).toArray(),
    db.plans.toArray(),
  ]);
  const closedPlanIds = new Set(
    plans.filter((plan) => plan.status === 'closed').map((plan) => plan.id),
  );

  return items.filter((item) => item.status === 'pending' && !closedPlanIds.has(item.planId));
}

async function assertCategoryMatches(
  kind: PlanItem['kind'],
  categoryId: UUID,
): Promise<void> {
  const category = await db.categories.get(categoryId);
  if (!category) {
    throw new Error('La categoría no existe.');
  }

  if (kind === 'fixed_expense') {
    if (category.kind !== 'expense' || category.group !== 'fixed') {
      throw new Error('Un gasto fijo exige una categoría fija de gasto.');
    }
    return;
  }

  if (category.kind !== 'income' || category.group !== 'income') {
    throw new Error('Un ingreso previsto exige una categoría de ingreso.');
  }
}

export const recurringRepo = {
  async list(): Promise<RecurringRule[]> {
    const rules = await db.recurringRules.toArray();
    return rules.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },

  async create(input: RecurringRuleInput): Promise<RecurringRule> {
    return db.transaction('rw', [db.recurringRules, db.categories, db.auditLog], async () => {
      await assertCategoryMatches(input.kind, input.categoryId);

      const createdAt = createTimestamp();
      const rule = recurringRuleSchema.parse({
        id: crypto.randomUUID(),
        name: input.name.trim(),
        kind: input.kind,
        amountCents: input.amountCents,
        categoryId: input.categoryId,
        dayOfMonth: input.dayOfMonth,
        startMonth: input.startMonth,
        ...(input.endMonth ? { endMonth: input.endMonth } : {}),
        ...(input.note ? { note: input.note } : {}),
        active: 1,
        createdAt,
        updatedAt: createdAt,
      }) as RecurringRule;

      await db.recurringRules.add(rule);
      await auditRepo.log({
        action: 'create',
        entity: 'recurring_rule',
        entityId: rule.id,
        summary: `Regla recurrente creada: ${rule.name}`,
        after: rule,
      });

      return rule;
    });
  },

  async update(
    id: UUID,
    patch: Partial<RecurringRuleInput>,
    ctx: Ctx,
  ): Promise<RecurringRule> {
    return db.transaction(
      'rw',
      [db.recurringRules, db.planItems, db.plans, db.categories, db.auditLog],
      async () => {
        const current = await db.recurringRules.get(id);
        if (!current) {
          throw new Error('La regla no existe.');
        }
        if (ctx.expectedUpdatedAt && current.updatedAt !== ctx.expectedUpdatedAt) {
          throw new ConflictError();
        }

        const definedPatch = withoutUndefined(patch);
        const kind = definedPatch.kind ?? current.kind;
        const categoryId = definedPatch.categoryId ?? current.categoryId;
        await assertCategoryMatches(kind, categoryId);

        const candidate = recurringRuleSchema.parse({
          ...current,
          ...definedPatch,
          name: definedPatch.name?.trim() ?? current.name,
          kind,
          categoryId,
          id: current.id,
          active: current.active,
          createdAt: current.createdAt,
          updatedAt: nextTimestamp(current.updatedAt),
        }) as RecurringRule;

        await db.recurringRules.put(candidate);

        const pendingItems = await pendingItemsForRule(candidate.id);
        for (const item of pendingItems) {
          await db.planItems.put({
            ...item,
            name: candidate.name,
            kind: candidate.kind,
            amountCents: candidate.amountCents,
            categoryId: candidate.categoryId,
            dueDate: dueDateForMonth(item.planId, candidate.dayOfMonth),
            note: candidate.note,
            updatedAt: nextTimestamp(item.updatedAt),
          });
        }

        await auditRepo.log({
          action: 'update',
          entity: 'recurring_rule',
          entityId: candidate.id,
          summary: `Regla recurrente actualizada: ${candidate.name}`,
          before: current,
          after: candidate,
        });

        return candidate;
      },
    );
  },

  async pause(id: UUID): Promise<void> {
    await db.transaction('rw', [db.recurringRules, db.auditLog], async () => {
      const current = await db.recurringRules.get(id);
      if (!current) {
        throw new Error('La regla no existe.');
      }
      if (current.active === 0) {
        return;
      }

      const paused: RecurringRule = {
        ...current,
        active: 0,
        updatedAt: nextTimestamp(current.updatedAt),
      };

      await db.recurringRules.put(paused);
      await auditRepo.log({
        action: 'update',
        entity: 'recurring_rule',
        entityId: paused.id,
        summary: `Regla recurrente pausada: ${paused.name}`,
        before: current,
        after: paused,
      });
    });
  },

  async resume(id: UUID): Promise<void> {
    await db.transaction('rw', [db.recurringRules, db.auditLog], async () => {
      const current = await db.recurringRules.get(id);
      if (!current) {
        throw new Error('La regla no existe.');
      }
      if (current.active === 1) {
        return;
      }

      const resumed: RecurringRule = {
        ...current,
        active: 1,
        updatedAt: nextTimestamp(current.updatedAt),
      };

      await db.recurringRules.put(resumed);
      await auditRepo.log({
        action: 'update',
        entity: 'recurring_rule',
        entityId: resumed.id,
        summary: `Regla recurrente reactivada: ${resumed.name}`,
        before: current,
        after: resumed,
      });
    });
  },

  async remove(id: UUID): Promise<void> {
    await db.transaction(
      'rw',
      [db.recurringRules, db.planItems, db.plans, db.reminderStates, db.auditLog],
      async () => {
        const current = await db.recurringRules.get(id);
        if (!current) {
          throw new Error('La regla no existe.');
        }

        const pendingItems = await pendingItemsForRule(id);
        if (pendingItems.length > 0) {
          const itemIds = pendingItems.map((item) => item.id);
          await db.planItems.bulkDelete(itemIds);
          await db.reminderStates.bulkDelete(itemIds);
        }

        await db.recurringRules.delete(id);
        await auditRepo.log({
          action: 'delete',
          entity: 'recurring_rule',
          entityId: id,
          summary: `Regla recurrente eliminada: ${current.name}`,
          before: current,
        });
      },
    );
  },
};
