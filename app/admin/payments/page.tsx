import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { format } from "date-fns";

import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/dashboard/empty-state";
import { CreditCard } from "lucide-react";

type MeUser = {
  id: string;
  email: string;
  role: "customer" | "staff" | "admin" | "superadmin";
};

type PaymentRow = {
  id: string;
  created_at: string;
  amount: number;
  status: "completed" | "failed" | "pending" | string;
  payment_method: string;
  booking?: {
    id: string;
    service?: { name?: string | null };
    customer?: { full_name?: string | null };
  };
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

async function getPayments(): Promise<PaymentRow[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const cookie = (await headers()).get("cookie") ?? "";

  // Backend endpoint you should create:
  // GET /api/admin/payments?limit=50
  try {
    const res = await fetch(`${apiUrl}/api/admin/payments?limit=50`, {
      method: "GET",
      headers: { Cookie: cookie },
      cache: "no-store",
    });

    if (!res.ok) return [];
    return (await res.json()) as PaymentRow[];
  } catch {
    return [];
  }
}

export default async function AdminPaymentsPage() {
  // ── Auth / Role guard ─────────────────────────
  const me = await getMe();
  if (!me) redirect("/auth/login");
  if (me.role !== "admin" && me.role !== "superadmin") redirect("/dashboard");

  const payments = await getPayments();

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight">
          Payments & Transactions
        </h2>
        <p className="text-muted-foreground">
          View all payment transactions and statuses
        </p>
      </div>

      {payments.length > 0 ? (
        <Card className="">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>

          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Method</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {format(new Date(payment.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      {payment.booking?.customer?.full_name || "N/A"}
                    </TableCell>
                    <TableCell>
                      {payment.booking?.service?.name || "N/A"}
                    </TableCell>
                    <TableCell>${Number(payment.amount || 0)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          payment.status === "completed"
                            ? "default"
                            : payment.status === "failed"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">
                      {payment.payment_method}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          icon={CreditCard}
          title="No payments yet"
          description="Payments will appear here once bookings are made."
        />
      )}
    </DashboardLayout>
  );
}
