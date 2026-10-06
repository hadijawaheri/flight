import type {
  AskAssistantInput,
  AssistantAnswerDto,
  AssistantCardDto,
  AssistantCitationDto,
  AssistantStatusDto,
  RuleCategory,
} from "@flysmart/contracts";
import { Injectable, Logger } from "@nestjs/common";

import { Clock } from "../../common/clock/clock.js";
import type { LlmContentBlock, LlmMessage } from "../../infra/ai/llm.provider.js";
import { LlmError, LlmProvider } from "../../infra/ai/llm.provider.js";
import { KnowledgeService } from "../knowledge/knowledge.service.js";
import {
  buildSystemPrompt,
  NOT_FOUND_ANSWER,
  STARTER_QUESTIONS,
  VERIFY_NOTICE,
} from "./assistant.prompt.js";
import type { ToolContext, ToolOutcome } from "./assistant-toolbox.js";
import { AssistantToolbox, LLM_TOOLS } from "./assistant-toolbox.js";
import { cardLead } from "./offline-answerer.js";
import { planOfflineCalls } from "./offline-answerer.js";

/** Search → compute → answer needs few hops; the cap bounds cost if the model keeps calling tools. */
const MAX_MODEL_ROUNDS = 4;
const MAX_ANSWER_TOKENS = 900;
const GREETING = /^\s*(سلام|درود|hi|hello|hey)[\s!،.؟?]*$/i;

const FOLLOW_UPS: Partial<Record<RuleCategory, string[]>> = {
  BAGGAGE: ["هزینه‌ی ۵ کیلو اضافه بار چقدر می‌شود؟", "چه چیزهایی را نباید در بار تحویلی بگذارم؟"],
  DANGEROUS_GOODS: ["پاوربانک ۱۰۰۰۰ میلی‌آمپر مجاز است؟", "مایعات در بار دستی چه محدودیتی دارند؟"],
  DOCUMENTS: ["برای پرواز خارجی چه مدارکی لازم است؟", "نام روی بلیت را چطور اصلاح کنم؟"],
  INTERNATIONAL: ["عوارض خروج چقدر است و از کجا بپرسم؟", "در ترانزیت چقدر زمان لازم است؟"],
  REFUNDS: ["اگر ۲ روز قبل پرواز لغو کنم چقدر جریمه می‌شوم؟", "تغییر تاریخ بلیت چقدر هزینه دارد؟"],
  DELAYS_RIGHTS: ["اگر ایرلاین پرواز را لغو کند چه حقی دارم؟"],
  CHECK_IN: ["پذیرش آنلاین چطور کار می‌کند؟"],
  CHILDREN: ["بلیت نوزاد چقدر است؟", "کودک می‌تواند در ردیف خروج بنشیند؟"],
  HEALTH: ["برای ویلچر در فرودگاه چه کنم؟"],
  SEATS: ["هزینه‌ی انتخاب صندلی چقدر است؟"],
  PETS: ["سفر با حیوان خانگی چه مدارکی می‌خواهد؟"],
  PLATFORM: ["تحلیل قیمت چقدر قابل اتکاست؟", "هشدار قیمت چطور کار می‌کند؟"],
};

interface Collected {
  cards: AssistantCardDto[];
  citationIds: Set<string>;
}

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);

  constructor(
    private readonly llm: LlmProvider,
    private readonly toolbox: AssistantToolbox,
    private readonly knowledge: KnowledgeService,
    private readonly clock: Clock,
  ) {}

  status(): AssistantStatusDto {
    return { mode: this.llm.available ? "ai" : "offline", starters: [...STARTER_QUESTIONS] };
  }

  async ask(input: AskAssistantInput, userId: string | undefined): Promise<AssistantAnswerDto> {
    const context: ToolContext = {
      userId,
      flightId: input.context?.flightId,
      bookingId: input.context?.bookingId,
    };

    if (this.llm.available) {
      try {
        const answer = await this.askModel(input, context);
        if (answer) return answer;
      } catch (error: unknown) {
        // A model outage must not take the assistant down: the knowledge base still answers.
        if (!(error instanceof LlmError)) throw error;
        this.logger.warn(
          `Language model failed (${error.status ?? "no status"}): ${error.message}`,
        );
      }
    }
    return this.askOffline(input, context);
  }

  /* ----------------------------------- model path ----------------------------------- */

  private async askModel(
    input: AskAssistantInput,
    context: ToolContext,
  ): Promise<AssistantAnswerDto | null> {
    const system = buildSystemPrompt(this.clock.today(), {
      flight: Boolean(context.flightId),
      booking: Boolean(context.bookingId),
    });
    const messages: LlmMessage[] = [
      ...input.history.map((item) => ({ role: item.role, content: item.content })),
      { role: "user", content: input.message },
    ];
    const collected: Collected = { cards: [], citationIds: new Set() };

    for (let round = 1; round <= MAX_MODEL_ROUNDS; round += 1) {
      // On the last round tools are withdrawn so the model has to answer with what it already has.
      const tools = round < MAX_MODEL_ROUNDS ? LLM_TOOLS : [];
      const response = await this.llm.complete({
        system,
        messages,
        tools,
        maxTokens: MAX_ANSWER_TOKENS,
      });

      const uses = response.content.filter(
        (block): block is Extract<LlmContentBlock, { type: "tool_use" }> =>
          block.type === "tool_use",
      );
      if (uses.length === 0) {
        const text = response.content
          .flatMap((block) => (block.type === "text" ? [block.text] : []))
          .join("\n")
          .trim();
        return text ? this.finish(text, "ai", collected) : null;
      }

      messages.push({ role: "assistant", content: response.content });
      const results: LlmContentBlock[] = [];
      for (const use of uses) {
        const outcome = await this.runTool(use.name, use.input, context);
        this.collect(collected, outcome);
        results.push({
          type: "tool_result",
          tool_use_id: use.id,
          content: outcome.content,
          ...(outcome.isError ? { is_error: true } : {}),
        });
      }
      messages.push({ role: "user", content: results });
    }
    return null;
  }

  private async runTool(
    name: string,
    input: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ToolOutcome> {
    if (!this.toolbox.isTool(name))
      return { content: "ابزار ناشناخته", isError: true, citationIds: [] };
    return this.toolbox.run(name, input, context);
  }

  /* ---------------------------------- offline path ---------------------------------- */

  private async askOffline(
    input: AskAssistantInput,
    context: ToolContext,
  ): Promise<AssistantAnswerDto> {
    if (GREETING.test(input.message)) {
      return {
        answer:
          "سلام! من دستیار پرواز پلاس هستم؛ درباره‌ی بار، مدارک، استرداد، قوانین فرودگاه و قیمت بلیت می‌توانید بپرسید.",
        mode: "offline",
        citations: [],
        cards: [],
        suggestions: [...STARTER_QUESTIONS],
        verifyNotice: null,
      };
    }

    const collected: Collected = { cards: [], citationIds: new Set() };
    const errors: string[] = [];
    for (const call of planOfflineCalls(input.message, context, this.clock.today())) {
      const outcome = await this.toolbox.run(call.name, call.input, context);
      if (outcome.isError) errors.push(outcome.content);
      else this.collect(collected, outcome);
    }

    const hits = this.knowledge.search(input.message, 2);
    const lines: string[] = [];

    for (const card of collected.cards) lines.push(cardLead(card));

    const top = hits[0]?.entry;
    if (top && collected.cards.length === 0) {
      lines.push(top.summary, ...top.details.slice(0, 2).map((detail) => `• ${detail}`));
      collected.citationIds.add(top.id);
      const related = hits[1]?.entry;
      if (related) {
        lines.push(`مطلب مرتبط: «${related.title}» — ${related.summary}`);
        collected.citationIds.add(related.id);
      }
    } else if (top && collected.cards.length > 0) {
      collected.citationIds.add(top.id);
    }

    if (lines.length === 0) {
      return {
        answer: errors[0] ?? NOT_FOUND_ANSWER,
        mode: "offline",
        citations: [],
        cards: [],
        suggestions: [...STARTER_QUESTIONS].slice(0, 3),
        verifyNotice: null,
      };
    }
    return this.finish(lines.join("\n"), "offline", collected);
  }

  /* ------------------------------------ shared ------------------------------------ */

  private collect(collected: Collected, outcome: ToolOutcome): void {
    if (outcome.card) collected.cards.push(outcome.card);
    for (const id of outcome.citationIds) collected.citationIds.add(id);
  }

  private finish(
    answer: string,
    mode: AssistantAnswerDto["mode"],
    collected: Collected,
  ): AssistantAnswerDto {
    const entries = [...collected.citationIds].flatMap((id) => {
      const entry = this.knowledge.entry(id);
      return entry ? [entry] : [];
    });
    const citations: AssistantCitationDto[] = entries.map((entry) => ({
      id: entry.id,
      title: entry.title,
      reliability: entry.reliability,
    }));
    // A follow-up that would retrieve an entry we just cited only repeats the answer (the live site
    // answered the Istanbul documents question and then suggested "what documents for abroad?")
    const suggestions = [...new Set(entries.flatMap((entry) => FOLLOW_UPS[entry.category] ?? []))]
      .filter((suggestion) => {
        const top = this.knowledge.search(suggestion, 1)[0]?.entry.id;
        return top === undefined || !collected.citationIds.has(top);
      })
      .slice(0, 3);

    return {
      answer,
      mode,
      citations,
      cards: collected.cards,
      suggestions: suggestions.length > 0 ? suggestions : [...STARTER_QUESTIONS].slice(0, 3),
      verifyNotice: entries.some((entry) => entry.reliability !== "STANDARD")
        ? VERIFY_NOTICE
        : null,
    };
  }
}
