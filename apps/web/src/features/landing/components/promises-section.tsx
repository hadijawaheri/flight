import { BellRingIcon, BookOpenCheckIcon, LineChartIcon } from "lucide-react";
import type { ReactNode } from "react";

import { JourneyColumn, JourneyPanel } from "./journey-panel";
import { AlertArt, AssistantArt, PriceVerdictArt } from "./promise-art";

interface Promise {
  icon: ReactNode;
  title: string;
  body: string;
  art: ReactNode;
}

const PROMISES: readonly Promise[] = [
  {
    icon: <LineChartIcon className="size-5" aria-hidden="true" />,
    title: "تحلیل قیمت هر پرواز",
    body: "نمودار قیمت روزهای گذشته، پیش‌بینی هفته‌ی بعد و توصیه‌ی «الان بخرید» یا «صبر کنید»؛ با دلیل و میزان اطمینان، نه فقط یک رنگ.",
    art: <PriceVerdictArt />,
  },
  {
    icon: <BookOpenCheckIcon className="size-5" aria-hidden="true" />,
    title: "دستیاری که قوانین را می‌داند",
    body: "وزن بار، اقلام ممنوعه، مدارک سفر، عوارض خروج، حقوق مسافر هنگام تأخیر؛ با محاسبه‌ی دقیق و منبع هر پاسخ.",
    art: <AssistantArt />,
  },
  {
    icon: <BellRingIcon className="size-5" aria-hidden="true" />,
    title: "هشدار قیمت",
    body: "قیمت دلخواهتان را بنویسید؛ وقتی ارزان‌ترین پرواز آن مسیر به آن رسید خبر می‌دهیم.",
    art: <AlertArt />,
  },
];

export function PromisesSection() {
  return (
    <section aria-labelledby="why-title" className="reveal py-6">
      <JourneyColumn>
        <JourneyPanel className="flex flex-col gap-8">
          <div className="flex max-w-2xl flex-col gap-2">
            <h2 id="why-title" className="text-2xl font-extrabold text-balance md:text-3xl">
              خرید بلیت، بدون حدس‌زدن
            </h2>
            <p className="text-muted-foreground md:text-lg">
              سه چیزی که معمولاً بعد از خرید می‌فهمید، پیش از خرید به شما می‌گوییم.
            </p>
          </div>
          <ol className="divide-y" role="list">
            {PROMISES.map((promise) => (
              <li
                key={promise.title}
                className="grid items-center gap-6 py-8 first:pt-0 last:pb-0 md:grid-cols-[3fr_2fr] md:gap-12"
              >
                <div className="flex gap-4">
                  <span className="bg-brand-soft text-brand-ink flex size-10 shrink-0 items-center justify-center rounded-xl">
                    {promise.icon}
                  </span>
                  <div className="flex flex-col gap-1">
                    <h3 className="text-lg font-bold md:text-xl">{promise.title}</h3>
                    <p className="text-muted-foreground leading-7 md:text-lg md:leading-8">
                      {promise.body}
                    </p>
                  </div>
                </div>
                <div className="mx-auto w-full max-w-xs md:max-w-none">{promise.art}</div>
              </li>
            ))}
          </ol>
        </JourneyPanel>
      </JourneyColumn>
    </section>
  );
}
