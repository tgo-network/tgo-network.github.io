import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { createRequestId, formatLogEntry } from "../src/lib/observability.js";

const originalLogFormat = process.env.LOG_FORMAT;

afterEach(() => {
  if (originalLogFormat === undefined) {
    delete process.env.LOG_FORMAT;
  } else {
    process.env.LOG_FORMAT = originalLogFormat;
  }
});

test("formatLogEntry emits JSON payloads when LOG_FORMAT=json", () => {
  process.env.LOG_FORMAT = "json";

  const line = formatLogEntry("info", "request.completed", {
    requestId: "req_123456",
    path: "/health",
    status: 200,
    durationMs: 12
  });
  const parsed = JSON.parse(line) as Record<string, unknown>;

  assert.equal(parsed.level, "info");
  assert.equal(parsed.message, "request.completed");
  assert.equal(parsed.requestId, "req_123456");
  assert.equal(parsed.path, "/health");
  assert.equal(parsed.status, 200);
  assert.equal(parsed.durationMs, 12);
});

test("formatLogEntry emits logfmt payloads when LOG_FORMAT=logfmt", () => {
  process.env.LOG_FORMAT = "logfmt";

  const line = formatLogEntry("error", "request.failed", {
    requestId: "req_abcdef",
    path: "/api/admin/v1/dashboard",
    status: 500,
    errorMessage: "boom"
  });

  assert.match(line, /level=error/);
  assert.match(line, /message=request\.failed/);
  assert.match(line, /requestId=req_abcdef/);
  assert.match(line, /path=\/api\/admin\/v1\/dashboard/);
  assert.match(line, /status=500/);
  assert.match(line, /errorMessage=boom/);
});

test("createRequestId keeps valid caller-provided ids and replaces unsafe ids", () => {
  assert.equal(createRequestId("req-123456"), "req-123456");

  const generated = createRequestId("invalid value with spaces");

  assert.notEqual(generated, "invalid value with spaces");
  assert.match(generated, /^[0-9a-f-]{36}$/i);
});
