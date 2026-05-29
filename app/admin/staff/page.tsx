import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { ArrowLeft, Users } from "lucide-react";
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
  average_rating?: number | null;
  review_count?: number;
  completed_bookings?: number;
  experience_level?: string | null;
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
      <div className="space-y-6">

        {/* ── Hero strip ── */}
        <section className="relative overflow-hidden rounded-[1.1rem] border border-(--seva-border-subtle) bg-(--seva-surface) px-8 py-8 lg:px-10 lg:py-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(122,213,221,0.08),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(196,176,253,0.05),transparent_30%)]" />
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-(--seva-violet)">
                Admin / Staff
              </p>
              <h1 className="sevacam-display mt-3 text-[clamp(2rem,4.5vw,3.4rem)] leading-[0.92] text-(--text-primary)">
                Staff Directory
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-(--text-secondary)">
                Manage customers, staff, and administrator accounts from one
                quieter operational surface.
              </p>
            </div>
            <Link
              href="/admin/dashboard"
              className="sevacam-secondary-button inline-flex h-11 shrink-0 items-center rounded-[0.18rem] px-5 text-[0.62rem] font-semibold uppercase tracking-[0.18em]"
            >
              <ArrowLeft className="mr-2 size-3.5" />
              Back to Dashboard
            </Link>
          </div>
        </section>

        {users.length > 0 ? (
          <StaffManager currentUser={me} users={users} />
        ) : (
          <div className="sevacam-rail flex flex-col items-center justify-center py-20 text-center">
            <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(122,213,221,0.08)] ring-1 ring-[rgba(122,213,221,0.14)]">
              <Users className="h-7 w-7 text-(--accent-primary)" />
            </span>
            <p className="text-[1rem] font-semibold text-(--text-primary)">No users found</p>
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
