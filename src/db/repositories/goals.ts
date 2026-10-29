import { todayInLima } from '@/domain/dates';
import { assertCanWithdraw, goalBalance } from '@/domain/goals';
import type { Cents, Goal, ISODate, Transaction, UUID } from '@/domain/models';
import { goalSchema } from '@/domain/schemas';
import { ConflictError, db, nextTimestamp, nowTimestamp, type Ctx } from '../db';
import { auditRepo } from './audit';
import { transactionRepo } from './transactions';

export interface CreateGoalInput {
  name: string;
  targetCents: Cents;
  targetDate?: ISODate;
}

export interface GoalMovementInput {
  amountCents: Cents;
  date: ISODate;
  note?: string;
}

export interface ArchiveGoalOptions {
  withdrawToAvailable: boolean;
}

const GOAL_TABLES = [
  db.goals,
  db.transactions,
  db.planItems,
  db.categories,
  db.plans,
  db.auditLog,
] as const;

const GOAL_COLORS = ['primary', 'gold', 'red', 'ink-muted'];

function withoutUndefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as Partial<T>;
}

async function getGoal(id: UUID): Promise<Goal> {
  const goal = await db.goals.get(id);
  if (!goal) {
    throw new Error('La meta no existe.');
  }
  return goal;
}

async function moveMoney(
  id: UUID,
  input: GoalMovementInput,
  type: 'goal_deposit' | 'goal_withdraw',
): Promise<{ goal: Goal; transaction: Transaction }> {
  return db.transaction('rw', GOAL_TABLES, async () => {
    const current = await getGoal(id);
    if (current.status === 'archived') {
      throw new Error('La meta está archivada y no admite movimientos.');
    }

    const existing = await db.transactions.toArray();
    if (type === 'goal_withdraw') {
      assertCanWithdraw(current, existing, input.amountCents);
    }

    const isDeposit = type === 'goal_deposit';
    const transaction = await transactionRepo.create({
      type,
      direction: isDeposit ? 'out' : 'in',
      amountCents: input.amountCents,
      date: input.date,
      goalId: current.id,
      description: input.note?.trim() || (isDeposit ? `Aporte a ${current.name}` : `Retiro de ${current.name}`),
      ...(input.note ? { note: input.note } : {}),
      source: 'goal',
    });

    const transactions = await db.transactions.toArray();
    const balance = goalBalance(current.id, transactions);
    const updated: Goal = {
      ...current,
      completedAt:
        balance >= current.targetCents ? (current.completedAt ?? nowTimestamp()) : undefined,
      updatedAt: nextTimestamp(current.updatedAt),
    };

    await db.goals.put(updated);
    await auditRepo.log({
      action: 'update',
      entity: 'goal',
      entityId: updated.id,
      summary: isDeposit
        ? `Aporte registrado en ${updated.name}`
        : `Retiro registrado de ${updated.name}`,
      before: current,
      after: updated,
    });

    return { goal: updated, transaction };
  });
}

export const goalRepo = {
  async list(options: { includeArchived?: boolean } = {}): Promise<Goal[]> {
    const goals = await db.goals.toArray();
    return goals
      .filter((goal) => options.includeArchived || goal.status === 'active')
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },

  async get(id: UUID): Promise<Goal> {
    return getGoal(id);
  },

  async create(input: CreateGoalInput): Promise<Goal> {
    return db.transaction('rw', [db.goals, db.auditLog], async () => {
      const count = await db.goals.count();
      const now = nowTimestamp();
      const goal = goalSchema.parse({
        id: crypto.randomUUID(),
        name: input.name.trim(),
        targetCents: input.targetCents,
        ...(input.targetDate ? { targetDate: input.targetDate } : {}),
        status: 'active',
        colorToken: GOAL_COLORS[count % GOAL_COLORS.length],
        createdAt: now,
        updatedAt: now,
      }) as Goal;

      await db.goals.add(goal);
      await auditRepo.log({
        action: 'create',
        entity: 'goal',
        entityId: goal.id,
        summary: `Meta creada: ${goal.name}`,
        after: goal,
      });

      return goal;
    });
  },

  async update(id: UUID, patch: Partial<Goal>, ctx: Ctx): Promise<Goal> {
    return db.transaction('rw', [db.goals, db.auditLog], async () => {
      const current = await getGoal(id);
      if (ctx.expectedUpdatedAt && current.updatedAt !== ctx.expectedUpdatedAt) {
        throw new ConflictError();
      }

      const candidate = goalSchema.parse({
        ...current,
        ...withoutUndefined(patch),
        id: current.id,
        status: current.status,
        createdAt: current.createdAt,
        updatedAt: nextTimestamp(current.updatedAt),
      }) as Goal;

      await db.goals.put(candidate);
      await auditRepo.log({
        action: 'update',
        entity: 'goal',
        entityId: candidate.id,
        summary: `Meta actualizada: ${candidate.name}`,
        before: current,
        after: candidate,
      });

      return candidate;
    });
  },

  async contribute(
    id: UUID,
    input: GoalMovementInput,
  ): Promise<{ goal: Goal; transaction: Transaction }> {
    return moveMoney(id, input, 'goal_deposit');
  },

  async withdraw(
    id: UUID,
    input: GoalMovementInput,
  ): Promise<{ goal: Goal; transaction: Transaction }> {
    return moveMoney(id, input, 'goal_withdraw');
  },

  async archive(id: UUID, options: ArchiveGoalOptions): Promise<Goal> {
    return db.transaction('rw', GOAL_TABLES, async () => {
      const current = await getGoal(id);
      if (current.status === 'archived') {
        return current;
      }

      const transactions = await db.transactions.toArray();
      const balance = goalBalance(current.id, transactions);

      if (balance > 0) {
        if (!options.withdrawToAvailable) {
          throw new Error('La meta tiene saldo; retirá el saldo antes de archivarla.');
        }

        await transactionRepo.create({
          type: 'goal_withdraw',
          direction: 'in',
          amountCents: balance,
          date: todayInLima(),
          goalId: current.id,
          description: `Retiro por archivado: ${current.name}`,
          source: 'goal',
        });
      }

      const archived: Goal = {
        ...current,
        status: 'archived',
        updatedAt: nextTimestamp(current.updatedAt),
      };

      await db.goals.put(archived);
      await auditRepo.log({
        action: 'goal_archive',
        entity: 'goal',
        entityId: archived.id,
        summary: `Meta archivada: ${archived.name}`,
        before: current,
        after: archived,
      });

      return archived;
    });
  },
};
