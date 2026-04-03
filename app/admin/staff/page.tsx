import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import StaffManager from "./StaffManager";

type MeUser = {
  id: string;
  email: string;
  role: "customer" | "staff" | "admin" | "superadmin";
};

type UserRow = {
  id: string;
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
  phone?: string | null;
  role: "customer" | "staff" | "admin" | "superadmin";
  is_active: boolean;
};

async function getMe(): Promise<MeUser | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const cookie = (await headers()).get("cookie") ?? "";

  const res = await fetch(`${apiUrl}/api/auth/me`, {
    method: "GET",
    headers: { Cookie: cookie },
    cache: "no-store",
  });

  if (!res.ok) return null;
  return (await res.json()) as MeUser;
}

async function getUsers(): Promise<UserRow[]> {
  const cookie = (await headers()).get("cookie") ?? "";
  const host = (await headers()).get("host");
  if (!host) return [];
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const baseUrl = `${protocol}://${host}`;

  try {
    const res = await fetch(`${baseUrl}/api/users?limit=500`, {
      method: "GET",
      headers: { Cookie: cookie },
      cache: "no-store",
    });

    if (!res.ok) return [];
    const data = (await res.json()) as UserRow[];
    return data.map((user) => ({
      ...user,
      id: user?.id ? String(user.id) : "",
    }));
  } catch {
    return [];
  }
}

export default async function AdminStaffPage() {
  const me = await getMe();
  if (!me) redirect("/auth/login");
  if (me.role !== "admin" && me.role !== "superadmin") redirect("/dashboard");

  const users = await getUsers();

  return (
    <DashboardLayout>
      <div className="space-y-8 motion-page">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <p className="sevacam-eyebrow">Admin / Staff</p>
            <h1 className="sevacam-display text-[clamp(2.25rem,3.6vw,3.4rem)] leading-[0.92] tracking-[-0.04em] text-(--text-primary)">
              Staff Directory
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-(--text-secondary)">
              Manage customers, staff, and administrator accounts from one
              quieter operational surface.
            </p>
          </div>
          <Button
            asChild
            variant="outline"
            className="h-11 rounded-[0.45rem] border border-(--border-subtle) bg-(--bg-elevated) px-5 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-(--text-primary) hover:border-(--accent-primary)/30 hover:bg-(--bg-elevated) hover:text-(--accent-primary)"
          >
            <Link href="/admin/dashboard">Back to Dashboard</Link>
          </Button>
        </div>

        {users.length > 0 ? (
          <StaffManager currentUser={me} users={users} />
        ) : (
          <div className="sevacam-rail flex flex-col items-center justify-center py-16 text-center">
              <Users className="mb-4 h-12 w-12 text-(--text-disabled)" />
              <p className="text-lg font-medium text-(--text-primary)">
                No users found
              </p>
              <p className="mt-2 max-w-md text-sm leading-6 text-(--text-secondary)">
                User accounts will appear here once staff, customer, or admin
                records are created.
              </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
