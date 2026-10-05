import { BellRingIcon, BookOpenCheckIcon, LineChartIcon } from "lucide-react";
import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FlashDeals } from "@/features/deals";
import { SearchForm } from "@/features/search";
import { tehranToday } from "@/lib/format";
import { paths } from "@/lib/paths";

const STARTER_QUESTIONS = [
  "پاوربانک در پرواز مجاز است؟",
  "اگر پرواز کنسل شود چه حقی دارم؟",
  "برای پرواز خارجی چه مدارکی لازم است؟",
] as const;

export default function HomePage() {
  const today = tehranToday();

  return (
    <>
      <section className="border-b">
        <PageContainer className="gap-8 py-10 md:py-16">
          <div className="flex max-w-2xl flex-col gap-3">
            <h1 className="text-4xl font-extrabold tracking-tight text-balance md:text-5xl">
              قیمت را بفهمید، بعد بلیت بخرید
            </h1>
            <p className="text-muted-foreground text-lg leading-8 text-pretty">
              برای هر پرواز می‌گوییم الان بخرید یا صبر کنید، و دستیار پرواز پلاس قوانین بار، مدارک و
              استرداد را برایتان روشن می‌کند.
            </p>
          </div>
          <Card className="p-5 shadow-sm">
            <SearchForm today={today} />
          </Card>
        </PageContainer>
      </section>

      <PageContainer className="gap-12 py-12">
        <section aria-labelledby="deals-title" className="flex flex-col gap-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 id="deals-title" className="text-2xl font-bold">
                قیمت‌هایی که امروز زیر معمول‌اند
              </h2>
              <p className="text-muted-foreground text-sm">
                پروازهایی از تهران که از میانگین قیمت خودشان ارزان‌ترند.
              </p>
            </div>
            <Button asChild variant="ghost">
              <Link href={paths.deals}>همه‌ی پیشنهادها</Link>
            </Button>
          </div>
          <FlashDeals limit={4} />
        </section>

        <section aria-labelledby="why-title" className="grid gap-8 md:grid-cols-[1fr_2fr]">
          <div className="flex flex-col gap-2 md:sticky md:top-24 md:self-start">
            <h2 id="why-title" className="text-2xl font-bold text-balance">
              خرید بلیت، بدون حدس‌زدن
            </h2>
            <p className="text-muted-foreground">
              سه چیزی که معمولاً بعد از خرید می‌فهمید، پیش از خرید به شما می‌گوییم.
            </p>
          </div>
          <ol className="divide-y border-y" role="list">
            <Feature
              icon={<LineChartIcon className="size-6" aria-hidden="true" />}
              title="تحلیل قیمت هر پرواز"
              body="نمودار قیمت روزهای گذشته، پیش‌بینی هفته‌ی بعد و توصیه‌ی «الان بخرید» یا «صبر کنید»؛ با دلیل و میزان اطمینان، نه فقط یک رنگ."
            />
            <Feature
              icon={<BookOpenCheckIcon className="size-6" aria-hidden="true" />}
              title="دستیاری که قوانین را می‌داند"
              body="وزن بار، اقلام ممنوعه، مدارک سفر، عوارض خروج، حقوق مسافر هنگام تأخیر؛ با محاسبه‌ی دقیق و منبع هر پاسخ."
            />
            <Feature
              icon={<BellRingIcon className="size-6" aria-hidden="true" />}
              title="هشدار قیمت"
              body="قیمت دلخواهتان را بنویسید؛ وقتی ارزان‌ترین پرواز آن مسیر به آن رسید خبر می‌دهیم."
            />
          </ol>
        </section>

        <section
          aria-labelledby="ask-title"
          className="bg-brand-soft flex flex-col gap-3 rounded-2xl p-6 md:p-8"
        >
          <h2 id="ask-title" className="text-brand-ink text-xl font-bold">
            هر سؤالی درباره‌ی پرواز دارید بپرسید
          </h2>
          <ul className="flex flex-wrap gap-2" role="list">
            {STARTER_QUESTIONS.map((question) => (
              <li key={question}>
                <Link
                  href={`${paths.assistant}?q=${encodeURIComponent(question)}`}
                  className="bg-background hover:bg-muted focus-visible:ring-ring/50 inline-flex rounded-full border px-4 py-2 text-sm outline-none focus-visible:ring-3"
                >
                  {question}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </PageContainer>
    </>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <li className="flex gap-4 py-6">
      <span className="bg-brand-soft text-brand-ink flex size-11 shrink-0 items-center justify-center rounded-xl">
        {icon}
      </span>
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="text-muted-foreground leading-7">{body}</p>
      </div>
    </li>
  );
}
