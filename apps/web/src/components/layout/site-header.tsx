import Link from "next/link";

import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth/dal";
import { paths } from "@/lib/paths";

import { MobileNav } from "./mobile-nav";
import { NAV_ITEMS } from "./nav-items";
import { UserMenu } from "./user-menu";

export async function SiteHeader() {
  const user = await getSession().catch(() => null);

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 print:hidden">
      <div className="bg-card shadow-panel ring-foreground/10 mx-auto flex h-14 w-full max-w-6xl items-center gap-3 rounded-2xl px-3 ring-1 sm:px-4">
        <MobileNav />
        <Logo />
        <nav aria-label="ناوبری اصلی" className="ms-4 hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <Button key={item.href} asChild variant="ghost" size="sm" className="font-medium">
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
        </nav>
        <div className="ms-auto flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <UserMenu user={user} />
          ) : (
            <Button asChild size="sm">
              <Link href={paths.signIn}>ورود / ثبت‌نام</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
