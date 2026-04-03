"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Edit, Eye } from "lucide-react";
import DeleteServiceButton from "./DeleteServiceButton";

type ServiceRow = {
  id: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  image_urls?: string[] | null;
  is_active: boolean;
  duration_minutes: number;
  price: number;
  deposit_amount: number;
  buffer_minutes: number;
  max_capacity: number;
};

type AdminServiceCardProps = {
  service: ServiceRow;
  onDeleted?: (serviceId: string) => void;
};

// Service category mapping based on name patterns
const getServiceCategory = (
  name: string,
  description?: string | null
): string => {
  const text = `${name} ${description || ""}`.toLowerCase();

  if (text.includes("hydra") || text.includes("facial")) return "WELLNESS";
  if (text.includes("massage") || text.includes("tissue")) return "THERAPY";
  if (text.includes("sauna") || text.includes("nordic")) return "RITUAL";
  if (text.includes("stone") || text.includes("therapy")) return "THERAPY";

  return "WELLNESS";
};

export default function AdminServiceCard({
  service,
  onDeleted,
}: AdminServiceCardProps) {
  const images = useMemo(() => {
    if (service.image_urls && service.image_urls.length > 0) {
      return service.image_urls;
    }
    if (service.image_url) return [service.image_url];
    return [];
  }, [service.image_urls, service.image_url]);

  const [imageIndex, setImageIndex] = useState(0);
  const activeImage = images[imageIndex];
  const hasMultipleImages = images.length > 1;
  const category = getServiceCategory(service.name, service.description);
  const price = Number(service.price ?? 0);
  const depositAmount = Number(service.deposit_amount ?? 0);
  const formattedPrice = Number.isFinite(price) ? price.toFixed(2) : "0.00";
  const formattedDeposit = Number.isFinite(depositAmount)
    ? depositAmount.toFixed(2)
    : "0.00";

  return (
    <div className="group relative overflow-hidden rounded-[1.1rem] border border-(--border-subtle) bg-(--bg-elevated) transition-all duration-200 hover:border-(--accent-primary)/30 hover:shadow-[0_8px_32px_rgba(0,0,0,0.35)]">
      {/* Image Section */}
      <div className="relative aspect-[4/3] overflow-hidden">
        {activeImage ? (
          <>
            <img
              src={activeImage}
              alt={service.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
            {/* Gradient overlay */}
            <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-(--bg-inset)">
            <Eye className="h-12 w-12 text-(--text-disabled)" />
          </div>
        )}

        {/* Status chip — top right */}
        <div className="absolute top-3 right-3">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-[0.14em] ${
              service.is_active
                ? "bg-(--accent-primary)/15 text-(--accent-primary) ring-1 ring-(--accent-primary)/30"
                : "bg-[rgba(255,183,133,0.15)] text-[#ffb785] ring-1 ring-[rgba(255,183,133,0.3)]"
            }`}
          >
            {service.is_active ? "Active" : "Draft"}
          </span>
        </div>

        {/* Category chip — top left */}
        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center rounded-full bg-black/40 px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-white backdrop-blur-sm ring-1 ring-white/10">
            {category}
          </span>
        </div>

        {/* Image Navigation */}
        {hasMultipleImages && (
          <>
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Previous image"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setImageIndex((prev) =>
                    prev === 0 ? images.length - 1 : prev - 1
                  );
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-(--border-subtle) bg-(--bg-elevated)/80 text-(--text-primary) backdrop-blur-sm transition-colors hover:bg-(--bg-elevated)"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label="Next image"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setImageIndex((prev) => (prev + 1) % images.length);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-(--border-subtle) bg-(--bg-elevated)/80 text-(--text-primary) backdrop-blur-sm transition-colors hover:bg-(--bg-elevated)"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="absolute bottom-3 left-3 rounded-full border border-(--border-subtle) bg-(--bg-elevated)/80 px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-wider text-(--text-secondary) backdrop-blur-sm">
              {imageIndex + 1}/{images.length}
            </div>
          </>
        )}
      </div>

      {/* Content Section */}
      <div className="space-y-4 p-5">
        {/* Name + description */}
        <div className="space-y-1.5">
          <h3 className="text-base font-bold leading-tight text-(--text-primary)">
            {service.name}
          </h3>
          {service.description && (
            <p className="line-clamp-2 text-sm leading-relaxed text-(--text-secondary)">
              {service.description}
            </p>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[0.6rem] bg-(--bg-inset) px-3 py-2.5">
            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-(--text-disabled)">
              Duration
            </p>
            <p className="mt-0.5 text-sm font-bold text-(--text-primary)">
              {service.duration_minutes} min
            </p>
          </div>
          <div className="rounded-[0.6rem] bg-(--bg-inset) px-3 py-2.5">
            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-(--text-disabled)">
              Price
            </p>
            <p className="mt-0.5 text-sm font-bold text-(--accent-primary)">
              ${formattedPrice}
            </p>
          </div>
        </div>

        {/* Deposit / capacity */}
        {(depositAmount > 0 || service.max_capacity > 1) && (
          <div className="flex flex-wrap items-center gap-3 text-[0.72rem] text-(--text-disabled)">
            {depositAmount > 0 && (
              <span className="rounded-full bg-(--bg-inset) px-2.5 py-1 ring-1 ring-(--border-subtle)">
                ${formattedDeposit} deposit
              </span>
            )}
            {service.max_capacity > 1 && (
              <span className="rounded-full bg-(--bg-inset) px-2.5 py-1 ring-1 ring-(--border-subtle)">
                Max {service.max_capacity} guests
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            asChild
            size="sm"
            className="sevacam-primary-button flex-1 rounded-[0.45rem] text-[0.62rem] font-semibold uppercase tracking-[0.14em]"
          >
            <Link href={`/admin/services/${service.id}/edit`}>
              <Edit className="mr-1.5 size-3.5" />
              Edit
            </Link>
          </Button>
          <DeleteServiceButton
            serviceId={service.id}
            serviceName={service.name}
            onDeleted={onDeleted}
          />
        </div>
      </div>
    </div>
  );
}
