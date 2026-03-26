import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
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
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Services
            </h1>
            <p className="text-muted-foreground">
              Manage all service offerings
            </p>
          </div>

          <Button asChild className="rounded-xl shadow-[var(--shadow-card)]">
            <Link href="/admin/services/new">
              <Plus className="mr-2 size-4" />
              Add Service
            </Link>
          </Button>
        </div>

        <AdminServicesListClient services={services} />
      </div>
    </DashboardLayout>
  );
}
