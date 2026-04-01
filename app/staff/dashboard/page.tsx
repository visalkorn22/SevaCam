import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, DollarSign, Users, Phone, Mail } from "lucide-react";
import { EmptyState } from "@/components/dashboard/empty-state";
import {
  formatDateTimeInTimeZone,
  formatTimeInTimeZone,
} from "@/lib/timezone";

type MeUser = {
  id: string;
  email: string;
  timezone?: string | null;
  role: "customer" | "staff" | "admin" | "superadmin";
};

type BookingRow = {
  id: string;
  start_time_utc: string;
  status: "confirmed" | "cancelled" | "pending" | string;

  services?: {
    name?: string | null;
    duration_minutes?: number | null;
    price?: number | null;
  } | null;

  customers?: {
    full_name?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
};

type StaffDashboardData = {
  todayBookings: BookingRow[];
  upcomingBookings: BookingRow[];
  totalRevenue: number;
  totalBookings: number;
};

const DEFAULT_STAFF_TIMEZONE = "Asia/Phnom_Penh";

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

async function getStaffDashboard(): Promise<StaffDashboardData> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const cookie = (await headers()).get("cookie") ?? "";

  // Backend endpoint you should create:
  // GET /api/staff/dashboard
  // Response:
  // {
  //   todayBookings: BookingRow[],
  //   upcomingBookings: BookingRow[],
  //   totalRevenue: number,
  //   totalBookings: number
  // }
  //
  // NOTE: Best practice: compute today/upcoming ranges on the backend
  // using staff's timezone rules, then return ready-to-render data.
  try {
    const res = await fetch(`${apiUrl}/api/staff/dashboard`, {
      method: "GET",
      headers: { Cookie: cookie },
      cache: "no-store",
    });

    if (!res.ok) {
      return {
        todayBookings: [],
        upcomingBookings: [],
        totalRevenue: 0,
        totalBookings: 0,
      };
    }
    return (await res.json()) as StaffDashboardData;
  } catch {
    return {
      todayBookings: [],
      upcomingBookings: [],
      totalRevenue: 0,
      totalBookings: 0,
    };
  }
}

export default async function StaffDashboard() {
  const me = await getMe();
  if (!me) redirect("/auth/login");
  if (me.role !== "staff" && me.role !== "admin" && me.role !== "superadmin")
    redirect("/dashboard");
  const displayTimeZone = me.timezone || DEFAULT_STAFF_TIMEZONE;

  // If you *don't* have /api/staff/dashboard yet, you can replace this with
  // two fetches (today/upcoming) + one stats fetch. But one endpoint is cleaner.
  const { todayBookings, upcomingBookings, totalRevenue, totalBookings } =
    await getStaffDashboard();

  return (
    <DashboardLayout>
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Today's Appointments"
          value={todayBookings.length}
          icon={Calendar}
          change={15.3}
        />
        <StatCard title="Total Bookings" value={totalBookings} icon={Users} />
        <StatCard
          title="Total Revenue"
          value={`$${totalRevenue.toFixed(2)}`}
          icon={DollarSign}
          change={8.7}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="today" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          </TabsList>

          <Button asChild>
            <Link href="/staff/availability">Manage Availability</Link>
          </Button>
        </div>

        <TabsContent value="today" className="space-y-5">
          {todayBookings.length > 0 ? (
            todayBookings.map((booking) => (
              <Card
                key={booking.id}
                className="border border-border bg-card shadow-md transition-shadow hover:shadow-lg"
              >
                <CardHeader className="pb-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl font-bold">
                        {booking.services?.name || "Service"}
                      </CardTitle>
                      <CardDescription className="mt-1.5 text-sm">
                        {formatTimeInTimeZone(
                          booking.start_time_utc,
                          displayTimeZone,
                        )}
                      </CardDescription>
                    </div>

                    <Badge
                      className="shrink-0"
                      variant={
                        booking.status === "confirmed"
                          ? "default"
                          : booking.status === "cancelled"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {booking.status}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="pt-2">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="size-4 text-muted-foreground" />
                      <span>{booking.customers?.full_name || "Customer"}</span>
                    </div>

                    {!!booking.customers?.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="size-4 text-muted-foreground" />
                        <span>{booking.customers.phone}</span>
                      </div>
                    )}

                    {!!booking.customers?.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="size-4 text-muted-foreground" />
                        <span>{booking.customers.email}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Clock className="size-4 text-muted-foreground" />
                      <span>
                        {booking.services?.duration_minutes || 0} minutes
                      </span>
                    </div>
                  </div>

                  {/* UI-only until you add endpoints/actions */}
                  {booking.status === "confirmed" && (
                    <div className="mt-5 flex gap-3">
                      <Button size="sm" className="flex-1 sm:flex-none">
                        Mark Completed
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 sm:flex-none"
                      >
                        Mark No-Show
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <EmptyState
              icon={Calendar}
              title="No appointments today"
              description="Enjoy your day! You have no scheduled appointments for today."
            />
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-5">
          {upcomingBookings.length > 0 ? (
            upcomingBookings.map((booking) => (
              <Card
                key={booking.id}
                className="border border-border bg-card shadow-md transition-shadow hover:shadow-lg"
              >
                <CardHeader className="pb-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl font-bold">
                        {booking.services?.name || "Service"}
                      </CardTitle>
                      <CardDescription className="mt-1.5 text-sm">
                        {formatDateTimeInTimeZone(
                          booking.start_time_utc,
                          displayTimeZone,
                        )}
                      </CardDescription>
                    </div>

                    <Badge
                      className="shrink-0"
                      variant={
                        booking.status === "confirmed" ? "default" : "secondary"
                      }
                    >
                      {booking.status}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="pt-2">
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {booking.customers?.full_name || "Customer"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {booking.services?.duration_minutes || 0} minutes
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <EmptyState
              icon={Calendar}
              title="No upcoming appointments"
              description="You have no scheduled appointments coming up."
            />
          )}
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
