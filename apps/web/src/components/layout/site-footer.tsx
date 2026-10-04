import { HeadphonesIcon, PlaneIcon, ShieldCheckIcon, SparklesIcon, ZapIcon } from "lucide-react";
import Link from "next/link";

import { paths } from "@/lib/paths";

export function SiteFooter() {
  return (
    <footer className="bg-muted/30 border-t">
      <div className="container mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4 lg:gap-12">
          {/* Brand info */}
          <div className="flex flex-col gap-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
                <PlaneIcon className="size-4 rtl:rotate-180" />
              </div>
              <span className="font-heading text-lg font-bold">پرواز پلاس (FlySmart)</span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              پلتفرم نوین و هوشمند خرید بلیط هواپیما با تحلیل لحظه‌ای نرخ‌ها، تضمین ارزان‌ترین قیمت،
              دیده‌بان خودکار کاهش نرخ و تجربه خرید ۱-کلیکه.
            </p>
          </div>

          {/* Quick links */}
          <div className="flex flex-col gap-2.5">
            <h4 className="font-heading text-sm font-semibold">دسترسی سریع</h4>
            <ul className="text-muted-foreground flex flex-col gap-2 text-sm">
              <li>
                <Link href={paths.flights} className="hover:text-foreground transition-colors">
                  جستجوی پروازهای داخلی
                </Link>
              </li>
              <li>
                <Link href={paths.deals} className="hover:text-foreground transition-colors">
                  آفرهای چارتری لحظه آخری
                </Link>
              </li>
              <li>
                <Link href={paths.explore} className="hover:text-foreground transition-colors">
                  کاوشگر بودجه سفر
                </Link>
              </li>
              <li>
                <Link href={paths.priceAlerts} className="hover:text-foreground transition-colors">
                  دیده‌بان و هشدار قیمت
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Area */}
          <div className="flex flex-col gap-2.5">
            <h4 className="font-heading text-sm font-semibold">خدمات مسافران</h4>
            <ul className="text-muted-foreground flex flex-col gap-2 text-sm">
              <li>
                <Link href={paths.passengers} className="hover:text-foreground transition-colors">
                  بانک مسافران من (Travelers Vault)
                </Link>
              </li>
              <li>
                <Link href={paths.bookings} className="hover:text-foreground transition-colors">
                  پیگیری و استرداد آنلاین بلیط
                </Link>
              </li>
              <li>
                <Link href={paths.profile} className="hover:text-foreground transition-colors">
                  اطلاعات حساب کاربری
                </Link>
              </li>
            </ul>
          </div>

          {/* Value Props & Contact */}
          <div className="flex flex-col gap-3">
            <h4 className="font-heading text-sm font-semibold">مزایای انحصاری</h4>
            <div className="text-muted-foreground flex flex-col gap-2 text-xs">
              <div className="flex items-center gap-2">
                <ZapIcon className="size-4 shrink-0 text-amber-500" />
                <span>رزرو فوق‌سریع ۱-کلیکه بدون تایپ مجدد مشخصات</span>
              </div>
              <div className="flex items-center gap-2">
                <SparklesIcon className="text-primary size-4 shrink-0" />
                <span>پیش‌بینی هوشمند افت یا افزایش قیمت</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheckIcon className="text-primary size-4 shrink-0" />
                <span>صدور رسمی و آنی بلیط با تاییدیه سازمان هواپیمایی</span>
              </div>
              <div className="flex items-center gap-2">
                <HeadphonesIcon className="size-4 shrink-0 text-blue-500" />
                <span>پشتیبانی شبانه‌روزی مسافران: ۰۲۱-۸۸۸۸۴۴۴۴</span>
              </div>
            </div>
          </div>
        </div>

        <div className="text-muted-foreground mt-8 border-t pt-6 text-center text-xs">
          © {new Date().getFullYear()} تمامی حقوق متعلق به پرواز پلاس (FlySmart) است.
        </div>
      </div>
    </footer>
  );
}
