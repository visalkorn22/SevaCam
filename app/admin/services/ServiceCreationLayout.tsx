"use client";

import { useMemo, useState } from "react";
import EnhancedServiceForm from "./EnhancedServiceForm";
import { ServicePreviewCard } from "./ServicePreviewCard";

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

type ServiceCreationLayoutProps = {
  mode: "create" | "edit";
  serviceId?: string;
  initialValues?: Partial<{
    name: string;
    description: string | null;
    category: string | null;
    duration_minutes: number | null;
    price: number | null;
    image_url: string | null;
    image_urls: string[] | null;
    is_active: boolean | null;
  }>;
  staffOptions?: Array<{
    id: string;
    full_name: string | null;
    role: "staff" | "admin" | "superadmin" | "customer";
    is_active: boolean;
  }>;
  assignedStaff?: Array<{
    id: string;
    full_name?: string | null;
    phone?: string | null;
    avatar_url?: string | null;
    role: string;
    assignment_id: string;
  }>;
};

export function ServiceCreationLayout({
  mode,
  serviceId,
  initialValues,
  staffOptions,
  assignedStaff,
}: ServiceCreationLayoutProps) {
  const initialPreview = useMemo<ServicePreviewData>(
    () => ({
      name: initialValues?.name ?? "",
      description: initialValues?.description ?? "",
      category: initialValues?.category ?? "WELLNESS",
      duration_minutes: initialValues?.duration_minutes ?? 60,
      price: initialValues?.price ?? 149,
      image_url: initialValues?.image_url ?? "",
      image_urls: initialValues?.image_urls ?? [],
      is_active: initialValues?.is_active ?? true,
    }),
    [initialValues],
  );

  const [previewData, setPreviewData] =
    useState<ServicePreviewData>(initialPreview);

  const title = mode === "create" ? "Create Service" : "Edit Service";
  const description =
    mode === "create"
      ? "Build a new service offering and preview how it appears to customers."
      : "Update service details and preview the customer-facing card.";

  return (
    <div className="space-y-8 motion-page">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="sevacam-eyebrow">Admin / Services / {title}</p>
          <h1 className="sevacam-display text-[clamp(2.4rem,4vw,3.8rem)] leading-[0.92] tracking-[-0.04em] text-[var(--text-primary)]">
            {title}
          </h1>
          <p className="text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <EnhancedServiceForm
          mode={mode}
          serviceId={serviceId}
          initialValues={initialValues}
          onPreviewUpdate={setPreviewData}
          staffOptions={staffOptions}
          assignedStaff={assignedStaff}
        />
        <div className="self-start lg:sticky lg:top-6">
          <ServicePreviewCard service={previewData} />
        </div>
      </div>
    </div>
  );
}
