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

interface AdminApiSuccessResponse<T, M = Record<string, unknown>> {
  data: T;
  meta?: M;
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

const requestAdminResponse = async <T, M = Record<string, unknown>>(
  path: string,
  options: AdminRequestOptions = {}
): Promise<AdminApiSuccessResponse<T, M>> => {
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
    const message = payload && "error" in payload ? payload.error.message : `请求失败，状态码 ${response.status}`;
    const code = payload && "error" in payload ? payload.error.code : undefined;
    const details = payload && "error" in payload ? payload.error.details : undefined;
    throw new AdminApiError(message, response.status, code, details);
  }

  if (!payload || !("data" in payload)) {
    throw new AdminApiError("响应内容缺少 data 字段。", response.status);
  }

  return {
    data: payload.data,
    meta: payload.meta as M | undefined
  };
};

export const adminRequest = async <T>(path: string, options: AdminRequestOptions = {}): Promise<T> => {
  const payload = await requestAdminResponse<T>(path, options);
  return payload.data;
};

export const adminRequestWithMeta = async <T, M = Record<string, unknown>>(
  path: string,
  options: AdminRequestOptions = {}
): Promise<AdminApiSuccessResponse<T, M>> => requestAdminResponse<T, M>(path, options);

export const adminFetch = async <T>(path: string): Promise<T> => adminRequest<T>(path);

export const adminFetchWithMeta = async <T, M = Record<string, unknown>>(
  path: string
): Promise<AdminApiSuccessResponse<T, M>> => adminRequestWithMeta<T, M>(path);
