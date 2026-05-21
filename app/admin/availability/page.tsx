import { redirect } from "next/navigation";
import { headers } from "next/headers";
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

  return <AvailabilityManager />;
}
