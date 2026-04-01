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
import { FileText } from "lucide-react";

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

export default async function AuditLogsPage() {
  const me = await getMe();
  if (!me) redirect("/auth/login");
  if (me.role !== "superadmin") redirect("/dashboard");

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight">Audit Logs</h2>
        <p className="text-muted-foreground">
          Review system activity and administrative actions.
        </p>
      </div>

      <Card className="">
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="size-5 text-muted-foreground" />
            <CardTitle>Activity Feed</CardTitle>
          </div>
          <CardDescription>Audit log ingestion is not wired yet.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Connect your audit table or logging system to surface events here.
          </p>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
