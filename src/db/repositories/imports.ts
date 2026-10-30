import { todayInLima, toMonthKey } from '@/domain/dates';
import { dedupeHash, type ImportMapping, type ImportRow } from '@/domain/import';
import type { Category, ImportBatch, Transaction, UUID } from '@/domain/models';
import { importBatchSchema, transactionSchema } from '@/domain/schemas';
import { db, nowTimestamp } from '../db';
import { auditRepo } from './audit';

export interface CreateImportBatchInput {
  filename: string;
  fileType: 'csv' | 'xlsx';
  rows: ImportRow[];
  mapping: ImportMapping;
  importDuplicates?: boolean;
}

const IMPORT_TABLES = [
  db.transactions,
  db.importBatches,
  db.plans,
  db.categories,
  db.auditLog,
] as const;

function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('es')
    .trim();
}

function matchCategory(categories: Category[], name?: string): { id?: string; warning?: string } {
  if (!name) {
    return {};
  }

  const needle = fold(name);
  const match = categories.find((category) => category.archived === 0 && fold(category.name) === needle);
  if (!match) {
    return { warning: `Categoría desconocida: ${name}` };
  }
  return { id: match.id };
}

function clipDescription(value: string): string {
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed.slice(0, 120);
}

export const importRepo = {
  async createBatch(input: CreateImportBatchInput): Promise<ImportBatch> {
    // SHA-256 uses a native promise, which Dexie cannot track inside a transaction
    // zone; compute every hash before opening it to avoid a premature commit.
    const hashes = await Promise.all(input.rows.map((row) => dedupeHash(row)));

    return db.transaction('rw', IMPORT_TABLES, async () => {
      const now = nowTimestamp();
      const today = todayInLima();
      const categories = await db.categories.toArray();
      const closedMonths = new Set(
        (await db.plans.where('status').equals('closed').toArray()).map((plan) => plan.id),
      );

      const batchId = crypto.randomUUID();
      const existingHashes = new Set(
        (await db.transactions.toArray())
          .map((transaction) => transaction.dedupeHash)
          .filter((hash): hash is string => Boolean(hash)),
      );

      let importedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;
      const toInsert: Transaction[] = [];

      for (const [index, row] of input.rows.entries()) {
        if (row.date > today) {
          errorCount += 1;
          continue;
        }
        if (closedMonths.has(toMonthKey(row.date))) {
          errorCount += 1;
          continue;
        }

        const hash = hashes[index]!;
        if (!input.importDuplicates && existingHashes.has(hash)) {
          skippedCount += 1;
          continue;
        }

        const category = matchCategory(categories, row.categoryName);
        const transaction = transactionSchema.parse({
          id: crypto.randomUUID(),
          type: row.type,
          direction: row.direction,
          amountCents: row.amountCents,
          currency: 'PEN',
          date: row.date,
          ...(category.id ? { categoryId: category.id } : {}),
          description: clipDescription(row.description),
          ...(row.note ? { note: row.note.slice(0, 500) } : {}),
          importBatchId: batchId,
          ...(row.externalId ? { externalId: row.externalId.slice(0, 120) } : {}),
          dedupeHash: hash,
          source: 'import',
          createdAt: now,
          updatedAt: now,
          deleted: 0,
        }) as Transaction;

        toInsert.push(transaction);
        existingHashes.add(hash);
        importedCount += 1;
      }

      if (toInsert.length > 0) {
        await db.transactions.bulkAdd(toInsert);
      }

      const batch = importBatchSchema.parse({
        id: batchId,
        filename: input.filename.slice(0, 255),
        fileType: input.fileType,
        importedAt: now,
        rowCount: input.rows.length,
        importedCount,
        skippedCount,
        errorCount,
        status: 'completed',
        mapping: input.mapping as unknown as Record<string, string>,
      }) as ImportBatch;

      await db.importBatches.add(batch);
      await auditRepo.log({
        action: 'import',
        entity: 'import_batch',
        entityId: batch.id,
        summary: `Importación de ${batch.filename}: ${importedCount} altas, ${skippedCount} omitidas, ${errorCount} con error.`,
        after: { importedCount, skippedCount, errorCount },
      });

      return batch;
    });
  },

  async undo(batchId: UUID): Promise<void> {
    await db.transaction('rw', IMPORT_TABLES, async () => {
      const batch = await db.importBatches.get(batchId);
      if (!batch) {
        throw new Error('El lote de importación no existe.');
      }
      if (batch.status === 'undone') {
        throw new Error('Este lote ya fue deshecho.');
      }

      const now = nowTimestamp();
      const transactions = await db.transactions.where('importBatchId').equals(batchId).toArray();

      for (const transaction of transactions) {
        if (transaction.deleted) {
          continue;
        }
        const plan = await db.plans.get(toMonthKey(transaction.date));
        if (plan?.status === 'closed') {
          throw new Error('El mes está cerrado y no admite cambios.');
        }

        await db.transactions.put({
          ...transaction,
          deleted: 1,
          deletedAt: now,
          updatedAt: now,
        });
      }

      const undone: ImportBatch = {
        ...batch,
        status: 'undone',
        undoneAt: now,
      };
      await db.importBatches.put(undone);
      await auditRepo.log({
        action: 'undo_import',
        entity: 'import_batch',
        entityId: batch.id,
        summary: `Importación deshecha: ${batch.filename} (${transactions.length} movimientos).`,
        before: batch,
        after: undone,
      });
    });
  },

  async get(batchId: UUID): Promise<ImportBatch | undefined> {
    return db.importBatches.get(batchId);
  },
};
