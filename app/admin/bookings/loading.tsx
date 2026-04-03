import { Skeleton } from "@/components/ui/skeleton";

export default function AdminBookingsLoading() {
  return (
    <div className="sevacam-home min-h-screen bg-(--bg-base)">
      <div className="mx-auto w-full max-w-[96rem] px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-8 motion-page">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-3">
              <Skeleton className="h-3 w-28 rounded-full bg-white/8" />
              <Skeleton className="h-14 w-[22rem] rounded-[0.8rem] bg-white/8" />
              <Skeleton className="h-4 w-[32rem] max-w-full rounded-full bg-white/8" />
            </div>
            <Skeleton className="h-11 w-44 rounded-[0.45rem] bg-white/8" />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton
                key={index}
                className="h-28 rounded-[0.8rem] bg-white/8"
              />
            ))}
          </div>

          <Skeleton className="h-40 rounded-[1.1rem] bg-white/8" />

          <div className="grid gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton
                key={index}
                className="h-72 rounded-[1.1rem] bg-white/8"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
