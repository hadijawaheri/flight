import type { PinoLogger } from "nestjs-pino";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MelipayamakSmsProvider } from "./melipayamak-sms.provider.js";

const logger = { warn: vi.fn(), error: vi.fn() } as unknown as PinoLogger;
const reply = (status: number, body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

describe("MelipayamakSmsProvider", () => {
  const fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", fetchMock);
  afterEach(() => fetchMock.mockReset());

  const provider = new MelipayamakSmsProvider(
    { apiKey: "KEY", otpBodyId: 777, alertBodyId: undefined, from: undefined },
    logger,
  );
  const alert = { route: "تهران به مشهد", date: "۲۰ آبان", price: "۱٬۸۵۰٬۰۰۰ تومان" };

  it("sends the code through the approved pattern", async () => {
    fetchMock.mockReturnValueOnce(reply(200, { recId: 4_000_123, status: "ارسال موفق بود" }));
    await provider.sendOtp("09120000000", "123456");
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("https://console.melipayamak.com/api/send/shared/KEY");
    expect(JSON.parse(String(init?.body))).toEqual({
      bodyId: 777,
      to: "09120000000",
      args: ["123456"],
    });
  });

  it("fails when the operator rejects the message", async () => {
    fetchMock.mockReturnValueOnce(reply(200, { recId: 11, status: "خط نامعتبر" }));
    await expect(provider.sendOtp("09120000000", "123456")).rejects.toThrow(/خط نامعتبر/);
  });

  it("skips price alerts when no pattern or line is configured", async () => {
    expect(await provider.sendPriceAlert("09120000000", alert)).toBe("SKIPPED");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends price alerts through the approved alert pattern when there is one", async () => {
    const patterned = new MelipayamakSmsProvider(
      { apiKey: "KEY", otpBodyId: 777, alertBodyId: 888, from: "5000123" },
      logger,
    );
    fetchMock.mockReturnValueOnce(reply(200, { recId: 4_000_124, status: "ارسال موفق بود" }));
    expect(await patterned.sendPriceAlert("09120000000", alert)).toBe("SENT");
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("https://console.melipayamak.com/api/send/shared/KEY");
    expect(JSON.parse(String(init?.body))).toEqual({
      bodyId: 888,
      to: "09120000000",
      args: ["تهران به مشهد", "۲۰ آبان", "۱٬۸۵۰٬۰۰۰ تومان"],
    });
  });

  it("falls back to a free-text alert from the dedicated line", async () => {
    const lined = new MelipayamakSmsProvider(
      { apiKey: "KEY", otpBodyId: 777, alertBodyId: undefined, from: "5000123" },
      logger,
    );
    fetchMock.mockReturnValueOnce(reply(200, { recId: 4_000_125, status: "ارسال موفق بود" }));
    expect(await lined.sendPriceAlert("09120000000", alert)).toBe("SENT");
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("https://console.melipayamak.com/api/send/simple/KEY");
    const body = JSON.parse(String(init?.body)) as { from: string; text: string };
    expect(body.from).toBe("5000123");
    expect(body.text).toContain("تهران به مشهد");
    expect(body.text).toContain("۱٬۸۵۰٬۰۰۰ تومان");
  });

  it("reports a rejected price alert as a failure so it can be retried", async () => {
    const patterned = new MelipayamakSmsProvider(
      { apiKey: "KEY", otpBodyId: 777, alertBodyId: 888, from: undefined },
      logger,
    );
    fetchMock.mockReturnValueOnce(reply(500, {}));
    await expect(patterned.sendPriceAlert("09120000000", alert)).rejects.toThrow(/not sent/);
  });
});
