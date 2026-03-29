import { count, eq } from "drizzle-orm";

import {
  articles,
  auditLogs,
  assets,
  events,
  joinApplications,
  permissions,
  rolePermissionBindings,
  roles,
  staffAccounts,
  staffRoleBindings
} from "@tgo/db";

import { getDb } from "./db.js";

export interface StaffAccess {
  staffAccount: {
    id: string;
    userId: string;
    status: string;
  } | null;
  roles: string[];
  permissions: string[];
}

export const getStaffAccess = async (userId: string): Promise<StaffAccess> => {
  const db = getDb();

  const rows = await db
    .select({
      staffAccountId: staffAccounts.id,
      staffUserId: staffAccounts.userId,
      staffStatus: staffAccounts.status,
      roleCode: roles.code,
      permissionCode: permissions.code
    })
    .from(staffAccounts)
    .leftJoin(staffRoleBindings, eq(staffRoleBindings.staffAccountId, staffAccounts.id))
    .leftJoin(roles, eq(roles.id, staffRoleBindings.roleId))
    .leftJoin(rolePermissionBindings, eq(rolePermissionBindings.roleId, roles.id))
    .leftJoin(permissions, eq(permissions.id, rolePermissionBindings.permissionId))
    .where(eq(staffAccounts.userId, userId));

  if (rows.length === 0) {
    return {
      staffAccount: null,
      roles: [],
      permissions: []
    };
  }

  const [first] = rows;

  return {
    staffAccount: {
      id: first.staffAccountId,
      userId: first.staffUserId,
      status: first.staffStatus
    },
    roles: [...new Set(rows.map((row) => row.roleCode).filter((value): value is string => Boolean(value)))],
    permissions: [
      ...new Set(rows.map((row) => row.permissionCode).filter((value): value is string => Boolean(value)))
    ]
  };
};

export const getDashboardStats = async () => {
  const db = getDb();

  const [articleCount] = await db.select({ value: count() }).from(articles);
  const [eventCount] = await db.select({ value: count() }).from(events);
  const [applicationCount] = await db.select({ value: count() }).from(joinApplications);
  const [assetCount] = await db.select({ value: count() }).from(assets);
  const [auditLogCount] = await db.select({ value: count() }).from(auditLogs);
  const [staffCount] = await db.select({ value: count() }).from(staffAccounts);
  const [roleCount] = await db.select({ value: count() }).from(roles);

  return {
    articles: articleCount?.value ?? 0,
    events: eventCount?.value ?? 0,
    applications: applicationCount?.value ?? 0,
    assets: assetCount?.value ?? 0,
    auditLogs: auditLogCount?.value ?? 0,
    staff: staffCount?.value ?? 0,
    roles: roleCount?.value ?? 0
  };
};
