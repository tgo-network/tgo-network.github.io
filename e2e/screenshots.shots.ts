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

const expectMainHeading = (heading: string) => async (page: Page) => {
  await expect(page.locator("main h1").filter({ hasText: heading })).toBeVisible();
};

const expectArticlesIndexReady = async (page: Page) => {
  await expect(page.locator(".article-lead-card, .article-list-grid, .empty-article-state").first()).toBeVisible();
};

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
    { path: "/", name: "home", assertReady: expectMainHeading("面向科技领导者的高质量学习社区") },
    { path: "/branches", name: "branches", assertReady: expectMainHeading("分会董事会") },
    { path: "/members", name: "members", assertReady: expectMainHeading("成员列表") },
    { path: "/members/member-2", name: "member-detail", assertReady: expectMainHeading("郭理靖") },
    { path: "/events", name: "events", assertReady: expectMainHeading("各地分会活动") },
    { path: "/events/event-1816", name: "event-detail", assertReady: expectMainHeading("第一届龙虾AI大会：ClawCon") },
    { path: "/articles", name: "articles", assertReady: expectArticlesIndexReady },
    { path: "/articles/what-a-city-hub-needs", name: "article-detail", assertReady: expectMainHeading("一座城市主页在真正活起来之前需要什么") },
    { path: "/join", name: "join", assertReady: expectMainHeading("面向技术领导者的高质量同侪网络") },
    { path: "/about", name: "about", assertReady: expectMainHeading("关于 TGO 鲲鹏会") },
    { path: "/faq", name: "faq", assertReady: expectMainHeading("常见问题") },
    { path: "/privacy", name: "privacy", assertReady: expectMainHeading("隐私说明") },
    { path: "/terms", name: "terms", assertReady: expectMainHeading("使用条款") }
  ] as const;
  const viewports = [
    { label: "desktop", width: 1440, height: 1024 },
    { label: "mobile", width: 390, height: 844 }
  ] as const;

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    for (const route of siteRoutes) {
      await page.goto(`${siteUrl}${route.path}`, { waitUntil: "networkidle" });
      await route.assertReady(page);
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
  await page.goto(`${adminUrl}/login`, { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "工作人员登录" })).toBeVisible();
  await saveScreenshot(page, "admin/desktop", "login");
  await signIn(page);

  for (const route of adminRoutes) {
    await page.goto(`${adminUrl}${route.path}`, { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: route.heading })).toBeVisible();
    await saveScreenshot(page, "admin/desktop", route.name);
  }
});
