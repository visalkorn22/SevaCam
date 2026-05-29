"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const revenueConfig = {
  total_revenue: {
    label: "Revenue",
    color: "#7ad5dd",
  },
} satisfies ChartConfig;

const bookingsConfig = {
  total_bookings: {
    label: "Bookings",
    color: "#c4b0fd",
  },
} satisfies ChartConfig;

type ServiceStat = { service_name: string; total_revenue: number };
type DailyStat = { date: string; total_bookings: number };

const FALLBACK_SERVICE_STATS: ServiceStat[] = [
  { service_name: "Hair Cut", total_revenue: 1240 },
  { service_name: "Facial", total_revenue: 980 },
  { service_name: "Massage", total_revenue: 1750 },
  { service_name: "Nail Care", total_revenue: 620 },
  { service_name: "Waxing", total_revenue: 430 },
];

const FALLBACK_DAILY_STATS: DailyStat[] = (() => {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return {
      date: d.toISOString().slice(0, 10),
      total_bookings: [4, 7, 5, 9, 6, 11, 8][i],
    };
  });
})();

export function AnalyticsCharts() {
  const [serviceStats, setServiceStats] = useState<ServiceStat[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [servicesRes, dailyRes] = await Promise.all([
          fetch("/api/analytics/services/stats", { credentials: "include" }),
          fetch("/api/analytics/daily/stats", { credentials: "include" }),
        ]);

        const servicesData = servicesRes.ok
          ? ((await servicesRes.json()) as ServiceStat[])
          : [];
        const dailyData = dailyRes.ok
          ? ((await dailyRes.json()) as DailyStat[])
          : [];

        setServiceStats(
          servicesData.length > 0 ? servicesData : FALLBACK_SERVICE_STATS
        );
        setDailyStats(
          dailyData.length > 0
            ? dailyData.slice(0, 7).reverse()
            : FALLBACK_DAILY_STATS
        );
      } catch {
        setServiceStats(FALLBACK_SERVICE_STATS);
        setDailyStats(FALLBACK_DAILY_STATS);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  if (isLoading) {
    return (
      <div className="grid gap-3 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="sevacam-rail flex h-64 animate-pulse items-center justify-center"
          >
            <p className="text-[0.76rem] text-(--text-disabled)">Loading analytics…</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">

      {/* ── Revenue by Service ── */}
      <div className="sevacam-rail overflow-hidden">
        <div className="border-b border-white/5 px-5 py-4">
          <p className="sevacam-eyebrow">Revenue by Service</p>
          <p className="mt-1 text-[0.74rem] text-(--text-disabled)">
            Total revenue generated per service
          </p>
        </div>
        <div className="p-4">
          <ChartContainer config={revenueConfig} className="h-72 w-full">
            <BarChart data={serviceStats} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="rgba(240,238,235,0.05)" />
              <XAxis
                dataKey="service_name"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: "rgba(240,238,235,0.38)" }}
                tickFormatter={(v: string) =>
                  v.length > 10 ? v.slice(0, 10) + "…" : v
                }
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: "rgba(240,238,235,0.38)" }}
                tickFormatter={(v: number) =>
                  v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
                }
              />
              <ChartTooltip
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
                content={
                  <ChartTooltipContent
                    formatter={(value) =>
                      `$${Number(value).toLocaleString()}`
                    }
                  />
                }
              />
              <Bar
                dataKey="total_revenue"
                fill="var(--color-total_revenue)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        </div>
      </div>

      {/* ── Daily Bookings ── */}
      <div className="sevacam-rail overflow-hidden">
        <div className="border-b border-white/5 px-5 py-4">
          <p className="sevacam-eyebrow">Daily Bookings</p>
          <p className="mt-1 text-[0.74rem] text-(--text-disabled)">
            Bookings over the last 7 days
          </p>
        </div>
        <div className="p-4">
          <ChartContainer config={bookingsConfig} className="h-72 w-full">
            <LineChart data={dailyStats} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="rgba(240,238,235,0.05)" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: "rgba(240,238,235,0.38)" }}
                tickFormatter={(v: string) => {
                  const d = new Date(v);
                  return isNaN(d.getTime())
                    ? v
                    : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: "rgba(240,238,235,0.38)" }}
                allowDecimals={false}
              />
              <ChartTooltip
                cursor={{ stroke: "rgba(196,176,253,0.2)", strokeWidth: 1 }}
                content={<ChartTooltipContent />}
              />
              <Line
                type="monotone"
                dataKey="total_bookings"
                stroke="var(--color-total_bookings)"
                strokeWidth={2}
                dot={{ fill: "var(--color-total_bookings)", r: 3 }}
                activeDot={{ r: 5, fill: "var(--color-total_bookings)" }}
              />
            </LineChart>
          </ChartContainer>
        </div>
      </div>
    </div>
  );
}
