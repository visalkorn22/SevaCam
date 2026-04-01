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
import { Badge } from "@/components/ui/badge";
import { CreditCard, ExternalLink } from "lucide-react";
import Link from "next/link";
import { PaymentReturnStatus } from "@/components/payment/payment-return-status";
import { formatDateTimeInTimeZone } from "@/lib/timezone";

type MeUser = {
  id: string;
  email: string;
  timezone?: string | null;
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

type PaymentRecord = {
  id: string;
  booking_id: string;
  provider: string;
  provider_reference?: string | null;
  amount: string | number;
  currency: string;
  status: string;
  created_at: string;
};

type CustomerBooking = {
  id: string;
  start_time_utc: string;
  status: string;
  payment_status?: string | null;
  service_name?: string | null;
  service_price?: number | string | null;
};

type PaymentHistoryItem = {
  booking: CustomerBooking;
  payments: PaymentRecord[];
};

const DEFAULT_CUSTOMER_TIMEZONE = "Asia/Phnom_Penh";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

async function getPaymentById(
  paymentId: string,
  stripeSessionId?: string,
): Promise<PaymentRecord | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const cookie = (await headers()).get("cookie") ?? "";
  const query = stripeSessionId
    ? `?stripe_session_id=${encodeURIComponent(stripeSessionId)}`
    : "";

  try {
    const res = await fetch(`${apiUrl}/api/payments/${paymentId}${query}`, {
      method: "GET",
      headers: { Cookie: cookie },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as PaymentRecord;
  } catch {
    return null;
  }
}

async function getCustomerPaymentHistory(): Promise<PaymentHistoryItem[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const cookie = (await headers()).get("cookie") ?? "";

  try {
    const bookingsRes = await fetch(`${apiUrl}/api/bookings?limit=20`, {
      method: "GET",
      headers: { Cookie: cookie },
      cache: "no-store",
    });

    if (!bookingsRes.ok) return [];
    const bookings = (await bookingsRes.json()) as CustomerBooking[];

    const withPaymentPotential = bookings.filter(
      (b) => (b.payment_status || "").toLowerCase() !== "none",
    );

    const paymentsByBooking = await Promise.all(
      withPaymentPotential.map(async (booking) => {
        try {
          const res = await fetch(
            `${apiUrl}/api/payments/booking/${booking.id}`,
            {
              method: "GET",
              headers: { Cookie: cookie },
              cache: "no-store",
            },
          );
          if (!res.ok) {
            return { booking, payments: [] as PaymentRecord[] };
          }
          const payments = (await res.json()) as PaymentRecord[];
          return { booking, payments };
        } catch {
          return { booking, payments: [] as PaymentRecord[] };
        }
      }),
    );

    return paymentsByBooking.filter((item) => item.payments.length > 0);
  } catch {
    return [];
  }
}

function statusVariant(
  status: string,
): "default" | "destructive" | "outline" | "secondary" {
  const normalized = status.toLowerCase();
  if (normalized === "completed" || normalized === "paid") return "default";
  if (normalized === "failed") return "destructive";
  if (normalized === "refunded") return "secondary";
  return "outline";
}

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    return_params?: string;
    payment_id?: string;
    paymentId?: string;
    stripe_session_id?: string;
  }>;
}) {
  const me = await getMe();
  if (!me) redirect("/auth/login");
  const displayTimeZone =
    me.timezone && me.timezone !== "UTC"
      ? me.timezone
      : DEFAULT_CUSTOMER_TIMEZONE;

  const resolved = await searchParams;
  const paymentId =
    resolved.return_params || resolved.payment_id || resolved.paymentId || "";
  const stripeSessionId = resolved.stripe_session_id || "";
  const history =
    me.role === "customer" ? await getCustomerPaymentHistory() : [];

  if (me.role === "customer" && paymentId) {
    const initialPayment = await getPaymentById(paymentId, stripeSessionId);
    return (
      <div className="min-h-screen bg-background">
        <div className="container space-y-6 py-10 sm:py-14">
          <PaymentReturnStatus
            paymentId={paymentId}
            initialPayment={initialPayment}
            stripeSessionId={stripeSessionId}
          />

          {history.length > 0 && (
            <Card className="mx-auto max-w-4xl">
              <CardHeader>
                <CardTitle>Recent Payment History</CardTitle>
                <CardDescription>
                  Your recent payment records linked to bookings.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {history.slice(0, 6).map((item) => (
                  <div
                    key={item.booking.id}
                    className="rounded-lg border border-border p-3"
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">
                          {item.booking.service_name || "Service"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTimeInTimeZone(
                            item.booking.start_time_utc,
                            displayTimeZone,
                          )}
                        </p>
                      </div>
                      <Link
                        href={`/booking-confirmed/${item.booking.id}`}
                        className="text-xs text-primary hover:underline"
                      >
                        View booking
                      </Link>
                    </div>
                    <div className="space-y-1">
                      {item.payments.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between rounded-md bg-muted/40 px-2 py-1.5 text-xs"
                        >
                          <span className="font-mono">
                            {p.id.slice(0, 8)}...
                          </span>
                          <span>{usd.format(Number(p.amount || 0))}</span>
                          <Badge variant={statusVariant(p.status)}>
                            {p.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  if (me.role === "customer") {
    return (
      <div className="min-h-screen bg-background">
        <div className="container space-y-6 py-12">
          <div className="mx-auto max-w-4xl">
            <Card>
              <CardHeader>
                <CardTitle>Payments</CardTitle>
                <CardDescription>
                  Start payment from your booking details page, and track all
                  transaction attempts here.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/bookings"
                    className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
                  >
                    Go to My Bookings
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>
                  Latest transactions from your bookings.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No payment records found yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {history.map((item) => (
                      <div
                        key={item.booking.id}
                        className="rounded-lg border border-border p-3"
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold">
                              {item.booking.service_name || "Service"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDateTimeInTimeZone(
                                item.booking.start_time_utc,
                                displayTimeZone,
                              )}
                            </p>
                          </div>
                          <Link
                            href={`/payment/${item.booking.id}`}
                            className="text-xs text-primary hover:underline"
                          >
                            Pay again
                          </Link>
                        </div>

                        <div className="space-y-1">
                          {item.payments.map((p) => (
                            <div
                              key={p.id}
                              className="flex items-center justify-between rounded-md bg-muted/40 px-2 py-1.5 text-xs"
                            >
                              <span className="font-mono">
                                {p.id.slice(0, 8)}...
                              </span>
                              <span>{usd.format(Number(p.amount || 0))}</span>
                              <Badge variant={statusVariant(p.status)}>
                                {p.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (me.role === "staff") redirect("/staff/dashboard");
  if (me.role === "admin" || me.role === "superadmin")
    redirect("/admin/dashboard");

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight">Payments</h2>
        <p className="text-muted-foreground">Review your payment history.</p>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="size-5 text-muted-foreground" />
            <CardTitle>Payment History</CardTitle>
          </div>
          <CardDescription>
            Payments will appear here after completed bookings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Connect to `/api/payments` and render your transaction list here.
          </p>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
