import { describe, expect, it } from "vitest";

import { DisabledSmsProvider } from "./disabled-sms.provider.js";

describe("DisabledSmsProvider", () => {
  const provider = new DisabledSmsProvider();

  it("refuses to send a code with a 503", async () => {
    await expect(provider.sendOtp()).rejects.toMatchObject({ code: "SMS_UNAVAILABLE" });
  });

  it("skips price alerts instead of failing the sweep", async () => {
    await expect(provider.sendPriceAlert()).resolves.toBe("SKIPPED");
  });
});
