import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { Plus } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Button } from "@/components/ui/button";
import AdminServicesListClient from "./AdminServicesListClient";

type MeUser = {
  id: string;
  email: string;
  role: "customer" | "staff" | "admin" | "superadmin";
};

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

async function getMe(): Promise<MeUser | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const cookie = (await headers()).get("cookie") ?? "";

  try {
    const res = await fetch(`${apiUrl}/api/auth/me`, {
      method: "GET",
      headers: { Cookie: cookie },
      cache: "no-store",
    });

    if (!res.ok) return null;
    return (await res.json()) as MeUser;
  } catch {
    return null;
  }
}

async function getServices(): Promise<ServiceRow[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const cookie = (await headers()).get("cookie") ?? "";

  try {
    const res = await fetch(`${apiUrl}/api/services?active_only=false`, {
      method: "GET",
      headers: { Cookie: cookie },
      cache: "no-store",
    });

    if (!res.ok) return [];
    return (await res.json()) as ServiceRow[];
  } catch {
    return [];
  }
}

export default async function AdminServicesPage() {
  const me = await getMe();
  if (!me) redirect("/auth/login");
  if (me.role !== "admin" && me.role !== "superadmin") redirect("/dashboard");

  const services = await getServices();

  return (
    <DashboardLayout>
      <div className="space-y-8 motion-page">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <p className="sevacam-eyebrow">Admin / Services</p>
            <h1 className="sevacam-display text-[clamp(2.4rem,4vw,3.8rem)] leading-[0.92] tracking-[-0.04em] text-(--text-primary)">
              Service Catalogue
            </h1>
            <p className="text-sm leading-6 text-(--text-secondary)">
              {services.length > 0
                ? `${services.length} service${services.length !== 1 ? "s" : ""} - manage offerings visible to customers`
                : "No services yet - create your first to start accepting bookings"}
            </p>
          </div>
          <Button
            asChild
            className="sevacam-primary-button min-h-11 rounded-[0.22rem] px-6 text-[0.62rem] font-semibold uppercase tracking-[0.18em]"
          >
            <Link href="/admin/services/new">
              <Plus className="mr-2 size-3.5" />
              New Service
            </Link>
          </Button>
        </div>

        <AdminServicesListClient services={services} />
      </div>
    </DashboardLayout>
  );
}
