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
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Soft success glow behind the card */}
      <div className="absolute inset-x-0 top-0 h-96 bg-emerald-500/5 blur-[100px] pointer-events-none" />

      <div className="container relative py-16 sm:py-24">
        <div className="mx-auto max-w-lg">
          <div className="mb-10 text-center motion-preset-slide-up-sm motion-duration-500">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl text-foreground">
              You&apos;re all set
            </h1>
            <p className="mt-3 text-base text-muted-foreground">
              Your appointment is confirmed and secured.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_8px_32px_rgba(0,0,0,0.04)] motion-preset-slide-up-sm motion-delay-100 duration-500">
            <div className="border-b border-border/40 bg-muted/20 px-6 py-5">
              <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                Booking Confirmed
              </p>
              <p className="mt-1 text-lg font-medium text-foreground">
                {booking.services.name}
              </p>
            </div>

            <div className="divide-y divide-border/40">
              <div className="flex items-center gap-4 px-6 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted/50 border border-border/40">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Provider
                  </p>
                  <p className="text-sm font-medium mt-0.5">{staffName}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 px-6 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted/50 border border-border/40">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Date
                  </p>
                  <p className="text-sm font-medium mt-0.5">
                    {format(startDate, "EEEE, MMMM d, yyyy")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 px-6 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted/50 border border-border/40">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Time
                  </p>
                  <p className="text-sm font-medium mt-0.5">
                    {format(startDate, "h:mm a")} &rarr;{" "}
                    {format(endDate, "h:mm a")}
                    <span className="ml-2 font-normal text-muted-foreground">
                      ({booking.services.duration_minutes} min)
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between px-6 py-5 bg-muted/10">
                <p className="text-sm font-medium text-muted-foreground">
                  Total
                </p>
                <p className="text-lg font-semibold text-foreground">
                  {formatPrice(booking.services.price)}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-border/60 bg-muted/30 p-5 motion-preset-slide-up-sm motion-delay-200 duration-500">
            <p className="mb-3 text-sm font-medium">What&apos;s next?</p>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li className="flex items-start gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                You&apos;ll receive a confirmation email shortly.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                We&apos;ll send a reminder before your appointment.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                Manage your booking anytime from your dashboard.
              </li>
            </ul>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row motion-preset-slide-up-sm motion-delay-300 duration-500">
            <Link
              href="/bookings"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border/60 bg-background px-4 py-3.5 text-sm font-medium transition-colors hover:bg-muted/50 hover:border-border"
            >
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              My Bookings
            </Link>
            <Link
              href="/services"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 shadow-sm"
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

  // Returning from a payment provider (Stripe redirect or ABA sandbox confirm).
  // Always render PaymentReturnStatus so the success modal can fire — even when
  // the payment is already completed server-side (e.g. Stripe webhook fires before
  // the user is redirected back). ConfirmedView is only shown at the clean URL
  // (no payment_id param), which the modal CTA navigates to.
  if (paymentId) {
    const payment = await getPayment(paymentId, stripeSessionId);

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
