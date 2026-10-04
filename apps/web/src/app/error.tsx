"use client";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Empty className="min-h-dvh">
      <EmptyHeader>
        <EmptyTitle>مشکلی پیش آمد</EmptyTitle>
        <EmptyDescription>خطای غیرمنتظره‌ای رخ داد. دوباره تلاش کنید.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={reset}>تلاش دوباره</Button>
      </EmptyContent>
    </Empty>
  );
}
