import type { AssistantAnswerDto } from "@flysmart/contracts";
import { Injectable } from "@nestjs/common";

import { FlightProvider } from "../../infra/flight/flight.provider.js";
import type { AskAssistantDto } from "./dto/ask-assistant.dto.js";

@Injectable()
export class AssistantService {
  constructor(private readonly flightProvider: FlightProvider) {}

  async answerQuestion(dto: AskAssistantDto): Promise<AssistantAnswerDto> {
    const q = dto.question.toLowerCase();
    const deals = await this.flightProvider.getCheapDeals();

    if (
      q.includes("ارزان") ||
      q.includes("آفر") ||
      q.includes("تخفیف") ||
      q.includes("لحظه آخری")
    ) {
      return {
        answer:
          "هم‌اکنون بهترین و ارزان‌ترین پروازهای چارتری لحظه آخری برای مقاصد کیش، مشهد، شیراز و قشم با تا ۴۷٪ تخفیف در پرواز پلاس فعال هستند. می‌توانید با کلیک بر روی آفرها در پایین، مستقیماً رزرو خود را قطعی کنید.",
        suggestedPrompts: [
          "با ۵ میلیون تومان کجا برم؟",
          "قوانین کنسلی چطوره؟",
          "ارزان‌ترین روز سفر به کیش چه زمانیه؟",
        ],
        suggestedAction: {
          type: "VIEW_DEALS",
          label: "مشاهده تمام آفرهای ارزان",
        },
        deals: deals.slice(0, 3),
      };
    }

    if (q.includes("بار") || q.includes("چمدان") || q.includes("کیلو")) {
      return {
        answer:
          "در پروازهای داخلی اکونومی، مقدار بار مجاز ۲۰ کیلوگرم به ازای هر مسافر (به علاوه یک ساک دستی ۵ کیلوگرمی داخل کابین) است. در پروازهای بیزینس کلاس، مقدار بار مجاز ۳۰ کیلوگرم می‌باشد. برای نوزادان نیز تا ۱۰ کیلوگرم بار و کالسکه مجاز است.",
        suggestedPrompts: ["قوانین استرداد و کنسلی چیست؟", "نحوه خرید صندلی اضافه"],
      };
    }

    if (q.includes("کنسل") || q.includes("استرداد") || q.includes("جریمه")) {
      return {
        answer:
          "پروازهای سیستمی طبق بخشنامه سازمان هواپیمایی کشوری تا ۲۴ ساعت قبل با ۲۰٪ و تا ۳ ساعت قبل با ۴۰٪ جریمه قابل استرداد هستند. در پروازهای چارتری درصد جریمه تابع قوانین چارترکننده است که در بخش جزئیات هر بلیط با شفافیت کامل درج شده است.",
        suggestedPrompts: ["ارزان‌ترین پروازها کجاست؟", "چطور مسافران رو ذخیره کنم؟"],
      };
    }

    if (q.includes("مسافر") || q.includes("ذخیره") || q.includes("مشخصات")) {
      return {
        answer:
          "با قابلیت نوآورانه «Travelers Vault» در پرواز پلاس، شما کافیست یک‌بار مشخصات خود و همراهان (کد ملی، نام و تاریخ تولد) را ثبت کنید. در خریدهای بعدی، تمام اطلاعات فقط با ۱ کلیک در فرم رزرو قرار می‌گیرند و نیازی به تایپ مجدد نیست!",
        suggestedPrompts: ["ورود به بخش مسافران من", "مشاهده آفرهای امروز"],
      };
    }

    // Default friendly travel concierge response
    return {
      answer:
        "سلام! من دستیار هوشمند پرواز پلاس هستم. می‌توانم به شما در یافتن ارزان‌ترین پروازها، بررسی تقویم قیمتی، قوانین بار و استرداد، و فعال‌سازی دیده‌بان کاهش قیمت کمک کنم. چه کمکی از دست من برای سفرتان برمی‌آید؟",
      suggestedPrompts: [
        "ارزان‌ترین پروازهای این هفته",
        "با ۴ میلیون تومان به کجا سفر کنم؟",
        "مقدار بار مجاز پروازها",
      ],
      suggestedAction: {
        type: "SEARCH_FLIGHTS",
        label: "جستجوی پروازها",
      },
    };
  }
}
