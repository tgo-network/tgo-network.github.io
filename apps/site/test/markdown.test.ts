import assert from "node:assert/strict";
import { test } from "node:test";

import { markdownToPlainText, normalizeLegacyEventMarkdown, renderMarkdownToHtml } from "@tgo/shared";

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

test("normalizes imported legacy event copy into markdown-friendly structure", () => {
  const source = [
    "活动简介",
    "这是一场面向技术领导者的闭门交流。",
    "",
    "● 认识同城成员",
    "● 讨论组织议题",
    "",
    "谁该来？怎么参与？",
    "🦞 如果你是 TGO 会员",
    "优先报名。",
    "",
    "参会须知",
    "1、本次活动需审核。",
    "2、审核通过后会继续联系。"
  ].join("\n");

  const normalized = normalizeLegacyEventMarkdown(source);
  const html = renderMarkdownToHtml(normalized);

  assert.match(normalized, /^## 活动简介/m);
  assert.match(normalized, /^- 认识同城成员/m);
  assert.match(normalized, /^### 如果你是 TGO 会员/m);
  assert.match(normalized, /^1\. 本次活动需审核。/m);
  assert.match(html, /<h2>活动简介<\/h2>/);
  assert.match(html, /<h3>如果你是 TGO 会员<\/h3>/);
  assert.match(html, /<li>认识同城成员<\/li>/);
});
