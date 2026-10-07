import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * The solid surface every section's copy sits on. Type never depends on the sky behind it, so the
 * sky is free to change colour while someone reads.
 */
export function JourneyPanel({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "bg-card text-card-foreground shadow-primary/5 rounded-3xl border p-5 shadow-xl md:p-8",
        className,
      )}
      {...props}
    />
  );
}

/** The page's single width and gutter, without PageContainer's vertical padding. */
export function JourneyColumn({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4", className)} {...props} />;
}
