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

  it("handles domestic baggage rules inquiries", async () => {
    const response = await service.answerQuestion({
      question: "چند کیلو بار مجازه؟",
    });
    expect(response.answer).toContain("کیلوگرم");
    expect(response.answer).toContain("اکونومی");
  });

  it("handles international baggage and specific airline rules (Turkish/Emirates)", async () => {
    const response = await service.answerQuestion({
      question: "بار مجاز پرواز ترکیش چقدره؟",
    });
    expect(response.answer).toContain("ترکیش");
    expect(response.answer).toContain("کیلوگرم");
  });

  it("handles dangerous goods and powerbank rules", async () => {
    const response = await service.answerQuestion({
      question: "آیا بردن پاوربانک در هواپیما مجازه؟",
    });
    expect(response.answer).toContain("پاوربانک");
    expect(response.answer).toContain("کابین");
  });

  it("handles pet travel regulations (AVIH)", async () => {
    const response = await service.answerQuestion({
      question: "قوانین بردن سگ و گربه در پرواز چطوره؟",
    });
    expect(response.answer).toContain("حیوانات خانگی");
    expect(response.answer).toContain("واکسن هاری");
  });

  it("handles pregnant passenger guidelines", async () => {
    const response = await service.answerQuestion({
      question: "تا ماه چندم بارداری میشه سوار هواپیما شد؟",
    });
    expect(response.answer).toContain("بارداری");
    expect(response.answer).toContain("هفته");
  });

  it("handles infant and children rules including strollers", async () => {
    const response = await service.answerQuestion({
      question: "قیمت بلیط نوزاد چقدره و کالسکه هزینه داره؟",
    });
    expect(response.answer).toContain("نوزاد");
    expect(response.answer).toContain("کالسکه");
    expect(response.answer).toContain("رایگان");
  });

  it("handles medical and wheelchair services", async () => {
    const response = await service.answerQuestion({
      question: "هزینه ویلچر در فرودگاه چقدره؟",
    });
    expect(response.answer).toContain("ویلچر");
    expect(response.answer).toContain("رایگان");
  });

  it("handles Mehrabad terminal routing for airlines", async () => {
    const response = await service.answerQuestion({
      question: "پرواز ماهان از کدام ترمینال مهرآباد انجام میشه؟",
    });
    expect(response.answer).toContain("ترمینال ۴");
    expect(response.answer).toContain("ترمینال ۶");
  });

  it("handles IKA airport timing and protocols", async () => {
    const response = await service.answerQuestion({
      question: "چند ساعت قبل باید در فرودگاه امام خمینی باشیم؟",
    });
    expect(response.answer).toContain("امام خمینی");
    expect(response.answer).toContain("ساعت");
  });

  it("handles travel currency and exit fee inquiries", async () => {
    const resCurrency = await service.answerQuestion({
      question: "چطور ارز مسافرتی دولتی بگیرم؟",
    });
    expect(resCurrency.answer).toContain("ارز مسافرتی");
    expect(resCurrency.answer).toContain("بله");

    const resExit = await service.answerQuestion({
      question: "مبلغ عوارض خروج از کشور چقدر است؟",
    });
    expect(resExit.answer).toContain("عوارض خروج");
  });

  it("handles flight delays and passenger compensation rights", async () => {
    const response = await service.answerQuestion({
      question: "اگر پرواز بیش از ۲ ساعت تاخیر داشته باشه حقم چیه؟",
    });
    expect(response.answer).toContain("تاخیر");
    expect(response.answer).toContain("حقوق");
    expect(response.answer).toContain("پذیرایی");
  });

  it("handles ticket cancellation and refund penalties", async () => {
    const response = await service.answerQuestion({
      question: "جریمه استرداد و کنسلی بلیط چقدر کسر میشه؟",
    });
    expect(response.answer).toContain("جریمه");
    expect(response.answer).toContain("سیستمی");
    expect(response.answer).toContain("چارتری");
  });

  it("handles general greeting with structured categories", async () => {
    const response = await service.answerQuestion({
      question: "سلام، خسته نباشید",
    });
    expect(response.answer).toContain("پرواز پلاس");
    expect(response.suggestedPrompts?.length).toBeGreaterThan(3);
  });
});
