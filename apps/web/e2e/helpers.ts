import { expect, type Page } from "@playwright/test";

/** A valid Iranian national code that is different on every call, so reruns never hit the duplicate-traveller rule. */
export function randomNationalId(): string {
  for (;;) {
    const digits = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
    if (digits.every((digit) => digit === digits[0])) continue;
    const sum = digits.reduce((acc, digit, index) => acc + digit * (10 - index), 0);
    const remainder = sum % 11;
    const check = remainder < 2 ? remainder : 11 - remainder;
    return [...digits, check].join("");
  }
}

export function isoDaysFromNow(days: number): string {
  const date = new Date(Date.now() + days * 86_400_000);
  return date.toISOString().slice(0, 10);
}

/** Uses the fixed OTP the API accepts when started with OTP_FIXED_CODE=123456 (test environments only). */
export async function signIn(page: Page, mobile = "09120000000"): Promise<void> {
  // Keep the ?next= the proxy added when the visitor is already on the sign-in page
  if (!page.url().includes("/sign-in")) await page.goto("/sign-in");
  await page.getByLabel("شماره موبایل").fill(mobile);
  await page.getByRole("button", { name: "دریافت کد تأیید" }).click();
  await page.locator("#otp-code").fill("123456");
  await expect(page).not.toHaveURL(/\/sign-in/);
}

export async function pickOption(
  page: Page,
  triggerName: string,
  optionName: string,
): Promise<void> {
  await page.getByRole("combobox", { name: triggerName }).click();
  await page.getByRole("option", { name: optionName, exact: true }).click();
}
