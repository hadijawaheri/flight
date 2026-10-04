"use client";

import {
  BellIcon,
  CompassIcon,
  MenuIcon,
  PlaneIcon,
  SparklesIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { paths } from "@/lib/paths";

export function SiteHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navItems = [
    { label: "جستجوی پرواز", href: paths.flights, icon: PlaneIcon },
    { label: "آفرهای ارزان", href: paths.deals, icon: SparklesIcon, badge: "ویژه" },
    { label: "کاوشگر بودجه", href: paths.explore, icon: CompassIcon },
    { label: "دیده‌بان قیمت", href: paths.priceAlerts, icon: BellIcon },
    { label: "بانک مسافران", href: paths.passengers, icon: UsersIcon },
  ];

  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-40 w-full border-b backdrop-blur-md">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link
            href={paths.home}
            className="flex items-center gap-2.5 transition-transform active:scale-95"
          >
            <div className="bg-primary text-primary-foreground shadow-primary/25 flex size-10 items-center justify-center rounded-xl shadow-md">
              <PlaneIcon className="size-5 rtl:rotate-180" />
            </div>
            <div className="flex flex-col">
              <span className="font-heading text-foreground text-lg font-bold tracking-tight">
                پرواز پلاس
              </span>
              <span className="text-muted-foreground text-[10px] font-medium">
                FlySmart • ارزان‌ترین قیمت‌ها
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-muted text-foreground font-semibold"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                >
                  <Icon className="size-4" />
                  <span>{item.label}</span>
                  {item.badge && (
                    <Badge
                      variant="secondary"
                      className="text-primary bg-primary/10 px-1.5 py-0 text-[10px]"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User CTA & Mobile Hamburger */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href={paths.dashboard}>
            <Button variant="outline" size="sm" className="hidden gap-1.5 sm:inline-flex">
              <UsersIcon className="size-4" />
              <span>حساب کاربری</span>
            </Button>
          </Link>
          <Link href={paths.signIn}>
            <Button size="sm" className="gap-1.5 text-xs shadow-sm sm:text-sm">
              <span>ورود / عضویت</span>
            </Button>
          </Link>

          {/* Mobile Menu Toggle Button */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden"
            aria-label="منوی سایت"
          >
            {mobileMenuOpen ? <XIcon className="size-5" /> : <MenuIcon className="size-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      {mobileMenuOpen && (
        <div className="bg-background/98 animate-in slide-in-from-top-2 flex flex-col gap-1 border-t px-4 py-3 shadow-lg duration-150 md:hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary font-bold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="size-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <Badge
                    variant="secondary"
                    className="text-primary bg-primary/10 px-1.5 py-0 text-[10px]"
                  >
                    {item.badge}
                  </Badge>
                )}
              </Link>
            );
          })}
          <div className="mt-1 flex flex-col gap-2 border-t pt-2 sm:hidden">
            <Link href={paths.dashboard} onClick={() => setMobileMenuOpen(false)}>
              <Button variant="outline" size="sm" className="w-full justify-start gap-2">
                <UsersIcon className="size-4" />
                <span>حساب کاربری من</span>
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
