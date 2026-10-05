import { expect, test } from "@playwright/test";

import { isoDaysFromNow, pickOption, randomNationalId, signIn } from "./helpers";

test("a traveller books a one-way flight and pays", async ({ page }) => {
  await page.goto(`/flights?origin=THR&destination=MHD&date=${isoDaysFromNow(12)}&adults=1`);
  await page.getByRole("button", { name: "انتخاب و ادامه" }).first().click();

  // The proxy sends visitors without a session to sign in, then back to the checkout with the flight intact.
  await expect(page).toHaveURL(/\/sign-in\?next=/);
  await signIn(page);
  await expect(page).toHaveURL(/\/checkout\/new\?.*outbound=/);

  await page.getByLabel("نام (فارسی)").fill("علی");
  await page.getByLabel("نام خانوادگی (فارسی)").fill("رضایی");
  await page.getByLabel("نام (لاتین، مطابق گذرنامه)").fill("Ali");
  await page.getByLabel("نام خانوادگی (لاتین)").fill("Rezaei");
  await page.getByLabel("کد ملی").fill(randomNationalId());
  await pickOption(page, "تاریخ تولد: روز", "۱۰");
  await pickOption(page, "تاریخ تولد: ماه", "مهر");
  await pickOption(page, "تاریخ تولد: سال", "۱۳۷۰");
  await page.getByRole("radio", { name: "مرد" }).click();

  await page.getByRole("button", { name: "ثبت رزرو و رفتن به پرداخت" }).click();
  await expect(page).toHaveURL(/\/checkout\/[a-f0-9]{24}$/);
  await expect(page.getByRole("timer")).toBeVisible();

  await page.getByRole("button", { name: "پرداخت", exact: true }).click();
  await expect(page.getByRole("heading", { name: "پرداخت با موفقیت انجام شد" })).toBeVisible();

  await page.getByRole("link", { name: "مشاهده‌ی بلیت" }).click();
  await expect(page.getByText("تأیید شده")).toBeVisible();
});

test("a failed payment keeps the seats and allows another try", async ({ page }) => {
  await signIn(page);
  await page.goto(`/flights?origin=THR&destination=MHD&date=${isoDaysFromNow(13)}&adults=1`);
  await page.getByRole("button", { name: "انتخاب و ادامه" }).first().click();
  await expect(page).toHaveURL(/\/checkout\/new/);

  await page.getByLabel("نام (فارسی)").fill("سارا");
  await page.getByLabel("نام خانوادگی (فارسی)").fill("احمدی");
  await page.getByLabel("نام (لاتین، مطابق گذرنامه)").fill("Sara");
  await page.getByLabel("نام خانوادگی (لاتین)").fill("Ahmadi");
  await page.getByLabel("کد ملی").fill(randomNationalId());
  await pickOption(page, "تاریخ تولد: روز", "۵");
  await pickOption(page, "تاریخ تولد: ماه", "فروردین");
  await pickOption(page, "تاریخ تولد: سال", "۱۳۷۵");
  await page.getByRole("radio", { name: "زن" }).click();
  await page.getByRole("button", { name: "ثبت رزرو و رفتن به پرداخت" }).click();

  await page.getByRole("radio", { name: "پرداخت ناموفق" }).click();
  await page.getByRole("button", { name: "پرداخت", exact: true }).click();
  await expect(page.getByText("پرداخت انجام نشد").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "تلاش دوباره برای پرداخت" })).toBeVisible();
});
