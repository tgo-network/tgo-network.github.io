import assert from "node:assert/strict";
import { test } from "node:test";

import { markdownToPlainText, renderMarkdownToHtml } from "@tgo/shared";

test("renders markdown into structured html without enabling raw html passthrough", () => {
  const source = [
    "## 标题",
    "",
    "正文里包含 **强调**、[链接](https://tgo.network) 和 `inline code`。",
    "",
    "- 条目一",
    "- 条目二",
    "",
    "> 引用说明",
    "",
    "```ts",
    "const cityHub = true;",
    "```",
    "",
    "<script>alert('xss')</script>"
  ].join("\n");

  const result = renderMarkdownToHtml(source);

  assert.match(result, /<h2>标题<\/h2>/);
  assert.match(result, /<strong>强调<\/strong>/);
  assert.match(result, /<a href="https:\/\/tgo\.network">链接<\/a>/);
  assert.match(result, /<li>条目一<\/li>/);
  assert.match(result, /<blockquote>/);
  assert.match(result, /<pre><code class="language-ts">const cityHub = true;/);
  assert.match(result, /&lt;script&gt;alert\('xss'\)&lt;\/script&gt;/);
});

test("extracts plain text from markdown for reading-time calculations", () => {
  const source = [
    "## 标题",
    "",
    "正文包含 **强调** 和 `inline code`。",
    "",
    "- 条目一",
    "- 条目二"
  ].join("\n");

  const result = markdownToPlainText(source);

  assert.equal(result.includes("标题"), true);
  assert.equal(result.includes("正文包含"), true);
  assert.equal(result.includes("inline code"), true);
  assert.equal(result.includes("条目一"), true);
  assert.equal(result.includes("**"), false);
  assert.equal(result.includes("##"), false);
});
