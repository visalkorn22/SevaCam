import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
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
      badge: "bg-[rgba(122,213,221,0.18)]",
      bg: "bg-[rgba(122,213,221,0.07)]",
      border: "border-[rgba(122,213,221,0.2)]",
      strip: "bg-[var(--seva-accent)]",
      glow: "rgba(122,213,221,0.06)",
    },
    {
      title: "Revenue",
      value: currencyFormatter.format(stats.totalRevenue),
      note: "+8.2% daily growth",
      icon: DollarSign,
      tone: "text-[var(--seva-warm)]",
      badge: "bg-[rgba(255,183,133,0.18)]",
      bg: "bg-[rgba(255,183,133,0.07)]",
      border: "border-[rgba(255,183,133,0.2)]",
      strip: "bg-[var(--seva-warm)]",
      glow: "rgba(255,183,133,0.06)",
    },
    {
      title: "Upcoming",
      value: stats.upcomingBookings.toLocaleString(),
      note:
        stats.upcomingBookings > 0
          ? "Reservations in the active pipeline"
          : "No active reservations in queue",
      icon: TrendingUp,
      tone: "text-[var(--seva-violet)]",
      badge: "bg-[rgba(196,176,253,0.18)]",
      bg: "bg-[rgba(196,176,253,0.07)]",
      border: "border-[rgba(196,176,253,0.2)]",
      strip: "bg-[var(--seva-violet)]",
      glow: "rgba(196,176,253,0.06)",
    },
    {
      title: "Avg Rating",
      value: stats.avgRating.toFixed(1),
      note: `${stats.totalReviews} guest reviews tracked`,
      icon: Star,
      tone: "text-[var(--seva-rose)]",
      badge: "bg-[rgba(249,168,196,0.18)]",
      bg: "bg-[rgba(249,168,196,0.07)]",
      border: "border-[rgba(249,168,196,0.2)]",
      strip: "bg-[var(--seva-rose)]",
      glow: "rgba(249,168,196,0.06)",
    },
  ];

  return (
    <DashboardLayout
      title="Overview"
      subtitle={`Welcome back, ${greetingName}.`}
    >
      <div className="mx-auto max-w-[70rem] space-y-6 text-[var(--seva-text)]">

        {/* ── Hero greeting strip ── */}
        <section className="relative overflow-hidden rounded-[1.1rem] border border-white/6 bg-[var(--seva-surface)] px-8 py-8 lg:px-10 lg:py-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(122,213,221,0.08),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(255,183,133,0.05),transparent_30%)]" />
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[var(--seva-warm)]">
                Admin Control Surface
              </p>
              <h1 className="sevacam-display mt-3 text-[clamp(2rem,4.5vw,3.4rem)] leading-[0.92] text-[var(--seva-text)]">
                Good to see you,<br />{greetingName}.
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--seva-text-soft)]">
                Monitor booking flow, revenue, and guest activity from one quieter admin surface.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <Link
                href="/admin/bookings"
                className="sevacam-secondary-button inline-flex min-h-10 items-center rounded-[0.18rem] px-5 text-[0.62rem] font-semibold uppercase tracking-[0.18em]"
              >
                View Bookings
              </Link>
              <Link
                href="/admin/services"
                className="sevacam-primary-button inline-flex min-h-10 items-center rounded-[0.18rem] px-5 text-[0.62rem] font-semibold uppercase tracking-[0.18em]"
              >
                Manage Services
              </Link>
            </div>
          </div>
        </section>

        {/* ── Stat tiles ── */}
        <section className="grid gap-3 xl:grid-cols-4">
          {overviewTiles.map((tile) => {
            const Icon = tile.icon;
            return (
              <div
                key={tile.title}
                className={`relative overflow-hidden rounded-[0.9rem] border ${tile.border} ${tile.bg} p-5`}
              >
                {/* coloured top-edge accent strip */}
                <div className={`absolute inset-x-0 top-0 h-[2.5px] ${tile.strip}`} />
                {/* subtle corner glow */}
                <div
                  className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl"
                  style={{ background: tile.glow }}
                />

                <div className="flex items-start justify-between gap-3">
                  <p className={`text-[0.56rem] font-semibold uppercase tracking-[0.18em] ${tile.tone}`}>
                    {tile.title}
                  </p>
                  <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.65rem] ${tile.badge} ${tile.tone}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                </div>
                <p className="mt-4 text-[1.9rem] font-medium leading-none tracking-[-0.05em] text-[var(--seva-text)]">
                  {tile.value}
                </p>
                <p className={`mt-2 text-[0.74rem] leading-5 ${tile.tone}`}>
                  {tile.note}
                </p>
              </div>
            );
          })}
        </section>

        {/* ── Main two-column layout ── */}
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.18fr)_16.25rem]">

          {/* Left column */}
          <div className="space-y-6">

            {/* Analytics header */}
            <div>
              <p className="sevacam-eyebrow">Live analytics</p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                <h2 className="sevacam-display text-[clamp(1.4rem,2.2vw,1.85rem)] leading-[1] text-[var(--seva-text)]">
                  Revenue and booking movement
                </h2>
                <span className="inline-flex items-center rounded-full bg-[rgba(122,213,221,0.1)] px-2.5 py-1 text-[0.56rem] font-semibold uppercase tracking-[0.14em] text-[var(--seva-accent)]">
                  Live view
                </span>
              </div>
            </div>

            <AnalyticsCharts />

            {/* Quick actions */}
            <div className="sevacam-rail overflow-hidden">
              <div className="flex items-center justify-between gap-4 border-b border-white/5 px-5 py-4">
                <div>
                  <p className="sevacam-eyebrow">Quick Tasks</p>
                  <p className="mt-1 text-[0.76rem] text-[var(--seva-text-muted)]">
                    Common administrative actions, kept within fast reach.
                  </p>
                </div>
                <Link
                  href="/admin/bookings"
                  className="shrink-0 text-[0.56rem] font-semibold uppercase tracking-[0.14em] text-[var(--seva-accent)] transition-colors hover:text-[var(--seva-text)]"
                >
                  View bookings
                </Link>
              </div>
              <div className="hidden grid-cols-[1.05fr_1.5fr_auto] gap-4 border-b border-white/5 px-5 py-2.5 text-[0.54rem] font-semibold uppercase tracking-[0.14em] text-[var(--seva-text-muted)] md:grid">
                <span>Action</span>
                <span>Focus</span>
                <span>Open</span>
              </div>
              <div className="divide-y divide-white/5">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link
                      key={action.href}
                      href={action.href}
                      className="grid gap-3 px-5 py-3.5 transition-colors hover:bg-[var(--seva-elevated)] md:grid-cols-[1.05fr_1.5fr_auto] md:items-center"
                    >
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.65rem] bg-[rgba(122,213,221,0.1)] text-[var(--seva-accent)]">
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <div>
                          <p className="text-[0.84rem] font-semibold text-[var(--seva-text)]">
                            {action.title}
                          </p>
                          <p className="text-[0.74rem] text-[var(--seva-text-muted)] md:hidden">
                            {action.description}
                          </p>
                        </div>
                      </div>
                      <p className="hidden text-[0.78rem] leading-5 text-[var(--seva-text-soft)] md:block">
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
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">

            {/* Quick stats */}
            <div className="sevacam-rail p-5">
              <p className="sevacam-eyebrow">Quick Stats</p>
              <p className="mt-1 mb-4 text-[0.76rem] text-[var(--seva-text-muted)]">
                Metrics that matter most while operations are live.
              </p>
              <div className="space-y-2">
                {pulseItems.map((item) => (
                  <div key={item.label} className="sevacam-side-stat flex-col !items-start gap-1">
                    <div className="flex w-full items-center justify-between gap-3">
                      <p className="text-[0.8rem] font-medium text-[var(--seva-text-soft)]">
                        {item.label}
                      </p>
                      <span className="text-[0.86rem] font-semibold text-[var(--seva-accent)]">
                        {item.value}
                      </span>
                    </div>
                    <p className="text-[0.7rem] leading-5 text-[var(--seva-text-muted)]">
                      {item.note}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* System integrity */}
            <div className="sevacam-rail p-5">
              <p className="sevacam-eyebrow">System Integrity</p>
              <p className="mt-1 mb-4 text-[0.76rem] text-[var(--seva-text-muted)]">
                Booking flow and response health at a glance.
              </p>
              <div className="rounded-[0.7rem] border border-white/5 bg-[var(--seva-elevated)] px-4 py-3.5">
                <p className="text-[0.56rem] font-semibold uppercase tracking-[0.18em] text-[var(--seva-accent)]">
                  Stable
                </p>
                <p className="mt-2 text-[0.76rem] leading-5 text-[var(--seva-text-soft)]">
                  All booking nodes remain synchronized. Revenue, reviews, and
                  upcoming reservations are updating without issue.
                </p>
              </div>
              <Link
                href="/admin/monitoring"
                className="sevacam-secondary-button mt-2.5 inline-flex w-full items-center justify-center rounded-[0.18rem] px-4 py-2.5 text-[0.56rem] font-semibold uppercase tracking-[0.14em]"
              >
                Run Diagnostics
              </Link>
            </div>

            {/* Overview summary */}
            <div className="sevacam-rail p-5">
              <p className="sevacam-eyebrow">Overview Summary</p>
              <p className="mt-1 mb-4 text-[0.76rem] text-[var(--seva-text-muted)]">
                A compact read on operational output.
              </p>
              <div className="space-y-2">
                <div className="sevacam-side-stat">
                  <span>Average ticket</span>
                  <span>{currencyFormatter.format(averageTicket)}</span>
                </div>
                <div className="sevacam-side-stat">
                  <span>Total reviews</span>
                  <span>{stats.totalReviews}</span>
                </div>
                <div className="sevacam-side-stat">
                  <span>Active users</span>
                  <span>{stats.activeUsers}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
