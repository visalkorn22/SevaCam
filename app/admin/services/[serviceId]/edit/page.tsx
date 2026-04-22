import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { ServiceCreationLayout } from "../../ServiceCreationLayout";
import ServiceOperatingSchedule from "../../ServiceOperatingSchedule";

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
  tags?: string[] | null;
  inclusions?: string | null;
  prep_notes?: string | null;
  category?: string | null;
  locations?: Array<{ id: string }> | null;
};

type StaffRow = {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  phone?: string | null;
  role: "customer" | "staff" | "admin" | "superadmin";
  is_active: boolean;
};

type AssignedStaff = {
  id: string;
  full_name?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  role: string;
  assignment_id: string;
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

async function getService(serviceId: string): Promise<ServiceRow | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const cookie = (await headers()).get("cookie") ?? "";

  try {
    const res = await fetch(`${apiUrl}/api/services/${serviceId}`, {
      method: "GET",
      headers: { Cookie: cookie },
      cache: "no-store",
    });

    if (!res.ok) return null;
    return (await res.json()) as ServiceRow;
  } catch {
    return null;
  }
}

async function getStaff(): Promise<StaffRow[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const cookie = (await headers()).get("cookie") ?? "";
  const token = (await cookies()).get("auth_token")?.value;

  try {
    const res = await fetch(`${apiUrl}/api/admin/staff`, {
      method: "GET",
      headers: {
        Cookie: cookie,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
    });

    if (!res.ok) return [];
    const data = (await res.json()) as StaffRow[];
    return data.filter((user) => user.role === "staff");
  } catch {
    return [];
  }
}

async function getAssignedStaff(serviceId: string): Promise<AssignedStaff[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const cookie = (await headers()).get("cookie") ?? "";

  try {
    const res = await fetch(`${apiUrl}/api/staff/${serviceId}/staff`, {
      method: "GET",
      headers: { Cookie: cookie },
      cache: "no-store",
    });

    if (!res.ok) return [];
    const data = (await res.json()) as AssignedStaff[];
    return data.filter((user) => user.role === "staff");
  } catch {
    return [];
  }
}

export default async function AdminServiceEditPage({
  params,
}: {
  params: Promise<{ serviceId: string }>;
}) {
  const { serviceId } = await params;
  const me = await getMe();

  if (!me) redirect("/auth/login");
  if (me.role !== "admin" && me.role !== "superadmin") redirect("/dashboard");

  const [service, staff, assignedStaff] = await Promise.all([
    getService(serviceId),
    getStaff(),
    getAssignedStaff(serviceId),
  ]);

  if (!service) redirect("/admin/services");

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <ServiceCreationLayout
          mode="edit"
          serviceId={serviceId}
          initialValues={{
            ...service,
            location_ids: service.locations?.map((l) => l.id) ?? [],
          }}
          staffOptions={staff}
          assignedStaff={assignedStaff}
        />
        <ServiceOperatingSchedule serviceId={serviceId} />
      </div>
    </DashboardLayout>
  );
}
