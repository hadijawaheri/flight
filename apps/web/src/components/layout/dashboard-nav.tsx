"use client";

import { BellIcon, LayoutDashboardIcon, TicketIcon, UserRoundIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { paths } from "@/lib/paths";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: paths.dashboard, label: "نمای کلی", icon: LayoutDashboardIcon, exact: true },
  { href: paths.bookings, label: "سفرهای من", icon: TicketIcon, exact: false },
  { href: paths.passengers, label: "مسافران", icon: UsersIcon, exact: false },
  { href: paths.priceAlerts, label: "هشدار قیمت", icon: BellIcon, exact: false },
  { href: paths.profile, label: "پروفایل", icon: UserRoundIcon, exact: false },
] as const;

/** Tabs on narrow screens, a sidebar from `lg`; the current page is announced, not just coloured. */
export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="بخش‌های حساب"
      className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:px-0"
    >
      <ul className="flex gap-1 lg:flex-col" role="list">
        {ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "focus-visible:ring-ring/50 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3",
                  active
                    ? "bg-brand-soft text-brand-ink"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
