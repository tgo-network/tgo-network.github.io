import { createDb, type Database } from "@tgo/db";

import { getEnv, hasDatabaseUrl } from "./env.js";

let database: Database | null = null;
let databasePool: ReturnType<typeof createDb>["pool"] | null = null;

export const isDatabaseConfigured = () => hasDatabaseUrl();

export const getDb = () => {
  if (database) {
    return database;
  }

  const { databaseUrl } = getEnv();

  if (!databaseUrl) {
    throw new Error("启用数据库能力前必须配置 DATABASE_URL。");
  }

  const created = createDb(databaseUrl);

  database = created.db;
  databasePool = created.pool;
  return database;
};

export const closeDb = async () => {
  if (databasePool) {
    await databasePool.end();
  }

  database = null;
  databasePool = null;
};
