"use client";

import { ASSISTANT_MAX_MESSAGE_LENGTH } from "@flysmart/contracts";
import { BotIcon, RotateCcwIcon, SendHorizontalIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

import { useAssistantStatus } from "../queries";
import type { useAssistantChat } from "../use-assistant-chat";
import { AnswerView } from "./answer-view";

interface ChatPanelProps {
  /** Owned by the caller so a conversation can outlive the panel (the widget keeps it while closed). */
  chat: ReturnType<typeof useAssistantChat>;
  /** Pre-filled composer text, e.g. from a rule page's "ask the assistant" link. */
  initialQuestion?: string;
  className?: string;
}

export function ChatPanel({ chat, initialQuestion = "", className }: ChatPanelProps) {
  const status = useAssistantStatus();
  const [draft, setDraft] = useState(initialQuestion);
  const endRef = useRef<HTMLDivElement>(null);

  // Keep the newest message in view; "nearest" avoids yanking the whole page on desktop.
  const lastId = chat.messages.at(-1)?.id;
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [lastId, chat.pending]);

  async function submit(text: string) {
    const value = text.trim();
    if (!value || chat.pending) return;
    setDraft("");
    await chat.send(value);
  }

  const lastAssistantId = [...chat.messages]
    .reverse()
    .find((message) => message.role === "assistant")?.id;

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className="flex items-center justify-between gap-2 border-b px-4 py-2 text-xs">
        <span className="text-muted-foreground">
          {status.data?.mode === "ai"
            ? "پاسخ‌ها با هوش مصنوعی و پایگاه قوانین پرواز پلاس"
            : "حالت آفلاین: پاسخ از پایگاه قوانین"}
        </span>
        {chat.messages.length > 0 && (
          <Button type="button" variant="ghost" size="xs" onClick={chat.reset}>
            <RotateCcwIcon data-icon="inline-start" />
            گفت‌وگوی جدید
          </Button>
        )}
      </div>

      <div
        className="flex-1 overflow-y-auto px-4 py-4"
        role="log"
        aria-live="polite"
        aria-label="گفت‌وگو با دستیار"
      >
        {chat.messages.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <span className="bg-brand-soft text-brand-ink flex size-12 items-center justify-center rounded-full">
              <BotIcon className="size-6" aria-hidden="true" />
            </span>
            <div>
              <p className="font-bold">سؤال پروازی دارید؟</p>
              <p className="text-muted-foreground text-sm">
                درباره‌ی بار، مدارک، استرداد، قانون فرودگاه و قیمت بپرسید.
              </p>
            </div>
            <ul className="flex flex-col gap-2 self-stretch" role="list" aria-label="نمونه پرسش‌ها">
              {(status.data?.starters ?? []).map((starter) => (
                <li key={starter}>
                  <button
                    type="button"
                    onClick={() => void submit(starter)}
                    className="hover:bg-muted focus-visible:ring-ring/50 w-full rounded-lg border px-3 py-2 text-start text-sm outline-none focus-visible:ring-3"
                  >
                    {starter}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <ol className="flex flex-col gap-4" role="list">
            {chat.messages.map((message) => (
              <li
                key={message.id}
                className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
              >
                {message.role === "user" ? (
                  <p className="bg-primary text-primary-foreground max-w-[85%] rounded-2xl rounded-ee-md px-4 py-2 whitespace-pre-line">
                    {message.content}
                  </p>
                ) : message.role === "error" ? (
                  <p
                    className="bg-destructive/10 text-destructive max-w-[85%] rounded-2xl px-4 py-2 text-sm"
                    role="alert"
                  >
                    {message.content}
                  </p>
                ) : (
                  <div className="bg-muted max-w-[92%] rounded-2xl rounded-es-md px-4 py-3">
                    <AnswerView
                      answer={message.answer}
                      showSuggestions={message.id === lastAssistantId && !chat.pending}
                      onSuggest={(question) => void submit(question)}
                    />
                  </div>
                )}
              </li>
            ))}
            {chat.pending && (
              <li className="text-muted-foreground flex items-center gap-2 text-sm" role="status">
                <Spinner aria-label="در حال پاسخ" /> در حال بررسی قوانین…
              </li>
            )}
          </ol>
        )}
        <div ref={endRef} />
      </div>

      <form
        className="flex flex-col gap-2 border-t p-3"
        onSubmit={(event) => {
          event.preventDefault();
          void submit(draft);
        }}
      >
        <label htmlFor="assistant-input" className="sr-only">
          سؤال شما
        </label>
        <div className="flex items-end gap-2">
          <Textarea
            id="assistant-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              // Enter sends; Shift+Enter breaks the line. IME composition must never trigger a send.
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                void submit(draft);
              }
            }}
            maxLength={ASSISTANT_MAX_MESSAGE_LENGTH}
            rows={2}
            placeholder="مثلاً: وزن مجاز چمدان در پرواز ماهان چقدر است؟"
            className="max-h-32 min-h-12 resize-none"
          />
          <Button
            type="submit"
            size="icon-lg"
            disabled={chat.pending || draft.trim().length === 0}
            aria-label="ارسال"
          >
            <SendHorizontalIcon className="rtl:-scale-x-100" />
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">
          پاسخ‌ها راهنما هستند و جایگزین اعلام رسمی ایرلاین نیستند.
          {draft.length > ASSISTANT_MAX_MESSAGE_LENGTH * 0.8 && (
            <span className="tnum ms-2">
              {formatNumber(draft.length)}/{formatNumber(ASSISTANT_MAX_MESSAGE_LENGTH)}
            </span>
          )}
        </p>
        {status.data?.mode === "offline" && (
          <Badge variant="outline" className="w-fit">
            آفلاین
          </Badge>
        )}
      </form>
    </div>
  );
}
