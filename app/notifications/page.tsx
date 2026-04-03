import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Bell } from "lucide-react";

type MeUser = {
  id: string;
  email: string;
  role: "customer" | "staff" | "admin" | "superadmin";
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

export default async function NotificationsPage() {
  const me = await getMe();
  if (!me) redirect("/auth/login");
  if (me.role === "customer") redirect("/#services");
  if (me.role === "admin" || me.role === "superadmin")
    redirect("/admin/dashboard");

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight">Notifications</h2>
        <p className="text-muted-foreground">Stay updated on your activity.</p>
      </div>

      <Card className="">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="size-5 text-muted-foreground" />
            <CardTitle>All Notifications</CardTitle>
          </div>
          <CardDescription>
            Notification delivery is configured, but the UI is not wired yet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You will see booking updates, reminders, and staff notes here once
            the notification feed is connected.
          </p>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
