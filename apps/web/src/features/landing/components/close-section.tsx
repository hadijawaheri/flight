import { ArrowUpIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { paths } from "@/lib/paths";

import { JourneyColumn } from "./journey-panel";

/**
 * Night: the flight ends where it began. The section is a solid colour in both themes so its light
 * type has a known background, and its rounded edges meet the page below like a horizon.
 */
export function CloseSection() {
  return (
    <section
      aria-labelledby="close-title"
      className="bg-night text-night-ink mx-2 rounded-[3rem] py-24 md:mx-4 md:py-32"
    >
      <JourneyColumn className="flex flex-col items-start gap-8">
        <h2
          id="close-title"
          className="max-w-3xl text-3xl leading-[1.35] font-black text-balance md:text-5xl md:leading-[1.3]"
        >
          پرواز بعدی‌تان را با اطمینان انتخاب کنید
        </h2>
        <p className="text-night-ink-muted max-w-xl text-lg leading-8">
          مسیر، تاریخ و تعداد مسافر را بنویسید؛ بقیه‌اش را تحلیل قیمت و دستیار قوانین روشن می‌کنند.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Button asChild size="lg" className="h-12 px-6 text-base">
            <a href="#search">
              <ArrowUpIcon aria-hidden="true" />
              جست‌وجوی پرواز
            </a>
          </Button>
          <Link
            href={paths.rules}
            className="text-night-ink focus-visible:ring-ring/50 rounded-md px-1 py-2 underline underline-offset-4 outline-none focus-visible:ring-3"
          >
            قوانین بار، مدارک و استرداد
          </Link>
        </div>
      </JourneyColumn>
    </section>
  );
}
