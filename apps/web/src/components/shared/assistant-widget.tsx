"use client";

import type { AssistantAnswerDto } from "@flysmart/contracts";
import { BotIcon, SendIcon, SparklesIcon, XIcon } from "lucide-react";
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

export function AssistantWidget() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [input, setInput] = React.useState("");
  const [messages, setMessages] = React.useState<Message[]>([
    {
      role: "assistant",
      text: "سلام! من دستیار هوشمند پرواز پلاس هستم. به شما در پیدا کردن ارزان‌ترین پروازها، تخفیف‌های لحظه آخری، قوانین چمدان و رزرو ۱-کلیکه کمک می‌کنم.",
    },
  ]);

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
              text: "متاسفانه ارتباط با سرور برقرار نشد، لطفا لحظاتی دیگر تلاش کنید.",
            },
          ]);
        },
      },
    );
  };

  const quickPrompts = [
    "ارزان‌ترین پروازهای امروز کجاست؟",
    "قوانین بار و جریمه استرداد",
    "چگونه مسافر ذخیره کنم؟",
    "با ۴ میلیون تومان به کجا سفر کنم؟",
  ];

  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, askMutation.isPending]);

  return (
    <div className="fixed end-6 bottom-6 z-50">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group bg-primary text-primary-foreground shadow-primary/30 flex items-center gap-2.5 rounded-full px-4 py-3 shadow-xl transition-all hover:scale-105 active:scale-95"
          aria-label="گفتگو با دستیار هوشمند سفر"
        >
          <div className="flex size-7 items-center justify-center rounded-full bg-white/20">
            <SparklesIcon className="size-4 animate-pulse" />
          </div>
          <span className="font-heading text-sm font-semibold">دستیار هوشمند سفر</span>
          <Badge variant="secondary" className="bg-white/25 px-1.5 py-0 text-[10px] text-white">
            آنلاین
          </Badge>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="bg-card text-card-foreground animate-in fade-in zoom-in-95 flex h-[520px] w-[360px] flex-col overflow-hidden rounded-2xl border shadow-2xl duration-200 sm:w-[400px]">
          {/* Header */}
          <div className="bg-primary text-primary-foreground flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-white/20">
                <BotIcon className="size-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-heading text-sm font-bold">دستیار هوشمند پرواز پلاس</span>
                <span className="text-[10px] text-white/80">
                  راهنمای نرخ‌های ارزان و پشتیبانی سفر
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <XIcon className="size-5" />
            </button>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 space-y-3.5 overflow-y-auto p-4 text-sm">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex flex-col gap-1.5 ${m.role === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-xs"
                      : "bg-muted text-foreground rounded-bl-xs border"
                  }`}
                >
                  {m.text}
                </div>

                {/* Optional Deals recommendation inside assistant bubble */}
                {m.data?.deals && m.data.deals.length > 0 && (
                  <div className="mt-1 flex w-full flex-col gap-1.5">
                    {m.data.deals.map((deal) => (
                      <Link
                        key={deal.id}
                        href={`${paths.flights}?origin=${deal.originCode}&destination=${deal.destinationCode}&departureDate=${normalizeDateParam(deal.departureDate)}`}
                        onClick={() => setIsOpen(false)}
                        className="bg-background hover:bg-accent flex items-center justify-between rounded-xl border p-2 text-xs transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-foreground font-bold">
                            {deal.origin} به {deal.destination}
                          </span>
                          <Badge
                            variant="secondary"
                            className="bg-emerald-500/10 text-[10px] text-emerald-600"
                          >
                            {deal.discountPercent}٪ تخفیف
                          </Badge>
                        </div>
                        <span className="text-primary font-semibold">
                          {deal.dealPrice.toLocaleString("fa-IR")} ریال
                        </span>
                      </Link>
                    ))}
                  </div>
                )}

                {/* Suggested Action */}
                {m.data?.suggestedAction && (
                  <Link
                    href={
                      m.data.suggestedAction.type === "VIEW_DEALS" ? paths.deals : paths.flights
                    }
                    onClick={() => setIsOpen(false)}
                    className="mt-1 self-end"
                  >
                    <Button size="xs" variant="outline" className="text-xs">
                      {m.data.suggestedAction.label}
                    </Button>
                  </Link>
                )}
              </div>
            ))}

            {askMutation.isPending && (
              <div className="text-muted-foreground flex items-center gap-2 text-xs">
                <div className="border-primary flex size-4 animate-spin rounded-full border-2 border-t-transparent" />
                <span>دستیار در حال جستجوی بهترین پیشنهاد...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Chips */}
          <div className="bg-muted/20 no-scrollbar flex items-center gap-1.5 overflow-x-auto border-t px-3 py-2 text-xs">
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(prompt)}
                className="bg-background text-muted-foreground hover:border-primary hover:text-foreground shrink-0 rounded-full border px-2.5 py-1 whitespace-nowrap transition-colors"
              >
                {prompt}
              </button>
            ))}
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
              placeholder="سوال خود را بپرسید..."
              className="h-9 flex-1 text-xs"
            />
            <Button
              type="submit"
              size="icon-sm"
              disabled={!input.trim() || askMutation.isPending}
              className="size-9 shrink-0"
            >
              <SendIcon className="size-4 rtl:rotate-180" />
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
