import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import StaffManager from "./StaffManager";

type MeUser = {
  id: string;
  email: string;
  role: "customer" | "staff" | "admin" | "superadmin";
};

type UserRow = {
  id: string;
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
  phone?: string | null;
  role: "customer" | "staff" | "admin" | "superadmin";
  is_active: boolean;
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

async function getUsers(): Promise<UserRow[]> {
  const cookie = (await headers()).get("cookie") ?? "";
  const host = (await headers()).get("host");
  if (!host) return [];
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const baseUrl = `${protocol}://${host}`;

  try {
    const res = await fetch(`${baseUrl}/api/users?limit=500`, {
      method: "GET",
      headers: { Cookie: cookie },
      cache: "no-store",
    });

    if (!res.ok) return [];
    const data = (await res.json()) as UserRow[];
    return data.map((user) => ({
      ...user,
      id: user?.id ? String(user.id) : "",
    }));
  } catch {
    return [];
  }
}

export default async function AdminStaffPage() {
  const me = await getMe();
  if (!me) redirect("/auth/login");
  if (me.role !== "admin" && me.role !== "superadmin") redirect("/dashboard");

  const users = await getUsers();

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Manage Users</h2>
          <p className="text-muted-foreground">
            Manage customers, staff, and administrator accounts.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/dashboard">Back to Dashboard</Link>
        </Button>
      </div>

      {users.length > 0 ? (
        <StaffManager currentUser={me} users={users} />
      ) : (
        <Card className="">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">No users found</p>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}
