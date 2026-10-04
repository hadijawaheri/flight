import { ArrowRightIcon, PlaneIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { SignInForm } from "@/features/auth";
import { paths } from "@/lib/paths";

export const metadata: Metadata = { title: "ورود به پرواز پلاس" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="from-primary/5 via-background to-background flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b p-6">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex items-center justify-between">
          <Link
            href={paths.home}
            className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-xs font-bold transition-colors"
          >
            <ArrowRightIcon className="size-4 rtl:rotate-180" />
            <span>بازگشت به صفحه اصلی</span>
          </Link>

          <Link href={paths.home} className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-xl shadow-sm">
              <PlaneIcon className="size-4 rtl:rotate-180" />
            </div>
            <span className="font-heading text-foreground text-base font-extrabold">
              پرواز پلاس
            </span>
          </Link>
        </div>

        <SignInForm next={next ?? null} />
      </div>
    </main>
  );
}
