"use client";

import { useState } from "react";
import { Clock, Star, Users } from "lucide-react";

type ServicePreviewData = {
  name: string;
  description: string;
  category: string;
  duration_minutes: number;
  price: number;
  image_url: string;
  image_urls: string[];
  is_active: boolean;
};

type ServicePreviewCardProps = {
  service: ServicePreviewData;
  onDataChange?: (data: ServicePreviewData) => void;
};

export function ServicePreviewCard({ service }: ServicePreviewCardProps) {
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());

  const defaultImage =
    "https://images.unsplash.com/photo-1544717297-fa95b6ee9643?w=400&h=300&fit=crop";

  const displayImage = service.image_url || service.image_urls?.[0] || defaultImage;
  const displayName = service.name || "Service Name";
  const displayDescription =
    service.description ||
    "Your service description will appear here. Add a compelling description to attract customers.";
  const priceValue = Number(service.price ?? 0);
  const displayPrice = Number.isFinite(priceValue) ? priceValue : 0;
  const displayDuration = service.duration_minutes || 60;
  const displayCategory = service.category || "WELLNESS";
  const imageError = failedImages.has(displayImage);

  return (
    <div className="overflow-hidden rounded-[1.1rem] border border-(--border-subtle) bg-(--bg-elevated) shadow-[0_8px_32px_rgba(0,0,0,0.22)]">
      <div className="border-b border-(--border-subtle) px-5 py-3">
        <p className="text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-(--text-disabled)">
          Customer preview
        </p>
      </div>

      <div className="relative aspect-[4/3] overflow-hidden bg-(--bg-base)">
        <img
          src={imageError ? defaultImage : displayImage}
          alt={displayName}
          className="h-full w-full object-cover"
          onError={() => {
            if (!failedImages.has(displayImage)) {
              setFailedImages((prev) => {
                const next = new Set(prev);
                next.add(displayImage);
                return next;
              });
            }
          }}
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent" />

        <div className="absolute left-3 top-3">
          <span className="inline-flex items-center rounded-full bg-black/40 px-2.5 py-1 text-[0.58rem] font-semibold uppercase tracking-[0.15em] text-white/80 backdrop-blur-sm">
            {displayCategory}
          </span>
        </div>

        <div className="absolute right-3 top-3">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[0.58rem] font-semibold uppercase tracking-[0.15em] ${
              service.is_active
                ? "bg-[rgba(122,213,221,0.18)] text-(--accent-primary)"
                : "bg-[rgba(255,183,133,0.15)] text-(--state-warning)"
            }`}
          >
            {service.is_active ? "Active" : "Draft"}
          </span>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div className="space-y-1.5">
          <h3 className="text-base font-semibold leading-snug text-(--text-primary)">
            {displayName}
          </h3>
          <p className="line-clamp-2 text-sm leading-6 text-(--text-secondary)">
            {displayDescription}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-2xl font-bold tracking-tight text-(--text-primary)">
            ${displayPrice.toFixed(2)}
          </p>
          <div className="flex items-center gap-1 text-(--accent-primary)">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-3 w-3 fill-current" />
            ))}
            <span className="ml-1 text-xs text-(--text-disabled)">5.0</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-(--text-secondary)">
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {displayDuration} min
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            1-2 guests
          </span>
        </div>

        <button
          type="button"
          className="w-full rounded-[0.55rem] bg-(--accent-primary) py-2.5 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-(--text-on-accent) transition-colors hover:bg-(--accent-primary-hover)"
        >
          Book Now
        </button>

        <p className="text-center text-[0.65rem] text-(--text-disabled)">
          This is how your service appears to customers
        </p>
      </div>
    </div>
  );
}
