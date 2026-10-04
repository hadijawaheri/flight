import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MobileStep } from "./mobile-step";

function renderStep(onSent = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MobileStep onSent={onSent} />
    </QueryClientProvider>,
  );
  return onSent;
}

describe("MobileStep", () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("shows a persian error for an invalid mobile and does not call the API", async () => {
    renderStep();
    await userEvent.type(screen.getByLabelText("شماره موبایل"), "123");
    await userEvent.click(screen.getByRole("button", { name: "دریافت کد تأیید" }));

    expect(await screen.findByText("شماره موبایل معتبر نیست")).toBeInTheDocument();
    expect(screen.getByLabelText("شماره موبایل")).toHaveAttribute("aria-invalid", "true");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("normalizes persian digits before sending", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const onSent = renderStep();
    await userEvent.type(screen.getByLabelText("شماره موبایل"), "۰۹۱۲۳۴۵۶۷۸۹");
    await userEvent.click(screen.getByRole("button", { name: "دریافت کد تأیید" }));

    await waitFor(() => expect(onSent).toHaveBeenCalledWith("09123456789"));
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      mobile: "09123456789",
    });
  });

  it("keeps the LTR direction on the mobile field", () => {
    renderStep();
    expect(screen.getByLabelText("شماره موبایل")).toHaveAttribute("dir", "ltr");
  });
});
