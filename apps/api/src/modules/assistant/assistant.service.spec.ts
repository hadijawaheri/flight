import { describe, expect, it } from "vitest";

import { MockFlightProvider } from "../../infra/flight/mock-flight.provider.js";
import { AssistantService } from "./assistant.service.js";

describe("AssistantService", () => {
  const provider = new MockFlightProvider();
  const service = new AssistantService(provider);

  it("handles cheap flight inquiries with deals and prompts", async () => {
    const response = await service.answerQuestion({
      question: "ارزان‌ترین پروازها کجاست؟",
    });
    expect(response.answer).toBeDefined();
    expect(response.deals?.length).toBeGreaterThan(0);
    expect(response.suggestedAction?.type).toBe("VIEW_DEALS");
  });

  it("handles baggage rules inquiries", async () => {
    const response = await service.answerQuestion({
      question: "چند کیلو بار مجازه؟",
    });
    expect(response.answer).toContain("کیلوگرم");
  });
});
