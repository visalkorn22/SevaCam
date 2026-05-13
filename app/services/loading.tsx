import { ServiceCardSkeleton } from "@/components/skeletons/ServiceCardSkeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function ServicesLoading() {
  return (
    <div className="sevacam-home min-h-screen bg-(--seva-base) text-(--seva-text)">
      <div className="mx-auto max-w-[86rem] space-y-12 px-6 py-10 sm:px-8 lg:px-10 lg:py-12">
        <div className="grid gap-8 border-b border-white/5 pb-12 md:grid-cols-[1.5fr_1fr]">
          <div className="space-y-4">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-10 w-80" />
            <Skeleton className="h-5 w-full max-w-2xl" />
          </div>
          <div className="sevacam-rail space-y-3 p-6">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-10 w-40 rounded-md" />
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[19rem_minmax(0,1fr)]">
          <div className="sevacam-rail p-6">
            <div className="space-y-5">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-10">
            <div className="space-y-3">
              <Skeleton className="h-11 w-full rounded-lg" />
              <Skeleton className="h-4 w-44" />
            </div>

            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <ServiceCardSkeleton />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
