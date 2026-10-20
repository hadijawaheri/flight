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
    { apiKey: "KEY", otpBodyId: 777, from: undefined },
    logger,
  );

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

  it("skips notifications without a sender line", async () => {
    await provider.sendNotification("09120000000", "hi");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
