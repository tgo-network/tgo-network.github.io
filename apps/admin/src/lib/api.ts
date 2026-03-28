import type { ApiErrorShape, ApiSuccess } from "@tgo/shared";

import { getAdminApiBaseUrl } from "./runtime-config";

export const getApiBaseUrl = () => getAdminApiBaseUrl();

export class AdminApiError extends Error {
  status: number;
  code?: string;
  details?: Record<string, unknown>;

  constructor(message: string, status: number, code?: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface AdminRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
}

export const getValidationIssues = (error: unknown): Record<string, string> => {
  if (!(error instanceof AdminApiError)) {
    return {};
  }

  const issues = (error.details as { issues?: Array<{ field?: string; message?: string }> } | undefined)?.issues;

  if (!Array.isArray(issues)) {
    return {};
  }

  return Object.fromEntries(
    issues
      .filter((issue) => typeof issue.field === "string" && typeof issue.message === "string")
      .map((issue) => [issue.field!, issue.message!])
  );
};

export const adminRequest = async <T>(path: string, options: AdminRequestOptions = {}): Promise<T> => {
  const response = await fetch(new URL(path, getAdminApiBaseUrl()), {
    method: options.method ?? "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {})
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {})
  });

  const text = await response.text();
  const payload = (text ? JSON.parse(text) : null) as ApiSuccess<T> | ApiErrorShape | null;

  if (!response.ok || (payload && "error" in payload)) {
    const message = payload && "error" in payload ? payload.error.message : `Request failed with status ${response.status}`;
    const code = payload && "error" in payload ? payload.error.code : undefined;
    const details = payload && "error" in payload ? payload.error.details : undefined;
    throw new AdminApiError(message, response.status, code, details);
  }

  if (!payload || !("data" in payload)) {
    throw new AdminApiError("Response payload is missing data.", response.status);
  }

  return payload.data;
};

export const adminFetch = async <T>(path: string): Promise<T> => adminRequest<T>(path);
