import { and, eq } from "drizzle-orm";

import {
  roles,
  staffAccounts,
  staffRoleBindings,
  users
} from "@tgo/db";

import { getAuth } from "../lib/auth.js";
import { getDb } from "../lib/db.js";
import { isAuthConfigured } from "../lib/env.js";

const adminEmail = process.env.DEV_ADMIN_EMAIL ?? "admin@tgo.local";
const adminPassword = process.env.DEV_ADMIN_PASSWORD ?? "TgoAdmin123456!";
const adminName = process.env.DEV_ADMIN_NAME ?? "TGO Super Admin";

const main = async () => {
  if (!isAuthConfigured()) {
    throw new Error("DATABASE_URL and BETTER_AUTH_SECRET are required before bootstrapping the admin account.");
  }

  const auth = getAuth();

  if (!auth) {
    throw new Error("Better Auth is not configured.");
  }

  const db = getDb();

  let user = await db.query.users.findFirst({
    where: eq(users.email, adminEmail)
  });

  if (!user) {
    await auth.api.signUpEmail({
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName
      }
    });

    user = await db.query.users.findFirst({
      where: eq(users.email, adminEmail)
    });
  }

  if (!user) {
    throw new Error("Unable to create or load the admin user.");
  }

  let staffAccount = await db.query.staffAccounts.findFirst({
    where: eq(staffAccounts.userId, user.id)
  });

  if (!staffAccount) {
    const [createdStaffAccount] = await db
      .insert(staffAccounts)
      .values({
        userId: user.id,
        status: "active",
        invitedAt: new Date(),
        activatedAt: new Date(),
        notes: "Bootstrapped development super admin"
      })
      .returning();

    staffAccount = createdStaffAccount ?? null;
  }

  if (!staffAccount) {
    throw new Error("Unable to create or load the staff account.");
  }

  const role = await db.query.roles.findFirst({
    where: eq(roles.code, "super_admin")
  });

  if (!role) {
    throw new Error("super_admin role is missing. Run the seed script first.");
  }

  const existingBinding = await db.query.staffRoleBindings.findFirst({
    where: and(eq(staffRoleBindings.staffAccountId, staffAccount.id), eq(staffRoleBindings.roleId, role.id))
  });

  if (!existingBinding) {
    await db.insert(staffRoleBindings).values({
      staffAccountId: staffAccount.id,
      roleId: role.id
    });
  }

  console.log(
    JSON.stringify(
      {
        email: adminEmail,
        password: adminPassword,
        userId: user.id,
        staffAccountId: staffAccount.id,
        role: role.code
      },
      null,
      2
    )
  );
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
