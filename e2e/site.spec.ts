import { expect, test, type Page } from "@playwright/test";

const siteUrl = process.env.E2E_SITE_URL ?? "http://localhost:4321";
const openEventSlug = "event-1816";
const openEventTitle = "第一届龙虾AI大会：ClawCon";
const leadArticleSlug = "what-a-city-hub-needs";
const leadArticleTitle = "一座城市主页在真正活起来之前需要什么";
const leadMemberSlug = "zhou-yang";
const leadMemberName = "周扬";

const createSuffix = () => `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
const keyRoutes = [
  {
    path: "/",
    heading: "连接技术领导者、分会活动与长期交流网络"
  },
  {
    path: "/branches",
    heading: "覆盖不同城市节点的技术领导者网络"
  },
  {
    path: "/members",
    heading: "来自不同公司与城市分会的技术领导者"
  },
  {
    path: "/events",
    heading: "各地分会活动与公开报名入口"
  },
  {
    path: "/articles",
    heading: "围绕技术管理、组织实践与社区观察的内容沉淀"
  },
  {
    path: "/join",
    heading: "面向技术领导者的高质量同侪网络"
  },
  {
    path: "/about",
    heading: "一个围绕技术领导者成长而组织起来的长期社区网络"
  }
] as const;
const detailRoutes = [
  {
    path: `/members/${leadMemberSlug}`,
    heading: leadMemberName
  },
  {
    path: `/events/${openEventSlug}`,
    heading: openEventTitle
  },
  {
    path: `/articles/${leadArticleSlug}`,
    heading: leadArticleTitle
  }
] as const;

const expectNoHorizontalOverflow = async (page: Page, label: string) => {
  const metrics = await page.evaluate(() => {
    const root = document.documentElement;
    const viewportWidth = root.clientWidth;
    const scrollWidth = root.scrollWidth;
    const offenders = Array.from(document.querySelectorAll("body *"))
      .map((element) => {
        const rect = element.getBoundingClientRect();

        return {
          tag: element.tagName.toLowerCase(),
          text: (element.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 48),
          left: Math.round(rect.left),
          right: Math.round(rect.right)
        };
      })
      .filter((item) => item.left < -1 || item.right > viewportWidth + 1)
      .slice(0, 8);

    return {
      viewportWidth,
      scrollWidth,
      offenders
    };
  });

  expect(metrics.scrollWidth, `${label} 存在横向溢出：${JSON.stringify(metrics.offenders)}`).toBeLessThanOrEqual(
    metrics.viewportWidth + 1
  );
};

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

  await page.goto(`${siteUrl}/events/${openEventSlug}`);
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

test("public key pages keep desktop and mobile layouts within the viewport", async ({ page }) => {
  for (const viewport of [
    { width: 1440, height: 1024, label: "desktop" },
    { width: 390, height: 844, label: "mobile" }
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    for (const route of keyRoutes) {
      await test.step(`${viewport.label} ${route.path}`, async () => {
        await page.goto(`${siteUrl}${route.path}`, { waitUntil: "networkidle" });
        await expect(page.locator("main h1").filter({ hasText: route.heading })).toBeVisible();
        await expect(page.getByRole("navigation", { name: "主导航" })).toBeVisible();
        await expectNoHorizontalOverflow(page, `${viewport.label}:${route.path}`);
      });
    }
  }
});

test("public detail pages keep desktop and mobile layouts within the viewport", async ({ page }) => {
  for (const viewport of [
    { width: 1440, height: 1024, label: "desktop" },
    { width: 390, height: 844, label: "mobile" }
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    for (const route of detailRoutes) {
      await test.step(`${viewport.label} ${route.path}`, async () => {
        await page.goto(`${siteUrl}${route.path}`, { waitUntil: "networkidle" });
        await expect(page.locator("main h1").filter({ hasText: route.heading })).toBeVisible();
        await expectNoHorizontalOverflow(page, `${viewport.label}:${route.path}`);
      });
    }
  }
});

test("public content drill-down routes expose the expected detail content", async ({ page }) => {
  await page.goto(`${siteUrl}/members`, { waitUntil: "networkidle" });
  await page.getByRole("link", { name: /周扬/ }).click();
  await expect(page).toHaveURL(new RegExp(`/members/${leadMemberSlug}$`));
  await expect(page.getByRole("heading", { name: leadMemberName })).toBeVisible();
  await expect(page.locator(".member-detail-side-card .card-label").filter({ hasText: "成员档案" })).toBeVisible();
  await expectNoHorizontalOverflow(page, "member-detail");

  await page.goto(`${siteUrl}/articles`, { waitUntil: "networkidle" });
  await page.getByRole("link", { name: /一座城市主页在真正活起来之前需要什么/ }).first().click();
  await expect(page).toHaveURL(/\/articles\/[^/]+$/);
  await expect(page.getByRole("heading", { name: leadArticleTitle })).toBeVisible();
  await expect(page.getByText("继续浏览")).toBeVisible();
  await expectNoHorizontalOverflow(page, "article-detail");

  await page.goto(`${siteUrl}/events/${openEventSlug}`, { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: openEventTitle })).toBeVisible();
  await expect(page.locator(".registration-panel .card-label").filter({ hasText: "活动报名" })).toBeVisible();
  await expect(page.getByRole("button", { name: "提交报名" })).toBeVisible();
  await expectNoHorizontalOverflow(page, "event-detail");

  await page.goto(`${siteUrl}/about`, { waitUntil: "networkidle" });
  await page.getByRole("link", { name: "查看加入说明" }).click();
  await expect(page).toHaveURL(/\/join$/);
  await expect(page.locator("main h1").filter({ hasText: "面向技术领导者的高质量同侪网络" })).toBeVisible();
});

test("branch quick-jump chips open the targeted branch disclosure", async ({ page }) => {
  await page.goto(`${siteUrl}/branches`, { waitUntil: "networkidle" });

  const chips = page.locator(".branch-chip-row a");
  const chipCount = await chips.count();
  expect(chipCount).toBeGreaterThan(1);

  const targetChip = chips.last();
  const href = await targetChip.getAttribute("href");
  const slug = href?.replace(/^#/, "") ?? "";

  expect(slug).not.toBe("");
  await targetChip.click();
  await expect(page).toHaveURL(new RegExp(`#${slug}$`));

  const disclosure = page.locator(`[data-branch-disclosure][data-branch-slug="${slug}"]`);
  await expect
    .poll(async () => disclosure.evaluate((node) => node.hasAttribute("open")), {
      message: `expected disclosure for ${slug} to open after quick jump`
    })
    .toBe(true);
  await expectNoHorizontalOverflow(page, "branches-disclosure");
});
