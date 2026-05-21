import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { AvailabilityManager } from "@/components/availability/availability-manager";

async function getMe() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const cookie = (await headers()).get("cookie") ?? "";
  const res = await fetch(`${apiUrl}/api/auth/me`, {
    headers: { Cookie: cookie },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function AdminAvailabilityPage() {
  const me = await getMe();
  if (!me) redirect("/auth/login");
  if (me.role !== "admin" && me.role !== "superadmin") redirect("/dashboard");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Hero strip */}
        <section className="relative overflow-hidden rounded-[1.1rem] border border-(--seva-border-subtle) bg-(--seva-surface) px-8 py-8 lg:px-10 lg:py-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(122,213,221,0.08),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(196,176,253,0.05),transparent_30%)]" />
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-(--seva-accent)">
                Admin / Availability
              </p>
              <h1 className="sevacam-display mt-3 text-[clamp(2rem,4.5vw,3.4rem)] leading-[0.92] text-(--text-primary)">
                Working Hours
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-(--text-secondary)">
                Set weekly schedules for each staff member so customers can book
                available time slots.
              </p>
            </div>
            <Link
              href="/admin/dashboard"
              className="sevacam-secondary-button inline-flex h-11 shrink-0 items-center rounded-[0.18rem] px-5 text-[0.62rem] font-semibold uppercase tracking-[0.18em]"
            >
              <ArrowLeft className="mr-2 size-3.5" />
              Back to Dashboard
            </Link>
          </div>
        </section>

        <AvailabilityManager />
      </div>
    </DashboardLayout>
  );
}
