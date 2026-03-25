import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

import AdminBookingsClient from "./AdminBookingsClient";

type MeUser = {
  id: string;
  email: string;
  role: "customer" | "staff" | "admin" | "superadmin";
  full_name?: string | null;
};

type Booking = {
  id: string;
  start_time_utc: string;
  status: string;
  payment_status: string;
  service: {
    id?: string | null;
    name?: string | null;
    price?: number | string | null;
    duration_minutes?: number | null;
  };
  staff?: {
    id?: string | null;
    full_name?: string | null;
  };
  customer?: {
    id?: string | null;
    full_name?: string | null;
    email?: string | null;
    phone?: string | null;
  };
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

async function getBookings(): Promise<Booking[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const cookie = (await headers()).get("cookie") ?? "";

  const res = await fetch(`${apiUrl}/api/admin/bookings`, {
    headers: { Cookie: cookie },
    cache: "no-store",
  });

  if (!res.ok) return [];
  return (await res.json()) as Booking[];
}

export default async function AdminBookingsPage() {
  const me = await getMe();
  if (!me) redirect("/auth/login");
  if (me.role !== "admin" && me.role !== "superadmin") redirect("/dashboard");

  const bookings = await getBookings();

  return (
    <DashboardLayout
      title="Bookings"
      subtitle="Manage booking status, reschedules, and customer timelines."
    >
      <AdminBookingsClient initialBookings={bookings} />
    </DashboardLayout>
  );
}
