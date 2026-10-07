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
      className="-mx-4 -my-1.5 overflow-x-auto px-4 py-1.5 lg:m-0 lg:overflow-visible lg:p-0"
    >
      <ul
        className="lg:bg-card lg:shadow-panel lg:ring-foreground/10 flex gap-1.5 lg:flex-col lg:gap-1 lg:rounded-2xl lg:p-2 lg:ring-1"
        role="list"
      >
        {ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "focus-visible:ring-ring/50 flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold whitespace-nowrap transition-colors outline-none focus-visible:ring-3",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground lg:bg-transparent",
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
