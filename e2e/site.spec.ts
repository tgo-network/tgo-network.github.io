import { expect, test } from "@playwright/test";

const siteUrl = process.env.E2E_SITE_URL ?? "http://localhost:4321";

const createSuffix = () => `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;

test("public homepage exposes the main content collections", async ({ page }) => {
  await page.goto(siteUrl);

  await expect(page.getByRole("heading", { name: "连接技术领导者、分会活动与长期交流网络" })).toBeVisible();
  await expect(page.getByRole("link", { name: "分会董事会", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "成员列表", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "活动", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "文章", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "加入申请", exact: true })).toBeVisible();

  await page.getByRole("link", { name: "查看全部分会" }).click();
  await expect(page).toHaveURL(/\/branches\/?$/);
  await expect(page.getByRole("heading", { name: "覆盖不同城市节点的技术领导者网络" })).toBeVisible();
});

test("public application form submits successfully", async ({ page }) => {
  const suffix = createSuffix();

  await page.goto(`${siteUrl}/join`);
  await page.getByLabel("姓名").fill(`端到端申请人 ${suffix}`);
  await page.getByLabel("手机号").fill("13800138099");
  await page.getByLabel("微信号").fill(`e2e-wechat-${suffix}`);
  await page.getByLabel("邮箱").fill(`e2e-applicant-${suffix}@example.com`);
  await page.getByLabel("个人介绍").fill("我负责技术团队管理与平台建设，希望通过端到端测试验证公开加入申请流程。");
  await page.getByLabel("申请信息").fill("希望加入本地分会，并持续参与技术领导者交流、闭门活动与专题研讨。");
  await page.getByRole("button", { name: "提交申请" }).click();

  await expect(page.locator("[data-form-status]")).toContainText("申请已提交，编号", {
    timeout: 15_000
  });
});

test("public event registration form submits successfully", async ({ page }) => {
  const suffix = createSuffix();

  await page.goto(`${siteUrl}/events/shanghai-ai-leadership-salon`);
  await page.getByLabel("姓名").fill(`端到端报名人 ${suffix}`);
  await page.getByLabel("手机号").fill("13900139099");
  await page.getByLabel("邮箱").fill(`e2e-attendee-${suffix}@example.com`);
  await page.getByLabel("公司").fill("端到端活动");
  await page.getByLabel("职称").fill("运营负责人");
  await page.getByRole("button", { name: "提交报名" }).click();

  await expect(page.locator("[data-event-registration-status]")).toContainText("报名已提交，编号", {
    timeout: 15_000
  });
});
