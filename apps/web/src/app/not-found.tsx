import Link from "next/link";

import { Button } from "@/components/ui/button";
import { paths } from "@/lib/paths";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-primary tnum text-6xl font-extrabold" aria-hidden="true">
        ۴۰۴
      </p>
      <h1 className="text-2xl font-bold">این صفحه پیدا نشد</h1>
      <p className="text-muted-foreground">
        ممکن است نشانی اشتباه باشد یا پرواز و رزرو دیگر وجود نداشته باشد.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link href={paths.home}>جست‌وجوی پرواز</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={paths.rules}>قوانین پرواز</Link>
        </Button>
      </div>
    </main>
  );
}
