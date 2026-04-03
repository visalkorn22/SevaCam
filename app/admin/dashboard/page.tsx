import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Calendar,
  DollarSign,
  ShieldCheck,
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

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default async function AdminDashboard() {
  const me = await getMe();
  if (!me) redirect("/auth/login");
  if (me.role !== "admin" && me.role !== "superadmin") redirect("/dashboard");

  const stats = await getAdminDashboardStats();
  const greetingName =
    me.full_name || me.email?.split("@")[0] || "Administrator";
  const averageTicket =
    stats.totalBookings > 0 ? stats.totalRevenue / stats.totalBookings : 0;
  const settingsHref =
    me.role === "superadmin" ? "/admin/system-settings" : "/admin/settings";

  const pulseItems = [
    {
      label: "Cancellation rate",
      value: `${stats.cancellationRate.toFixed(1)}%`,
      note: "Track scheduling friction and prevent avoidable drop-off.",
    },
    {
      label: "Guest reviews",
      value: stats.totalReviews.toString(),
      note: "Measure service perception and response volume.",
    },
    {
      label: "Active users",
      value: stats.activeUsers.toString(),
      note: "Watch customer and team activity in real time.",
    },
  ];

  const quickActions = [
    {
      title: "Manage services",
      description: "Adjust pricing, timing, visibility, and service details.",
      href: "/admin/services",
      icon: Briefcase,
    },
    {
      title: "Review bookings",
      description: "Check upcoming reservations and scheduling changes.",
      href: "/admin/bookings",
      icon: Calendar,
    },
    {
      title: "Oversee staff",
      description: "Review access, availability, and team assignments.",
      href: "/admin/staff",
      icon: Users,
    },
    {
      title: "Open settings",
      description: "Update system controls and operating preferences.",
      href: settingsHref,
      icon: ShieldCheck,
    },
  ];

  const overviewTiles = [
    {
      title: "Total Bookings",
      value: stats.totalBookings.toLocaleString(),
      note: "+12.5% vs last month",
      icon: Calendar,
      tone: "text-[var(--seva-accent)]",
      badge: "bg-[rgba(122,213,221,0.14)]",
    },
    {
      title: "Revenue",
      value: currencyFormatter.format(stats.totalRevenue),
      note: "+8.2% daily growth",
      icon: DollarSign,
      tone: "text-[var(--seva-warm)]",
      badge: "bg-[rgba(255,183,133,0.14)]",
    },
    {
      title: "Upcoming",
      value: stats.upcomingBookings.toLocaleString(),
      note:
        stats.upcomingBookings > 0
          ? "Reservations in the active pipeline"
          : "No active reservations in queue",
      icon: TrendingUp,
      tone: "text-[var(--seva-accent)]",
      badge: "bg-[rgba(122,213,221,0.14)]",
    },
    {
      title: "Avg Rating",
      value: stats.avgRating.toFixed(1),
      note: `${stats.totalReviews} guest reviews tracked`,
      icon: Star,
      tone: "text-white/78",
      badge: "bg-white/[0.08]",
    },
  ];

  return (
    <DashboardLayout
      title="Overview"
      subtitle={`Welcome back, ${greetingName}. Monitor booking flow, revenue, and guest activity from one quieter admin surface.`}
    >
      <div className="mx-auto max-w-[70rem] space-y-5 text-[var(--seva-text)]">
        <section className="grid gap-3 xl:grid-cols-4">
          {overviewTiles.map((tile) => {
            const Icon = tile.icon;

            return (
              <Card
                key={tile.title}
                className="border-white/6 bg-[var(--seva-surface)] text-[var(--seva-text)] shadow-none"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className={`text-[0.58rem] font-semibold uppercase tracking-[0.16em] ${tile.tone}`}>
                      {tile.title}
                    </p>
                    <span
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-[0.75rem] ${tile.badge} ${tile.tone}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <p className="mt-5 text-[1.95rem] font-semibold leading-none tracking-[-0.05em] text-[var(--seva-text)]">
                    {tile.value}
                  </p>
                  <p className={`mt-2 text-[0.78rem] leading-5 ${tile.tone === "text-white/78" ? "text-[var(--seva-text-soft)]" : tile.tone}`}>
                    {tile.note}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.18fr)_16.25rem]">
          <div className="space-y-4">
            <div>
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-[var(--seva-accent)]">
                Live analytics
              </p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                  <h3 className="sevacam-display text-[clamp(1.45rem,2vw,1.9rem)] leading-[1] tracking-[-0.04em] text-[var(--seva-text)]">
                  Revenue and booking movement
                </h3>
                  <span className="inline-flex items-center gap-2 rounded-full bg-[rgba(122,213,221,0.12)] px-2.5 py-1 text-[0.56rem] font-semibold uppercase tracking-[0.14em] text-[var(--seva-accent)]">
                  Live view
                </span>
              </div>
            </div>
            <AnalyticsCharts />

            <Card className="border-white/6 bg-[var(--seva-surface)] text-[var(--seva-text)] shadow-none">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-[0.92rem]">Quick Tasks</CardTitle>
                    <CardDescription className="text-[0.8rem] text-[var(--seva-text-muted)]">
                      Common administrative actions, kept within fast reach.
                    </CardDescription>
                  </div>
                  <Link
                    href="/admin/bookings"
                    className="text-[0.56rem] font-semibold uppercase tracking-[0.14em] text-[var(--seva-accent)] transition-colors hover:text-[var(--seva-text)]"
                  >
                    View bookings
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="hidden grid-cols-[1.05fr_1.5fr_auto] gap-4 border-b border-white/6 px-4 py-2.5 text-[0.56rem] font-semibold uppercase tracking-[0.14em] text-[var(--seva-text-muted)] md:grid">
                  <span>Action</span>
                  <span>Focus</span>
                  <span>Open</span>
                </div>
                <div className="divide-y divide-white/6">
                  {quickActions.map((action) => {
                    const Icon = action.icon;

                    return (
                      <Link
                        key={action.href}
                        href={action.href}
                        className="grid gap-3 px-4 py-3 transition-colors hover:bg-[var(--seva-elevated)] md:grid-cols-[1.05fr_1.5fr_auto] md:items-center"
                      >
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-[0.75rem] bg-[rgba(122,213,221,0.14)] text-[var(--seva-accent)]">
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          <div>
                            <p className="text-[0.84rem] font-semibold text-[var(--seva-text)]">
                              {action.title}
                            </p>
                            <p className="text-[0.78rem] text-white/40 md:hidden">
                              {action.description}
                            </p>
                          </div>
                        </div>
                        <p className="text-[0.78rem] leading-5 text-white/52">
                          {action.description}
                        </p>
                        <div className="inline-flex items-center gap-1.5 text-[0.56rem] font-semibold uppercase tracking-[0.14em] text-[var(--seva-accent)]">
                          Open
                          <ArrowRight className="h-3.5 w-3.5" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="border-white/6 bg-[var(--seva-surface)] text-[var(--seva-text)] shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-[0.92rem]">Quick Stats</CardTitle>
                <CardDescription className="text-[0.8rem] text-[var(--seva-text-muted)]">
                  The metrics that matter most while operations are live.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {pulseItems.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[0.8rem] border border-white/6 bg-[var(--seva-elevated)] px-3 py-3"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-[0.8rem] font-medium text-[var(--seva-text)]">
                        {item.label}
                      </p>
                      <p className="text-[0.86rem] font-semibold text-[var(--seva-accent)]">
                        {item.value}
                      </p>
                    </div>
                    <p className="mt-1 text-[0.76rem] leading-5 text-white/50">
                      {item.note}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-white/6 bg-[var(--seva-surface)] text-[var(--seva-text)] shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-[0.92rem]">System Integrity</CardTitle>
                <CardDescription className="text-[0.8rem] text-[var(--seva-text-muted)]">
                  Booking flow and response health at a glance.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-[0.85rem] border border-white/6 bg-[var(--seva-elevated)] px-3 py-3">
                  <p className="text-[0.56rem] font-semibold uppercase tracking-[0.14em] text-[var(--seva-accent)]">
                    Stable
                  </p>
                  <p className="mt-2 text-[0.78rem] leading-5 text-white/58">
                    All booking nodes remain synchronized. Revenue, reviews, and
                    upcoming reservations are updating without issue.
                  </p>
                </div>
                <Link
                  href="/admin/monitoring"
                  className="mt-2.5 inline-flex w-full items-center justify-center rounded-[0.85rem] border border-white/8 bg-[var(--seva-elevated)] px-3 py-2.5 text-[0.56rem] font-semibold uppercase tracking-[0.14em] text-[var(--seva-text)] transition-colors hover:border-[rgba(122,213,221,0.22)] hover:bg-[var(--seva-overlay)]"
                >
                  Run diagnostics
                </Link>
              </CardContent>
            </Card>

            <Card className="border-white/6 bg-[var(--seva-surface)] text-[var(--seva-text)] shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-[0.92rem]">Overview Summary</CardTitle>
                <CardDescription className="text-[0.8rem] text-[var(--seva-text-muted)]">
                  A compact read on operational output.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <div className="flex items-center justify-between rounded-[0.85rem] border border-white/6 bg-[var(--seva-elevated)] px-3 py-3">
                  <span className="text-[0.8rem] text-[var(--seva-text-soft)]">Average ticket</span>
                  <span className="text-[0.86rem] font-semibold text-[var(--seva-text)]">
                    {currencyFormatter.format(averageTicket)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-[0.85rem] border border-white/6 bg-[var(--seva-elevated)] px-3 py-3">
                  <span className="text-[0.8rem] text-[var(--seva-text-soft)]">Total reviews</span>
                  <span className="text-[0.86rem] font-semibold text-[var(--seva-text)]">
                    {stats.totalReviews}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-[0.85rem] border border-white/6 bg-[var(--seva-elevated)] px-3 py-3">
                  <span className="text-[0.8rem] text-[var(--seva-text-soft)]">Active users</span>
                  <span className="text-[0.86rem] font-semibold text-[var(--seva-text)]">
                    {stats.activeUsers}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
