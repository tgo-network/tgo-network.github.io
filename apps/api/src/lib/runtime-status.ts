import { sql } from "drizzle-orm";

import { apiName } from "@tgo/shared";

import { getDb, isDatabaseConfigured } from "./db.js";
import { getEnv, isAuthConfigured, isStorageConfigured } from "./env.js";

export interface RuntimeComponentStatus {
  required: boolean;
  configured: boolean;
  ready: boolean;
  message: string;
}

export interface RuntimeReadinessPayload {
  service: string;
  environment: string;
  checkedAt: string;
  ready: boolean;
  components: {
    database: RuntimeComponentStatus;
    auth: RuntimeComponentStatus;
    cors: RuntimeComponentStatus;
    storage: RuntimeComponentStatus;
    internalAutomation: RuntimeComponentStatus;
  };
}

export interface RuntimeVersionPayload {
  service: string;
  environment: string;
  version: string;
  gitSha: string | null;
  checkedAt: string;
}

const now = () => new Date().toISOString();

const getRuntimeEnvironment = () =>
  getEnv().appEnvironment ?? (process.env.NODE_ENV?.trim() || "development");

const getConfiguredVersion = () => getEnv().appVersion ?? "dev";

const getConfiguredGitSha = () => getEnv().gitSha ?? null;

const getDatabaseStatus = async (): Promise<RuntimeComponentStatus> => {
  if (!isDatabaseConfigured()) {
    return {
      required: true,
      configured: false,
      ready: false,
      message: "DATABASE_URL is missing."
    };
  }

  try {
    await getDb().execute(sql`select 1`);

    return {
      required: true,
      configured: true,
      ready: true,
      message: "Database connection is ready."
    };
  } catch (error) {
    return {
      required: true,
      configured: true,
      ready: false,
      message: error instanceof Error ? error.message : "Database connection failed."
    };
  }
};

const getConfiguredStatus = (
  required: boolean,
  configured: boolean,
  okMessage: string,
  missingMessage: string
): RuntimeComponentStatus => ({
  required,
  configured,
  ready: required ? configured : true,
  message: configured ? okMessage : missingMessage
});

export const getRuntimeVersion = (): RuntimeVersionPayload => ({
  service: apiName,
  environment: getRuntimeEnvironment(),
  version: getConfiguredVersion(),
  gitSha: getConfiguredGitSha(),
  checkedAt: now()
});

export const getRuntimeReadiness = async (): Promise<RuntimeReadinessPayload> => {
  const env = getEnv();
  const database = await getDatabaseStatus();
  const auth = getConfiguredStatus(
    true,
    isAuthConfigured(),
    "Authentication runtime is configured.",
    "DATABASE_URL and BETTER_AUTH_SECRET are required for auth."
  );
  const cors = getConfiguredStatus(
    true,
    env.corsAllowedOrigins.length > 0,
    "CORS allowed origins are configured.",
    "CORS_ALLOWED_ORIGINS must include at least one origin."
  );
  const storageConfigured = isStorageConfigured();
  const storage = getConfiguredStatus(
    false,
    storageConfigured,
    "Object storage is configured.",
    "Storage is optional until editorial uploads are enabled."
  );
  const internalAutomation = getConfiguredStatus(
    false,
    Boolean(env.internalApiToken),
    "Internal automation token is configured.",
    "INTERNAL_API_TOKEN is optional unless internal automation is enabled."
  );

  return {
    service: apiName,
    environment: getRuntimeEnvironment(),
    checkedAt: now(),
    ready: database.ready && auth.ready && cors.ready,
    components: {
      database,
      auth,
      cors,
      storage,
      internalAutomation
    }
  };
};
