import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { AvailabilityManager } from "@/components/staff/availability-manager";

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

export default async function StaffAvailabilityPage() {
  const me = await getMe();
  if (!me) redirect("/auth/login");
  if (me.role !== "staff" && me.role !== "admin" && me.role !== "superadmin")
    redirect("/dashboard");

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center">
          <h1 className="text-xl font-bold">Manage Availability</h1>
        </div>
      </header>

      <div className="container py-8">
        <AvailabilityManager
          staffId={me.id}
          role={me.role}
          timezone={me.timezone || DEFAULT_STAFF_TIMEZONE}
        />
      </div>
    </div>
  );
}
