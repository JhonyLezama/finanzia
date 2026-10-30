import type { Category } from '@/domain/models';
import { categorySchema } from '@/domain/schemas';
import { ConflictError, db, nextTimestamp, nowTimestamp, type Ctx } from '../db';
import { buildDefaultCategories } from '../seed';
import { auditRepo } from './audit';

export interface CreateCategoryInput {
  name: string;
  kind: Category['kind'];
  group?: Category['group'];
  colorToken?: string;
  icon?: string;
}

export type CategoryPatch = Partial<
  Pick<Category, 'name' | 'group' | 'colorToken' | 'icon' | 'order' | 'archived'>
>;

export interface ListCategoriesOptions {
  includeArchived?: boolean;
  kind?: Category['kind'];
}

const PALETTE = ['primary', 'gold', 'red', 'ink-muted'];

function normalizeName(name: string): string {
  return name.trim().toLocaleLowerCase('es');
}

async function assertUniqueName(
  name: string,
  kind: Category['kind'],
  excludeId?: string,
): Promise<void> {
  const normalized = normalizeName(name);
  const sameKind = await db.categories.where('kind').equals(kind).toArray();

  const duplicate = sameKind.some(
    (category) =>
      category.archived === 0 &&
      category.id !== excludeId &&
      normalizeName(category.name) === normalized,
  );

  if (duplicate) {
    const label = kind === 'income' ? 'ingreso' : 'gasto';
    throw new Error(`Ya existe una categoría de ${label} con ese nombre.`);
  }
}

async function isCategoryUsed(id: string): Promise<boolean> {
  const [transactionCount, planItems, rules, plans] = await Promise.all([
    db.transactions.where('categoryId').equals(id).count(),
    db.planItems.toArray(),
    db.recurringRules.toArray(),
    db.plans.toArray(),
  ]);

  return (
    transactionCount > 0 ||
    planItems.some((item) => item.categoryId === id) ||
    rules.some((rule) => rule.categoryId === id) ||
    plans.some((plan) =>
      plan.variableBudgets.some((budget) => budget.categoryId === id),
    )
  );
}

export const categoryRepo = {
  async list(options: ListCategoriesOptions = {}): Promise<Category[]> {
    const categories = await db.categories.orderBy('order').toArray();

    return categories.filter((category) => {
      if (!options.includeArchived && category.archived === 1) {
        return false;
      }
      if (options.kind && category.kind !== options.kind) {
        return false;
      }
      return true;
    });
  },

  async create(input: CreateCategoryInput): Promise<Category> {
    return db.transaction('rw', db.categories, db.auditLog, async () => {
      const categories = await db.categories.orderBy('order').toArray();
      await assertUniqueName(input.name, input.kind);

      const now = nowTimestamp();
      const group = input.kind === 'income' ? 'income' : (input.group ?? 'variable');
      const order = (categories.at(-1)?.order ?? 0) + 1;

      const category = categorySchema.parse({
        id: crypto.randomUUID(),
        name: input.name.trim(),
        kind: input.kind,
        group,
        colorToken: input.colorToken ?? PALETTE[categories.length % PALETTE.length],
        ...(input.icon ? { icon: input.icon } : {}),
        order,
        archived: 0,
        isDefault: 0,
        createdAt: now,
        updatedAt: now,
      }) as Category;

      await db.categories.add(category);
      await auditRepo.log({
        action: 'create',
        entity: 'category',
        entityId: category.id,
        summary: `Categoría creada: ${category.name}`,
        after: category,
      });

      return category;
    });
  },

  async update(id: string, patch: CategoryPatch, ctx?: Ctx): Promise<Category> {
    return db.transaction(
      'rw',
      [
        db.categories,
        db.transactions,
        db.planItems,
        db.recurringRules,
        db.plans,
        db.auditLog,
      ],
      async () => {
        const current = await db.categories.get(id);
        if (!current) {
          throw new Error('La categoría no existe.');
        }
        if (ctx?.expectedUpdatedAt && current.updatedAt !== ctx.expectedUpdatedAt) {
          throw new ConflictError();
        }

        const name = patch.name?.trim() ?? current.name;
        if (name !== current.name) {
          await assertUniqueName(name, current.kind, id);
        }

        const groupChanged = patch.group !== undefined && patch.group !== current.group;
        if (groupChanged) {
          const validGroup =
            current.kind === 'income'
              ? patch.group === 'income'
              : patch.group === 'fixed' || patch.group === 'variable';

          if (!validGroup) {
            throw new Error('El grupo no corresponde al tipo de la categoría.');
          }
          if (await isCategoryUsed(id)) {
            throw new Error(
              'No se puede cambiar el grupo de una categoría en uso; creá una categoría nueva.',
            );
          }
        }

        const candidate = categorySchema.parse({
          ...current,
          ...patch,
          name,
          id: current.id,
          kind: current.kind,
          createdAt: current.createdAt,
          updatedAt: nextTimestamp(current.updatedAt),
        }) as Category;

        await db.categories.put(candidate);
        await auditRepo.log({
          action: 'update',
          entity: 'category',
          entityId: candidate.id,
          summary: `Categoría actualizada: ${candidate.name}`,
          before: current,
          after: candidate,
        });

        return candidate;
      },
    );
  },

  async archive(id: string): Promise<void> {
    await db.transaction('rw', db.categories, db.auditLog, async () => {
      const current = await db.categories.get(id);
      if (!current) {
        throw new Error('La categoría no existe.');
      }
      if (current.archived === 1) {
        return;
      }

      const archived: Category = {
        ...current,
        archived: 1,
        updatedAt: nextTimestamp(current.updatedAt),
      };

      await db.categories.put(archived);
      await auditRepo.log({
        action: 'category_archive',
        entity: 'category',
        entityId: archived.id,
        summary: `Categoría archivada: ${archived.name}`,
        before: current,
        after: archived,
      });
    });
  },

  async unarchive(id: string): Promise<Category> {
    return db.transaction('rw', db.categories, db.auditLog, async () => {
      const current = await db.categories.get(id);
      if (!current) {
        throw new Error('La categoría no existe.');
      }
      if (current.archived === 0) {
        return current;
      }

      await assertUniqueName(current.name, current.kind, id);

      const restored: Category = {
        ...current,
        archived: 0,
        updatedAt: nextTimestamp(current.updatedAt),
      };

      await db.categories.put(restored);
      await auditRepo.log({
        action: 'restore',
        entity: 'category',
        entityId: restored.id,
        summary: `Categoría restaurada: ${restored.name}`,
        before: current,
        after: restored,
      });

      return restored;
    });
  },

  async remove(id: string): Promise<void> {
    await db.transaction(
      'rw',
      [
        db.categories,
        db.transactions,
        db.planItems,
        db.recurringRules,
        db.plans,
        db.auditLog,
      ],
      async () => {
        const current = await db.categories.get(id);
        if (!current) {
          throw new Error('La categoría no existe.');
        }
        if (current.isDefault === 1) {
          throw new Error(
            'Las categorías por defecto no se pueden borrar; archivalas en su lugar.',
          );
        }
        if (await isCategoryUsed(id)) {
          throw new Error(
            'La categoría tiene movimientos o está en uso; archivala para conservar el historial.',
          );
        }

        await db.categories.delete(id);
        await auditRepo.log({
          action: 'delete',
          entity: 'category',
          entityId: id,
          summary: `Categoría eliminada: ${current.name}`,
          before: current,
        });
      },
    );
  },

  async ensureDefaults(): Promise<void> {
    await db.transaction('rw', db.categories, async () => {
      const count = await db.categories.count();
      if (count > 0) {
        return;
      }
      await db.categories.bulkAdd(buildDefaultCategories(nowTimestamp()));
    });
  },
};
