import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { paths } from "@/lib/paths";

export default function NotFound() {
  return (
    <Empty className="min-h-dvh">
      <EmptyHeader>
        <EmptyTitle>صفحه پیدا نشد</EmptyTitle>
        <EmptyDescription>آدرس واردشده وجود ندارد.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild>
          <Link href={paths.home}>بازگشت به صفحه اصلی</Link>
        </Button>
      </EmptyContent>
    </Empty>
  );
}
