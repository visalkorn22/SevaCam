import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
    <DashboardLayout>
      <div className="space-y-8 motion-page">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <p className="sevacam-eyebrow">Admin / Bookings</p>
            <h1 className="sevacam-display text-[clamp(2.25rem,3.8vw,3.6rem)] leading-[0.92] tracking-[-0.04em] text-(--text-primary)">
              Booking Ledger
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-(--text-secondary)">
              Review service timelines, adjust statuses, and manage customer
              appointments from one quieter operational surface.
            </p>
          </div>
          <Link
            href="/admin/dashboard"
            className="sevacam-secondary-button inline-flex h-11 items-center rounded-[0.18rem] px-5 text-[0.62rem] font-semibold uppercase tracking-[0.16em]"
          >
            <ArrowLeft className="mr-2 size-3.5" />
            Back to Dashboard
          </Link>
        </div>

        <AdminBookingsClient initialBookings={bookings} />
      </div>
    </DashboardLayout>
  );
}
