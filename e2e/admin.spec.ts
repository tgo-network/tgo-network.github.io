import { expect, test, type Locator, type Page } from "@playwright/test";

const adminUrl = process.env.E2E_ADMIN_URL ?? "http://localhost:5173";
const siteUrl = process.env.E2E_SITE_URL ?? "http://localhost:4321";
const adminEmail = process.env.DEV_ADMIN_EMAIL ?? "admin@tgo.local";
const adminPassword = process.env.DEV_ADMIN_PASSWORD ?? "TgoAdmin123456!";
const openEventSlug = "event-1816";
const openEventTitle = "第一届龙虾AI大会：ClawCon";

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

const expectDefaultPagination = async (page: Page, rows: Locator) => {
  await expect(page.getByLabel("每页数量")).toHaveValue("20");
  expect(await rows.count()).toBeLessThanOrEqual(20);
};

const signIn = async (page: Page) => {
  await page.getByLabel("邮箱").fill(adminEmail);
  await page.getByLabel("密码").fill(adminPassword);
  await page.getByRole("button", { name: "登录" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "仪表盘", exact: true })).toBeVisible();
};

test("admin redirects unauthenticated users to login and supports dashboard navigation", async ({ page }) => {
  await page.goto(`${adminUrl}/dashboard`);
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "工作人员登录", exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page, "admin-login");

  await signIn(page);
  await expect(page.locator(".sidebar-account strong")).toBeVisible();
  await expect(page.getByRole("link", { name: "会员", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Staff", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "角色", exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Staff", exact: true }).click();
  await expect(page).toHaveURL(/\/staff$/);
  await expect(page.getByRole("heading", { name: "工作人员", exact: true })).toBeVisible();
  const staffFilters = page.locator(".filter-panel").first();
  await expect(staffFilters.getByLabel("状态")).toBeVisible();
  await expect(staffFilters.getByLabel("角色")).toBeVisible();
  await expectDefaultPagination(page, page.locator("tbody tr"));
  await expectNoHorizontalOverflow(page, "admin-staff");

  await page.getByRole("link", { name: "角色", exact: true }).click();
  await expect(page).toHaveURL(/\/roles$/);
  await expect(page.getByRole("heading", { name: "角色", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "系统角色" })).toBeVisible();
  await expectDefaultPagination(page, page.locator("tbody tr"));
  await expectNoHorizontalOverflow(page, "admin-roles");

  await page.getByRole("link", { name: "会员", exact: true }).click();
  await expect(page).toHaveURL(/\/members$/);
  await expect(page.getByRole("heading", { name: "成员", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "新增成员" })).toBeVisible();
  await expectDefaultPagination(page, page.locator("tbody tr"));

  const auditLogsLink = page.getByRole("link", { name: "日志", exact: true });
  await expect(auditLogsLink).toBeVisible();
  await page.goto(`${adminUrl}/audit-logs`);
  await expect(page).toHaveURL(/\/audit-logs$/);
  await expect(page.getByRole("heading", { name: "审计日志", exact: true })).toBeVisible();
  await expect(page.getByPlaceholder("搜索动作、对象、操作人或目标 ID")).toBeVisible();

  await page.getByRole("button", { name: "退出登录" }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("admin article list supports keyword filtering and preview actions", async ({ page }) => {
  await page.goto(`${adminUrl}/login`);
  await signIn(page);

  await page.getByRole("link", { name: "文章", exact: true }).click();
  await expect(page).toHaveURL(/\/articles$/);
  await expect(page.getByRole("heading", { name: "文章", exact: true })).toBeVisible();
  await expectDefaultPagination(page, page.locator("tbody tr"));

  const searchInput = page.getByPlaceholder("搜索标题、slug、作者或分会");
  await searchInput.fill("城市主页");

  const articleTable = page.locator("tbody");
  await expect(articleTable).toContainText("一座城市主页在真正活起来之前需要什么");
  await expect(articleTable).not.toContainText("在不锁死技术栈的前提下交付内容平台");
  await expect(page.getByRole("link", { name: "前台预览" }).first()).toBeVisible();
});

test("admin editor pages expose structured overview and editing controls", async ({ page }) => {
  await page.goto(`${adminUrl}/login`);
  await signIn(page);

  await page.getByRole("link", { name: "文章", exact: true }).click();
  await page.getByPlaceholder("搜索标题、slug、作者或分会").fill("城市主页");
  await page.locator("tr", { hasText: "一座城市主页在真正活起来之前需要什么" }).first().getByRole("link", { name: "编辑" }).click();
  await expect(page).toHaveURL(/\/articles\/[^/]+\/edit$/);
  await expect(page.getByRole("heading", { name: /编辑文章：/ })).toBeVisible();
  await expect(page.getByText("发布信息", { exact: true })).toBeVisible();
  await expect(page.getByText("封面资源", { exact: true })).toBeVisible();
  await expect(page.getByText("SEO（可选）", { exact: true })).toBeVisible();
  await expect(page.getByLabel("定时发布时间")).toBeVisible();
  await expect(page.getByText("Markdown 正文", { exact: true })).toBeVisible();
  await expect(page.getByText("实时预览", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "插入标题" }).first()).toBeVisible();
  await expectNoHorizontalOverflow(page, "admin-article-editor");

  await page.goto(`${adminUrl}/events`, { waitUntil: "networkidle" });
  await page.getByPlaceholder("搜索标题、slug 或分会").fill(openEventSlug);
  await page.locator("tr", { hasText: openEventSlug }).first().getByRole("link", { name: "编辑" }).click();
  await expect(page).toHaveURL(/\/events\/[^/]+\/edit$/);
  await expect(page.getByRole("heading", { name: /编辑活动：/ })).toBeVisible();
  await expect(page.getByText("活动封面", { exact: true })).toBeVisible();
  await expect(page.getByText("报名设置", { exact: true })).toBeVisible();
  await expect(page.getByLabel("报名状态")).toBeVisible();
  await expect(page.getByText("议程", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Markdown 正文", { exact: true })).toBeVisible();
  await expect(page.getByText("实时预览", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "插入标题" }).first()).toBeVisible();
  await expectNoHorizontalOverflow(page, "admin-event-editor");

  await page.goto(`${adminUrl}/members`, { waitUntil: "networkidle" });
  await page.getByPlaceholder("搜索姓名、slug、公司、职称或分会").fill("周扬");
  await page.locator("tr", { hasText: "周扬" }).first().getByRole("link", { name: "编辑" }).click();
  await expect(page).toHaveURL(/\/members\/[^/]+\/edit$/);
  await expect(page.getByRole("heading", { name: /编辑成员：/ })).toBeVisible();
  await expect(page.getByText("成员状态", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("可见性", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("公开路径", { exact: true }).first()).toBeVisible();
  await expectNoHorizontalOverflow(page, "admin-member-editor");
});

test("admin branch, asset, and site configuration pages expose refined management layouts", async ({ page }) => {
  await page.goto(`${adminUrl}/login`);
  await signIn(page);

  await page.goto(`${adminUrl}/members/branches`, { waitUntil: "networkidle" });
  await expect(page).toHaveURL(/\/members\/branches$/);
  await expect(page.getByRole("heading", { name: "分会维护", exact: true })).toBeVisible();
  await expect(page.getByText("分会列表", { exact: true })).toBeVisible();
  await expectDefaultPagination(page, page.locator("tbody tr"));
  await page.getByPlaceholder("搜索分会、slug、城市或区域").fill("上海");
  await expect(page.locator("tbody")).toContainText("上海分会");
  await expectNoHorizontalOverflow(page, "admin-branches");

  await page.locator("tr", { hasText: "上海分会" }).first().getByRole("link", { name: "编辑" }).click();
  await expect(page).toHaveURL(/\/members\/branches\/[^/]+\/edit$/);
  await expect(page.getByRole("heading", { name: /编辑分会：/ })).toBeVisible();
  await expect(page.getByText("当前状态", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("公开路径", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("状态", { exact: true }).first()).toBeVisible();
  await expectNoHorizontalOverflow(page, "admin-branch-editor");

  await page.goto(`${adminUrl}/assets`, { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "资源", exact: true })).toBeVisible();
  await expect(page.getByText("资源列表", { exact: true })).toBeVisible();
  await expect(page.getByPlaceholder("搜索文件名、对象键、替代文本或 MIME 类型")).toBeVisible();
  await expect(page.getByText("资源类型", { exact: true }).first()).toBeVisible();
  await expectDefaultPagination(page, page.locator("tbody tr"));
  await expectNoHorizontalOverflow(page, "admin-assets");

  await page.goto(`${adminUrl}/site/homepage`, { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "首页配置", exact: true })).toBeVisible();
  await expect(page.getByText("首屏状态", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("当前精选内容", { exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page, "admin-site-homepage");

  await page.goto(`${adminUrl}/site/pages/about`, { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "关于页", exact: true })).toBeVisible();
  await expect(page.getByText("页面状态", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("内容结构", { exact: true }).first()).toBeVisible();
  await expectNoHorizontalOverflow(page, "admin-site-about");

  await page.goto(`${adminUrl}/site/pages/join`, { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "加入页", exact: true })).toBeVisible();
  await expect(page.getByText("页面状态", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("内容结构", { exact: true }).first()).toBeVisible();
  await expectNoHorizontalOverflow(page, "admin-site-join");
});

test("admin dashboard and core lists support layout and filter verification", async ({ page }) => {
  await page.goto(`${adminUrl}/login`);
  await signIn(page);

  await expect(page.getByText("文章总数", { exact: true })).toBeVisible();
  await expect(page.getByText("活动总数", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "快捷入口" })).toBeVisible();
  await expect(page.locator(".dashboard-quick-links").getByRole("link", { name: /申请/ })).toBeVisible();
  await expectNoHorizontalOverflow(page, "admin-dashboard");

  await page.getByRole("link", { name: "活动", exact: true }).click();
  await expect(page).toHaveURL(/\/events$/);
  await expect(page.getByRole("heading", { name: "活动", exact: true })).toBeVisible();
  await expectDefaultPagination(page, page.locator("tbody tr"));
  const eventSearchInput = page.getByPlaceholder("搜索标题、slug 或分会");
  await expect(page.getByText(/第 \d+ \/ \d+ 页 · 每页 \d+ 条 · 当前 \d+ 条/).last()).toBeVisible();
  await eventSearchInput.fill(openEventSlug);
  await expect(page.locator("tr", { hasText: openEventSlug }).first()).toContainText(openEventTitle);
  await expect(page.locator("tr", { hasText: openEventSlug }).first().getByRole("link", { name: "报名审核" })).toBeVisible();
  await eventSearchInput.fill("event-1615");
  await expect(page.locator("tr", { hasText: "event-1615" }).first()).toContainText("未分配分会");
  await expectNoHorizontalOverflow(page, "admin-events");

  await page.getByRole("link", { name: "申请", exact: true }).click();
  await expect(page).toHaveURL(/\/applications$/);
  await expect(page.getByRole("heading", { name: "申请", exact: true })).toBeVisible();
  await expectDefaultPagination(page, page.locator("tbody tr"));
  await page.getByPlaceholder("搜索姓名、手机号、微信号、邮箱或分会").fill("李昊然");
  await expect(page.locator("tbody")).toContainText("李昊然");
  await expect(page.locator("tr", { hasText: "李昊然" }).first().getByRole("link", { name: "审核" })).toBeVisible();
  await expectNoHorizontalOverflow(page, "admin-applications");

  await page.getByRole("link", { name: "会员", exact: true }).click();
  await expect(page).toHaveURL(/\/members$/);
  await expect(page.getByRole("heading", { name: "成员", exact: true })).toBeVisible();
  await expectDefaultPagination(page, page.locator("tbody tr"));
  await page.getByPlaceholder("搜索姓名、slug、公司、职称或分会").fill("周扬");
  await expect(page.locator("tbody")).toContainText("周扬");
  await expect(page.getByRole("link", { name: "前台预览" }).first()).toBeVisible();
  await expectNoHorizontalOverflow(page, "admin-members");

  await page.getByRole("link", { name: "日志", exact: true }).click();
  await expect(page).toHaveURL(/\/audit-logs$/);
  await expect(page.getByRole("heading", { name: "审计日志", exact: true })).toBeVisible();
  await expect(page.getByPlaceholder("搜索动作、对象、操作人或目标 ID")).toBeVisible();
  await expectDefaultPagination(page, page.locator(".audit-log-card"));
  await expectNoHorizontalOverflow(page, "admin-audit-logs");
});

test("admin review detail flows support saving application and registration decisions", async ({ page }) => {
  const suffix = Date.now().toString();
  const attendeeName = `管理端报名人 ${suffix}`;

  await page.goto(`${adminUrl}/login`);
  await signIn(page);

  await page.getByRole("link", { name: "申请", exact: true }).click();
  await expect(page).toHaveURL(/\/applications$/);
  await page.getByPlaceholder("搜索姓名、手机号、微信号、邮箱或分会").fill("李昊然");
  await page.locator("tr", { hasText: "李昊然" }).first().getByRole("link", { name: "审核" }).click();
  await expect(page).toHaveURL(/\/applications\/[^/]+$/);
  await expect(page.getByRole("heading", { name: "李昊然" })).toBeVisible();
  await page.getByLabel("状态").selectOption("in_review");
  await page.getByLabel("审核备注").fill(`Playwright 自动审核备注 ${suffix}`);
  await page.getByRole("button", { name: "保存审核" }).click();
  await expect(page.getByText("申请审核已更新。")).toBeVisible();
  await expect(page.locator(".editor-side .status-pill")).toContainText("审核中");

  await page.goto(`${siteUrl}/events/${openEventSlug}`, { waitUntil: "networkidle" });
  await page.getByLabel("姓名").fill(attendeeName);
  await page.getByLabel("手机号").fill("13900139098");
  await page.getByLabel("邮箱").fill(`admin-registration-${suffix}@example.com`);
  await page.getByLabel("公司").fill("Playwright 运营");
  await page.getByLabel("职称").fill("测试负责人");
  await page.getByLabel("补充信息").fill("用于验证后台审核报名详情页的保存流程。");
  await page.getByRole("button", { name: "提交报名" }).click();
  await expect(page.locator("[data-event-registration-status]")).toContainText("报名已提交，编号", {
    timeout: 15_000
  });

  await page.goto(`${adminUrl}/events`, { waitUntil: "networkidle" });
  await page.getByPlaceholder("搜索标题、slug 或分会").fill(openEventSlug);
  const openEventRow = page.locator("tr", { hasText: openEventSlug }).first();
  await expect(openEventRow).toContainText(openEventTitle);
  await openEventRow.getByRole("link", { name: "报名审核" }).click();
  await expect(page).toHaveURL(/\/events\/[^/]+\/registrations$/);
  await expect(page.getByRole("heading", { name: openEventTitle })).toBeVisible();
  await expectDefaultPagination(page, page.locator("tbody tr"));
  await expect(page.locator("tbody")).toContainText(attendeeName);
  await page.locator("tr", { hasText: attendeeName }).getByRole("link", { name: "审核" }).click();
  await expect(page).toHaveURL(/\/registrations\/[^/]+$/);
  await expect(page.getByRole("heading", { name: attendeeName })).toBeVisible();
  await page.getByLabel("状态").selectOption("approved");
  await page.getByLabel("审核备注").fill(`Playwright 自动报名审核 ${suffix}`);
  await page.getByRole("button", { name: "保存审核" }).click();
  await expect(page.getByText("报名状态已更新。")).toBeVisible();
  await expect(page.getByLabel("状态")).toHaveValue("approved");
  await expect(page.locator(".editor-side .status-pill").first()).toContainText("开放中");
});
