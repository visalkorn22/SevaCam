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
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

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

export default async function SettingsPage() {
  const me = await getMe();
  if (!me) redirect("/auth/login");
  if (me.role === "customer") redirect("/#services");

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">Manage your account preferences</p>
      </div>

      <div className="space-y-6">
        <Card className="">
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Configure how you receive notifications
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="email-notifications">Email Notifications</Label>
              <Switch id="email-notifications" />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="sms-notifications">SMS Notifications</Label>
              <Switch id="sms-notifications" />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="booking-reminders">Booking Reminders</Label>
              <Switch id="booking-reminders" defaultChecked />
            </div>
          </CardContent>
        </Card>

        <Card className="">
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Manage your account security</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* UI-only until you add endpoints/actions */}
            <Button variant="outline">Change Password</Button>

            <div className="border-t border-border pt-4">
              <Button variant="destructive">Delete Account</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
