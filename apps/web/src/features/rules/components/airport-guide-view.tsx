import type { AirportGuideDto } from "@flysmart/contracts";
import { ClockIcon, DoorClosedIcon } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDuration } from "@/lib/format";
import { paths } from "@/lib/paths";

import { ReliabilityBadge } from "./reliability-badge";

export function AirportGuideView({ guide }: { guide: AirportGuideDto }) {
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">
            راهنمای فرودگاه {guide.nameFa}
          </h1>
          <Badge variant="outline" className="tnum" dir="ltr">
            {guide.code}
          </Badge>
          <Badge variant="secondary">
            {guide.international && guide.domestic
              ? "داخلی و خارجی"
              : guide.international
                ? "فقط خارجی"
                : "داخلی"}
          </Badge>
        </div>
        <p className="text-muted-foreground text-sm" dir="ltr">
          {guide.nameEn} · {guide.cityFa}، {guide.countryFa}
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="flex-row items-center gap-4 p-4">
          <ClockIcon className="text-primary size-8 shrink-0" aria-hidden="true" />
          <div>
            <p className="text-muted-foreground text-xs">زمان توصیه‌شده‌ی رسیدن به فرودگاه</p>
            <p className="font-bold">{formatDuration(guide.arrivalLeadMinutes)} قبل از پرواز</p>
          </div>
        </Card>
        <Card className="flex-row items-center gap-4 p-4">
          <DoorClosedIcon className="text-primary size-8 shrink-0" aria-hidden="true" />
          <div>
            <p className="text-muted-foreground text-xs">بسته شدن پذیرش (معمولاً)</p>
            <p className="font-bold">
              {formatDuration(guide.checkInClosesMinutesBefore)} قبل از پرواز
            </p>
          </div>
        </Card>
      </div>

      <p className="text-muted-foreground text-xs">
        این زمان‌ها توصیه‌ی عمومی‌اند؛ زمان دقیق پذیرش هر پرواز را ایرلاین اعلام می‌کند.
      </p>

      {guide.tips.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">نکته‌های این فرودگاه</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex list-disc flex-col gap-2 ps-5 leading-7" role="list">
              {guide.tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {guide.relatedRules.length > 0 && (
        <section aria-labelledby="related-rules" className="flex flex-col gap-3">
          <h2 id="related-rules" className="text-lg font-bold">
            قوانین مرتبط
          </h2>
          <ul className="flex flex-col gap-2" role="list">
            {guide.relatedRules.map((rule) => (
              <li key={rule.id}>
                <Card className="p-0">
                  <Link
                    href={paths.rule(rule.id)}
                    className="hover:bg-muted/50 focus-visible:ring-ring/50 flex flex-col gap-1 rounded-xl p-4 outline-none focus-visible:ring-3"
                  >
                    <span className="flex flex-wrap items-center gap-2 font-semibold">
                      {rule.title}
                      <ReliabilityBadge reliability={rule.reliability} />
                    </span>
                    <span className="text-muted-foreground text-sm">{rule.summary}</span>
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
