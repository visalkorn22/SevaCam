import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import {
  CheckCircle2,
  Calendar,
  Clock,
  User,
  ArrowRight,
  CalendarDays,
} from "lucide-react";
import { addMinutes, format } from "date-fns";

type BookingConfirmedRow = {
  id: string;
  start_time_utc: string;
  services: {
    name: string;
    price: number;
    duration_minutes: number;
  } | null;
  staff: {
    full_name?: string | null;
    phone?: string | null;
  } | null;
};

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

async function getBookingConfirmed(
  bookingId: string,
): Promise<BookingConfirmedRow | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const cookie = (await headers()).get("cookie") ?? "";

  // Backend endpoint you should create:
  // GET /api/bookings/:bookingId/confirmed
  // Returns booking + service + staff (public-safe fields)
  try {
    const res = await fetch(`${apiUrl}/api/bookings/${bookingId}/confirmed`, {
      method: "GET",
      headers: { Cookie: cookie },
      cache: "no-store",
    });

    if (!res.ok) return null;
    return (await res.json()) as BookingConfirmedRow;
  } catch {
    return null;
  }
}

export default async function BookingConfirmedPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;

  const me = await getMe();
  if (!me) redirect("/auth/login");

  const booking = await getBookingConfirmed(bookingId);
  if (!booking || !booking.services) notFound();

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
          {/* Success hero */}
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

          {/* Booking card */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            {/* Header strip */}
            <div className="bg-emerald-500/10 px-6 py-4 border-b border-border">
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                Booking Confirmed
              </p>
              <p className="mt-0.5 text-xl font-bold text-foreground">
                {booking.services.name}
              </p>
            </div>

            <div className="divide-y divide-border">
              {/* Staff */}
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

              {/* Date */}
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

              {/* Time */}
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

              {/* Price */}
              <div className="flex items-center justify-between px-6 py-4">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-lg font-bold text-foreground">
                  {formatPrice(booking.services.price)}
                </p>
              </div>
            </div>
          </div>

          {/* What's next */}
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

          {/* CTAs */}
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
