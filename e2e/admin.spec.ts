import { expect, test } from "@playwright/test";

const adminUrl = process.env.E2E_ADMIN_URL ?? "http://localhost:5173";
const adminEmail = process.env.DEV_ADMIN_EMAIL ?? "admin@tgo.local";
const adminPassword = process.env.DEV_ADMIN_PASSWORD ?? "TgoAdmin123456!";

test("admin redirects unauthenticated users to login and supports dashboard navigation", async ({ page }) => {
  await page.goto(`${adminUrl}/dashboard`);
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "工作人员登录" })).toBeVisible();

  await page.getByLabel("邮箱").fill(adminEmail);
  await page.getByLabel("密码").fill(adminPassword);
  await page.getByRole("button", { name: "登录" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "仪表盘" })).toBeVisible();
  await expect(page.getByText(adminEmail)).toBeVisible();
  await expect(page.getByRole("link", { name: "成员" })).toBeVisible();
  await expect(page.getByRole("link", { name: "工作人员" })).toBeVisible();

  await page.getByRole("link", { name: "成员" }).click();
  await expect(page).toHaveURL(/\/members$/);
  await expect(page.getByRole("heading", { name: "成员" })).toBeVisible();
  await expect(page.getByRole("link", { name: "新增成员" })).toBeVisible();

  await page.getByRole("button", { name: "退出登录" }).click();
  await expect(page).toHaveURL(/\/login$/);
});
