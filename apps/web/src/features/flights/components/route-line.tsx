import { PlaneIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Origin, flight path, destination: the one motif that recurs on every working page. The plane
 * points along the reading direction, so it flies right-to-left in this RTL product.
 */
export function RouteLine({ className }: { className?: string }) {
  return (
    <span className={cn("flex w-full items-center gap-1.5", className)} aria-hidden="true">
      <span className="border-primary bg-card size-2.5 shrink-0 rounded-full border-2" />
      <span className="border-foreground/25 h-0 flex-1 border-t-2 border-dashed" />
      <PlaneIcon className="text-primary size-4 shrink-0 rotate-45 rtl:-rotate-135" />
      <span className="border-foreground/25 h-0 flex-1 border-t-2 border-dashed" />
      <span className="bg-primary size-2.5 shrink-0 rounded-full" />
    </span>
  );
}
