import type { ApiSuccess } from "@tgo/shared";

export const ok = <T, M = Record<string, unknown>>(data: T, meta?: M): ApiSuccess<T, M> => ({
  data,
  ...(meta ? { meta } : {})
});
