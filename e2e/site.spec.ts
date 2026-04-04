import { expect, test, type Page } from "@playwright/test";

const siteUrl = process.env.E2E_SITE_URL ?? "http://localhost:4321";
const openEventSlug = "event-1816";
const openEventTitle = "第一届龙虾AI大会：ClawCon";
const leadArticleSlug = "what-a-city-hub-needs";
const leadArticleTitle = "一座城市主页在真正活起来之前需要什么";
const leadMemberSlug = "member-2";
const leadMemberName = "郭理靖";
const expectedBranchOrder = ["北京", "上海", "深圳", "广州", "杭州", "成都", "硅谷", "南京", "厦门", "苏州", "武汉", "新加坡"];

const createSuffix = () => `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
const expectMainHeading = (heading: string) => async (page: Page) => {
  await expect(page.locator("main h1").filter({ hasText: heading })).toBeVisible();
};

const expectArticlesIndexReady = async (page: Page) => {
  await expect(page.locator(".article-lead-card, .article-list-grid, .empty-article-state").first()).toBeVisible();
};

const keyRoutes = [
  {
    path: "/",
    assertReady: expectMainHeading("科技领导者的长期学习与交流社区")
  },
  {
    path: "/branches",
    assertReady: expectMainHeading("分会董事会")
  },
  {
    path: "/members",
    assertReady: expectMainHeading("成员列表")
  },
  {
    path: "/events",
    assertReady: expectMainHeading("活动")
  },
  {
    path: "/articles",
    assertReady: expectArticlesIndexReady
  },
  {
    path: "/join",
    assertReady: expectMainHeading("加入申请")
  },
  {
    path: "/about",
    assertReady: expectMainHeading("关于 TGO 鲲鹏会")
  },
  {
    path: "/faq",
    assertReady: expectMainHeading("常见问题")
  },
  {
    path: "/privacy",
    assertReady: expectMainHeading("隐私说明")
  },
  {
    path: "/terms",
    assertReady: expectMainHeading("使用条款")
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
  const primaryNav = page.getByRole("navigation", { name: "主导航" });

  await expect(page.getByRole("heading", { name: "科技领导者的长期学习与交流社区" })).toBeVisible();
  await expect(primaryNav.getByRole("link", { name: "分会董事会", exact: true })).toBeVisible();
  await expect(primaryNav.getByRole("link", { name: "成员列表", exact: true })).toBeVisible();
  await expect(primaryNav.getByRole("link", { name: "活动", exact: true })).toBeVisible();
  await expect(primaryNav.getByRole("link", { name: "文章", exact: true })).toBeVisible();
  await expect(primaryNav.getByRole("link", { name: "加入申请", exact: true })).toBeVisible();
  await expect(primaryNav.getByRole("link", { name: "FAQ", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "成员推荐" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "近期活动" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "近期文章" })).toBeVisible();
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
        await route.assertReady(page);
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

test("public events listing keeps stacked cards on desktop and mobile", async ({ page }) => {
  for (const viewport of [
    { width: 1440, height: 1024, label: "desktop", expectedGridColumns: 3 },
    { width: 390, height: 844, label: "mobile", expectedGridColumns: 1 }
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(`${siteUrl}/events`, { waitUntil: "networkidle" });

    const layout = await page.evaluate(() => {
      const grid = document.querySelector("[data-event-grid]");
      const firstCardLink = document.querySelector(".event-card-link");
      const firstMedia = document.querySelector(".event-card-media-shell");

      return {
        gridColumns: grid ? getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).length : 0,
        cardColumns: firstCardLink ? getComputedStyle(firstCardLink).gridTemplateColumns.trim().split(/\s+/).length : 0,
        cardRows: firstCardLink ? getComputedStyle(firstCardLink).gridTemplateRows.trim().split(/\s+/).length : 0,
        mediaBorderBottom: firstMedia ? getComputedStyle(firstMedia).borderBottomWidth : "0px"
      };
    });

    expect(layout.gridColumns, `${viewport.label} 活动列表列数异常`).toBe(viewport.expectedGridColumns);
    expect(layout.cardColumns, `${viewport.label} 活动卡片不应再是左右分栏`).toBe(1);
    expect(layout.cardRows, `${viewport.label} 活动卡片应保持图片在上、内容在下`).toBeGreaterThanOrEqual(2);
    expect(layout.mediaBorderBottom, `${viewport.label} 活动卡片图片与内容之间应保留分隔线`).toBe("1px");
    await expectNoHorizontalOverflow(page, `${viewport.label}:events-listing-stacked`);
  }
});

test("public members listing keeps styled card layout after client render", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1024 });
  await page.goto(`${siteUrl}/members`, { waitUntil: "networkidle" });

  const layout = await page.evaluate(() => {
    const grid = document.querySelector("[data-member-grid]");
    const firstCard = document.querySelector(".member-directory-card");
    const firstHead = document.querySelector(".member-directory-head");
    const firstAvatar = document.querySelector(".member-directory-avatar, .member-directory-avatar-fallback");

    return {
      gridColumns: grid ? getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).length : 0,
      cardDisplay: firstCard ? getComputedStyle(firstCard).display : "",
      headColumns: firstHead ? getComputedStyle(firstHead).gridTemplateColumns.trim().split(/\s+/).length : 0,
      avatarWidth: firstAvatar ? getComputedStyle(firstAvatar).width : "0px",
      avatarHeight: firstAvatar ? getComputedStyle(firstAvatar).height : "0px"
    };
  });

  expect(layout.gridColumns, "成员列表桌面端应保持四列网格").toBe(4);
  expect(layout.cardDisplay, "成员卡片应保持网格布局").toBe("grid");
  expect(layout.headColumns, "成员卡片头部应保持头像与文字两列布局").toBe(2);
  expect(layout.avatarWidth, "成员头像尺寸异常，可能样式未命中").toBe("72px");
  expect(layout.avatarHeight, "成员头像高度异常，可能样式未命中").toBe("72px");
  await expectNoHorizontalOverflow(page, "desktop:members-directory-cards");
});

test("public content drill-down routes expose the expected detail content", async ({ page }) => {
  await page.goto(`${siteUrl}/members`, { waitUntil: "networkidle" });
  const firstMemberCard = page.locator("[data-member-grid] a").first();
  const firstMemberName = (await firstMemberCard.locator("h2").textContent())?.trim() ?? "";
  const firstMemberHref = await firstMemberCard.getAttribute("href");
  await firstMemberCard.click();
  await expect(page).toHaveURL(new RegExp(`${firstMemberHref ?? "/members/.+"}$`));
  await expect(page.locator("main h1").filter({ hasText: firstMemberName })).toBeVisible();
  await expect(page.getByRole("link", { name: "返回成员列表" })).toBeVisible();
  await expectNoHorizontalOverflow(page, "member-detail");

  await page.goto(`${siteUrl}/articles`, { waitUntil: "networkidle" });
  await page.getByRole("link", { name: /一座城市主页在真正活起来之前需要什么/ }).first().click();
  await expect(page).toHaveURL(/\/articles\/[^/]+$/);
  await expect(page.getByRole("heading", { name: leadArticleTitle })).toBeVisible();
  await expect(page.getByRole("link", { name: "返回文章列表" })).toBeVisible();
  await expectNoHorizontalOverflow(page, "article-detail");

  await page.goto(`${siteUrl}/events/${openEventSlug}`, { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: openEventTitle })).toBeVisible();
  await expect(page.locator(".registration-panel h2").filter({ hasText: "活动报名" })).toBeVisible();
  await expect(page.getByRole("button", { name: "提交报名" })).toBeVisible();
  await expectNoHorizontalOverflow(page, "event-detail");

  await page.goto(`${siteUrl}/about`, { waitUntil: "networkidle" });
  await page.locator(".about-cta-card").getByRole("link", { name: "加入申请" }).click();
  await expect(page).toHaveURL(/\/join$/);
  await expect(page.locator("main h1").filter({ hasText: "加入申请" })).toBeVisible();
});

test("branches page shows imported board member records", async ({ page }) => {
  await page.goto(`${siteUrl}/branches`, { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "广州分会" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "杨韶伟" })).toBeVisible();
  await expect(page.getByText("广州威而比科技有限公司", { exact: true }).first()).toBeVisible();
  await expectNoHorizontalOverflow(page, "branches-board-list");
});

test("branch order stays aligned across branches, members and events pages", async ({ page }) => {
  await page.goto(`${siteUrl}/branches`, { waitUntil: "networkidle" });
  const branchHeadings = await page.locator(".branch-record-title").evaluateAll((items) =>
    items.map((item) => item.textContent?.trim() ?? "").filter(Boolean)
  );
  expect(branchHeadings.slice(0, expectedBranchOrder.length)).toEqual(expectedBranchOrder.map((city) => `${city}分会`));

  await page.goto(`${siteUrl}/members`, { waitUntil: "networkidle" });
  const memberFilterTexts = await page.locator("[data-member-filters] [data-member-city]").evaluateAll((items) =>
    items.map((item) => item.textContent?.trim() ?? "").filter(Boolean)
  );
  expect(memberFilterTexts.slice(1, expectedBranchOrder.length + 1)).toEqual(expectedBranchOrder);

  await page.goto(`${siteUrl}/events`, { waitUntil: "networkidle" });
  const eventFilterTexts = await page.locator("[data-event-filters] [data-city-filter]").evaluateAll((items) =>
    items.map((item) => item.textContent?.trim() ?? "").filter(Boolean)
  );
  expect(eventFilterTexts.slice(1, expectedBranchOrder.length + 1)).toEqual(expectedBranchOrder);
});
