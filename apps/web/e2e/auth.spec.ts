import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

// Inputs are server-rendered: a fill() before hydration is wiped when React takes over
async function fillMobile(page: Page, value: string) {
  const input = page.getByLabel("شماره موبایل");
  await expect(async () => {
    await input.fill(value);
    await expect(input).toHaveValue(value, { timeout: 500 });
  }).toPass();
}

const mobile = () => `0913${String(Date.now()).slice(-7)}`;

test("protected routes redirect to sign-in with a safe next param", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fdashboard$/);
});

test("page is RTL Persian and has no serious accessibility violations", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("lang", "fa");

  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
});

test("full flow: OTP sign-in with persian digits, profile update, logout", async ({ page }) => {
  await page.goto("/sign-in?next=/dashboard");

  await fillMobile(
    page,
    mobile().replace(/\d/g, (d) => String.fromCharCode(0x06f0 + Number(d))),
  );
  await page.getByRole("button", { name: "دریافت کد تأیید" }).click();

  // Persian digits typed on a Persian keyboard
  const otp = page.locator("input[autocomplete=one-time-code]");
  await otp.waitFor();
  await otp.pressSequentially("۱۲۳۴۵۶");

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByTestId("greeting")).toHaveText("خوش آمدید");

  await page.getByLabel("نام", { exact: true }).fill("علی");
  await page.getByLabel("نام خانوادگی").fill("رضایی");
  await page.getByRole("button", { name: "ذخیره" }).click();
  await expect(page.getByTestId("greeting")).toHaveText("سلام علی");

  await page.getByRole("button", { name: "خروج" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in\?next=/);
});

test("wrong code shows a Persian error and keeps the user on the page", async ({ page }) => {
  await page.goto("/sign-in");
  await fillMobile(page, mobile());
  await page.getByRole("button", { name: "دریافت کد تأیید" }).click();
  const otp = page.locator("input[autocomplete=one-time-code]");
  await otp.waitFor();
  await otp.pressSequentially("000000");
  await expect(page.getByText("کد تأیید نادرست است")).toBeVisible();
  await expect(page).toHaveURL(/\/sign-in/);
});
