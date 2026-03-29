import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  User,
} from "lucide-react";
import { addMinutes, format } from "date-fns";
import { PaymentForm } from "@/components/payment/payment-form";
import { PaymentReturnStatus } from "@/components/payment/payment-return-status";

type MeUser = {
  id: string;
  email: string;
  role: "customer" | "staff" | "admin" | "superadmin";
};

type BookingRow = {
  id: string;
  status: string;
  payment_status?: string | null;
  start_time_utc: string;
  services: {
    name: string;
    price: number;
    deposit_amount: number;
    duration_minutes: number;
  };
  staff: { full_name?: string | null } | null;
};

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

async function getMe(): Promise<MeUser | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const cookie = (await headers()).get("cookie") ?? "";
  const res = await fetch(`${apiUrl}/api/auth/me`, {
    method: "GET",
    headers: { Cookie: cookie },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json() as Promise<MeUser>;
}

async function getBooking(bookingId: string): Promise<BookingRow | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const cookie = (await headers()).get("cookie") ?? "";
  try {
    const res = await fetch(`${apiUrl}/api/bookings/${bookingId}/payment`, {
      method: "GET",
      headers: { Cookie: cookie },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json() as Promise<BookingRow>;
  } catch {
    return null;
  }
}

async function getPayment(
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
    return res.json() as Promise<PaymentRecord>;
  } catch {
    return null;
  }
}

function ConfirmedView({ booking }: { booking: BookingRow }) {
  const staffName = booking.staff?.full_name || "Staff Member";
  const startDate = new Date(booking.start_time_utc);
  const endDate = addMinutes(startDate, booking.services.duration_minutes);
  const formatPrice = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <div className="min-h-screen bg-linear-to-b from-emerald-950/30 via-background to-background">
      <div className="container py-16 sm:py-24">
        <div className="mx-auto max-w-lg">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 ring-2 ring-emerald-500/30">
              <CheckCircle2 className="h-10 w-10 text-emerald-400" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              You&apos;re all set!
            </h1>
            <p className="mt-2 text-base text-muted-foreground">
              Your appointment has been confirmed. See you soon.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="border-b border-border bg-emerald-500/10 px-6 py-4">
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                Booking Confirmed
              </p>
              <p className="mt-0.5 text-xl font-bold text-foreground">
                {booking.services.name}
              </p>
            </div>

            <div className="divide-y divide-border">
              <div className="flex items-center gap-4 px-6 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Provider
                  </p>
                  <p className="font-semibold">{staffName}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 px-6 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Date
                  </p>
                  <p className="font-semibold">
                    {format(startDate, "EEEE, MMMM d, yyyy")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 px-6 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Time
                  </p>
                  <p className="font-semibold">
                    {format(startDate, "h:mm a")} &rarr;{" "}
                    {format(endDate, "h:mm a")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {booking.services.duration_minutes} min session
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between px-6 py-4">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-lg font-bold text-foreground">
                  {formatPrice(booking.services.price)}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-muted/30 p-5">
            <p className="mb-3 text-sm font-semibold">What&apos;s next?</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                You&apos;ll receive a confirmation email shortly.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                We&apos;ll send a reminder before your appointment.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                Manage your booking anytime from your dashboard.
              </li>
            </ul>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/bookings"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold transition hover:bg-muted"
            >
              <CalendarDays className="h-4 w-4" />
              My Bookings
            </Link>
            <Link
              href="/services"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition hover:bg-primary/90"
            >
              Book Another
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function PaymentPage({
  params,
  searchParams,
}: {
  params: Promise<{ bookingId: string }>;
  searchParams: Promise<{
    payment_id?: string;
    stripe_session_id?: string;
  }>;
}) {
  const { bookingId } = await params;
  const { payment_id: paymentId, stripe_session_id: stripeSessionId } =
    await searchParams;

  const me = await getMe();
  if (!me) redirect("/auth/login");

  // Returning from a payment provider (Stripe redirect or ABA sandbox confirm)
  if (paymentId) {
    const payment = await getPayment(paymentId, stripeSessionId);

    // Payment already completed server-side — skip polling, show confirmation
    if (payment?.status === "completed") {
      const booking = await getBooking(bookingId);
      if (!booking?.services) notFound();
      return <ConfirmedView booking={booking} />;
    }

    // Payment pending or failed — show live status poller
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-12">
          <div className="mx-auto max-w-2xl">
            <PaymentReturnStatus
              paymentId={paymentId}
              initialPayment={payment}
              stripeSessionId={stripeSessionId ?? null}
              autoRefresh
            />
          </div>
        </div>
      </div>
    );
  }

  // No payment_id — load booking to determine state
  const booking = await getBooking(bookingId);
  if (!booking?.services) notFound();

  // Already paid (direct URL visit or back-navigation after completion)
  if ((booking.payment_status ?? "").toLowerCase() === "paid") {
    return <ConfirmedView booking={booking} />;
  }

  // Needs payment — show payment form
  return (
    <div className="min-h-screen bg-background">
      <div className="container motion-page py-12">
        <div className="mx-auto max-w-2xl">
          <PaymentForm booking={booking} />
        </div>
      </div>
    </div>
  );
}
