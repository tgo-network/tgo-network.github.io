import { dirname, join } from "node:path";
import { mkdirSync, rmSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";

const siteUrl = process.env.E2E_SITE_URL ?? "http://localhost:4321";
const adminUrl = process.env.E2E_ADMIN_URL ?? "http://localhost:5173";
const adminEmail = process.env.DEV_ADMIN_EMAIL ?? "admin@tgo.local";
const adminPassword = process.env.DEV_ADMIN_PASSWORD ?? "TgoAdmin123456!";
const outputRoot = process.env.PLAYWRIGHT_SCREENSHOT_DIR ?? join(process.cwd(), "artifacts", "screenshots");

rmSync(outputRoot, { recursive: true, force: true });
mkdirSync(outputRoot, { recursive: true });

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const saveScreenshot = async (page: Page, group: string, name: string) => {
  const filePath = join(outputRoot, group, `${slugify(name)}.png`);
  mkdirSync(dirname(filePath), { recursive: true });
  await page.screenshot({ path: filePath, fullPage: true });
};

const signIn = async (page: Page) => {
  await page.goto(`${adminUrl}/login`, { waitUntil: "networkidle" });
  await page.getByLabel("邮箱").fill(adminEmail);
  await page.getByLabel("密码").fill(adminPassword);
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
};

test.describe.configure({ mode: "serial" });

test("capture public site screenshots", async ({ page }) => {
  const siteRoutes = [
    { path: "/", heading: "连接技术领导者、分会活动与长期交流网络", name: "home" },
    { path: "/branches", heading: "覆盖不同城市节点的技术领导者网络", name: "branches" },
    { path: "/members", heading: "来自不同公司与城市分会的技术领导者", name: "members" },
    { path: "/events", heading: "各地分会活动与公开报名入口", name: "events" },
    { path: "/articles", heading: "围绕技术管理、组织实践与社区观察的内容沉淀", name: "articles" },
    { path: "/join", heading: "面向技术领导者的高质量同侪网络", name: "join" },
    { path: "/about", heading: "一个围绕技术领导者成长而组织起来的长期社区网络", name: "about" }
  ] as const;
  const viewports = [
    { label: "desktop", width: 1440, height: 1024 },
    { label: "mobile", width: 390, height: 844 }
  ] as const;

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    for (const route of siteRoutes) {
      await page.goto(`${siteUrl}${route.path}`, { waitUntil: "networkidle" });
      await expect(page.locator("main h1").filter({ hasText: route.heading })).toBeVisible();
      await saveScreenshot(page, `site/${viewport.label}`, route.name);
    }
  }
});

test("capture admin screenshots", async ({ page }) => {
  const adminRoutes = [
    { path: "/dashboard", heading: "仪表盘", name: "dashboard" },
    { path: "/articles", heading: "文章", name: "articles" },
    { path: "/events", heading: "活动", name: "events" },
    { path: "/applications", heading: "申请", name: "applications" },
    { path: "/members", heading: "成员", name: "members" },
    { path: "/audit-logs", heading: "审计日志", name: "audit-logs" }
  ] as const;

  await page.setViewportSize({ width: 1440, height: 1024 });
  await signIn(page);

  for (const route of adminRoutes) {
    await page.goto(`${adminUrl}${route.path}`, { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: route.heading })).toBeVisible();
    await saveScreenshot(page, "admin/desktop", route.name);
  }
});
