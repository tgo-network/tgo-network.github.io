const splitCsv = (value: string | undefined, fallback: string[]) =>
  value
    ? value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
    : fallback;

const getOptional = (value: string | undefined) => {
  const normalized = value?.trim();

  return normalized ? normalized : undefined;
};

const getBoolean = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) {
    return fallback;
  }

  return !["0", "false", "no", "off"].includes(value.trim().toLowerCase());
};

const getPositiveInteger = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const getLogFormat = (value: string | undefined): "json" | "logfmt" => {
  const normalized = value?.trim().toLowerCase();

  if (normalized === "json") {
    return "json";
  }

  return "logfmt";
};

export const getEnv = () => ({
  appEnvironment: getOptional(process.env.APP_ENV) ?? getOptional(process.env.NODE_ENV) ?? "development",
  appVersion: getOptional(process.env.APP_VERSION),
  gitSha: getOptional(process.env.GIT_SHA),
  logFormat: getLogFormat(process.env.LOG_FORMAT ?? (process.env.NODE_ENV === "production" ? "json" : "logfmt")),
  databaseUrl: process.env.DATABASE_URL,
  betterAuthSecret: process.env.BETTER_AUTH_SECRET,
  betterAuthUrl: process.env.BETTER_AUTH_URL ?? process.env.PUBLIC_API_BASE_URL ?? "http://localhost:8787",
  internalApiToken: getOptional(process.env.INTERNAL_API_TOKEN),
  s3Endpoint: getOptional(process.env.S3_ENDPOINT),
  s3Region: getOptional(process.env.S3_REGION) ?? "us-east-1",
  s3Bucket: getOptional(process.env.S3_BUCKET),
  s3AccessKeyId: getOptional(process.env.S3_ACCESS_KEY_ID),
  s3SecretAccessKey: getOptional(process.env.S3_SECRET_ACCESS_KEY),
  s3PublicBaseUrl: getOptional(process.env.S3_PUBLIC_BASE_URL),
  s3ForcePathStyle: getBoolean(process.env.S3_FORCE_PATH_STYLE, Boolean(getOptional(process.env.S3_ENDPOINT))),
  storageEnvironment:
    getOptional(process.env.APP_ENV) ?? (process.env.NODE_ENV === "production" ? "prod" : "dev"),
  assetUploadExpiresInSeconds: getPositiveInteger(process.env.ASSET_UPLOAD_EXPIRES_IN_SECONDS, 900),
  publicWriteRateLimitWindowSeconds: getPositiveInteger(process.env.PUBLIC_WRITE_RATE_LIMIT_WINDOW_SECONDS, 300),
  publicApplicationRateLimitMax: getPositiveInteger(process.env.PUBLIC_APPLICATION_RATE_LIMIT_MAX, 8),
  publicEventRegistrationRateLimitMax: getPositiveInteger(process.env.PUBLIC_EVENT_REGISTRATION_RATE_LIMIT_MAX, 12),
  assetImageMaxDimension: getPositiveInteger(process.env.ASSET_IMAGE_MAX_DIMENSION, 12000),
  assetImageMaxPixels: getPositiveInteger(process.env.ASSET_IMAGE_MAX_PIXELS, 40_000_000),
  corsAllowedOrigins: splitCsv(process.env.CORS_ALLOWED_ORIGINS, [
    "http://localhost:4321",
    "http://localhost:5173"
  ])
});

export const hasDatabaseUrl = () => Boolean(getEnv().databaseUrl);

export const isAuthConfigured = () => {
  const env = getEnv();

  return Boolean(env.databaseUrl && env.betterAuthSecret);
};

export const isStorageConfigured = () => {
  const env = getEnv();

  return Boolean(env.s3Bucket && env.s3AccessKeyId && env.s3SecretAccessKey);
};
