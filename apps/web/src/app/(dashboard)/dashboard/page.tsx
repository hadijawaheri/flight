import { ArrowLeftIcon, BellIcon, PlaneIcon, TicketIcon, UsersIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProfileForm } from "@/features/profile";
import { requireSession } from "@/lib/auth/dal";
import { paths } from "@/lib/paths";

export const metadata: Metadata = { title: "داشبورد پرواز پلاس", robots: { index: false } };

export default async function DashboardPage() {
  const user = await requireSession();

  return (
    <div className="flex flex-col gap-8">
      {/* Welcome Banner */}
      <div className="bg-card flex flex-col justify-between gap-4 rounded-2xl border p-6 shadow-xs sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-2xl">
            <PlaneIcon className="size-6 rtl:rotate-180" />
          </div>
          <div className="flex flex-col text-start">
            <h1 className="font-heading text-2xl font-bold" data-testid="greeting">
              {user.firstName ? `سلام ${user.firstName}` : "خوش آمدید"}
            </h1>
            <span className="text-muted-foreground text-xs">
              به سامانه هوشمند رزرو پرواز پلاس خوش آمدید.
            </span>
          </div>
        </div>

        <Link href={paths.flights}>
          <Button className="gap-2 font-bold shadow-sm">
            <PlaneIcon className="size-4 rtl:rotate-180" />
            <span>جستجو و رزرو پرواز</span>
          </Button>
        </Link>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Travelers Vault */}
        <Card className="bg-card hover:border-primary/40 flex flex-col justify-between gap-4 border p-5 transition-colors">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                <UsersIcon className="size-5" />
              </div>
              <div className="flex flex-col text-start">
                <span className="font-heading text-foreground text-sm font-bold">
                  بانک مسافران من
                </span>
                <span className="text-muted-foreground text-[11px]">خرید ۱-کلیکه بدون تایپ</span>
              </div>
            </div>
            <Badge variant="secondary" className="bg-amber-500/10 text-[10px] text-amber-700">
              ویژه
            </Badge>
          </div>
          <p className="text-muted-foreground text-xs leading-relaxed">
            مشخصات هویتی خود و همراهان را ذخیره کنید تا در صفحه خرید به صورت خودکار قرار گیرند.
          </p>
          <Link href={paths.passengers}>
            <Button variant="outline" size="sm" className="w-full gap-1 text-xs">
              <span>مدیریت مسافران</span>
              <ArrowLeftIcon className="size-3 rtl:rotate-180" />
            </Button>
          </Link>
        </Card>

        {/* Price Alerts */}
        <Card className="bg-card hover:border-primary/40 flex flex-col justify-between gap-4 border p-5 transition-colors">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl">
                <BellIcon className="size-5" />
              </div>
              <div className="flex flex-col text-start">
                <span className="font-heading text-foreground text-sm font-bold">
                  دیده‌بان‌های فعال قیمت
                </span>
                <span className="text-muted-foreground text-[11px]">هشدار پیامکی کاهش نرخ</span>
              </div>
            </div>
          </div>
          <p className="text-muted-foreground text-xs leading-relaxed">
            مسیرهای زیر نظر شما برای خرید به محض ارزان شدن و رسیدن به سقف بودجه تعیین شده.
          </p>
          <Link href={paths.priceAlerts}>
            <Button variant="outline" size="sm" className="w-full gap-1 text-xs">
              <span>مشاهده دیده‌بان‌ها</span>
              <ArrowLeftIcon className="size-3 rtl:rotate-180" />
            </Button>
          </Link>
        </Card>

        {/* Bookings */}
        <Card className="bg-card hover:border-primary/40 flex flex-col justify-between gap-4 border p-5 transition-colors">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <TicketIcon className="size-5" />
              </div>
              <div className="flex flex-col text-start">
                <span className="font-heading text-foreground text-sm font-bold">
                  سفرها و بلیط‌های من
                </span>
                <span className="text-muted-foreground text-[11px]">مشاهده و چاپ E-Ticket</span>
              </div>
            </div>
          </div>
          <p className="text-muted-foreground text-xs leading-relaxed">
            تاریخچه پروازهای گذشته، پروازهای آینده و دانلود فایل چاپی یا بارکد بلیط.
          </p>
          <Link href={paths.bookings}>
            <Button variant="outline" size="sm" className="w-full gap-1 text-xs">
              <span>مشاهده بلیط‌ها</span>
              <ArrowLeftIcon className="size-3 rtl:rotate-180" />
            </Button>
          </Link>
        </Card>
      </div>

      {/* Profile Form */}
      <div className="flex flex-col gap-3">
        <h2 className="font-heading text-foreground text-lg font-bold">اطلاعات حساب کاربری</h2>
        <ProfileForm user={user} />
      </div>
    </div>
  );
}
