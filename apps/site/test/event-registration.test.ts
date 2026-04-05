import assert from "node:assert/strict";
import test from "node:test";

import { sanitizeEventRegistrationUrl, shouldShowExternalRegistrationLink } from "../src/lib/event-registration.js";

test("keeps valid registration form URLs and safe relative paths", () => {
  assert.equal(sanitizeEventRegistrationUrl("https://www.infoq.cn/form/?id=2980"), "https://www.infoq.cn/form/?id=2980");
  assert.equal(sanitizeEventRegistrationUrl(" /join/event-1 "), "/join/event-1");
});

test("drops imported asset URLs and binary file links from registration URLs", () => {
  assert.equal(
    sanitizeEventRegistrationUrl("https://static001.geekbang.org/resource/image/ab/db/ab048275f1dd37edbdf4e85bd836a9db.png"),
    null
  );
  assert.equal(sanitizeEventRegistrationUrl("http://cdn001.geekbang.org/ck/5a0a68866038b.png"), null);
  assert.equal(sanitizeEventRegistrationUrl("/downloads/event-1.pdf"), null);
});

test("shows external registration links only when registration is still open", () => {
  assert.equal(shouldShowExternalRegistrationLink("open", "https://www.infoq.cn/form/?id=2980"), true);
  assert.equal(shouldShowExternalRegistrationLink("waitlist", "https://www.infoq.cn/form/?id=2980"), true);
  assert.equal(shouldShowExternalRegistrationLink("closed", "https://www.infoq.cn/form/?id=2980"), false);
  assert.equal(shouldShowExternalRegistrationLink("not_open", "https://www.infoq.cn/form/?id=2980"), false);
  assert.equal(shouldShowExternalRegistrationLink("open", null), false);
});
