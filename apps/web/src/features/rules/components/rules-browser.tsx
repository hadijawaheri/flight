import type { RuleCategory, RulesIndexDto } from "@flysmart/contracts";
import { SearchIcon, SearchXIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { formatNumber } from "@/lib/format";
import { paths } from "@/lib/paths";
import { cn } from "@/lib/utils";

import { RuleCard } from "./rule-card";

interface RulesBrowserProps {
  index: RulesIndexDto;
  category: RuleCategory | undefined;
  q: string | undefined;
}

/** Plain links and a GET form: the whole browser works without JavaScript and every view is shareable. */
export function RulesBrowser({ index, category, q }: RulesBrowserProps) {
  const total = index.categories.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="flex flex-col gap-6">
      <form
        action={paths.rules}
        method="get"
        role="search"
        aria-label="جست‌وجو در قوانین"
        className="flex gap-2"
      >
        {category && <input type="hidden" name="category" value={category} />}
        <div className="relative flex-1">
          <SearchIcon
            className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="مثلاً: پاوربانک، بار اضافه، استرداد، مدارک کودک"
            aria-label="عبارت جست‌وجو"
            className="ps-9"
          />
        </div>
        <Button type="submit">جست‌وجو</Button>
      </form>

      <nav aria-label="دسته‌بندی قوانین">
        <ul className="flex flex-wrap gap-2" role="list">
          <li>
            <CategoryLink
              href={q ? `${paths.rules}?q=${encodeURIComponent(q)}` : paths.rules}
              active={!category}
              label={`همه (${formatNumber(total)})`}
            />
          </li>
          {index.categories
            .filter((item) => item.count > 0)
            .map((item) => (
              <li key={item.category}>
                <CategoryLink
                  href={`${paths.rules}?category=${item.category}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                  active={category === item.category}
                  label={`${item.label} (${formatNumber(item.count)})`}
                />
              </li>
            ))}
        </ul>
      </nav>

      {index.entries.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchXIcon />
            </EmptyMedia>
            <EmptyTitle>موردی پیدا نشد</EmptyTitle>
            <EmptyDescription>
              عبارت دیگری را امتحان کنید، یا سؤالتان را مستقیم از دستیار بپرسید.
            </EmptyDescription>
          </EmptyHeader>
          <Button asChild variant="outline">
            <Link href={paths.assistant}>پرسیدن از دستیار</Link>
          </Button>
        </Empty>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="list">
          {index.entries.map((rule) => (
            <li key={rule.id}>
              <RuleCard rule={rule} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CategoryLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "focus-visible:ring-ring/50 inline-flex h-8 items-center rounded-full border px-3 text-sm transition-colors outline-none focus-visible:ring-3",
        active ? "border-primary bg-brand-soft text-brand-ink font-medium" : "hover:bg-muted",
      )}
    >
      {label}
    </Link>
  );
}
