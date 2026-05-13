import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, DollarSign, Users, Calendar, Star, Clock } from "lucide-react";
import { AnalyticsCharts } from "@/components/admin/analytics-charts";

type MeUser = {
  id: string;
  email: string;
  full_name?: string | null;
  role: "customer" | "staff" | "admin" | "superadmin";
};

type AdminStats = {
  totalBookings: number;
  totalRevenue: number;
  totalUsers: number;
  growthRate: number;
};

type ServiceStat = {
  service_id: string;
  service_name: string;
  total_bookings: number;
  total_revenue: number;
  average_rating: number | null;
};

type DailyStat = {
  date: string;
  total_bookings: number;
  total_revenue: number;
};

async function fetchJson<T>(url: string, cookie: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: { Cookie: cookie }, cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function getMe(): Promise<MeUser | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const cookie = (await headers()).get("cookie") ?? "";
  return fetchJson<MeUser>(`${apiUrl}/api/auth/me`, cookie);
}

function peakHoursFromDaily(daily: DailyStat[]): { label: string; bookings: number; pct: number }[] {
  const dayCount: Record<number, number> = {};
  for (const d of daily) {
    const dow = new Date(d.date).getDay();
    dayCount[dow] = (dayCount[dow] ?? 0) + d.total_bookings;
  }
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const entries = days.map((label, i) => ({ label, bookings: dayCount[i] ?? 0 }));
  const max = Math.max(...entries.map((e) => e.bookings), 1);
  return entries.map((e) => ({ ...e, pct: Math.round((e.bookings / max) * 100) }));
}

export default async function AdminAnalyticsPage() {
  const cookie = (await headers()).get("cookie") ?? "";
  const me = await getMe();
  if (!me) redirect("/auth/login");
  if (me.role !== "admin" && me.role !== "superadmin") redirect("/dashboard");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const [adminStats, serviceStats, dailyStats] = await Promise.all([
    fetchJson<AdminStats>(`${apiUrl}/api/analytics/admin-stats`, cookie),
    fetchJson<ServiceStat[]>(`${apiUrl}/api/analytics/services/stats`, cookie),
    fetchJson<DailyStat[]>(`${apiUrl}/api/analytics/daily/stats`, cookie),
  ]);

  const stats = {
    totalBookings: adminStats?.totalBookings ?? 0,
    totalRevenue: adminStats?.totalRevenue ?? 0,
    totalUsers: adminStats?.totalUsers ?? 0,
    growthRate: adminStats?.growthRate ?? 0,
  };

  const topServices = (serviceStats ?? [])
    .filter((s) => s.total_bookings > 0)
    .slice(0, 6);

  const peakHours = dailyStats ? peakHoursFromDaily(dailyStats) : [];
  const maxBookings = Math.max(...peakHours.map((h) => h.bookings), 1);

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight">Analytics & Reports</h2>
        <p className="text-muted-foreground">
          Comprehensive insights into your business performance
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Bookings" value={stats.totalBookings} icon={Calendar} change={18.2} />
        <StatCard title="Revenue" value={`$${stats.totalRevenue.toFixed(0)}`} icon={DollarSign} change={12.5} />
        <StatCard title="Active Users" value={stats.totalUsers} icon={Users} change={24.8} />
        <StatCard title="Growth Rate" value={`${stats.growthRate.toFixed(1)}%`} icon={TrendingUp} change={5.2} />
      </div>

      <AnalyticsCharts />

      <div className="grid gap-4 md:grid-cols-2">
        {/* Top Services */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Star className="h-4 w-4 text-amber-500" />
              Top Services
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topServices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No booking data yet.</p>
            ) : (
              <div className="space-y-3">
                {topServices.map((s, i) => (
                  <div key={s.service_id} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium">{s.service_name}</p>
                        <Badge variant="secondary" className="shrink-0 text-xs">
                          {s.total_bookings} bookings
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-3">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary/60"
                            style={{ width: `${(s.total_bookings / (topServices[0]?.total_bookings || 1)) * 100}%` }}
                          />
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          ${Number(s.total_revenue).toFixed(0)}
                        </span>
                        {s.average_rating != null && (
                          <span className="flex shrink-0 items-center gap-0.5 text-xs text-amber-500">
                            <Star className="h-3 w-3 fill-current" />
                            {s.average_rating.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Peak Days */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-blue-500" />
              Peak Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            {peakHours.every((h) => h.bookings === 0) ? (
              <p className="text-sm text-muted-foreground">No booking data yet.</p>
            ) : (
              <div className="space-y-2">
                {peakHours.map((h) => (
                  <div key={h.label} className="flex items-center gap-3">
                    <span className="w-8 shrink-0 text-xs text-muted-foreground">{h.label}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-blue-500/60 transition-all"
                        style={{ width: `${(h.bookings / maxBookings) * 100}%` }}
                      />
                    </div>
                    <span className="w-6 shrink-0 text-right text-xs text-muted-foreground">
                      {h.bookings}
                    </span>
                  </div>
                ))}
                <p className="mt-2 text-xs text-muted-foreground">
                  Based on {dailyStats?.length ?? 0} days of booking history
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
