import { createDb, type Database } from "@tgo/db";

import { getEnv, hasDatabaseUrl } from "./env.js";

let database: Database | null = null;

export const isDatabaseConfigured = () => hasDatabaseUrl();

export const getDb = () => {
  if (database) {
    return database;
  }

  const { databaseUrl } = getEnv();

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for database-backed API features.");
  }

  database = createDb(databaseUrl).db;
  return database;
};
