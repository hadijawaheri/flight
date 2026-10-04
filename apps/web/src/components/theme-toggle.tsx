"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";

import { Button } from "@/components/ui/button";

const emptySubscribe = () => () => {};

export function ThemeToggle({ className }: { className?: string }) {
  const { setTheme, resolvedTheme } = useTheme();
  const mounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        className={`size-9 rounded-xl ${className ?? ""}`}
        aria-label="تغییر تم"
        disabled
      >
        <span className="size-4 opacity-0" />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`border-border/60 hover:border-primary/30 hover:bg-primary/10 relative size-9 rounded-xl border transition-all duration-300 ${className ?? ""}`}
      title={isDark ? "تغییر به حالت روشن (روز)" : "تغییر به حالت تاریک (شب)"}
      aria-label="تغییر حالت تم روشن و تاریک"
    >
      <SunIcon
        className={`size-4.5 transition-all duration-500 ${
          isDark
            ? "absolute scale-0 -rotate-90 opacity-0"
            : "scale-100 rotate-0 text-amber-500 opacity-100"
        }`}
      />
      <MoonIcon
        className={`size-4.5 transition-all duration-500 ${
          isDark
            ? "scale-100 rotate-0 text-sky-400 opacity-100"
            : "absolute scale-0 rotate-90 opacity-0"
        }`}
      />
      <span className="sr-only">تغییر تم</span>
    </Button>
  );
}
