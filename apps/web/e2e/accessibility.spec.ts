import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { isoDaysFromNow } from "./helpers";

const pages = [
  { name: "home", url: "/" },
  { name: "rules", url: "/rules" },
  { name: "assistant", url: "/assistant" },
  { name: "sign-in", url: "/sign-in" },
  { name: "deals", url: "/deals" },
  {
    name: "results",
    url: `/flights?origin=THR&destination=MHD&date=${isoDaysFromNow(10)}&adults=1`,
  },
];

for (const { name, url } of pages) {
  test(`${name} has no serious accessibility violations`, async ({ page }) => {
    await page.goto(url);
    await page.waitForLoadState("networkidle");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    const blocking = results.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    );
    expect(blocking, JSON.stringify(blocking.map((violation) => violation.id))).toEqual([]);
  });
}
