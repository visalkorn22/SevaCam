import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import ProfileClient from "./ProfileClient";

type MeUser = {
  id: string;
  email: string;
  role: "customer" | "staff" | "admin" | "superadmin";
  full_name?: string | null;
  phone?: string | null;
  timezone?: string | null;
  avatar_url?: string | null;
};

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

export default async function ProfilePage() {
  const me = await getMe();
  if (!me) redirect("/auth/login");

  return (
    <DashboardLayout>
      <ProfileClient user={me} />
    </DashboardLayout>
  );
}
