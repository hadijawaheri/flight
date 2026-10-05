import type { AssistantAnswerDto, AssistantCardDto } from "@flysmart/contracts";
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  CircleCheckIcon,
  InfoIcon,
  OctagonAlertIcon,
} from "lucide-react";
import Link from "next/link";

import { ReliabilityBadge } from "@/features/rules";
import { paths } from "@/lib/paths";
import { cn } from "@/lib/utils";

const TONE_STYLES: Record<AssistantCardDto["tone"], string> = {
  ok: "bg-brand-soft text-brand-ink",
  info: "bg-muted text-foreground",
  warn: "bg-warning-soft text-warning-ink",
  danger: "bg-destructive/10 text-destructive",
};

const TONE_ICONS: Record<AssistantCardDto["tone"], typeof InfoIcon> = {
  ok: CircleCheckIcon,
  info: InfoIcon,
  warn: AlertTriangleIcon,
  danger: OctagonAlertIcon,
};

interface AnswerViewProps {
  answer: AssistantAnswerDto;
  onSuggest: (question: string) => void;
  /** Suggestions only make sense on the latest answer. */
  showSuggestions: boolean;
}

export function AnswerView({ answer, onSuggest, showSuggestions }: AnswerViewProps) {
  return (
    <div className="flex flex-col gap-3">
      <p className="leading-7 whitespace-pre-line">{answer.answer}</p>

      {answer.cards.map((card, index) => (
        <ResultCard key={`${card.tool}-${index}`} card={card} />
      ))}

      {answer.verifyNotice && (
        <p
          className="bg-warning-soft text-warning-ink flex items-start gap-2 rounded-lg p-3 text-sm"
          role="note"
        >
          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{answer.verifyNotice}</span>
        </p>
      )}

      {answer.citations.length > 0 && (
        <section aria-label="منبع پاسخ" className="flex flex-col gap-1.5">
          <h4 className="text-muted-foreground text-xs font-medium">منبع</h4>
          <ul className="flex flex-col gap-1.5" role="list">
            {answer.citations.map((citation) => (
              <li key={citation.id} className="flex flex-wrap items-center gap-2 text-sm">
                <Link
                  href={paths.rule(citation.id)}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {citation.title}
                </Link>
                <ReliabilityBadge reliability={citation.reliability} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {showSuggestions && answer.suggestions.length > 0 && (
        <ul className="flex flex-wrap gap-2" role="list" aria-label="پرسش‌های پیشنهادی">
          {answer.suggestions.map((suggestion) => (
            <li key={suggestion}>
              <button
                type="button"
                onClick={() => onSuggest(suggestion)}
                className="hover:bg-muted focus-visible:ring-ring/50 rounded-full border px-3 py-1 text-start text-xs outline-none focus-visible:ring-3"
              >
                {suggestion}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ResultCard({ card }: { card: AssistantCardDto }) {
  const Icon = TONE_ICONS[card.tone];
  return (
    <section
      className={cn("flex flex-col gap-2 rounded-lg p-3", TONE_STYLES[card.tone])}
      aria-label={card.title}
    >
      <h4 className="flex items-center gap-2 text-sm font-bold">
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        {card.title}
      </h4>
      <dl className="flex flex-col gap-1 text-sm">
        {card.rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-3">
            <dt className="opacity-80">{row.label}</dt>
            <dd className="tnum font-semibold">{row.value}</dd>
          </div>
        ))}
      </dl>
      {card.note && <p className="text-xs opacity-90">{card.note}</p>}
      {card.href && (
        <Link
          href={card.href}
          className="flex w-fit items-center gap-1 text-sm font-medium underline underline-offset-4"
        >
          مشاهده
          <ArrowLeftIcon className="size-3.5" aria-hidden="true" />
        </Link>
      )}
    </section>
  );
}
