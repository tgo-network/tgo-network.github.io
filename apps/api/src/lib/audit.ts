import { desc, eq } from "drizzle-orm";

import { auditLogs, users } from "@tgo/db";
import type { AdminAuditLogRecord } from "@tgo/shared";

import { getDb } from "./db.js";

export interface AuditActorContext {
  actorUserId: string | null;
  actorStaffAccountId: string | null;
  requestIp?: string | null;
  userAgent?: string | null;
}

interface AuditEntryInput {
  action: string;
  targetType: string;
  targetId?: string | null;
  before?: unknown;
  after?: unknown;
}

const normalizeAuditJson = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
};

const mapAuditLogRecord = (
  row: typeof auditLogs.$inferSelect,
  actorName: string | null,
  actorEmail: string | null
): AdminAuditLogRecord => ({
  id: row.id,
  action: row.action,
  targetType: row.targetType,
  targetId: row.targetId,
  actor: {
    userId: row.actorUserId,
    staffAccountId: row.actorStaffAccountId,
    name: actorName,
    email: actorEmail
  },
  requestIp: row.requestIp ?? "",
  userAgent: row.userAgent ?? "",
  beforeJson: (row.beforeJson as Record<string, unknown> | null) ?? null,
  afterJson: (row.afterJson as Record<string, unknown> | null) ?? null,
  createdAt: row.createdAt.toISOString()
});

export const writeAuditLog = async (
  actor: AuditActorContext,
  entry: AuditEntryInput
) => {
  const db = getDb();

  await db.insert(auditLogs).values({
    actorUserId: actor.actorUserId,
    actorStaffAccountId: actor.actorStaffAccountId,
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId ?? null,
    beforeJson: normalizeAuditJson(entry.before),
    afterJson: normalizeAuditJson(entry.after),
    requestIp: actor.requestIp?.trim() || null,
    userAgent: actor.userAgent?.trim() || null
  });
};

export const listAdminAuditLogs = async (limit = 50): Promise<AdminAuditLogRecord[]> => {
  const db = getDb();
  const rows = await db
    .select({
      auditLog: auditLogs,
      actorName: users.name,
      actorEmail: users.email
    })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.actorUserId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);

  return rows.map((row) => mapAuditLogRecord(row.auditLog, row.actorName ?? null, row.actorEmail ?? null));
};
