import { and, asc, eq, inArray } from "drizzle-orm";

import {
  permissions,
  rolePermissionBindings,
  roles,
  staffAccounts,
  staffRoleBindings,
  users
} from "@tgo/db";
import type {
  AdminPermissionRecord,
  AdminRoleListItem,
  AdminRoleSummary,
  AdminRoleUpdateInput,
  AdminRolesPayload,
  AdminStaffCreateInput,
  AdminStaffListItem,
  AdminStaffListPayload,
  AdminStaffUpdateInput,
  AdminValidationIssue
} from "@tgo/shared";

import type { AuditActorContext } from "./audit.js";
import { writeAuditLog } from "./audit.js";
import { getAuth } from "./auth.js";
import { AdminContentError } from "./admin-content.js";
import { getDb } from "./db.js";

const asIso = (value: Date | null | undefined) => (value ? value.toISOString() : null);
const now = () => new Date();

const getActorStaffAccountId = (actor: AuditActorContext) => {
  if (!actor.actorStaffAccountId) {
    throw new AdminContentError(403, "FORBIDDEN", "需要启用中的员工账号权限。");
  }

  return actor.actorStaffAccountId;
};

const isUniqueViolation = (error: unknown): error is { code: string } =>
  typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "23505";

const validationError = (issues: AdminValidationIssue[]): AdminContentError =>
  new AdminContentError(400, "VALIDATION_ERROR", "一个或多个字段校验失败。", {
    issues
  });

const conflictError = (message: string) => new AdminContentError(409, "CONFLICT", message);

const mapRoleSummary = (role: typeof roles.$inferSelect): AdminRoleSummary => ({
  id: role.id,
  code: role.code,
  name: role.name
});

const mapPermissionRecord = (permission: typeof permissions.$inferSelect): AdminPermissionRecord => ({
  id: permission.id,
  code: permission.code,
  name: permission.name,
  resource: permission.resource,
  action: permission.action
});

const mapStaffListItem = (
  staff: typeof staffAccounts.$inferSelect,
  user: typeof users.$inferSelect,
  assignedRoles: AdminRoleSummary[]
): AdminStaffListItem => ({
  id: staff.id,
  userId: staff.userId,
  email: user.email,
  name: user.name,
  status: staff.status,
  roles: assignedRoles,
  notes: staff.notes ?? "",
  invitedAt: asIso(staff.invitedAt),
  activatedAt: asIso(staff.activatedAt),
  lastLoginAt: asIso(staff.lastLoginAt),
  createdAt: staff.createdAt.toISOString(),
  updatedAt: staff.updatedAt.toISOString()
});

const mapRoleListItem = (
  role: typeof roles.$inferSelect,
  permissionIds: string[],
  permissionCodes: string[],
  assignedStaffCount: number
): AdminRoleListItem => ({
  id: role.id,
  code: role.code,
  name: role.name,
  description: role.description ?? "",
  isSystem: role.isSystem,
  permissionIds,
  permissionCodes,
  assignedStaffCount,
  createdAt: role.createdAt.toISOString(),
  updatedAt: role.updatedAt.toISOString()
});

const getRoleRowsByIds = async (roleIds: string[]) => {
  const db = getDb();

  if (roleIds.length === 0) {
    return [] as Array<typeof roles.$inferSelect>;
  }

  return db.select().from(roles).where(inArray(roles.id, roleIds));
};

const getPermissionRowsByIds = async (permissionIds: string[]) => {
  const db = getDb();

  if (permissionIds.length === 0) {
    return [] as Array<typeof permissions.$inferSelect>;
  }

  return db.select().from(permissions).where(inArray(permissions.id, permissionIds));
};

const assertRoleIds = async (roleIds: string[]) => {
  const roleRows = await getRoleRowsByIds(roleIds);

  if (roleRows.length !== roleIds.length) {
    throw validationError([
      {
        field: "roleIds",
        message: "所选角色中存在无效项。"
      }
    ]);
  }

  return roleRows;
};

const assertPermissionIds = async (permissionIds: string[]) => {
  const permissionRows = await getPermissionRowsByIds(permissionIds);

  if (permissionRows.length !== permissionIds.length) {
    throw validationError([
      {
        field: "permissionIds",
        message: "所选权限中存在无效项。"
      }
    ]);
  }

  return permissionRows;
};

const getActiveSuperAdminCount = async (excludedStaffAccountId?: string) => {
  const db = getDb();
  const superAdminRole = await db.query.roles.findFirst({
    where: eq(roles.code, "super_admin")
  });

  if (!superAdminRole) {
    return 0;
  }

  const rows = await db
    .select({
      staffAccountId: staffAccounts.id
    })
    .from(staffRoleBindings)
    .innerJoin(staffAccounts, eq(staffAccounts.id, staffRoleBindings.staffAccountId))
    .where(and(eq(staffRoleBindings.roleId, superAdminRole.id), eq(staffAccounts.status, "active")));

  const ids = new Set(rows.map((row) => row.staffAccountId));

  if (excludedStaffAccountId) {
    ids.delete(excludedStaffAccountId);
  }

  return ids.size;
};

const ensureSuperAdminSafety = async (
  staffAccountId: string,
  nextStatus: AdminStaffUpdateInput["status"],
  nextRoleIds: string[],
  existingRoleIds: string[]
) => {
  const db = getDb();
  const superAdminRole = await db.query.roles.findFirst({
    where: eq(roles.code, "super_admin")
  });

  if (!superAdminRole) {
    return;
  }

  const hadSuperAdminRole = existingRoleIds.includes(superAdminRole.id);
  const keepsSuperAdminRole = nextRoleIds.includes(superAdminRole.id);
  const remainsActiveSuperAdmin = nextStatus === "active" && keepsSuperAdminRole;

  if (!hadSuperAdminRole || remainsActiveSuperAdmin) {
    return;
  }

  const remainingSuperAdmins = await getActiveSuperAdminCount(staffAccountId);

  if (remainingSuperAdmins === 0) {
    throw validationError([
      {
        field: "roleIds",
        message: "系统中至少需要保留一名启用中的超级管理员。"
      }
    ]);
  }
};

const loadStaffListPayload = async (): Promise<AdminStaffListPayload> => {
  const db = getDb();
  const [staffRows, roleRows, bindingRows] = await Promise.all([
    db
      .select({
        staff: staffAccounts,
        user: users
      })
      .from(staffAccounts)
      .innerJoin(users, eq(users.id, staffAccounts.userId))
      .orderBy(asc(users.name), asc(users.email)),
    db.select().from(roles).orderBy(asc(roles.name)),
    db.select().from(staffRoleBindings)
  ]);

  const roleById = new Map(roleRows.map((role) => [role.id, role]));
  const roleIdsByStaffId = new Map<string, string[]>();

  for (const binding of bindingRows) {
    const current = roleIdsByStaffId.get(binding.staffAccountId) ?? [];
    current.push(binding.roleId);
    roleIdsByStaffId.set(binding.staffAccountId, current);
  }

  return {
    staff: staffRows.map(({ staff, user }) =>
      mapStaffListItem(
        staff,
        user,
        (roleIdsByStaffId.get(staff.id) ?? [])
          .map((roleId) => roleById.get(roleId))
          .filter((value): value is typeof roles.$inferSelect => Boolean(value))
          .map(mapRoleSummary)
      )
    ),
    roles: roleRows.map(mapRoleSummary)
  };
};

const loadRolesPayload = async (): Promise<AdminRolesPayload> => {
  const db = getDb();
  const [roleRows, permissionRows, permissionBindingRows, staffBindingRows] = await Promise.all([
    db.select().from(roles).orderBy(asc(roles.name)),
    db.select().from(permissions).orderBy(asc(permissions.resource), asc(permissions.action)),
    db.select().from(rolePermissionBindings),
    db.select().from(staffRoleBindings)
  ]);

  const permissionById = new Map(permissionRows.map((permission) => [permission.id, permission]));
  const permissionIdsByRoleId = new Map<string, string[]>();
  const assignedStaffCountByRoleId = new Map<string, number>();

  for (const binding of permissionBindingRows) {
    const current = permissionIdsByRoleId.get(binding.roleId) ?? [];
    current.push(binding.permissionId);
    permissionIdsByRoleId.set(binding.roleId, current);
  }

  for (const binding of staffBindingRows) {
    assignedStaffCountByRoleId.set(binding.roleId, (assignedStaffCountByRoleId.get(binding.roleId) ?? 0) + 1);
  }

  return {
    roles: roleRows.map((role) => {
      const permissionIds = permissionIdsByRoleId.get(role.id) ?? [];
      const permissionCodes = permissionIds
        .map((permissionId) => permissionById.get(permissionId)?.code ?? null)
        .filter((value): value is string => Boolean(value));

      return mapRoleListItem(role, permissionIds, permissionCodes, assignedStaffCountByRoleId.get(role.id) ?? 0);
    }),
    permissions: permissionRows.map(mapPermissionRecord)
  };
};

const getStaffRecordById = async (staffAccountId: string): Promise<AdminStaffListItem> => {
  const db = getDb();
  const [staffRow, roleRows, bindingRows] = await Promise.all([
    db
      .select({
        staff: staffAccounts,
        user: users
      })
      .from(staffAccounts)
      .innerJoin(users, eq(users.id, staffAccounts.userId))
      .where(eq(staffAccounts.id, staffAccountId))
      .then((rows) => rows[0] ?? null),
    db.select().from(roles),
    db.select().from(staffRoleBindings).where(eq(staffRoleBindings.staffAccountId, staffAccountId))
  ]);

  if (!staffRow) {
    throw new AdminContentError(404, "NOT_FOUND", "员工账号不存在。");
  }

  const roleById = new Map(roleRows.map((role) => [role.id, role]));

  return mapStaffListItem(
    staffRow.staff,
    staffRow.user,
    bindingRows
      .map((binding) => roleById.get(binding.roleId))
      .filter((value): value is typeof roles.$inferSelect => Boolean(value))
      .map(mapRoleSummary)
  );
};

const getRoleRecordById = async (roleId: string): Promise<AdminRoleListItem> => {
  const db = getDb();
  const [role, permissionRows, permissionBindingRows, staffBindingRows] = await Promise.all([
    db.query.roles.findFirst({
      where: eq(roles.id, roleId)
    }),
    db.select().from(permissions),
    db.select().from(rolePermissionBindings).where(eq(rolePermissionBindings.roleId, roleId)),
    db.select().from(staffRoleBindings).where(eq(staffRoleBindings.roleId, roleId))
  ]);

  if (!role) {
    throw new AdminContentError(404, "NOT_FOUND", "角色不存在。");
  }

  const permissionById = new Map(permissionRows.map((permission) => [permission.id, permission]));
  const permissionIds = permissionBindingRows.map((binding) => binding.permissionId);
  const permissionCodes = permissionIds
    .map((permissionId) => permissionById.get(permissionId)?.code ?? null)
    .filter((value): value is string => Boolean(value));

  return mapRoleListItem(role, permissionIds, permissionCodes, staffBindingRows.length);
};

export const listAdminStaff = async (): Promise<AdminStaffListPayload> => loadStaffListPayload();

export const createAdminStaff = async (
  input: AdminStaffCreateInput,
  actor: AuditActorContext
): Promise<AdminStaffListItem> => {
  const db = getDb();
  const actorStaffAccountId = getActorStaffAccountId(actor);
  await assertRoleIds(input.roleIds);

  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, input.email)
  });

  let userId = existingUser?.id ?? null;

  if (existingUser) {
    const existingStaff = await db.query.staffAccounts.findFirst({
      where: eq(staffAccounts.userId, existingUser.id)
    });

    if (existingStaff) {
      throw conflictError("该邮箱已绑定员工账号。");
    }
  } else {
    const auth = getAuth();

    if (!auth) {
      throw new AdminContentError(503, "AUTH_NOT_CONFIGURED", "认证能力尚未配置。");
    }

    try {
      await auth.api.signUpEmail({
        body: {
          email: input.email,
          password: input.password,
          name: input.name
        }
      });
    } catch {
      throw new AdminContentError(
        422,
        "USER_CREATE_FAILED",
        "无法为该员工账号创建登录凭证用户。"
      );
    }

    const createdUser = await db.query.users.findFirst({
      where: eq(users.email, input.email)
    });

    if (!createdUser) {
      throw new AdminContentError(500, "INTERNAL_ERROR", "无法读取刚创建的用户记录。");
    }

    userId = createdUser.id;
  }

  if (!userId) {
    throw new AdminContentError(500, "INTERNAL_ERROR", "无法解析对应的员工用户。");
  }

  try {
    const invitedAt = now();
    const activatedAt = input.status === "active" ? invitedAt : null;

    const [createdStaffAccount] = await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({
          name: input.name,
          updatedAt: invitedAt
        })
        .where(eq(users.id, userId!));

      const [staffAccount] = await tx
        .insert(staffAccounts)
        .values({
          userId: userId!,
          status: input.status,
          invitedByStaffId: actorStaffAccountId,
          invitedAt,
          activatedAt,
          notes: input.notes || null,
          updatedAt: invitedAt
        })
        .returning();

      await tx.insert(staffRoleBindings).values(
        input.roleIds.map((roleId) => ({
          staffAccountId: staffAccount.id,
          roleId
        }))
      );

      return [staffAccount] as const;
    });

    const createdRecord = await getStaffRecordById(createdStaffAccount.id);

    await writeAuditLog(actor, {
      action: "staff.create",
      targetType: "staff_account",
      targetId: createdStaffAccount.id,
      after: createdRecord
    });

    return createdRecord;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflictError("该邮箱已被其他用户使用。");
    }

    throw error;
  }
};

export const updateAdminStaff = async (
  staffAccountId: string,
  input: AdminStaffUpdateInput,
  actor: AuditActorContext
): Promise<AdminStaffListItem> => {
  const db = getDb();
  const actorStaffAccountId = getActorStaffAccountId(actor);
  await assertRoleIds(input.roleIds);

  const [existingRow, existingRoleBindings] = await Promise.all([
    db
      .select({
        staff: staffAccounts,
        user: users
      })
      .from(staffAccounts)
      .innerJoin(users, eq(users.id, staffAccounts.userId))
      .where(eq(staffAccounts.id, staffAccountId))
      .then((rows) => rows[0] ?? null),
    db.select().from(staffRoleBindings).where(eq(staffRoleBindings.staffAccountId, staffAccountId))
  ]);

  if (!existingRow) {
    throw new AdminContentError(404, "NOT_FOUND", "员工账号不存在。");
  }

  if (existingRow.staff.id === actorStaffAccountId && input.status !== "active") {
    throw validationError([
      {
        field: "status",
        message: "你不能停用当前登录的员工账号。"
      }
    ]);
  }

  await ensureSuperAdminSafety(
    existingRow.staff.id,
    input.status,
    input.roleIds,
    existingRoleBindings.map((binding) => binding.roleId)
  );

  const before = await getStaffRecordById(staffAccountId);

  try {
    const timestamp = now();

    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({
          email: input.email,
          name: input.name,
          updatedAt: timestamp
        })
        .where(eq(users.id, existingRow.user.id));

      await tx
        .update(staffAccounts)
        .set({
          status: input.status,
          activatedAt:
            input.status === "active"
              ? existingRow.staff.activatedAt ?? timestamp
              : input.status === "invited"
                ? null
                : existingRow.staff.activatedAt,
          notes: input.notes || null,
          updatedAt: timestamp
        })
        .where(eq(staffAccounts.id, staffAccountId));

      await tx.delete(staffRoleBindings).where(eq(staffRoleBindings.staffAccountId, staffAccountId));
      await tx.insert(staffRoleBindings).values(
        input.roleIds.map((roleId) => ({
          staffAccountId,
          roleId
        }))
      );
    });

    const after = await getStaffRecordById(staffAccountId);

    await writeAuditLog(actor, {
      action: "staff.update",
      targetType: "staff_account",
      targetId: staffAccountId,
      before,
      after
    });

    return after;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflictError("该邮箱已被其他用户使用。");
    }

    throw error;
  }
};

export const listAdminRoles = async (): Promise<AdminRolesPayload> => loadRolesPayload();

export const updateAdminRole = async (
  roleId: string,
  input: AdminRoleUpdateInput,
  actor: AuditActorContext
): Promise<AdminRoleListItem> => {
  const db = getDb();
  await assertPermissionIds(input.permissionIds);

  const existingRole = await db.query.roles.findFirst({
    where: eq(roles.id, roleId)
  });

  if (!existingRole) {
    throw new AdminContentError(404, "NOT_FOUND", "角色不存在。");
  }

  if (existingRole.code === "super_admin") {
    const allPermissions = await db.select().from(permissions);

    if (input.permissionIds.length !== allPermissions.length) {
      throw validationError([
        {
          field: "permissionIds",
          message: "超级管理员必须保留全部权限。"
        }
      ]);
    }
  }

  const before = await getRoleRecordById(roleId);
  const timestamp = now();

  await db.transaction(async (tx) => {
    await tx
      .update(roles)
      .set({
        name: input.name,
        description: input.description || null,
        updatedAt: timestamp
      })
      .where(eq(roles.id, roleId));

    await tx.delete(rolePermissionBindings).where(eq(rolePermissionBindings.roleId, roleId));

    if (input.permissionIds.length > 0) {
      await tx.insert(rolePermissionBindings).values(
        input.permissionIds.map((permissionId) => ({
          roleId,
          permissionId
        }))
      );
    }
  });

  const after = await getRoleRecordById(roleId);

  await writeAuditLog(actor, {
    action: "role.update",
    targetType: "role",
    targetId: roleId,
    before,
    after
  });

  return after;
};
