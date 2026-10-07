import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** One width and one gutter for every page, so content edges line up with the header. */
export function PageContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pt-10 pb-12", className)}>
      {children}
    </div>
  );
}
