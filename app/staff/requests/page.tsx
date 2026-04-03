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
import { Users } from "lucide-react";

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

export default async function StaffRequestsPage() {
  const me = await getMe();
  if (!me) redirect("/auth/login");
  if (me.role === "customer") redirect("/dashboard");

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight">Customer Requests</h2>
        <p className="text-muted-foreground">
          Track incoming customer requests and assignments.
        </p>
      </div>

      <Card className="">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="size-5 text-muted-foreground" />
            <CardTitle>Requests Queue</CardTitle>
          </div>
          <CardDescription>
            Connect this view to your booking or ticket workflow.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Staff can triage new customer requests here once the API is wired.
          </p>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
