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
import { Download, FileText } from "lucide-react";

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

export default async function AdminReportsPage() {
  const me = await getMe();
  if (!me) redirect("/auth/login");
  if (me.role !== "admin" && me.role !== "superadmin") redirect("/dashboard");

  // These endpoints are what you should implement in FastAPI later:
  // GET /api/admin/reports/bookings.csv
  // GET /api/admin/reports/financial.csv
  // GET /api/admin/reports/customers.csv
  // GET /api/admin/reports/staff.csv
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight">Reports & Exports</h2>
        <p className="text-muted-foreground">
          Generate and download business reports
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-5" />
              Booking Reports
            </CardTitle>
            <CardDescription>
              Export booking data and statistics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href={`${apiUrl}/api/admin/reports/bookings.csv`}>
                <Download className="mr-2 size-4" />
                Export Bookings CSV
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card className="">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-5" />
              Financial Reports
            </CardTitle>
            <CardDescription>Export revenue and payment data</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href={`${apiUrl}/api/admin/reports/financial.csv`}>
                <Download className="mr-2 size-4" />
                Export Financial CSV
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card className="">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-5" />
              Customer Reports
            </CardTitle>
            <CardDescription>
              Export customer data and statistics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href={`${apiUrl}/api/admin/reports/customers.csv`}>
                <Download className="mr-2 size-4" />
                Export Customers CSV
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card className="">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-5" />
              Staff Performance
            </CardTitle>
            <CardDescription>
              Export staff metrics and performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href={`${apiUrl}/api/admin/reports/staff.csv`}>
                <Download className="mr-2 size-4" />
                Export Staff CSV
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
