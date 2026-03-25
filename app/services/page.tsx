import { headers } from "next/headers";
import { ServicesClient } from "@/components/booking/services-client";

type ServiceRow = {
  id: string;
  name: string;
  public_name?: string | null;
  category?: string | null;
  tags?: string[] | null;
  description?: string | null;
  image_url?: string | null;
  image_urls?: string[] | null;
  duration_minutes: number;
  price: number;
  deposit_amount: number;
  is_active: boolean;
};

async function getActiveServices(): Promise<ServiceRow[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const cookie = (await headers()).get("cookie") ?? "";
  try {
    const res = await fetch(`${apiUrl}/api/services`, {
      method: "GET",
      headers: { Cookie: cookie },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as ServiceRow[];
    return data.filter((s) => s.is_active).sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

export default async function ServicesPage() {
  const services = await getActiveServices();
  const categories = Array.from(new Set(services.map((s) => s.category).filter(Boolean)));

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-10 sm:py-16">
        {/* Page header */}
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Services</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Book your next appointment
          </h1>
          <p className="mt-3 max-w-xl text-base text-muted-foreground">
            Browse our {services.length} curated service{services.length !== 1 ? "s" : ""} across{" "}
            {categories.length} categor{categories.length !== 1 ? "ies" : "y"}.
            Filter instantly and book in minutes.
          </p>
        </div>

        {/* Client-side filterable grid */}
        <ServicesClient initialServices={services} />
      </div>
    </div>
  );
}
