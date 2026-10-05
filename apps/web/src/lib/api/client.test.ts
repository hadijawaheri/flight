import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "./client";
import { ApiError } from "./parse";

const json = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status });

describe("api client", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("returns parsed data and sends credentials", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { data: 1 }));
    await expect(api("/x")).resolves.toEqual({ data: 1 });
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ credentials: "include" });
  });

  it("throws ApiError with the server code and message", async () => {
    fetchMock.mockResolvedValueOnce(
      json(400, { statusCode: 400, code: "OTP_INVALID", message: "کد نادرست است" }),
    );
    await expect(api("/auth/otp/verify", { method: "POST", json: {} })).rejects.toMatchObject({
      status: 400,
      code: "OTP_INVALID",
      message: "کد نادرست است",
    });
  });

  it("refreshes once and retries when several requests get 401 together", async () => {
    let refreshCalls = 0;
    const unauthorizedOnce = new Set<string>();
    fetchMock.mockImplementation((input) => {
      const url = String(input);
      if (url === "/api/auth/refresh") {
        refreshCalls += 1;
        return Promise.resolve(json(204));
      }
      if (!unauthorizedOnce.has(url)) {
        unauthorizedOnce.add(url);
        return Promise.resolve(
          json(401, { statusCode: 401, code: "UNAUTHENTICATED", message: "x" }),
        );
      }
      return Promise.resolve(json(200, { data: url }));
    });

    const results = await Promise.all([api("/a"), api("/b"), api("/c")]);
    expect(results).toEqual([{ data: "/api/a" }, { data: "/api/b" }, { data: "/api/c" }]);
    expect(refreshCalls).toBe(1);
  });

  it("does not loop when refresh fails", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { assign, pathname: "/dashboard", search: "?tab=1" });
    fetchMock.mockImplementation((input) =>
      Promise.resolve(
        String(input) === "/api/auth/refresh"
          ? json(401, { statusCode: 401, code: "UNAUTHENTICATED", message: "x" })
          : json(401, { statusCode: 401, code: "UNAUTHENTICATED", message: "x" }),
      ),
    );
    await expect(api("/a")).rejects.toBeInstanceOf(ApiError);
    // The query string must survive the round trip so the traveller lands back on the same view
    expect(assign).toHaveBeenCalledWith("/sign-in?next=%2Fdashboard%3Ftab%3D1");
  });
});
