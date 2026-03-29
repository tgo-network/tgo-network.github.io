import { expect, test } from "@playwright/test";

const siteUrl = process.env.E2E_SITE_URL ?? "http://localhost:4321";

const createSuffix = () => `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;

test("public homepage exposes the main content collections", async ({ page }) => {
  await page.goto(siteUrl);

  await expect(page.getByRole("heading", { name: "组织首个版本内容结构的核心主题" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "已经可以面向公众浏览的长内容" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "可感知报名状态的活动页面" })).toBeVisible();

  await page.getByRole("link", { name: "查看全部主题" }).click();
  await expect(page).toHaveURL(/\/topics\/?$/);
  await expect(page.getByRole("heading", { name: "主题" })).toBeVisible();
});

test("public application form submits successfully", async ({ page }) => {
  const suffix = createSuffix();

  await page.goto(`${siteUrl}/apply`);
  await page.getByLabel("姓名").fill(`端到端申请人 ${suffix}`);
  await page.getByLabel("邮箱").fill(`e2e-applicant-${suffix}@example.com`);
  await page.getByLabel("公司").fill("端到端工作室");
  await page.getByLabel("城市").fill("上海");
  await page.getByLabel("申请说明").fill(
    "我想通过浏览器驱动的冒烟测试，完整验证公开申请流程是否能够顺利提交。"
  );
  await page.getByRole("button", { name: "提交申请" }).click();

  await expect(page.locator("[data-form-status]")).toContainText("已收到申请", {
    timeout: 15_000
  });
});

test("public event registration form submits successfully", async ({ page }) => {
  const suffix = createSuffix();

  await page.goto(`${siteUrl}/events/spring-platform-workshop`);
  await page.getByLabel("姓名").fill(`端到端报名人 ${suffix}`);
  await page.getByLabel("邮箱").fill(`e2e-attendee-${suffix}@example.com`);
  await page.getByLabel("公司").fill("端到端活动");
  await page.getByLabel("职位").fill("运营负责人");
  await page.getByRole("button", { name: "提交报名" }).click();

  await expect(page.locator("[data-event-registration-status]")).toContainText("参考编号", {
    timeout: 15_000
  });
});
