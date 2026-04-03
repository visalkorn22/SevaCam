"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Line,
  LineChart,
} from "recharts";

export function AnalyticsCharts() {
  const [serviceStats, setServiceStats] = useState<any[]>([]);
  const [dailyStats, setDailyStats] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const tooltipStyle = {
    backgroundColor: "#181818",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "18px",
    color: "#f0eeeb",
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [servicesRes, dailyRes] = await Promise.all([
          fetch(`/api/analytics/services/stats`, {
            credentials: "include",
          }),
          fetch(`/api/analytics/daily/stats`, {
            credentials: "include",
          }),
        ]);

        if (!servicesRes.ok || !dailyRes.ok) {
          const servicesText = await servicesRes.text().catch(() => "");
          const dailyText = await dailyRes.text().catch(() => "");
          throw new Error(
            `Analytics request failed: services=${servicesRes.status}, daily=${dailyRes.status}. ${servicesText || dailyText}`,
          );
        }

        const servicesData = (await servicesRes.json()) as any[];
        const dailyData = (await dailyRes.json()) as any[];

        setServiceStats(servicesData);
        setDailyStats(dailyData.slice(0, 7).reverse());
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <Card className="border-white/6 bg-[var(--seva-surface)] text-[var(--seva-text)] shadow-none">
        <CardContent className="flex h-56 items-center justify-center">
          <p className="text-white/52">Loading analytics...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Card className="border-white/6 bg-[var(--seva-surface)] text-[var(--seva-text)] shadow-none">
        <CardHeader className="pb-0">
          <CardTitle className="text-[0.92rem] text-[var(--seva-text)]">
            Revenue by Service
          </CardTitle>
          <CardDescription className="text-[0.8rem] text-white/48">
            Total revenue generated per service
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-3">
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={serviceStats}>
              <XAxis dataKey="service_name" fontSize={12} stroke="rgba(240,238,235,0.42)" />
              <YAxis fontSize={12} stroke="rgba(240,238,235,0.42)" />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Bar
                dataKey="total_revenue"
                fill="#7ad5dd"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-white/6 bg-[var(--seva-surface)] text-[var(--seva-text)] shadow-none">
        <CardHeader className="pb-0">
          <CardTitle className="text-[0.92rem] text-[var(--seva-text)]">
            Daily Bookings
          </CardTitle>
          <CardDescription className="text-[0.8rem] text-white/48">
            Bookings over the last 7 days
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-3">
          <ResponsiveContainer width="100%" height={190}>
            <LineChart data={dailyStats}>
              <XAxis dataKey="date" fontSize={12} stroke="rgba(240,238,235,0.42)" />
              <YAxis fontSize={12} stroke="rgba(240,238,235,0.42)" />
              <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "rgba(122,213,221,0.18)" }} />
              <Line
                type="monotone"
                dataKey="total_bookings"
                stroke="#7ad5dd"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
