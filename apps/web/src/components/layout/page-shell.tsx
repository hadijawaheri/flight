import type { ReactNode } from "react";

import { AssistantWidget } from "@/features/assistant";

import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

/** Header, footer and the floating assistant around every public and signed-in page. */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col">
      <div className="app-sky" aria-hidden="true" />
      <a
        href="#main"
        className="bg-primary text-primary-foreground sr-only z-50 rounded-md px-3 py-2 focus:not-sr-only focus:fixed focus:start-4 focus:top-4"
      >
        پرش به محتوا
      </a>
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <AssistantWidget />
    </div>
  );
}
