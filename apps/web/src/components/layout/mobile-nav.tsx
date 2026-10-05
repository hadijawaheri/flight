"use client";

import { MenuIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

import { NAV_ITEMS } from "./nav-items";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="باز کردن منو">
          <MenuIcon />
        </Button>
      </SheetTrigger>
      <SheetContent side="start">
        <SheetHeader>
          <SheetTitle>
            <Logo />
          </SheetTitle>
        </SheetHeader>
        <nav aria-label="ناوبری موبایل" className="flex flex-col gap-1 px-2">
          {NAV_ITEMS.map((item) => (
            <Button
              key={item.href}
              asChild
              variant="ghost"
              className="justify-start"
              onClick={() => setOpen(false)}
            >
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
