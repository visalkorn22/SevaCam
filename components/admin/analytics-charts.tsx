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
      <Card className="">
        <CardContent className="flex h-96 items-center justify-center">
          <p className="text-muted-foreground">Loading analytics...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Revenue by Service</CardTitle>
          <CardDescription>Total revenue generated per service</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={serviceStats}>
              <XAxis dataKey="service_name" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Bar
                dataKey="total_revenue"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Daily Bookings</CardTitle>
          <CardDescription>Bookings over the last 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyStats}>
              <XAxis dataKey="date" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="total_bookings"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
