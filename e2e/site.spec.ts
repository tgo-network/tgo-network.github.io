import { expect, test } from "@playwright/test";

const siteUrl = process.env.E2E_SITE_URL ?? "http://localhost:4321";

const createSuffix = () => `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;

test("public homepage exposes the main content collections", async ({ page }) => {
  await page.goto(siteUrl);

  await expect(page.getByRole("heading", { name: "Editorial themes that organize the first release" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Long-form content ready for public browsing" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Registration-aware event pages" })).toBeVisible();

  await page.getByRole("link", { name: "View all topics" }).click();
  await expect(page).toHaveURL(/\/topics\/?$/);
  await expect(page.getByRole("heading", { name: "Topics" })).toBeVisible();
});

test("public application form submits successfully", async ({ page }) => {
  const suffix = createSuffix();

  await page.goto(`${siteUrl}/apply`);
  await page.getByLabel("Name").fill(`E2E Applicant ${suffix}`);
  await page.getByLabel("Email").fill(`e2e-applicant-${suffix}@example.com`);
  await page.getByLabel("Company").fill("E2E Studio");
  await page.getByLabel("City").fill("SHANGHAI");
  await page.getByLabel("Why are you applying?").fill(
    "I want to validate the public application flow end to end with a browser-driven smoke test."
  );
  await page.getByRole("button", { name: "Submit application" }).click();

  await expect(page.locator("[data-form-status]")).toContainText("Received application", {
    timeout: 15_000
  });
});

test("public event registration form submits successfully", async ({ page }) => {
  const suffix = createSuffix();

  await page.goto(`${siteUrl}/events/spring-platform-workshop`);
  await page.getByLabel("Name").fill(`E2E Attendee ${suffix}`);
  await page.getByLabel("Email").fill(`e2e-attendee-${suffix}@example.com`);
  await page.getByLabel("Company").fill("E2E Events");
  await page.getByLabel("Job title").fill("Operations Lead");
  await page.getByRole("button", { name: "Submit registration" }).click();

  await expect(page.locator("[data-event-registration-status]")).toContainText("Reference", {
    timeout: 15_000
  });
});
