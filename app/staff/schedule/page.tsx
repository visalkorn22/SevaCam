import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { AvailabilityCalendar } from "@/components/availability/availability-calendar";

type MeUser = {
  id: string;
  email: string;
  timezone?: string | null;
  role: "customer" | "staff" | "admin" | "superadmin";
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

export default async function StaffSchedulePage() {
  const me = await getMe();
  if (!me) redirect("/auth/login");
  if (me.role !== "staff" && me.role !== "admin" && me.role !== "superadmin")
    redirect("/dashboard");

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight">My Schedule</h2>
        <p className="text-muted-foreground">
          View your complete appointment schedule
        </p>
      </div>
      <AvailabilityCalendar
        mode="staff"
        staffId={me.id}
        timezone={me.timezone || DEFAULT_STAFF_TIMEZONE}
      />
    </DashboardLayout>
  );
}
