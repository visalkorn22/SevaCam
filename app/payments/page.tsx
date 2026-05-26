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

const SECTION_LABEL_CLASS = "sevacam-booking-label text-(--text-secondary)";
const PRIMARY_ACTION_CLASS =
  "sevacam-booking-primary-action inline-flex items-center justify-center gap-2 px-4 py-3 text-[11px] font-medium uppercase tracking-[0.18em]";
const SECONDARY_ACTION_CLASS =
  "sevacam-booking-secondary-action inline-flex items-center justify-center gap-2 px-4 py-3 text-[11px] font-medium uppercase tracking-[0.18em]";

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

function customerPaymentTone(
  status: string,
): "available" | "unavailable" | "selected" | "today" {
  const normalized = status.toLowerCase();
  if (normalized === "completed" || normalized === "paid") return "available";
  if (normalized === "failed") return "unavailable";
  if (normalized === "refunded") return "selected";
  return "today";
}

function formatStatusLabel(status: string) {
  return status.replace(/_/g, " ");
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
      <div className="sevacam-home min-h-screen bg-(--bg-base) text-(--text-primary)">
        <div className="mx-auto max-w-[72rem] space-y-7 px-6 py-10 sm:px-8 sm:py-14 lg:px-10">
          <PaymentReturnStatus
            paymentId={paymentId}
            initialPayment={initialPayment}
            stripeSessionId={stripeSessionId}
          />

          {history.length > 0 && (
            <section className="sevacam-booking-rail mx-auto max-w-4xl p-6">
              <p className={SECTION_LABEL_CLASS}>Recent Payments</p>
              <h2 className="mt-4 text-2xl font-medium text-(--text-primary)">
                Recent Payment History
              </h2>
              <p className="mt-3 text-sm leading-6 text-(--text-secondary)">
                  Your recent payment records linked to bookings.
              </p>
              <div className="mt-6 space-y-4">
                {history.slice(0, 6).map((item) => (
                  <div
                    key={item.booking.id}
                    className="sevacam-booking-card p-4"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className={SECTION_LABEL_CLASS}>Booking</p>
                        <p className="mt-1 text-sm font-medium text-(--text-primary)">
                          {item.booking.service_name || "Service"}
                        </p>
                        <p className="mt-2 text-xs text-(--text-secondary)">
                          {formatDateTimeInTimeZone(
                            item.booking.start_time_utc,
                            displayTimeZone,
                          )}
                        </p>
                      </div>
                      <Link
                        href={`/booking-confirmed/${item.booking.id}`}
                        className={`${SECONDARY_ACTION_CLASS} min-h-10 px-4`}
                      >
                        View booking
                      </Link>
                    </div>
                    <div className="mt-4 space-y-2">
                      {item.payments.map((p) => (
                        <div
                          key={p.id}
                          className="rounded-xl bg-(--bg-elevated) px-3 py-3 text-xs"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <span className="font-mono text-(--text-secondary)">
                              {p.id.slice(0, 8)}...
                            </span>
                            <span className="font-medium text-(--text-primary)">
                              {usd.format(Number(p.amount || 0))}
                            </span>
                            <span
                              data-tone={customerPaymentTone(p.status)}
                              className="sevacam-booking-pill"
                            >
                              {formatStatusLabel(p.status)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    );
  }

  if (me.role === "customer") {
    return (
      <div className="sevacam-home min-h-screen bg-(--bg-base) text-(--text-primary)">
        <div className="mx-auto max-w-[72rem] space-y-7 px-6 py-10 sm:px-8 sm:py-12 lg:px-10">
          <section className="mx-auto max-w-4xl border-b border-(--booking-frame) pb-6">
            <p className={SECTION_LABEL_CLASS}>Payments</p>
            <h1 className="sevacam-display mt-4 text-[clamp(2.4rem,6vw,4rem)] leading-[0.95] tracking-[-0.04em] text-(--text-primary)">
              Review every payment touchpoint.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-(--text-secondary)">
              Start payment from your booking details page, then track all
              attempts and confirmations here without leaving the customer flow.
            </p>
            <div className="mt-6">
              <Link
                href="/bookings"
                className={`${SECONDARY_ACTION_CLASS} min-h-12 px-4`}
              >
                Go to My Bookings
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          </section>

          <section className="sevacam-booking-rail mx-auto max-w-4xl p-6">
            <p className={SECTION_LABEL_CLASS}>Payment History</p>
            <h2 className="mt-4 text-2xl font-medium text-(--text-primary)">
              Latest transactions
            </h2>
            <p className="mt-3 text-sm leading-6 text-(--text-secondary)">
              Latest transactions captured from your bookings.
            </p>
            {history.length === 0 ? (
              <div className="sevacam-booking-card mt-6 p-4">
                <p className="text-sm text-(--text-secondary)">
                  No payment records found yet.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {history.map((item) => (
                  <div
                    key={item.booking.id}
                    className="sevacam-booking-card p-4"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className={SECTION_LABEL_CLASS}>Booking</p>
                        <p className="mt-1 text-sm font-medium text-(--text-primary)">
                          {item.booking.service_name || "Service"}
                        </p>
                        <p className="mt-2 text-xs text-(--text-secondary)">
                          {formatDateTimeInTimeZone(
                            item.booking.start_time_utc,
                            displayTimeZone,
                          )}
                        </p>
                      </div>
                      <Link
                        href={`/payment/${item.booking.id}`}
                        className={`${SECONDARY_ACTION_CLASS} min-h-10 px-4`}
                      >
                        Pay again
                      </Link>
                    </div>

                    <div className="mt-4 space-y-2">
                      {item.payments.map((p) => (
                        <div
                          key={p.id}
                          className="rounded-xl bg-(--bg-elevated) px-3 py-3 text-xs"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <span className="font-mono text-(--text-secondary)">
                              {p.id.slice(0, 8)}...
                            </span>
                            <span className="font-medium text-(--text-primary)">
                              {usd.format(Number(p.amount || 0))}
                            </span>
                            <span
                              data-tone={customerPaymentTone(p.status)}
                              className="sevacam-booking-pill"
                            >
                              {formatStatusLabel(p.status)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
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

      <Card className="">
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
