import { PageContainer } from "@/components/layout/page-container";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <PageContainer>
      <div role="status" aria-label="در حال بارگذاری" className="flex flex-col gap-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-96 max-w-full" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </PageContainer>
  );
}
