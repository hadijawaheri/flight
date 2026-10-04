import type { AssistantAnswerDto } from "@flysmart/contracts";
import { Injectable } from "@nestjs/common";

import { FlightProvider } from "../../infra/flight/flight.provider.js";
import type { AskAssistantDto } from "./dto/ask-assistant.dto.js";
import { AVIATION_KNOWLEDGE_TOPICS, getDefaultAssistantResponse } from "./knowledge-base.js";

const DESTINATION_CODES: Record<string, { code: string; name: string }> = {
  کیش: { code: "KIH", name: "کیش" },
  مشهد: { code: "MHD", name: "مشهد" },
  شیراز: { code: "SYZ", name: "شیراز" },
  اصفهان: { code: "IFN", name: "اصفهان" },
  تبریز: { code: "TBZ", name: "تبریز" },
  قشم: { code: "GSM", name: "قشم" },
  اهواز: { code: "AWZ", name: "اهواز" },
  بندرعباس: { code: "BND", name: "بندرعباس" },
  استانبول: { code: "IST", name: "استانبول" },
  دبی: { code: "DXB", name: "دبی" },
  نجف: { code: "NJF", name: "نجف" },
};

@Injectable()
export class AssistantService {
  constructor(private readonly flightProvider: FlightProvider) {}

  async answerQuestion(dto: AskAssistantDto): Promise<AssistantAnswerDto> {
    const rawQuestion = dto.question || "";
    const q = rawQuestion.toLowerCase().trim();
    const deals = await this.flightProvider.getCheapDeals();

    // 1. Intelligent Scoring against Aviation Knowledge Topics
    let bestTopic = null;
    let highestScore = 0;

    for (const topic of AVIATION_KNOWLEDGE_TOPICS) {
      let score = 0;

      for (const kw of topic.keywords) {
        const lowerKw = kw.toLowerCase();
        if (q.includes(lowerKw)) {
          // Weight longer keywords higher (e.g. 'ارز مسافرتی' > 'ارز')
          score += lowerKw.length * 4 + 10;
        }
      }

      if (topic.patterns) {
        for (const pattern of topic.patterns) {
          if (pattern.test(q)) {
            score += 60;
          }
        }
      }

      // Negative filter: If asking about international airlines, domestic baggage topic shouldn't take precedence
      if (
        topic.id === "baggage-domestic" &&
        (q.includes("ترکیش") ||
          q.includes("امارات") ||
          q.includes("قطر") ||
          q.includes("خارجی") ||
          q.includes("فلای دبی") ||
          q.includes("پگاسوس"))
      ) {
        score = 0;
      }

      // Add normalized priority bonus
      if (score > 0) {
        score += topic.priority * 0.5;
        if (score > highestScore) {
          highestScore = score;
          bestTopic = topic;
        }
      }
    }

    // 2. If a relevant aviation or airport topic matched, build answer
    if (bestTopic && highestScore >= 15) {
      const response = bestTopic.handler(q, deals);

      // Check if a specific destination was asked to tune the suggested action
      for (const [name, target] of Object.entries(DESTINATION_CODES)) {
        if (q.includes(name)) {
          response.suggestedAction = {
            type: "SEARCH_FLIGHTS",
            label: `جستجوی پروازهای ${target.name}`,
            params: { destination: target.code },
          };
          break;
        }
      }

      return response;
    }

    // 3. Check for direct destination searches (e.g. 'پرواز تهران به کیش')
    for (const [name, target] of Object.entries(DESTINATION_CODES)) {
      if (q.includes(name)) {
        return {
          answer: `### ✈️ پروازهای مسیر ${target.name}\n\nبرای مشاهده ارزان‌ترین نرخ‌های پرواز به **${target.name}** همراه با تقویم مقایسه قیمت ۷ روزه، می‌توانید از دکمه زیر مستقیماً به صفحه پروازها هدایت شوید. تمامی پروازهای چارتری و سیستمی با تضمین بهترین قیمت و صدور آنی بلیط در دسترس شما هستند.`,
          suggestedPrompts: [
            `بار مجاز پرواز ${target.name} چقدر است؟`,
            `ارزان‌ترین روزهای سفر به ${target.name}`,
            "قوانین استرداد و کنسلی بلیط",
          ],
          suggestedAction: {
            type: "SEARCH_FLIGHTS",
            label: `مشاهده بلیط‌های ${target.name}`,
            params: { destination: target.code },
          },
        };
      }
    }

    // 4. Default comprehensive travel assistant response
    return getDefaultAssistantResponse();
  }
}
