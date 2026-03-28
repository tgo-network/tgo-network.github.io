import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import { getRequestId } from "./observability.js";

export const jsonError = (
  c: Context,
  status: ContentfulStatusCode,
  code: string,
  message: string,
  details?: Record<string, unknown>
) => {
  const requestId = getRequestId(c);

  return c.json(
    {
      error: {
        code,
        message,
        ...(requestId ? { requestId } : {}),
        ...(details ? { details } : {})
      }
    },
    {
      status
    }
  );
};
