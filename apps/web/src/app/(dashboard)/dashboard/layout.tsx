import { BellIcon, HomeIcon, PlaneIcon, TicketIcon, UsersIcon } from "lucide-react";
import Link from "next/link";

import { LogoutButton } from "@/features/auth";
import { requireSession } from "@/lib/auth/dal";
import { paths } from "@/lib/paths";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSession();

  return (
    <div className="bg-muted/20 flex min-h-dvh flex-col">
      {/* Top Header */}
      <header className="bg-background sticky top-0 z-30 border-b">
        <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href={paths.home} className="flex items-center gap-2">
              <div className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-xl">
                <PlaneIcon className="size-5 rtl:rotate-180" />
              </div>
              <span className="font-heading text-foreground font-bold">پرواز پلاس</span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <bdi dir="ltr" className="text-muted-foreground font-mono text-sm">
              {user.mobile}
            </bdi>
            <LogoutButton />
          </div>
        </div>

        {/* Sub-Navigation */}
        <div className="no-scrollbar container mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto border-t px-4 py-2 text-xs font-semibold sm:px-6">
          <Link
            href={paths.dashboard}
            className="text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors"
          >
            <HomeIcon className="size-3.5" />
            <span>نمای کلی</span>
          </Link>
          <Link
            href={paths.passengers}
            className="text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors"
          >
            <UsersIcon className="size-3.5" />
            <span>بانک مسافران من (خرید ۱-کلیکه)</span>
          </Link>
          <Link
            href={paths.priceAlerts}
            className="text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors"
          >
            <BellIcon className="size-3.5" />
            <span>دیده‌بان‌های فعال قیمت</span>
          </Link>
          <Link
            href={paths.bookings}
            className="text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors"
          >
            <TicketIcon className="size-3.5" />
            <span>سفرها و بلیط‌های من</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto max-w-6xl flex-1 p-4 sm:p-6">{children}</main>
    </div>
  );
}
