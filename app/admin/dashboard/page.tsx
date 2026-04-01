import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import {
  Briefcase,
  Calendar,
  DollarSign,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";
import { AnalyticsCharts } from "@/components/admin/analytics-charts";

type MeUser = {
  id: string;
  email: string;
  role: "customer" | "staff" | "admin" | "superadmin";
  full_name?: string | null;
};

type AdminDashboardStats = {
  totalBookings: number;
  upcomingBookings: number;
  totalRevenue: number;
  avgRating: number;
  cancellationRate: number;
  totalReviews: number;
  activeUsers: number;
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

async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const cookie = (await headers()).get("cookie") ?? "";

  // Backend endpoint you should create:
  // GET /api/analytics/admin-dashboard
  try {
    const res = await fetch(`${apiUrl}/api/analytics/admin-dashboard`, {
      method: "GET",
      headers: { Cookie: cookie },
      cache: "no-store",
    });

    if (!res.ok) {
      return {
        totalBookings: 0,
        upcomingBookings: 0,
        totalRevenue: 0,
        avgRating: 0,
        cancellationRate: 0,
        totalReviews: 0,
        activeUsers: 0,
      };
    }

    const data = await res.json();

    return {
      totalBookings: Number(data?.totalBookings ?? 0),
      upcomingBookings: Number(data?.upcomingBookings ?? 0),
      totalRevenue: Number(data?.totalRevenue ?? 0),
      avgRating: Number(data?.avgRating ?? 0),
      cancellationRate: Number(data?.cancellationRate ?? 0),
      totalReviews: Number(data?.totalReviews ?? 0),
      activeUsers: Number(data?.activeUsers ?? 0),
    };
  } catch {
    return {
      totalBookings: 0,
      upcomingBookings: 0,
      totalRevenue: 0,
      avgRating: 0,
      cancellationRate: 0,
      totalReviews: 0,
      activeUsers: 0,
    };
  }
}

export default async function AdminDashboard() {
  // ── Auth / Role guard ─────────────────────────
  const me = await getMe();
  if (!me) redirect("/auth/login");
  if (me.role !== "admin" && me.role !== "superadmin") redirect("/dashboard");

  // ── Stats ─────────────────────────────────────
  const stats = await getAdminDashboardStats();
  const greetingName =
    me.full_name || me.email?.split("@")[0] || "Administrator";

  return (
    <DashboardLayout
      title="Overview"
      subtitle={`Welcome back, ${greetingName}.`}
    >
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Bookings"
            value={stats.totalBookings}
            icon={Calendar}
            change={12.5}
            changeLabel="from last month"
          />
          <StatCard
            title="Revenue"
            value={`$${stats.totalRevenue.toFixed(0)}`}
            icon={DollarSign}
            change={8.2}
            changeLabel="from last month"
          />
          <StatCard
            title="Upcoming"
            value={stats.upcomingBookings}
            icon={TrendingUp}
            change={4.1}
            changeLabel="from last week"
          />
          <StatCard
            title="Avg Rating"
            value={stats.avgRating.toFixed(1)}
            icon={Star}
          />
        </div>

        {/* Analytics */}
        <AnalyticsCharts />

        {/* System Overview */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Quick Stats</CardTitle>
              <CardDescription>Key performance indicators</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-(--radius-md) bg-(--bg-elevated) px-4 py-3">
                <span className="text-sm text-(--text-secondary)">
                  Cancellation Rate
                </span>
                <span className="text-sm font-semibold">
                  {stats.cancellationRate.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between rounded-(--radius-md) bg-(--bg-elevated) px-4 py-3">
                <span className="text-sm text-(--text-secondary)">
                  Total Reviews
                </span>
                <span className="text-sm font-semibold">
                  {stats.totalReviews}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-(--radius-md) bg-(--bg-elevated) px-4 py-3">
                <span className="text-sm text-(--text-secondary)">
                  Active Users
                </span>
                <span className="text-sm font-semibold">
                  {stats.activeUsers}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Quick Tasks</CardTitle>
              <CardDescription>Common administrative tasks</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Link
                href="/admin/services"
                className="group rounded-2xl bg-(--bg-elevated) p-4 transition-colors duration-150 hover:bg-(--bg-hover)"
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-(--accent-subtle) text-(--accent-primary)">
                  <Briefcase className="size-4" />
                </div>
                <p className="mt-3 text-sm font-semibold">Manage Services</p>
                <p className="text-xs text-(--text-secondary)">
                  Create or edit services
                </p>
              </Link>
              <Link
                href="/admin/bookings"
                className="group rounded-2xl bg-(--bg-elevated) p-4 transition-colors duration-150 hover:bg-(--bg-hover)"
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-(--accent-subtle) text-(--accent-primary)">
                  <Calendar className="size-4" />
                </div>
                <p className="mt-3 text-sm font-semibold">View Bookings</p>
                <p className="text-xs text-(--text-secondary)">
                  Track upcoming appointments
                </p>
              </Link>
              <Link
                href="/admin/staff"
                className="group rounded-2xl bg-(--bg-elevated) p-4 transition-colors duration-150 hover:bg-(--bg-hover)"
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-(--accent-subtle) text-(--accent-primary)">
                  <Users className="size-4" />
                </div>
                <p className="mt-3 text-sm font-semibold">Manage Staff</p>
                <p className="text-xs text-(--text-secondary)">
                  Update roles and access
                </p>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
