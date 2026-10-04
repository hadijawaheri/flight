"use client";

import type { AssistantAnswerDto } from "@flysmart/contracts";
import { ArrowLeftIcon, BotIcon, RotateCcwIcon, SendIcon, SparklesIcon, XIcon } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAskAssistant } from "@/features/assistant/queries";
import { normalizeDateParam } from "@/lib/format";
import { paths } from "@/lib/paths";

interface Message {
  role: "user" | "assistant";
  text: string;
  data?: AssistantAnswerDto;
}

const ASSISTANT_CATEGORIES = [
  { id: "all", label: "🌟 سوالات برتر", prompt: "قوانین به روز پرواز و فرودگاه چیست؟" },
  { id: "baggage", label: "🎒 بار و چمدان", prompt: "بار مجاز پروازهای داخلی و خارجی چقدر است؟" },
  {
    id: "dangerous",
    label: "⚠️ پاوربانک و ممنوعه",
    prompt: "آیا بردن پاوربانک و باتری در هواپیما مجازه؟",
  },
  { id: "pets", label: "🐕 حیوانات خانگی", prompt: "قوانین حمل سگ و گربه در پرواز (AVIH)" },
  {
    id: "pregnancy",
    label: "🤰 بارداری و کودکان",
    prompt: "قوانین پرواز برای بانوان باردار و نوزادان",
  },
  {
    id: "mehrabad",
    label: "🏢 ترمینال‌های مهرآباد",
    prompt: "کدام ایرلاین در کدام ترمینال مهرآباد است؟",
  },
  {
    id: "ika",
    label: "✈️ فرودگاه امام و ارز",
    prompt: "زمان حضور در فرودگاه امام و سقف ارز مسافرتی",
  },
  {
    id: "delays",
    label: "⏱️ تاخیر و استرداد",
    prompt: "حقوق مسافر در تاخیر پرواز و جریمه کنسلی بلیط",
  },
  {
    id: "airlines",
    label: "🏆 بهترین ایرلاین‌ها",
    prompt: "مقایسه کیفیت ایرلاین‌های ماهان، ایران‌ایر، معراج و ترکیش",
  },
];

function parseBold(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="text-foreground font-bold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

function FormattedMessage({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="flex flex-col gap-1.5 text-xs leading-relaxed sm:text-sm">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        // Headings: ###
        if (trimmed.startsWith("### ")) {
          return (
            <h4
              key={idx}
              className="font-heading text-foreground mt-1 mb-1 border-b pb-1 text-sm font-bold sm:text-base"
            >
              {trimmed.replace(/^###\s*/, "")}
            </h4>
          );
        }

        // Gold Tip Callout: 💡
        if (trimmed.startsWith("💡")) {
          return (
            <div
              key={idx}
              className="my-1 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs font-medium text-amber-900 dark:text-amber-200"
            >
              {trimmed}
            </div>
          );
        }

        // Warning Callout: ⚠️
        if (trimmed.startsWith("⚠️")) {
          return (
            <div
              key={idx}
              className="my-1 rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs font-medium text-rose-900 dark:text-rose-200"
            >
              {trimmed}
            </div>
          );
        }

        // Checklist / Documents: 📋 or ⏱️ or 🌟
        if (trimmed.startsWith("📋") || trimmed.startsWith("⏱️") || trimmed.startsWith("🌟")) {
          return (
            <div
              key={idx}
              className="bg-primary/5 border-primary/20 text-foreground my-1 rounded-xl border p-2.5 text-xs font-medium"
            >
              {trimmed}
            </div>
          );
        }

        // Bullet point: • or -
        if (trimmed.startsWith("• ") || trimmed.startsWith("- ")) {
          const content = trimmed.replace(/^[•-]\s*/, "");
          return (
            <div key={idx} className="flex items-start gap-2 ps-1">
              <span className="text-primary text-base leading-none font-bold select-none">•</span>
              <span className="text-foreground/90 flex-1">{parseBold(content)}</span>
            </div>
          );
        }

        // Numbered list: 1. or ۱.
        const numMatch = trimmed.match(/^([0-9۱-۹]+[.)])\s*(.*)/);
        if (numMatch && numMatch[1] && numMatch[2]) {
          return (
            <div key={idx} className="flex items-start gap-2 ps-1">
              <span className="text-primary mt-0.5 font-mono text-xs font-bold">{numMatch[1]}</span>
              <span className="text-foreground/90 flex-1">{parseBold(numMatch[2])}</span>
            </div>
          );
        }

        // Regular paragraph with bold support
        return (
          <p key={idx} className="text-foreground/90">
            {parseBold(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

export function AssistantWidget() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [input, setInput] = React.useState("");
  const [activeCategory, setActiveCategory] = React.useState("all");

  const initialMessage: Message = {
    role: "assistant",
    text: `### 👋 سلام! من دستیار هوشمند مرجع قوانین پرواز و فرودگاهی «پرواز پلاس» هستم.

به جای جستجو در گوگل، می‌توانید تمام سوالات خود در مورد قوانین پرواز، فرودگاه‌ها و ایرلاین‌ها را از من بپرسید:
• **وزن بار مجاز و ابعاد ساک دستی** در پروازهای داخلی و خارجی
• **قوانین حمل پاوربانک، باتری و وسایل ممنوعه** در کابین
• **شرایط سفر با حیوان خانگی (AVIH)**، استاندارد باکس و مدارک
• **قوانین سفر بانوان باردار، نوزادان و کالسکه رایگان**
• **ترمینال‌های مهرآباد (۱، ۲، ۴، ۶) برای هر ایرلاین**
• **سقف ارز مسافرتی دولتی و عوارض خروج از کشور**
• **حقوق مسافر در تاخیرات بالای ۲ ساعت و جدول جریمه استرداد**`,
    data: {
      answer: "",
      suggestedPrompts: [
        "بار مجاز پروازهای داخلی چقدر است؟",
        "آیا بردن پاوربانک در هواپیما مجازه؟",
        "کدام ایرلاین در کدام ترمینال مهرآباد است؟",
        "سقف و نحوه دریافت ارز مسافرتی",
        "حقوق قانونی مسافر در تاخیر بالای ۲ ساعت",
      ],
      suggestedAction: {
        type: "SEARCH_FLIGHTS",
        label: "جستجوی پروازها",
      },
    },
  };

  const [messages, setMessages] = React.useState<Message[]>([initialMessage]);

  const askMutation = useAskAssistant();

  const handleSend = (textToSend?: string) => {
    const q = textToSend || input.trim();
    if (!q || askMutation.isPending) return;

    setMessages((prev) => [...prev, { role: "user", text: q }]);
    if (!textToSend) setInput("");

    askMutation.mutate(
      { question: q },
      {
        onSuccess: (data) => {
          setMessages((prev) => [...prev, { role: "assistant", text: data.answer, data }]);
        },
        onError: () => {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              text: "متاسفانه ارتباط با سرور برقرار نشد، لطفا لحظاتی دیگر مجدداً تلاش کنید.",
            },
          ]);
        },
      },
    );
  };

  const handleResetChat = () => {
    setMessages([initialMessage]);
    setInput("");
  };

  const handleSelectCategory = (cat: (typeof ASSISTANT_CATEGORIES)[number]) => {
    setActiveCategory(cat.id);
    handleSend(cat.prompt);
  };

  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, askMutation.isPending]);

  return (
    <div className="fixed end-4 bottom-4 z-50 sm:end-6 sm:bottom-6">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group bg-primary text-primary-foreground shadow-primary/35 flex items-center gap-2.5 rounded-full px-4 py-3 shadow-2xl transition-all hover:scale-105 active:scale-95"
          aria-label="گفتگو با دستیار هوشمند قوانین پرواز"
        >
          <div className="flex size-7 items-center justify-center rounded-full bg-white/20">
            <SparklesIcon className="size-4 animate-pulse" />
          </div>
          <div className="flex flex-col text-start">
            <span className="font-heading text-xs font-bold sm:text-sm">دستیار قوانین پرواز</span>
            <span className="text-[10px] text-white/80">پاسخ فوری به سوالات فرودگاهی</span>
          </div>
          <Badge
            variant="secondary"
            className="bg-cyan-400 px-1.5 py-0 text-[10px] font-bold text-cyan-950 shadow-xs"
          >
            آنلاین
          </Badge>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="bg-card text-card-foreground animate-in fade-in zoom-in-95 flex h-[580px] max-h-[85vh] w-[350px] flex-col overflow-hidden rounded-2xl border shadow-2xl duration-200 sm:w-[440px] md:w-[480px]">
          {/* Header */}
          <div className="bg-primary text-primary-foreground flex items-center justify-between border-b px-4 py-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-white/20 shadow-xs">
                <BotIcon className="size-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-heading text-sm font-bold sm:text-base">
                  دستیار هوشمند قوانین پرواز و فرودگاه
                </span>
                <span className="text-[10px] text-white/85">
                  مرجع بخشنامه‌های هوانوردی کشوری و ایرلاین‌ها
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleResetChat}
                title="شروع مجدد گفتگو"
                className="rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="شروع مجدد"
              >
                <RotateCcwIcon className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="بستن پنجره"
              >
                <XIcon className="size-5" />
              </button>
            </div>
          </div>

          {/* Quick Categories Bar */}
          <div className="bg-muted/40 no-scrollbar flex items-center gap-1.5 overflow-x-auto border-b px-3 py-2 text-xs">
            {ASSISTANT_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleSelectCategory(cat)}
                className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium whitespace-nowrap transition-all ${
                  activeCategory === cat.id
                    ? "border-primary bg-primary text-primary-foreground font-bold shadow-xs"
                    : "bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Messages Feed */}
          <div className="flex-1 space-y-3.5 overflow-y-auto p-4 text-sm">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex flex-col gap-1.5 ${m.role === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 leading-relaxed ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-xs font-medium"
                      : "bg-muted text-foreground rounded-bl-xs border"
                  }`}
                >
                  {m.role === "user" ? m.text : <FormattedMessage text={m.text} />}
                </div>

                {/* Interactive Contextual Follow-up Chips */}
                {m.data?.suggestedPrompts && m.data.suggestedPrompts.length > 0 && (
                  <div className="mt-1 flex max-w-[95%] flex-wrap gap-1.5">
                    {m.data.suggestedPrompts.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSend(p)}
                        className="bg-background text-foreground/80 hover:border-primary hover:bg-primary/5 hover:text-primary rounded-xl border px-2.5 py-1 text-start text-[11px] font-medium shadow-2xs transition-all"
                      >
                        💬 {p}
                      </button>
                    ))}
                  </div>
                )}

                {/* Optional Deals recommendation inside assistant bubble */}
                {m.data?.deals && m.data.deals.length > 0 && (
                  <div className="mt-1 flex w-full max-w-[95%] flex-col gap-1.5">
                    {m.data.deals.map((deal) => (
                      <Link
                        key={deal.id}
                        href={`${paths.flights}?origin=${deal.originCode}&destination=${deal.destinationCode}&departureDate=${normalizeDateParam(deal.departureDate)}`}
                        onClick={() => setIsOpen(false)}
                        className="bg-background hover:bg-accent flex items-center justify-between rounded-xl border p-2 text-xs shadow-2xs transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-foreground font-bold">
                            {deal.origin} به {deal.destination}
                          </span>
                          <Badge
                            variant="secondary"
                            className="border-amber-500/20 bg-amber-500/10 text-[10px] font-bold text-amber-600 dark:text-amber-400"
                          >
                            {deal.discountPercent}٪ تخفیف
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-primary font-bold">
                            {deal.dealPrice.toLocaleString("fa-IR")} ریال
                          </span>
                          <ArrowLeftIcon className="text-muted-foreground size-3 rtl:rotate-180" />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {/* Suggested Action */}
                {m.data?.suggestedAction && (
                  <Link
                    href={
                      m.data.suggestedAction.type === "VIEW_DEALS"
                        ? paths.deals
                        : m.data.suggestedAction.params?.destination
                          ? `${paths.flights}?origin=THR&destination=${m.data.suggestedAction.params.destination}&departureDate=${new Date().toISOString().split("T")[0]}`
                          : paths.flights
                    }
                    onClick={() => setIsOpen(false)}
                    className="mt-1 self-start"
                  >
                    <Button
                      size="sm"
                      variant="default"
                      className="gap-1.5 text-xs font-bold shadow-xs"
                    >
                      <span>{m.data.suggestedAction.label}</span>
                      <ArrowLeftIcon className="size-3.5 rtl:rotate-180" />
                    </Button>
                  </Link>
                )}
              </div>
            ))}

            {askMutation.isPending && (
              <div className="text-muted-foreground flex items-center gap-2 py-2 text-xs">
                <div className="border-primary flex size-4 animate-spin rounded-full border-2 border-t-transparent" />
                <span className="font-medium">دستیار در حال بررسی قوانین و تدوین پاسخ کامل...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="bg-background flex items-center gap-2 border-t p-3"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="مثلا: قوانین بار ماهان، حمل حیوان خانگی، سقف ارز..."
              className="h-10 flex-1 text-xs"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || askMutation.isPending}
              className="size-10 shrink-0 shadow-sm"
              title="ارسال سوال"
            >
              <SendIcon className="size-4 rtl:rotate-180" />
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
