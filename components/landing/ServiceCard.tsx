"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import type { Service } from "@/lib/types/landing";

interface ServiceCardProps {
  service: Service;
}

export function ServiceCard({ service }: ServiceCardProps) {
  const displayName = service.publicName || service.name;
  const images = useMemo(() => {
    if (service.imageUrls && service.imageUrls.length > 0) {
      return service.imageUrls;
    }
    if (service.imageUrl) return [service.imageUrl];
    return [];
  }, [service.imageUrls, service.imageUrl]);
  const [imageIndex, setImageIndex] = useState(0);
  const depositAmount = service.depositAmount
    ? Number(service.depositAmount)
    : 0;
  const totalImages = images.length;
  const hasMultipleImages = totalImages > 1;
  const displayIndex =
    totalImages === 0 ? 0 : Math.min(imageIndex, totalImages - 1);
  const activeImage = images[displayIndex];

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card motion-card motion-reduce:transition-none">
      {/* Image */}
      <div className="relative aspect-4/3 overflow-hidden bg-muted">
        {activeImage ? (
          <img
            src={activeImage}
            alt={displayName}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground/40">
            No image
          </div>
        )}

        {/* Price pill — top right */}
        <div className="absolute right-3 top-3 rounded-full bg-background/95 px-3 py-1.5 text-[11px] font-bold tabular-nums text-foreground shadow-sm backdrop-blur-sm">
          ${service.price}
        </div>

        {/* Category — top left */}
        {service.category && (
          <div className="absolute left-3 top-3 rounded-full border border-border/40 bg-background/90 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground backdrop-blur-sm">
            {service.category}
          </div>
        )}

        {/* Image nav — visible on hover */}
        {hasMultipleImages && (
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between px-3 pb-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <button
              type="button"
              aria-label="Previous image"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setImageIndex(
                  displayIndex === 0 ? totalImages - 1 : displayIndex - 1,
                );
              }}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-border/60 bg-background/90 text-foreground shadow-sm backdrop-blur-sm hover:bg-background"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>

            {/* Dot indicators */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalImages }).map((_, i) => (
                <span
                  key={i}
                  className={`h-1 rounded-full bg-white transition-all duration-200 ${
                    i === displayIndex ? "w-3 opacity-100" : "w-1 opacity-50"
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              aria-label="Next image"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setImageIndex((displayIndex + 1) % totalImages);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-border/60 bg-background/90 text-foreground shadow-sm backdrop-blur-sm hover:bg-background"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-base font-semibold leading-snug text-foreground">
          {displayName}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {service.description || "Service details available upon booking."}
        </p>

        <div className="mt-auto flex items-center justify-between pt-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            {service.durationMinutes} min
            {depositAmount > 0 && (
              <span className="ml-2 text-primary">· ${depositAmount} dep.</span>
            )}
          </p>
          <Link
            href={`/book/${service.id}?serviceId=${service.id}`}
            className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.3em] text-primary transition-colors hover:text-primary/70"
          >
            Book
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </article>
  );
}
