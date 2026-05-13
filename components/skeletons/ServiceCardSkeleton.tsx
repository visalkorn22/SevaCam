import { Skeleton } from "@/components/ui/skeleton";

export function ServiceCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-(--shadow-card)">
      <Skeleton className="h-44 w-full rounded-xl" />

      <div className="mt-4 space-y-3">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>

      <div className="mt-6">
        <Skeleton className="h-9 w-full rounded-full" />
      </div>
    </div>
  );
}

