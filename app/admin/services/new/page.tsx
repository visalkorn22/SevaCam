import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { ServiceCreationLayout } from "../ServiceCreationLayout";

type MeUser = {
  id: string;
  email: string;
  role: "customer" | "staff" | "admin" | "superadmin";
};

type StaffOption = {
  id: string;
  full_name: string | null;
  email?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  role: "staff" | "admin" | "superadmin" | "customer";
  is_active: boolean;
  average_rating?: number | null;
  completed_bookings?: number;
  experience_level?: string | null;
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

async function getStaff(): Promise<StaffOption[]> {
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
    const data = (await res.json()) as StaffOption[];
    return data.filter((user) => user.role === "staff");
  } catch {
    return [];
  }
}

export default async function AdminServiceCreatePage() {
  const me = await getMe();
  if (!me) redirect("/auth/login");
  if (me.role !== "admin" && me.role !== "superadmin") redirect("/dashboard");
  const staffOptions = await getStaff();

  return (
    <DashboardLayout>
      <ServiceCreationLayout mode="create" staffOptions={staffOptions} />
    </DashboardLayout>
  );
}
