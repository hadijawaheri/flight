"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { paths } from "@/lib/paths";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the failure to the console (and any error reporter hooked on it); the page itself stays calm.
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold">مشکلی پیش آمد</h1>
      <p className="text-muted-foreground">
        این صفحه به‌درستی بارگذاری نشد. دوباره تلاش کنید؛ اگر ادامه داشت کمی بعد برگردید.
        {error.digest && (
          <>
            {" "}
            کد پیگیری: <bdi dir="ltr">{error.digest}</bdi>
          </>
        )}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" onClick={reset}>
          تلاش دوباره
        </Button>
        <Button asChild variant="outline">
          <Link href={paths.home}>صفحه‌ی اول</Link>
        </Button>
      </div>
    </main>
  );
}
