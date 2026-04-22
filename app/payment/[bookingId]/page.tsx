import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { addMinutes } from "date-fns";
import { MapPin } from "lucide-react";
import LocationMapView from "@/components/booking/LocationMapView";
import { PaymentForm } from "@/components/payment/payment-form";
import { PaymentReceiptActions } from "@/components/payment/payment-receipt-actions";
import { PaymentReturnStatus } from "@/components/payment/payment-return-status";
import TelegramShareButton from "@/components/payment/TelegramShareButton";
import {
  formatDateTimeInTimeZone,
  formatLongDateInTimeZone,
  formatTimeInTimeZone,
  parseDateValue,
} from "@/lib/timezone";

type MeUser = {
  id: string;
  email: string;
  timezone?: string | null;
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
  location?: {
    name: string;
    address: string;
    latitude: number | null;
    longitude: number | null;
  } | null;
};

const DEFAULT_CUSTOMER_TIMEZONE = "Asia/Phnom_Penh";

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

async function getBookingPayments(bookingId: string): Promise<PaymentRecord[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const cookie = (await headers()).get("cookie") ?? "";
  try {
    const res = await fetch(`${apiUrl}/api/payments/booking/${bookingId}`, {
      method: "GET",
      headers: { Cookie: cookie },
      cache: "no-store",
    });
    if (!res.ok) return [];
    return (await res.json()) as PaymentRecord[];
  } catch {
    return [];
  }
}

function formatMoney(amount: number | string, currency = "USD") {
  const value = Number(amount);
  if (!Number.isFinite(value)) return String(amount);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatProviderLabel(provider?: string | null) {
  const normalized = (provider || "").trim().toLowerCase();
  if (!normalized) return "Recorded payment";
  if (normalized === "aba_payway") return "ABA PayWay";
  if (normalized === "bakong_khqr") return "Bakong KHQR";
  if (normalized === "stripe") return "Stripe";
  return normalized
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function ConfirmedView({
  booking,
  payment,
  customerEmail,
  timeZone,
}: {
  booking: BookingRow;
  payment: PaymentRecord | null;
  customerEmail: string;
  timeZone?: string | null;
}) {
  const staffName = booking.staff?.full_name || "Staff Member";
  const startDate =
    parseDateValue(booking.start_time_utc) ?? new Date(booking.start_time_utc);
  const endDate = addMinutes(startDate, booking.services.duration_minutes);
  const issuedDate = payment?.created_at
    ? parseDateValue(payment.created_at) ?? new Date(payment.created_at)
    : new Date();
  const currency = payment?.currency ?? "USD";
  const totalPrice = Number(booking.services.price);
  const parsedPaid = Number(payment?.amount);
  const amountPaid = Number.isFinite(parsedPaid) ? parsedPaid : totalPrice;
  const balanceRemaining = Math.max(totalPrice - amountPaid, 0);
  const providerLabel = formatProviderLabel(payment?.provider);
  const paymentStatus =
    payment?.status?.replace(/_/g, " ") ??
    booking.payment_status?.replace(/_/g, " ") ??
    "paid";
  const receiptId = `RCPT-${(payment?.id ?? booking.id).slice(0, 8).toUpperCase()}`;
  const bookingReference = `BKG-${booking.id.slice(0, 8).toUpperCase()}`;
  const paymentReference =
    payment?.provider_reference || payment?.id || "Captured securely";
  const receiptRows = [
    {
      label: "Service",
      value: booking.services.name,
      amount: formatMoney(totalPrice, "USD"),
    },
    {
      label: "Provider",
      value: staffName,
      amount: "",
    },
    {
      label: "Schedule",
      value: `${formatLongDateInTimeZone(startDate, timeZone)} ${formatTimeInTimeZone(startDate, timeZone)}`,
      amount: "",
    },
    {
      label: "Duration",
      value: `${booking.services.duration_minutes} min`,
      amount: "",
    },
    {
      label: "Payment",
      value: providerLabel,
      amount: formatMoney(amountPaid, currency),
    },
  ];

  return (
    <div className="sevacam-home relative min-h-screen overflow-hidden bg-(--bg-base) text-(--text-primary) print:bg-white print:text-black">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-(--accent-primary)/8 blur-[120px] print:hidden" />

      <div className="relative flex w-full justify-center px-4 py-12 sm:px-6 sm:py-16 print:px-0 print:py-0">
        <div className="w-full max-w-3xl">
          <div className="mb-10 text-center motion-preset-slide-up-sm motion-duration-500 print:hidden">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-(--accent-primary)">
              Payment Receipt
            </p>
            <h1 className="sevacam-display mt-4 text-[clamp(2.8rem,7vw,5rem)] leading-[0.92] tracking-[-0.05em] text-(--text-primary)">
              Reservation secured
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-(--text-secondary)">
              A clean printable receipt with the booking details your customer
              actually needs to keep.
            </p>
          </div>

          <div className="mx-auto max-w-md motion-preset-slide-up-sm motion-delay-100 duration-500 print:max-w-[28rem]">
            <div className="relative px-5 sm:px-0">
              <div
                className="absolute inset-x-7 -top-3 h-4 print:hidden sm:inset-x-2"
                style={{
                  backgroundImage:
                    "linear-gradient(-45deg, transparent 8px, #f4efe7 0), linear-gradient(45deg, transparent 8px, #f4efe7 0)",
                  backgroundPosition: "0 0, 8px 0",
                  backgroundSize: "16px 16px",
                  backgroundRepeat: "repeat-x",
                }}
              />

              <article className="relative bg-[#f4efe7] px-7 pb-8 pt-9 text-[#1c2740] shadow-[0_32px_90px_rgba(0,0,0,0.42)] print:shadow-none sm:px-9">
                <div className="text-center font-mono">
                  <p className="text-[0.72rem] font-bold uppercase tracking-[0.45em] text-[#1f3453]">
                    SevaCam
                  </p>
                  <h2 className="mt-4 text-[2.15rem] font-black uppercase tracking-[0.34em] text-[#1c2740] sm:text-[2.55rem]">
                    Receipt
                  </h2>
                  <p className="mx-auto mt-3 max-w-[18rem] text-[0.76rem] leading-5 text-[#2b3d5f]/78">
                    Premium booking confirmation and payment record.
                  </p>
                  <p className="mt-4 text-[0.82rem] font-semibold text-[#1f3453]">
                    Ref: {receiptId}
                  </p>
                </div>

                <div className="my-6 border-t border-dashed border-[#2b3d5f]/35" />

                <div className="space-y-1.5 font-mono text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-[#223552]">
                  <div className="flex items-start justify-between gap-4">
                    <span>Date</span>
                    <span className="text-right normal-case tracking-[0.08em]">
                      {formatDateTimeInTimeZone(issuedDate, timeZone)}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <span>Status</span>
                    <span className="text-right capitalize tracking-[0.08em]">
                      {paymentStatus}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <span>Booking</span>
                    <span className="text-right tracking-[0.08em]">
                      {bookingReference}
                    </span>
                  </div>
                </div>

                <div className="my-6 border-t border-dashed border-[#2b3d5f]/35" />

                <div className="space-y-1 font-mono text-[0.74rem] leading-5 text-[#2c3f61]">
                  <p className="break-all">Customer: {customerEmail}</p>
                  <p>Provider: {staffName}</p>
                  <p>When: {formatLongDateInTimeZone(startDate, timeZone)}</p>
                  <p>
                    Time: {formatTimeInTimeZone(startDate, timeZone)} -{" "}
                    {formatTimeInTimeZone(endDate, timeZone)}
                  </p>
                  <p>Time zone: {timeZone || DEFAULT_CUSTOMER_TIMEZONE}</p>
                  <p className="break-all">Payment ref: {paymentReference}</p>
                </div>

                <div className="my-6 border-t border-dashed border-[#2b3d5f]/35" />

                <div className="space-y-3 font-mono text-[0.78rem] text-[#1d2c47]">
                  {receiptRows.map((row) => (
                    <div
                      key={row.label}
                      className="grid grid-cols-[minmax(0,1fr)_5.5rem] gap-4"
                    >
                      <div className="min-w-0">
                        <p className="font-bold uppercase tracking-[0.12em]">
                          {row.label}
                        </p>
                        <p className="mt-0.5 break-words leading-5 text-[#2c3f61]">
                          {row.value}
                        </p>
                      </div>
                      <p className="text-right font-bold tracking-[0.06em]">
                        {row.amount || "--"}
                      </p>
                    </div>
                  ))}
                  {balanceRemaining > 0 && (
                    <div className="grid grid-cols-[minmax(0,1fr)_5.5rem] gap-4">
                      <div>
                        <p className="font-bold uppercase tracking-[0.12em]">
                          Remaining
                        </p>
                        <p className="mt-0.5 leading-5 text-[#2c3f61]">
                          Outstanding after this payment
                        </p>
                      </div>
                      <p className="text-right font-bold tracking-[0.06em]">
                        {formatMoney(balanceRemaining, "USD")}
                      </p>
                    </div>
                  )}
                </div>

                <div className="my-6 border-t border-dashed border-[#2b3d5f]/35" />

                <div className="flex items-end justify-between gap-4 font-mono">
                  <div>
                    <p className="text-[0.82rem] font-bold uppercase tracking-[0.14em] text-[#2b3d5f]/72">
                      Total Paid
                    </p>
                    <p className="mt-2 text-[2.2rem] font-black tracking-[0.04em] text-[#1c2740]">
                      {formatMoney(amountPaid, currency)}
                    </p>
                  </div>
                  <p className="pb-2 text-[0.78rem] font-bold uppercase tracking-[0.16em] text-[#2b3d5f]/72">
                    {providerLabel}
                  </p>
                </div>

                <div className="mt-6 flex items-center justify-center gap-3 font-mono text-[0.7rem] font-bold uppercase tracking-[0.22em] text-[#2b3d5f]/75">
                  <span>Paid</span>
                  <span className="h-1 w-1 rounded-full bg-[#2b3d5f]/45" />
                  <span>{booking.services.duration_minutes} min</span>
                  <span className="h-1 w-1 rounded-full bg-[#2b3d5f]/45" />
                  <span>{booking.id.slice(0, 6).toUpperCase()}</span>
                </div>

                <div className="mt-7">
                  <div
                    className="h-20 w-full"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(90deg, #192744 0 3px, transparent 3px 5px, #192744 5px 8px, transparent 8px 10px, #192744 10px 13px, transparent 13px 15px)",
                    }}
                  />
                </div>
              </article>

              <div
                className="absolute inset-x-7 -bottom-3 h-4 rotate-180 print:hidden sm:inset-x-2"
                style={{
                  backgroundImage:
                    "linear-gradient(-45deg, transparent 8px, #f4efe7 0), linear-gradient(45deg, transparent 8px, #f4efe7 0)",
                  backgroundPosition: "0 0, 8px 0",
                  backgroundSize: "16px 16px",
                  backgroundRepeat: "repeat-x",
                }}
              />
            </div>
          </div>

          <div className="mx-auto mt-10 max-w-md motion-preset-slide-up-sm motion-delay-200 duration-500 print:hidden">
            <PaymentReceiptActions />
            {booking.location?.latitude != null && booking.location?.longitude != null && (
              <div className="mt-6">
                <LocationMapView
                  location={{
                    name: booking.location.name,
                    address: booking.location.address,
                    latitude: booking.location.latitude,
                    longitude: booking.location.longitude,
                  }}
                />
              </div>
            )}
            {booking.location?.latitude != null && booking.location?.longitude != null && (
              <div className="mt-4">
                <TelegramShareButton bookingId={booking.id} />
              </div>
            )}
          </div>
          {booking.location && (booking.location.name || booking.location.address) && (
            <div className="mx-auto mt-6 max-w-md">
              <div className="rounded-[0.7rem] border border-(--border-subtle) bg-(--bg-elevated) p-4">
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-(--accent-primary)" />
                  <div>
                    <p className="text-sm font-semibold text-(--text-primary)">
                      {booking.location.name || booking.location.address}
                    </p>
                    {booking.location.name && booking.location.address && (
                      <p className="mt-1 text-xs text-(--text-disabled)">
                        {booking.location.address}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
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
  const displayTimeZone =
    me.timezone && me.timezone !== "UTC"
      ? me.timezone
      : DEFAULT_CUSTOMER_TIMEZONE;

  // Returning from a payment provider (Stripe redirect or ABA sandbox confirm).
  // Always render PaymentReturnStatus so the success modal can fire - even when
  // the payment is already completed server-side (e.g. Stripe webhook fires before
  // the user is redirected back). ConfirmedView is only shown at the clean URL
  // (no payment_id param), which the modal CTA navigates to.
  if (paymentId) {
    const payment = await getPayment(paymentId, stripeSessionId);

    if ((payment?.status ?? "").toLowerCase() === "completed") {
      return (
        <PaymentReturnStatus
          paymentId={paymentId}
          initialPayment={payment}
          stripeSessionId={stripeSessionId ?? null}
          autoRefresh
        />
      );
    }

    return (
      <div className="sevacam-home min-h-screen bg-(--bg-base) text-(--text-primary)">
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

  // No payment_id - load booking to determine state
  const booking = await getBooking(bookingId);
  if (!booking?.services) notFound();

  // Already paid (direct URL visit or back-navigation after completion)
  if ((booking.payment_status ?? "").toLowerCase() === "paid") {
    const payments = await getBookingPayments(booking.id);
    return (
      <ConfirmedView
        booking={booking}
        payment={payments[0] ?? null}
        customerEmail={me.email}
        timeZone={displayTimeZone}
      />
    );
  }

  // Needs payment - show payment form
  return (
    <div className="sevacam-home min-h-screen bg-(--bg-base) text-(--text-primary)">
      <div className="container motion-page py-10 sm:py-12">
        <div className="mx-auto w-full">
          <PaymentForm booking={booking} timeZone={displayTimeZone} />
        </div>
      </div>
    </div>
  );
}
