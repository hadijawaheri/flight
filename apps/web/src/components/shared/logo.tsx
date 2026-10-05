import Link from "next/link";

import { SITE_NAME } from "@/lib/seo";
import { cn } from "@/lib/utils";

/** A swept wing: two strokes meeting at the leading edge. Drawn, not an icon-font glyph. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" className={cn("size-7", className)}>
      <rect width="32" height="32" rx="9" className="fill-primary" />
      <path
        d="M7 20.5 24.5 8.5l-4.2 15.2-5.1-4.1-3.3 3.6-.7-5.4L7 20.5Z"
        className="fill-primary-foreground"
      />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn("flex items-center gap-2 font-extrabold tracking-tight", className)}
    >
      <LogoMark />
      <span className="text-lg">{SITE_NAME}</span>
    </Link>
  );
}
