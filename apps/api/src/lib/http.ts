import type { ApiSuccess } from "@tgo/shared";

export const ok = <T>(data: T, meta?: Record<string, unknown>): ApiSuccess<T> => ({
  data,
  ...(meta ? { meta } : {})
});
