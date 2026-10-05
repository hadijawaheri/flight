import { expect, test } from "@playwright/test";

import { isoDaysFromNow } from "./helpers";

test("search results show a price insight and the detail page shows the analysis", async ({
  page,
}) => {
  await page.goto(`/flights?origin=THR&destination=MHD&date=${isoDaysFromNow(10)}&adults=1`);

  const firstCard = page
    .getByRole("list", { name: "نتایج پرواز" })
    .or(page.getByRole("region", { name: "نتایج پرواز" }))
    .getByRole("listitem")
    .first();
  await expect(firstCard).toBeVisible();
  await expect(firstCard.getByText(/الان بخرید|صبر کنید/)).toBeVisible();

  await firstCard.getByRole("link", { name: "جزئیات و تحلیل قیمت" }).click();
  await expect(page.getByRole("heading", { name: "تحلیل قیمت" })).toBeVisible();
  await expect(page.getByRole("img", { name: /نمودار قیمت/ })).toBeVisible();
});

test("filters narrow the list and can be cleared", async ({ page }) => {
  await page.goto(`/flights?origin=THR&destination=MHD&date=${isoDaysFromNow(10)}&adults=1`);
  const counter = page.getByText(/پرواز از .* پرواز/);
  await expect(counter).toBeVisible();

  await page.getByRole("checkbox", { name: /صبح/ }).check();
  await expect(page).toHaveURL(/times=MORNING/);
  await page
    .getByRole("button", { name: /حذف فیلترها/ })
    .first()
    .click();
  await expect(page).not.toHaveURL(/times=/);
});

test("rules can be searched and each rule shows how far to trust it", async ({ page }) => {
  await page.goto("/rules");
  await page.getByRole("searchbox", { name: "عبارت جست‌وجو" }).fill("پاوربانک");
  await page.getByRole("button", { name: "جست‌وجو" }).click();
  await page
    .getByRole("link", { name: /پاوربانک|باتری/ })
    .first()
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(
    page.getByText(/قاعده‌ی عمومی|بسته به ایرلاین و نرخ|ممکن است تغییر کند/).first(),
  ).toBeVisible();
});

test("the assistant answers a baggage question with a source", async ({ page }) => {
  await page.goto("/assistant");
  await page.getByLabel("سؤال شما").fill("پاوربانک در پرواز مجاز است؟");
  await page.getByRole("button", { name: "ارسال" }).click();
  await expect(page.getByRole("log", { name: "گفت‌وگو با دستیار" }).getByText("منبع")).toBeVisible({
    timeout: 20_000,
  });
});
