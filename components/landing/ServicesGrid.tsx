"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ServiceCard } from "./ServiceCard";
import type { Service } from "@/lib/types/landing";
import { Skeleton } from "@/components/ui/skeleton";

interface ServicesGridProps {
  services: Service[];
  isLoading?: boolean;
}

export function ServicesGrid({ services, isLoading }: ServicesGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const updateScrollState = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    const maxScrollLeft = container.scrollWidth - container.clientWidth;
    setCanScrollPrev(container.scrollLeft > 4);
    setCanScrollNext(container.scrollLeft < maxScrollLeft - 4);
  }, []);

  const getScrollAmount = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return 0;
    const card = container.querySelector<HTMLElement>("[data-service-card]");
    if (!card) {
      return Math.floor(container.clientWidth * 0.9);
    }
    return card.offsetWidth + 24;
  }, []);

  const handleScroll = useCallback(
    (direction: "prev" | "next") => {
      const container = scrollRef.current;
      if (!container) return;
      const amount = getScrollAmount();
      if (!amount) return;
      container.scrollBy({
        left: direction === "next" ? amount : -amount,
        behavior: "smooth",
      });
    },
    [getScrollAmount],
  );

  useEffect(() => {
    updateScrollState();
    const container = scrollRef.current;
    if (!container) return;

    const handle = () => updateScrollState();
    container.addEventListener("scroll", handle, { passive: true });
    window.addEventListener("resize", handle);

    return () => {
      container.removeEventListener("scroll", handle);
      window.removeEventListener("resize", handle);
    };
  }, [updateScrollState, services.length, isLoading]);

  if (isLoading) {
    return (
      <div className="relative">
        <div className="mb-4 flex items-center justify-end gap-2">
          <button
            type="button"
            aria-label="Previous services"
            disabled
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-foreground opacity-40 shadow-(--shadow-card)"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Next services"
            disabled
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-foreground opacity-40 shadow-(--shadow-card)"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div ref={scrollRef} className="flex gap-6 overflow-hidden pb-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex-none w-[220px] sm:w-[240px] lg:w-[260px] xl:w-[280px]"
            >
              <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-(--shadow-card)">
                <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
                <div className="mt-4 flex flex-1 flex-col gap-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-3xl border border-dashed border-border bg-muted/30">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-muted-foreground/10" />
          <p className="text-lg font-semibold">No services found</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Try adjusting your filters to see more results
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="mb-4 flex items-center justify-end gap-2">
        <button
          type="button"
          aria-label="Previous services"
          onClick={() => handleScroll("prev")}
          disabled={!canScrollPrev}
          className="motion-standard motion-press flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-(--shadow-card) hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Next services"
          onClick={() => handleScroll("next")}
          disabled={!canScrollNext}
          className="motion-standard motion-press flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-(--shadow-card) hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth pb-2 motion-reduce:scroll-auto"
      >
        {services.map((service) => (
          <div
            key={service.id}
            data-service-card
            className="flex-none w-[220px] snap-start sm:w-[240px] lg:w-[260px] xl:w-[280px]"
          >
            <ServiceCard service={service} />
          </div>
        ))}
      </div>
    </div>
  );
}
