import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import {
  adminRequest,
  adminRequestWithMeta,
  AdminApiError,
  getApiBaseUrl,
  getValidationIssues
} from "../src/lib/api.js";

const originalFetch = globalThis.fetch;
const originalApiBaseUrl = process.env.VITE_API_BASE_URL;

afterEach(() => {
  globalThis.fetch = originalFetch;

  if (originalApiBaseUrl === undefined) {
    delete process.env.VITE_API_BASE_URL;
  } else {
    process.env.VITE_API_BASE_URL = originalApiBaseUrl;
  }
});

test("uses the configured VITE_API_BASE_URL for admin requests", async () => {
  process.env.VITE_API_BASE_URL = "http://admin-api.test:9898";

  let requestedUrl = "";
  let requestedMethod = "";
  let requestedCredentials = "";

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    requestedUrl = String(input);
    requestedMethod = init?.method ?? "GET";
    requestedCredentials = String(init?.credentials ?? "");

    return new Response(
      JSON.stringify({
        data: {
          ok: true
        }
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json"
        }
      }
    );
  }) as typeof fetch;

  const result = await adminRequest<{ ok: boolean }>("/api/admin/v1/me");

  assert.equal(getApiBaseUrl(), "http://admin-api.test:9898");
  assert.equal(requestedUrl, "http://admin-api.test:9898/api/admin/v1/me");
  assert.equal(requestedMethod, "GET");
  assert.equal(requestedCredentials, "include");
  assert.deepEqual(result, { ok: true });
});

test("throws AdminApiError and extracts validation issues from error details", async () => {
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        error: {
          code: "VALIDATION_ERROR",
          message: "One or more fields are invalid.",
          details: {
            issues: [
              {
                field: "email",
                message: "Email must be a valid email address."
              },
              {
                field: "roleIds",
                message: "Select at least one role."
              }
            ]
          }
        }
      }),
      {
        status: 400,
        headers: {
          "content-type": "application/json"
        }
      }
    )) as typeof fetch;

  await assert.rejects(
    () => adminRequest("/api/admin/v1/staff", { method: "POST", body: { email: "bad" } }),
    (error: unknown) => {
      assert.ok(error instanceof AdminApiError);
      assert.equal(error.status, 400);
      assert.equal(error.code, "VALIDATION_ERROR");
      assert.deepEqual(getValidationIssues(error), {
        email: "Email must be a valid email address.",
        roleIds: "Select at least one role."
      });
      return true;
    }
  );
});

test("returns data and meta for admin requests that include pagination metadata", async () => {
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        data: [
          {
            id: "event-1"
          }
        ],
        meta: {
          total: 99,
          page: 2,
          pageSize: 25
        }
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json"
        }
      }
    )) as typeof fetch;

  const result = await adminRequestWithMeta<Array<{ id: string }>, { total: number; page: number; pageSize: number }>(
    "/api/admin/v1/events?page=2"
  );

  assert.deepEqual(result.data, [{ id: "event-1" }]);
  assert.deepEqual(result.meta, {
    total: 99,
    page: 2,
    pageSize: 25
  });
});
