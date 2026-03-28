import { randomUUID } from "node:crypto";

import { apiName } from "@tgo/shared";
import type { Context } from "hono";

import { getEnv } from "./env.js";

const requestIdPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{5,127}$/;

type LogLevel = "info" | "error";

interface LogFields {
  [key: string]: unknown;
  requestId?: string;
  method?: string;
  path?: string;
  status?: number;
  durationMs?: number;
  userAgent?: string;
  userId?: string;
  staffAccountId?: string;
  errorName?: string;
  errorMessage?: string;
  stack?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getContextValue = (c: Context, key: string) => (c.get as (name: string) => unknown)(key);

const quoteLogfmtValue = (value: string) =>
  /^[A-Za-z0-9._:/-]+$/.test(value) ? value : JSON.stringify(value);

const toLogfmtString = (value: unknown) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return "null";
  }

  if (typeof value === "string") {
    return quoteLogfmtValue(value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return quoteLogfmtValue(JSON.stringify(value));
};

export const requestIdHeaderName = "X-Request-ID";

export const createRequestId = (incomingValue?: string) => {
  const normalized = incomingValue?.trim();

  return normalized && requestIdPattern.test(normalized) ? normalized : randomUUID();
};

export const getRequestId = (c: Context) => {
  const requestId = getContextValue(c, "requestId");

  return typeof requestId === "string" && requestId.length > 0 ? requestId : undefined;
};

export const getRequestStartedAt = (c: Context) => {
  const startedAt = getContextValue(c, "requestStartedAt");

  return typeof startedAt === "number" ? startedAt : undefined;
};

export const formatLogEntry = (level: LogLevel, message: string, fields: LogFields = {}) => {
  const env = getEnv();
  const timestamp = new Date().toISOString();
  const entry = {
    timestamp,
    level,
    service: apiName,
    environment: env.appEnvironment,
    message,
    ...fields
  };

  if (env.logFormat === "json") {
    return JSON.stringify(entry);
  }

  return Object.entries(entry)
    .flatMap(([key, value]) => {
      const formatted = toLogfmtString(value);
      return formatted === undefined ? [] : [`${key}=${formatted}`];
    })
    .join(" ");
};

export const logInfo = (message: string, fields?: LogFields) => {
  console.log(formatLogEntry("info", message, fields));
};

export const logError = (message: string, fields?: LogFields) => {
  console.error(formatLogEntry("error", message, fields));
};

export const serializeError = (error: unknown) => {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
      stack: error.stack
    };
  }

  if (isRecord(error)) {
    return {
      errorName: "UnknownError",
      errorMessage: JSON.stringify(error)
    };
  }

  return {
    errorName: "UnknownError",
    errorMessage: String(error)
  };
};
