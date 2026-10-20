import { expect, test } from "@playwright/test";

import { signIn } from "./helpers";

test("pages ship a nonce-based CSP and nothing on them violates it", async ({ page }) => {
  const violations: string[] = [];
  page.on("console", (message) => {
    if (/Content Security Policy/i.test(message.text())) violations.push(message.text());
  });

  const response = await page.goto("/");
  const csp = response?.headers()["content-security-policy"] ?? "";
  expect(csp).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
  expect(csp).toContain("frame-ancestors 'none'");

  await page.goto("/sign-in");
  await page.getByLabel("شماره موبایل").fill("09120000010");
  await expect(page.getByRole("button", { name: "دریافت کد تأیید" })).toBeEnabled();
  expect(violations).toEqual([]);
});

test("deleting the account needs a fresh code", async ({ page }) => {
  await signIn(page, "09120000011");
  await page.goto("/dashboard/profile");

  await page.getByRole("button", { name: "حذف حساب کاربری" }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog.getByRole("button", { name: "حذف حساب" })).toHaveCount(0);
  await dialog.getByRole("button", { name: "ارسال کد تأیید" }).click();

  await dialog.locator("#delete-account-code").fill("000000");
  await dialog.getByRole("button", { name: "حذف حساب" }).click();
  await expect(page.getByText("کد تأیید نادرست است")).toBeVisible();

  await dialog.locator("#delete-account-code").fill("123456");
  await dialog.getByRole("button", { name: "حذف حساب" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in/);
});

test("signing out everywhere ends the session", async ({ page }) => {
  await signIn(page, "09120000012");
  await page.goto("/dashboard/profile");
  await page.getByRole("button", { name: "خروج از همه‌ی دستگاه‌ها" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in/);
});
