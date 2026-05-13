import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { AdminsClient } from "@/components/admin/admins-client";

type MeUser = {
  id: string;
  role: "customer" | "staff" | "admin" | "superadmin";
};

export type StaffUser = {
  id: string;
  full_name: string | null;
  email: string;
  role: "staff" | "admin" | "superadmin";
  phone: string | null;
  is_active: boolean;
  created_at?: string | null;
};

async function getMe(): Promise<MeUser | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const cookie = (await headers()).get("cookie") ?? "";
  const res = await fetch(`${apiUrl}/api/auth/me`, {
    headers: { Cookie: cookie },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()) as MeUser;
}

async function getStaffUsers(cookie: string): Promise<StaffUser[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  try {
    const res = await fetch(`${apiUrl}/api/users?role=staff,admin,superadmin`, {
      headers: { Cookie: cookie },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default async function AdminManagementPage() {
  const cookie = (await headers()).get("cookie") ?? "";
  const me = await getMe();
  if (!me) redirect("/auth/login");
  if (me.role !== "superadmin") redirect("/dashboard");

  const users = await getStaffUsers(cookie);

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight">Admin Management</h2>
        <p className="text-muted-foreground">
          Promote staff to admin and manage administrator accounts.
        </p>
      </div>
      <AdminsClient users={users} currentUserId={me.id} />
    </DashboardLayout>
  );
}
