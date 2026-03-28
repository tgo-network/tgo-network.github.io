import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export const jsonError = (
  c: Context,
  status: ContentfulStatusCode,
  code: string,
  message: string,
  details?: Record<string, unknown>
) =>
  c.json(
    {
      error: {
        code,
        message,
        ...(details ? { details } : {})
      }
    },
    {
      status
    }
  );
