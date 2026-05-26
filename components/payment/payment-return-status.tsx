"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePaymentPoller, type PaymentRecord } from "@/hooks/use-payment-poller";
import { PaymentSuccessModal } from "@/components/payment/payment-success-modal";

type PaymentStatus = "pending" | "completed" | "failed" | "refunded" | string;

interface PaymentReturnStatusProps {
  paymentId: string;
  initialPayment: PaymentRecord | null;
  stripeSessionId?: string | null;
  autoRefresh?: boolean;
  deferInitialFetch?: boolean;
}

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const SECTION_LABEL_CLASS = "sevacam-booking-label text-(--text-secondary)";
const PRIMARY_ACTION_CLASS =
  "sevacam-booking-primary-action inline-flex items-center justify-center gap-2 px-4 py-3 text-[11px] font-medium uppercase tracking-[0.18em] disabled:opacity-100";
const SECONDARY_ACTION_CLASS =
  "sevacam-booking-secondary-action inline-flex items-center justify-center gap-2 px-4 py-3 text-[11px] font-medium uppercase tracking-[0.18em] disabled:opacity-100";

export function PaymentReturnStatus({
  paymentId,
  initialPayment,
  stripeSessionId,
  autoRefresh = true,
  deferInitialFetch = false,
}: PaymentReturnStatusProps) {
  const router = useRouter();

  const { payment, isLoading, error, refetch } = usePaymentPoller(paymentId, {
    enabled: Boolean(paymentId),
    autoRefresh,
    initialPayment,
    deferInitialFetch,
    stripeSessionId,
  });

  const status: PaymentStatus = payment?.status || "pending";
  const isTerminal = ["completed", "failed", "refunded"].includes(status);
  const showSuccessExperience = status === "completed";

  const statusMeta = useMemo(() => {
    if (status === "completed") {
      return {
        title: "Payment successful",
        description:
          "Your payment has been confirmed. Your booking is now secured.",
        icon: CheckCircle2,
        iconClass: "text-(--accent-primary)",
        tone: "available",
      };
    }
    if (status === "failed") {
      return {
        title: "Payment failed",
        description:
          "The payment was not completed. You can try again from your booking.",
        icon: XCircle,
        iconClass: "text-(--state-warning)",
        tone: "unavailable",
      };
    }
    if (status === "refunded") {
      return {
        title: "Payment refunded",
        description: "This payment has been refunded.",
        icon: AlertTriangle,
        iconClass: "text-(--state-warning)",
        tone: "selected",
      };
    }
    return {
      title: "Waiting for confirmation",
      description: autoRefresh
        ? "We are checking the latest payment status with the selected provider."
        : "QR created. Complete payment first, then refresh status manually.",
      icon: Clock3,
      iconClass: "text-(--accent-primary)",
      tone: "today",
    };
  }, [autoRefresh, status]);

  const StatusIcon = statusMeta.icon;

  return (
    <>
      {!showSuccessExperience && (
        <div className="mx-auto max-w-lg space-y-6 motion-preset-slide-up-sm motion-duration-500">
          <div>
            <p className={SECTION_LABEL_CLASS}>Payment Status</p>
            <h1 className="mt-4 text-3xl font-medium tracking-tight text-(--text-primary)">
              Checking your payment
            </h1>
            <p className="mt-3 text-sm text-(--text-secondary)">
              Verifying the latest status with{" "}
              {payment?.provider?.replace("_", " ") || "the provider"}.
            </p>
          </div>

          <div className="sevacam-booking-rail overflow-hidden">
            <div className="border-b border-(--booking-frame) px-6 py-6">
              <div className="flex items-center gap-4">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-(--booking-frame) bg-(--bg-elevated)"
                >
                  <StatusIcon className={`h-6 w-6 ${statusMeta.iconClass}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-base font-medium text-(--text-primary)">
                      {statusMeta.title}
                    </p>
                    <span
                      data-tone={statusMeta.tone}
                      className="sevacam-booking-pill"
                    >
                      {status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="mt-2 max-w-75 text-sm text-(--text-secondary)">
                    {statusMeta.description}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-6">
              {isLoading && (
                <div className="mb-4 flex items-center gap-2 text-sm text-(--text-secondary)">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-(--accent-primary)" />
                  Syncing latest status...
                </div>
              )}

              {error && (
                <div className="mb-4 rounded-xl border border-(--booking-frame) bg-(--state-warning-subtle) px-4 py-3 text-sm text-(--text-secondary)">
                  {error}
                </div>
              )}

              {payment && (
                <div className="sevacam-booking-card space-y-3 p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-(--text-secondary)">Amount</span>
                    <span className="font-medium text-(--text-primary)">
                      {usd.format(Number(payment.amount || 0))}{" "}
                      {payment.currency}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-(--text-secondary)">Provider</span>
                    <span className="font-medium capitalize text-(--text-primary)">
                      {payment.provider.replace("_", " ")}
                    </span>
                  </div>
                </div>
              )}

              <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
                {!isTerminal && (
                  <Button
                    type="button"
                    onClick={() => refetch()}
                    className={`${SECONDARY_ACTION_CLASS} h-11 flex-1`}
                  >
                    <RefreshCw
                      className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                    />
                    Refresh Status
                  </Button>
                )}
                {payment?.booking_id && status === "completed" && (
                  <Link
                    href={`/payment/${payment.booking_id}`}
                    className={`${PRIMARY_ACTION_CLASS} h-11 flex-1`}
                  >
                      View Confirmation
                  </Link>
                )}
                {payment?.booking_id && status !== "completed" && (
                  <Link
                    href={`/payment/${payment.booking_id}`}
                    className={`${SECONDARY_ACTION_CLASS} h-11 flex-1`}
                  >
                    Try Payment Again
                  </Link>
                )}
              </div>

              <div className="mt-3 text-center">
                <Link
                  href="/bookings"
                  className="text-sm text-(--text-secondary) transition-colors hover:text-(--text-primary)"
                >
                  Return to My Bookings
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <PaymentSuccessModal
        open={showSuccessExperience}
        bookingId={payment?.booking_id ?? ""}
        amount={Number(payment?.amount ?? 0)}
        currency={payment?.currency}
        onConfirm={() => router.replace(`/payment/${payment?.booking_id}`)}
      />
    </>
  );
}
