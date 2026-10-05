import Link from "next/link";

import { Logo } from "@/components/shared/logo";
import { Separator } from "@/components/ui/separator";
import { SITE_NAME } from "@/lib/seo";
import { paths } from "@/lib/paths";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t print:hidden">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex max-w-sm flex-col gap-2">
            <Logo />
            <p className="text-muted-foreground text-sm">
              بلیت هواپیما را با اطمینان بخرید: قیمت را تحلیل می‌کنیم و قوانین پرواز را برایتان ساده
              می‌کنیم.
            </p>
          </div>
          <nav
            aria-label="پیوندهای پایین صفحه"
            className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm"
          >
            <Link href={paths.flights} className="hover:underline">
              جست‌وجوی پرواز
            </Link>
            <Link href={paths.rules} className="hover:underline">
              قوانین پرواز
            </Link>
            <Link href={paths.deals} className="hover:underline">
              پیشنهاد ویژه
            </Link>
            <Link href={paths.assistant} className="hover:underline">
              دستیار هوشمند
            </Link>
            <Link href={paths.explore} className="hover:underline">
              کجا بروم؟
            </Link>
            <Link href={paths.bookings} className="hover:underline">
              سفرهای من
            </Link>
          </nav>
        </div>
        <Separator />
        <p className="text-muted-foreground text-xs">
          {SITE_NAME} نسخه‌ی نمایشی است: پروازها و قیمت‌ها شبیه‌سازی شده‌اند و پرداخت واقعی انجام
          نمی‌شود.
        </p>
      </div>
    </footer>
  );
}
