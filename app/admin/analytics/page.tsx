import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, DollarSign, Users, Calendar } from "lucide-react";
import { AnalyticsCharts } from "@/components/admin/analytics-charts";

type MeUser = {
  id: string;
  email: string;
  full_name?: string | null;
  role: "customer" | "staff" | "admin" | "superadmin";
  phone?: string | null;
  avatar_url?: string | null;
};

async function getMe(): Promise<MeUser | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const cookie = (await headers()).get("cookie") ?? "";

  const res = await fetch(`${apiUrl}/api/auth/me`, {
    method: "GET",
    headers: {
      // forward auth_token cookie to backend
      Cookie: cookie,
    },
    cache: "no-store",
  });

  if (!res.ok) return null;
  return (await res.json()) as MeUser;
}

type AdminStats = {
  totalBookings: number;
  totalRevenue: number;
  totalUsers: number;
  growthRate: number;
};

async function getAdminStats(): Promise<AdminStats> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const cookie = (await headers()).get("cookie") ?? "";

  // If you haven't created this endpoint yet, we'll gracefully fall back to zeros.
  try {
    const res = await fetch(`${apiUrl}/api/analytics/admin-stats`, {
      method: "GET",
      headers: { Cookie: cookie },
      cache: "no-store",
    });

    if (!res.ok) {
      return {
        totalBookings: 0,
        totalRevenue: 0,
        totalUsers: 0,
        growthRate: 0,
      };
    }

    const data = await res.json();

    return {
      totalBookings: Number(data?.totalBookings ?? 0),
      totalRevenue: Number(data?.totalRevenue ?? 0),
      totalUsers: Number(data?.totalUsers ?? 0),
      growthRate: Number(data?.growthRate ?? 0),
    };
  } catch {
    return { totalBookings: 0, totalRevenue: 0, totalUsers: 0, growthRate: 0 };
  }
}

export default async function AdminAnalyticsPage() {
  // 1) Auth guard
  const me = await getMe();
  if (!me) redirect("/auth/login");

  // 2) Role guard
  if (me.role !== "admin" && me.role !== "superadmin") redirect("/dashboard");

  // 3) Fetch stats
  const stats = await getAdminStats();

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight">
          Analytics & Reports
        </h2>
        <p className="text-muted-foreground">
          Comprehensive insights into your business performance
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Bookings"
          value={stats.totalBookings}
          icon={Calendar}
          change={18.2}
        />
        <StatCard
          title="Revenue"
          value={`$${stats.totalRevenue.toFixed(0)}`}
          icon={DollarSign}
          change={12.5}
        />
        <StatCard
          title="Active Users"
          value={stats.totalUsers}
          icon={Users}
          change={24.8}
        />
        <StatCard
          title="Growth Rate"
          value={`${stats.growthRate.toFixed(1)}%`}
          icon={TrendingUp}
          change={5.2}
        />
      </div>

      <AnalyticsCharts />

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="">
          <CardHeader>
            <CardTitle>Top Services</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Coming soon...</p>
          </CardContent>
        </Card>

        <Card className="">
          <CardHeader>
            <CardTitle>Peak Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Coming soon...</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
