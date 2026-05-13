import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  ExternalLink,
  Server,
  Users,
  XCircle,
} from "lucide-react";

type MeUser = {
  id: string;
  role: "customer" | "staff" | "admin" | "superadmin";
};

type AdminStats = {
  totalBookings: number;
  totalRevenue: number;
  totalUsers: number;
  growthRate: number;
};

type BookingStats = {
  total_bookings: number;
  confirmed_bookings: number;
  cancelled_bookings: number;
  completed_bookings: number;
  pending_bookings: number;
  total_revenue: number;
  average_booking_value: number;
};

type AuditSummary = {
  total: number;
  items: { action: string; entity_type: string; created_at: string | null }[];
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

async function fetchJson<T>(url: string, cookie: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: { Cookie: cookie }, cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function StatTile({
  label,
  value,
  icon: Icon,
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-5">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold leading-tight">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default async function MonitoringPage() {
  const cookie = (await headers()).get("cookie") ?? "";
  const me = await getMe();
  if (!me) redirect("/auth/login");
  if (me.role !== "superadmin") redirect("/dashboard");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const [adminStats, bookingStats, recentAudit] = await Promise.all([
    fetchJson<AdminStats>(`${apiUrl}/api/analytics/admin-stats`, cookie),
    fetchJson<BookingStats>(`${apiUrl}/api/analytics/bookings/stats`, cookie),
    fetchJson<AuditSummary>(`${apiUrl}/api/admin/audit-logs?limit=5`, cookie),
  ]);

  // Check backend health
  let backendHealthy = false;
  try {
    const healthRes = await fetch(`${apiUrl}/api/health`, { cache: "no-store" });
    backendHealthy = healthRes.ok;
  } catch {
    backendHealthy = false;
  }

  const totalBookings = adminStats?.totalBookings ?? bookingStats?.total_bookings ?? 0;
  const totalRevenue = adminStats?.totalRevenue ?? bookingStats?.total_revenue ?? 0;
  const totalUsers = adminStats?.totalUsers ?? 0;

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight">System Monitoring</h2>
        <p className="text-muted-foreground">
          Live system health, booking status, and recent activity.
        </p>
      </div>

      {/* System status */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Server className="h-4 w-4" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              {backendHealthy ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm">FastAPI Backend</span>
              <Badge variant={backendHealthy ? "default" : "destructive"} className="text-xs">
                {backendHealthy ? "Online" : "Unreachable"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-sm">Next.js Frontend</span>
              <Badge variant="default" className="text-xs">Online</Badge>
            </div>
            <div className="flex items-center gap-2">
              {totalBookings > 0 ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <Clock className="h-4 w-4 text-amber-500" />
              )}
              <span className="text-sm">Database</span>
              <Badge variant={totalBookings > 0 ? "default" : "secondary"} className="text-xs">
                {totalBookings > 0 ? "Connected" : "No data yet"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key metrics */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Total Bookings" value={totalBookings} icon={Calendar} />
        <StatTile
          label="Total Revenue"
          value={`$${Number(totalRevenue).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={DollarSign}
        />
        <StatTile label="Active Users" value={totalUsers} icon={Users} />
        <StatTile
          label="Completion Rate"
          value={
            bookingStats && bookingStats.total_bookings > 0
              ? `${((bookingStats.completed_bookings / bookingStats.total_bookings) * 100).toFixed(1)}%`
              : "—"
          }
          icon={Activity}
          sub={bookingStats ? `${bookingStats.completed_bookings} completed` : undefined}
        />
      </div>

      {/* Booking breakdown + recent audit */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" />
              Booking Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bookingStats ? (
              <div className="space-y-3">
                {(
                  [
                    ["Pending", bookingStats.pending_bookings, "secondary"],
                    ["Confirmed", bookingStats.confirmed_bookings, "default"],
                    ["Completed", bookingStats.completed_bookings, "default"],
                    ["Cancelled", bookingStats.cancelled_bookings, "destructive"],
                  ] as [string, number, "default" | "secondary" | "destructive"][]
                ).map(([label, count, variant]) => (
                  <div key={label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={variant} className="w-24 justify-center capitalize text-xs">
                        {label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary/60"
                          style={{
                            width:
                              bookingStats.total_bookings > 0
                                ? `${(count / bookingStats.total_bookings) * 100}%`
                                : "0%",
                          }}
                        />
                      </div>
                      <span className="w-8 text-right text-sm font-medium">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No booking data available.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4" />
              Recent Audit Events
            </CardTitle>
            <Button asChild variant="ghost" size="sm" className="h-7 gap-1 text-xs">
              <Link href="/admin/audit-logs">
                View all <ExternalLink className="h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentAudit && recentAudit.items.length > 0 ? (
              <div className="space-y-2">
                {recentAudit.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize text-xs">{item.action}</Badge>
                      <span className="text-muted-foreground capitalize">{item.entity_type}</span>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {item.created_at
                        ? new Date(item.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })
                        : "—"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No recent audit events.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/analytics">Full Analytics</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/audit-logs">Audit Logs</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/reports">Export Reports</Link>
        </Button>
      </div>
    </DashboardLayout>
  );
}
