import type { AuditAction, AuditEntity, AuditEntry, ISOTimestamp } from '@/domain/models';
import { db } from '../db';

let lastAuditAt = 0;

function auditTimestamp(): ISOTimestamp {
  const current = Date.now();
  lastAuditAt = current > lastAuditAt ? current : lastAuditAt + 1;
  return new Date(lastAuditAt).toISOString() as ISOTimestamp;
}

export interface AuditInput {
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  summary: string;
  before?: unknown;
  after?: unknown;
}

export const auditRepo = {
  async log(entry: AuditInput): Promise<void> {
    await db.auditLog.add({
      ...entry,
      id: crypto.randomUUID(),
      at: auditTimestamp(),
    });
  },

  async list(limit = 50): Promise<AuditEntry[]> {
    return db.auditLog.orderBy('at').reverse().limit(limit).toArray();
  },
};
