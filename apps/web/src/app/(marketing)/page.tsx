"use client";

import {
  ArrowLeftIcon,
  BellRingIcon,
  CheckCircle2Icon,
  CompassIcon,
  PlaneIcon,
  SparklesIcon,
  TrendingDownIcon,
  UsersIcon,
  ZapIcon,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useBudgetExplore, useCheapDeals } from "@/features/deals/queries";
import { FlightSearchBox } from "@/features/flights/components/flight-search-box";
import { normalizeDateParam } from "@/lib/format";
import { paths } from "@/lib/paths";

export default function HomePage() {
  const { data: deals, isLoading: isDealsLoading } = useCheapDeals();
  const [selectedBudget, setSelectedBudget] = React.useState(20_000_000); // 2M Tomans = 20M Rials

  const { data: budgetDestinations } = useBudgetExplore({
    origin: "THR",
    maxBudget: selectedBudget,
  });

  return (
    <div className="flex flex-col gap-16 pb-20">
      {/* Hero Section */}
      <section className="from-primary/10 via-background to-background relative overflow-hidden bg-gradient-to-b pt-12 pb-8 sm:pt-20">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto mb-8 flex max-w-3xl flex-col items-center gap-4 text-center">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Badge
                variant="secondary"
                className="bg-primary/10 text-primary border-primary/20 gap-1.5 px-3 py-1 text-xs"
              >
                <SparklesIcon className="size-3.5" />
                <span>نسل جدید سامانه پرواز پلاس (FlySmart)</span>
              </Badge>
              <Badge
                variant="outline"
                className="gap-1.5 border-emerald-300 px-3 py-1 text-xs text-emerald-600"
              >
                <TrendingDownIcon className="size-3.5" />
                <span>تضمین کمترین نرخ بازار</span>
              </Badge>
            </div>

            <h1 className="font-heading text-foreground text-3xl leading-tight font-extrabold tracking-tight sm:text-5xl sm:leading-tight">
              خرید هوشمندانه بلیط هواپیما <br className="hidden sm:inline" />
              <span className="text-primary">با بهترین قیمت و رزرو ۱-کلیکه</span>
            </h1>

            <p className="text-muted-foreground max-w-2xl text-base leading-relaxed sm:text-lg">
              اولین سامانه پروازی مجهز به تحلیل روند قیمت، دیده‌بان هوشمند کاهش نرخ و بانک مسافران
              همیشگی. یک‌بار مشخصات را ثبت کنید و در تمام سفرهای آینده تنها با یک کلیک بلیط خود را
              نهایی کنید.
            </p>
          </div>

          {/* Floating Search Box */}
          <div className="relative z-10 mx-auto max-w-5xl">
            <FlightSearchBox />
          </div>
        </div>
      </section>

      {/* Innovation Highlights Bar */}
      <section className="container mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-card/60 hover:border-primary/40 border p-4 transition-all hover:shadow-xs">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                <ZapIcon className="size-5" />
              </div>
              <div className="flex flex-col gap-1 text-start">
                <h3 className="font-heading text-foreground text-sm font-bold">
                  رزرو ۱-کلیکه بدون تایپ
                </h3>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  مشخصات مسافران را یکبار ثبت کنید و در تمام خریدها با یک کلیک درج کنید.
                </p>
              </div>
            </div>
          </Card>

          <Card className="bg-card/60 hover:border-primary/40 border p-4 transition-all hover:shadow-xs">
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
                <TrendingDownIcon className="size-5" />
              </div>
              <div className="flex flex-col gap-1 text-start">
                <h3 className="font-heading text-foreground text-sm font-bold">
                  پیش‌بینی روند قیمت
                </h3>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  الگوریتم پرواز پلاس به شما پیشنهاد می‌دهد که الان بخرید یا برای ارزان‌تر شدن صبر
                  کنید.
                </p>
              </div>
            </div>
          </Card>

          <Card className="bg-card/60 hover:border-primary/40 border p-4 transition-all hover:shadow-xs">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <BellRingIcon className="size-5" />
              </div>
              <div className="flex flex-col gap-1 text-start">
                <h3 className="font-heading text-foreground text-sm font-bold">
                  دیده‌بان افت قیمت پیامکی
                </h3>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  بودجه و مسیرتان را ثبت کنید؛ به محض باز شدن پرواز زیر قیمت، پیامک فوری دریافت
                  کنید.
                </p>
              </div>
            </div>
          </Card>

          <Card className="bg-card/60 hover:border-primary/40 border p-4 transition-all hover:shadow-xs">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                <CompassIcon className="size-5" />
              </div>
              <div className="flex flex-col gap-1 text-start">
                <h3 className="font-heading text-foreground text-sm font-bold">کاوشگر بودجه سفر</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  سقف بودجه خود را تعیین کنید تا تمام شهرهایی که با آن مبلغ می‌توانید بروید را
                  ببینید!
                </p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Cheap Deals & Flash Bargains */}
      <section className="container mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1 text-start">
            <div className="flex items-center gap-2">
              <SparklesIcon className="size-5 text-amber-500" />
              <h2 className="font-heading text-foreground text-2xl font-bold">
                آفرهای شگفت‌انگیز و پروازهای زیر قیمت امروز
              </h2>
            </div>
            <p className="text-muted-foreground text-sm">
              پروازهای چارتری و کنسلی لحظه آخری با بیشترین درصد تخفیف ویژه کاربران پرواز پلاس
            </p>
          </div>

          <Link href={paths.deals}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <span>مشاهده همه آفرها</span>
              <ArrowLeftIcon className="size-4 rtl:rotate-180" />
            </Button>
          </Link>
        </div>

        {isDealsLoading ? (
          <div className="grid animate-pulse grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-muted h-44 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {deals?.map((deal) => (
              <Card
                key={deal.id}
                className="group hover:border-primary/40 overflow-hidden border transition-all hover:shadow-lg"
              >
                <div className="flex h-full flex-col justify-between gap-4 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="font-heading text-foreground text-lg font-bold">
                        {deal.origin} به {deal.destination}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        حرکت: {deal.departureDate} • {deal.airline}
                      </span>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-600"
                    >
                      {deal.discountPercent}٪ تخفیف
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between border-t pt-3">
                    <div className="flex flex-col">
                      <span className="text-muted-foreground text-xs line-through">
                        {deal.regularPrice.toLocaleString("fa-IR")}
                      </span>
                      <div className="flex items-baseline gap-1">
                        <span className="font-heading text-primary text-xl font-extrabold">
                          {deal.dealPrice.toLocaleString("fa-IR")}
                        </span>
                        <span className="text-muted-foreground text-xs font-medium">ریال</span>
                      </div>
                    </div>

                    <Link
                      href={`${paths.flights}?origin=${deal.originCode}&destination=${deal.destinationCode}&departureDate=${normalizeDateParam(deal.departureDate)}`}
                    >
                      <Button size="sm" className="gap-1 font-bold shadow-sm">
                        <span>خرید سریع</span>
                        <ArrowLeftIcon className="size-3.5 rtl:rotate-180" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Interactive Budget Explorer Teaser */}
      <section className="container mx-auto max-w-7xl px-4 sm:px-6">
        <Card className="from-card via-card to-primary/5 overflow-hidden border bg-gradient-to-br p-6 sm:p-8">
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-col gap-1 text-start">
                <div className="flex items-center gap-2">
                  <CompassIcon className="text-primary size-6" />
                  <h2 className="font-heading text-foreground text-2xl font-bold">
                    با بودجه دلخواه کجا می‌تونم برم؟ (کاوشگر بودجه)
                  </h2>
                </div>
                <p className="text-muted-foreground text-sm">
                  مبلغی که می‌خواهید برای سفر هزینه کنید را انتخاب کنید تا بهترین مقاصد در دسترس به
                  شما پیشنهاد شوند.
                </p>
              </div>

              {/* Budget selector buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { label: "تا ۱.۵ میلیون", value: 15_000_000 },
                  { label: "تا ۲ میلیون", value: 20_000_000 },
                  { label: "تا ۲.۵ میلیون", value: 25_000_000 },
                  { label: "تا ۳ میلیون", value: 30_000_000 },
                ].map((b) => (
                  <button
                    key={b.value}
                    type="button"
                    onClick={() => setSelectedBudget(b.value)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                      selectedBudget === b.value
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Matching Destinations Grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {budgetDestinations?.map((dest) => (
                <Link
                  key={dest.destinationCode}
                  href={`${paths.flights}?origin=THR&destination=${dest.destinationCode}&departureDate=${dest.bestDate}`}
                  className="bg-background hover:border-primary/50 group flex flex-col gap-1.5 rounded-xl border p-3 text-center transition-all hover:shadow-md"
                >
                  <div className="bg-primary/10 text-primary mx-auto flex size-10 items-center justify-center rounded-xl transition-transform group-hover:scale-110">
                    <PlaneIcon className="size-5 rtl:rotate-180" />
                  </div>
                  <span className="font-heading text-foreground text-sm font-bold">
                    {dest.destination}
                  </span>
                  <div className="text-muted-foreground flex flex-col text-[11px]">
                    <span>شروع از:</span>
                    <span className="text-primary text-xs font-bold">
                      {dest.minPrice.toLocaleString("fa-IR")} ریال
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </Card>
      </section>

      {/* 1-Click Travelers Vault Feature Showcase */}
      <section className="container mx-auto max-w-7xl px-4 sm:px-6">
        <div className="bg-muted/20 grid grid-cols-1 items-center gap-8 rounded-3xl border p-6 sm:p-10 lg:grid-cols-2">
          <div className="flex flex-col gap-4 text-start">
            <Badge variant="outline" className="text-primary border-primary/30 w-fit">
              نوآوری در تجربه کاربری
            </Badge>
            <h2 className="font-heading text-foreground text-2xl leading-snug font-extrabold sm:text-3xl">
              خداحافظی با تایپ مکرر کد ملی و مشخصات همراهان!
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed sm:text-base">
              با تکنولوژی **Travelers Vault** در پرواز پلاس، مشخصات شما و خانواده یا همکارانتان تنها
              یک بار ثبت می‌شود. در تمام رزروهای آتی، نام همراهان به صورت نشان‌های آماده نمایش داده
              می‌شود و فقط با ۱ کلیک در فرم قرار می‌گیرد.
            </p>

            <ul className="text-foreground flex flex-col gap-2.5 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle2Icon className="size-4 text-emerald-600" />
                <span>اعتبارسنجی خودکار صحت الگوریتم کد ملی و اطلاعات گذرنامه</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2Icon className="size-4 text-emerald-600" />
                <span>انتخاب سریع صندلی‌های کنار هم برای خانواده</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2Icon className="size-4 text-emerald-600" />
                <span>امکان افزودن نامحدود مسافران مکرر (همکاران، دوستان، خانواده)</span>
              </li>
            </ul>

            <div className="pt-2">
              <Link href={paths.passengers}>
                <Button className="shadow-primary/20 gap-2 font-bold shadow-md">
                  <UsersIcon className="size-4" />
                  <span>ورود به بانک مسافران من</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Interactive Mock Preview */}
          <div className="bg-card flex flex-col gap-3 rounded-2xl border p-5 shadow-xl">
            <span className="text-muted-foreground text-xs font-bold">
              پیش‌نمایش بانک مسافران در صفحه رزرو:
            </span>
            <div className="flex flex-wrap gap-2">
              <div className="bg-primary text-primary-foreground flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold shadow-sm">
                <CheckCircle2Icon className="size-4" />
                <span>علی محمدی (۰۴۹۹۳۷۰۸۹۹)</span>
                <Badge variant="secondary" className="bg-white/20 text-[9px]">
                  انتخاب شد
                </Badge>
              </div>
              <div className="bg-muted/60 text-foreground flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium">
                <span className="size-2 rounded-full bg-emerald-500" />
                <span>سارا محمدی (۰۶۸۴۱۵۹۴۱۴)</span>
              </div>
              <div className="bg-muted/60 text-foreground flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium">
                <span className="size-2 rounded-full bg-blue-500" />
                <span>رضا احمدی (۰۰۱۳۵۴۲۴۱۹)</span>
              </div>
            </div>
            <div className="bg-muted/30 text-muted-foreground rounded-xl border p-3 text-xs">
              ⚡ با کلیک روی هر مسافر، تمام فیلدهای نام، کدملی، تاریخ تولد و شماره پاسپورت در کسری
              از ثانیه پر می‌شوند!
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
