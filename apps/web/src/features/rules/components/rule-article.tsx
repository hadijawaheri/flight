import { RELIABILITY_LABELS, RULE_CATEGORY_LABELS, type RuleEntryDto } from "@flysmart/contracts";
import { CheckIcon, MessageCircleQuestionIcon } from "lucide-react";
import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { paths } from "@/lib/paths";

import { ReliabilityBadge } from "./reliability-badge";

export function RuleArticle({ rule }: { rule: RuleEntryDto }) {
  return (
    <article className="flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Link
            href={`${paths.rules}?category=${rule.category}`}
            className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          >
            {RULE_CATEGORY_LABELS[rule.category]}
          </Link>
          <ReliabilityBadge reliability={rule.reliability} />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-balance md:text-3xl">
          {rule.title}
        </h1>
        <p className="text-lg leading-8">{rule.summary}</p>
      </header>

      {rule.reliability !== "STANDARD" && (
        <Alert>
          <AlertTitle>{RELIABILITY_LABELS[rule.reliability]}</AlertTitle>
          <AlertDescription>
            {rule.reliability === "VOLATILE"
              ? "مبلغ‌ها و مقررات این بخش مرتب تغییر می‌کند. پیش از تصمیم، مقدار جاری را بررسی کنید."
              : "عددها و شرایط دقیق را هر ایرلاین و هر نرخ خودش تعیین می‌کند."}
            {rule.verifyWith && (
              <>
                {" "}
                منبع تأیید: <strong>{rule.verifyWith}</strong>.
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      {rule.details.length > 0 && (
        <section aria-label="توضیحات" className="flex flex-col gap-3 leading-8">
          {rule.details.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </section>
      )}

      {rule.checklist.length > 0 && (
        <section aria-labelledby="checklist-title" className="flex flex-col gap-3">
          <h2 id="checklist-title" className="text-lg font-bold">
            پیش از سفر
          </h2>
          <ul className="flex flex-col gap-2" role="list">
            {rule.checklist.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <CheckIcon className="text-primary mt-1.5 size-4 shrink-0" aria-hidden="true" />
                <span className="leading-7">{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <p className="text-muted-foreground text-xs">
          آخرین بازبینی: {formatDate(rule.reviewedAt)}
        </p>
        <Button asChild variant="outline">
          <Link href={`${paths.assistant}?q=${encodeURIComponent(rule.title)}`}>
            <MessageCircleQuestionIcon data-icon="inline-start" />
            سؤال دیگری دارید؟ از دستیار بپرسید
          </Link>
        </Button>
      </footer>
    </article>
  );
}
