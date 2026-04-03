"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import AdminServiceCard from "./AdminServiceCard";

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

type AdminServicesListClientProps = {
  services: ServiceRow[];
};

export default function AdminServicesListClient({
  services,
}: AdminServicesListClientProps) {
  const [items, setItems] = useState<ServiceRow[]>(services);
  const hasItems = items.length > 0;

  const handleDeleted = (serviceId: string) => {
    setItems((prev) =>
      prev.filter((service) => String(service.id) !== String(serviceId))
    );
  };

  const emptyState = useMemo(
    () => (
      <div className="sevacam-rail flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-6 flex size-16 items-center justify-center rounded-full bg-(--bg-elevated) ring-1 ring-white/8">
          <Plus className="size-7 text-(--accent-primary)" />
        </div>
        <h3 className="text-lg font-semibold text-(--text-primary)">No services yet</h3>
        <p className="mt-2 mb-8 max-w-sm text-sm leading-6 text-(--text-secondary)">
          Create your first service offering to start accepting bookings from customers.
        </p>
        <Button
          asChild
          className="sevacam-primary-button min-h-11 rounded-[0.22rem] px-6 text-[0.62rem] font-semibold uppercase tracking-[0.18em]"
        >
          <Link href="/admin/services/new">
            <Plus className="mr-2 size-3.5" />
            Create First Service
          </Link>
        </Button>
      </div>
    ),
    []
  );

  if (!hasItems) {
    return emptyState;
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {items.map((service) => (
        <AdminServiceCard
          key={service.id}
          service={service}
          onDeleted={handleDeleted}
        />
      ))}
    </div>
  );
}
