import { expect, test } from "@playwright/test";

import { signIn } from "./helpers";

test("protected routes redirect to sign-in with a safe next param", async ({ page }) => {
  await page.goto("/dashboard/bookings");
  await expect(page).toHaveURL(/\/sign-in\?next=/);
});

test("sign-in page is RTL Persian", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("lang", "fa");
});

test("a wrong code shows a Persian error and keeps the user on the page", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("شماره موبایل").fill("09120000001");
  await page.getByRole("button", { name: "دریافت کد تأیید" }).click();
  await page.locator("#otp-code").fill("000000");
  await expect(page.getByText("کد تأیید نادرست است")).toBeVisible();
  await expect(page).toHaveURL(/\/sign-in/);
});

test("signing in lands on the dashboard and the menu signs out again", async ({ page }) => {
  await signIn(page, "09120000002");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { level: 1, name: /سلام/ })).toBeVisible();

  await page.getByRole("button", { name: "منوی حساب کاربری" }).click();
  await page.getByRole("menuitem", { name: "خروج" }).click();
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in/);
});
