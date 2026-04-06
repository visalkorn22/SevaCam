import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { format } from "date-fns";
import Link from "next/link";

import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  DollarSign,
  XCircle,
} from "lucide-react";

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

function statusChip(status: string) {
  if (status === "completed")
    return "border-[rgba(122,213,221,0.3)] bg-[rgba(122,213,221,0.1)] text-(--seva-accent)";
  if (status === "failed")
    return "border-[rgba(249,168,196,0.3)] bg-[rgba(249,168,196,0.1)] text-(--seva-rose)";
  if (status === "pending")
    return "border-[rgba(255,183,133,0.3)] bg-[rgba(255,183,133,0.1)] text-(--seva-warm)";
  return "border-(--border-subtle) bg-(--bg-inset) text-(--text-secondary)";
}

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export default async function AdminPaymentsPage() {
  const me = await getMe();
  if (!me) redirect("/auth/login");
  if (me.role !== "admin" && me.role !== "superadmin") redirect("/dashboard");

  const payments = await getPayments();

  const total = payments.length;
  const completed = payments.filter((p) => p.status === "completed").length;
  const failed = payments.filter((p) => p.status === "failed").length;
  const pending = payments.filter((p) => p.status === "pending").length;
  const revenue = payments
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6 text-(--seva-text)">

        {/* ── Hero strip ── */}
        <section className="relative overflow-hidden rounded-[1.1rem] border border-white/6 bg-(--seva-surface) px-8 py-8 lg:px-10 lg:py-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(122,213,221,0.08),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(255,183,133,0.05),transparent_30%)]" />
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-(--seva-warm)">
                Admin / Payments
              </p>
              <h1 className="sevacam-display mt-3 text-[clamp(2rem,4.5vw,3.4rem)] leading-[0.92] text-(--seva-text)">
                Payments &amp; Transactions
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-(--seva-text-soft)">
                View all payment transactions, statuses, and revenue movement
                across the platform.
              </p>
            </div>
            <Link
              href="/admin/dashboard"
              className="sevacam-secondary-button inline-flex h-11 shrink-0 items-center rounded-[0.18rem] px-5 text-[0.62rem] font-semibold uppercase tracking-[0.18em]"
            >
              <ArrowLeft className="mr-2 size-3.5" />
              Back to Dashboard
            </Link>
          </div>
        </section>

        {/* ── Stat tiles ── */}
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {/* Total transactions — teal */}
          <div className="relative overflow-hidden rounded-[0.9rem] border border-[rgba(122,213,221,0.2)] bg-[rgba(122,213,221,0.07)] p-5">
            <div className="absolute inset-x-0 top-0 h-[2.5px] bg-(--seva-accent)" />
            <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-[rgba(122,213,221,0.08)] blur-xl" />
            <p className="text-[0.56rem] font-semibold uppercase tracking-[0.18em] text-(--seva-accent)">
              Total Transactions
            </p>
            <div className="mt-4 flex items-center gap-2">
              <CreditCard className="size-4 text-(--seva-accent)" />
              <span className="text-[1.9rem] font-medium leading-none tracking-[-0.05em] text-(--text-primary)">
                {total}
              </span>
            </div>
          </div>

          {/* Revenue — warm */}
          <div className="relative overflow-hidden rounded-[0.9rem] border border-[rgba(255,183,133,0.2)] bg-[rgba(255,183,133,0.07)] p-5">
            <div className="absolute inset-x-0 top-0 h-[2.5px] bg-(--seva-warm)" />
            <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-[rgba(255,183,133,0.08)] blur-xl" />
            <p className="text-[0.56rem] font-semibold uppercase tracking-[0.18em] text-(--seva-warm)">
              Revenue Collected
            </p>
            <div className="mt-4 flex items-center gap-2">
              <DollarSign className="size-4 text-(--seva-warm)" />
              <span className="text-[1.9rem] font-medium leading-none tracking-[-0.05em] text-(--text-primary)">
                {currencyFormatter.format(revenue)}
              </span>
            </div>
          </div>

          {/* Completed — violet */}
          <div className="relative overflow-hidden rounded-[0.9rem] border border-[rgba(196,176,253,0.2)] bg-[rgba(196,176,253,0.07)] p-5">
            <div className="absolute inset-x-0 top-0 h-[2.5px] bg-(--seva-violet)" />
            <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-[rgba(196,176,253,0.08)] blur-xl" />
            <p className="text-[0.56rem] font-semibold uppercase tracking-[0.18em] text-(--seva-violet)">
              Completed
            </p>
            <div className="mt-4 flex items-center gap-2">
              <CheckCircle2 className="size-4 text-(--seva-violet)" />
              <span className="text-[1.9rem] font-medium leading-none tracking-[-0.05em] text-(--seva-violet)">
                {completed}
              </span>
            </div>
          </div>

          {/* Failed / Pending — rose */}
          <div className="relative overflow-hidden rounded-[0.9rem] border border-[rgba(249,168,196,0.2)] bg-[rgba(249,168,196,0.07)] p-5">
            <div className="absolute inset-x-0 top-0 h-[2.5px] bg-(--seva-rose)" />
            <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-[rgba(249,168,196,0.08)] blur-xl" />
            <p className="text-[0.56rem] font-semibold uppercase tracking-[0.18em] text-(--seva-rose)">
              Failed / Pending
            </p>
            <div className="mt-4 flex items-center gap-2">
              <XCircle className="size-4 text-(--seva-rose)" />
              <span className="text-[1.9rem] font-medium leading-none tracking-[-0.05em] text-(--seva-rose)">
                {failed + pending}
              </span>
            </div>
          </div>
        </section>

        {/* ── Transactions table / empty state ── */}
        {payments.length > 0 ? (
          <div className="sevacam-rail overflow-hidden">
            {/* Section header */}
            <div className="border-b border-white/5 px-5 py-4">
              <p className="sevacam-eyebrow">Recent Transactions</p>
              <p className="mt-1 text-[0.76rem] text-(--text-disabled)">
                Latest {total} payment records across all booking channels.
              </p>
            </div>

            {/* Column labels */}
            <div className="hidden grid-cols-[1.5fr_1.5fr_1.8fr_0.9fr_1fr_1fr] gap-4 border-b border-white/5 px-5 py-2.5 text-[0.54rem] font-semibold uppercase tracking-[0.14em] text-(--text-disabled) md:grid">
              <span>Date</span>
              <span>Customer</span>
              <span>Service</span>
              <span>Amount</span>
              <span>Status</span>
              <span>Method</span>
            </div>

            {/* Rows */}
            <div className="divide-y divide-white/5">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="grid gap-x-4 gap-y-1.5 px-5 py-3.5 transition-colors hover:bg-(--seva-elevated) md:grid-cols-[1.5fr_1.5fr_1.8fr_0.9fr_1fr_1fr] md:items-center"
                >
                  {/* Date */}
                  <span className="text-[0.78rem] text-(--text-secondary)">
                    {format(new Date(payment.created_at), "MMM d, yyyy")}
                  </span>

                  {/* Customer */}
                  <span className="truncate text-[0.82rem] font-medium text-(--text-primary)">
                    {payment.booking?.customer?.full_name || "—"}
                  </span>

                  {/* Service */}
                  <span className="truncate text-[0.82rem] text-(--text-secondary)">
                    {payment.booking?.service?.name || "—"}
                  </span>

                  {/* Amount */}
                  <span className="text-[0.86rem] font-semibold text-(--accent-primary)">
                    {currencyFormatter.format(Number(payment.amount || 0))}
                  </span>

                  {/* Status chip */}
                  <span>
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[0.56rem] font-semibold uppercase tracking-[0.14em] ${statusChip(payment.status)}`}
                    >
                      {payment.status}
                    </span>
                  </span>

                  {/* Method */}
                  <span className="capitalize text-[0.78rem] text-(--text-secondary)">
                    {payment.payment_method || "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="sevacam-rail flex flex-col items-center justify-center py-20 text-center">
            <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(122,213,221,0.08)] ring-1 ring-[rgba(122,213,221,0.14)]">
              <CreditCard className="size-7 text-(--accent-primary)" />
            </span>
            <p className="text-[1rem] font-semibold text-(--text-primary)">
              No payments yet
            </p>
            <p className="mt-2 max-w-xs text-sm leading-6 text-(--text-secondary)">
              Payments will appear here once bookings are made and processed.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
