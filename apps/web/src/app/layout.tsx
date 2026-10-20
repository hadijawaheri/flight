import "./globals.css";

import type { Metadata, Viewport } from "next";
import { Vazirmatn } from "next/font/google";
import { headers } from "next/headers";

import { AppProviders } from "@/components/providers/app-providers";
import { NONCE_HEADER } from "@/lib/csp";
import { defaultMetadata } from "@/lib/seo";

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazirmatn",
  display: "swap",
});

export const metadata: Metadata = defaultMetadata;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
};

// Reading the per-request nonce makes every page dynamic, which the CSP requires
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get(NONCE_HEADER) ?? undefined;
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning className={vazirmatn.variable}>
      <body className="bg-background text-foreground min-h-dvh antialiased">
        <AppProviders nonce={nonce}>{children}</AppProviders>
      </body>
    </html>
  );
}
