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
        iconClass: "text-emerald-600 dark:text-emerald-400",
        ringClass: "ring-emerald-500/20 bg-emerald-500/10",
        barClass: "bg-emerald-500/8 border-b border-emerald-500/20",
      };
    }
    if (status === "failed") {
      return {
        title: "Payment failed",
        description:
          "The payment was not completed. You can try again from your booking.",
        icon: XCircle,
        iconClass: "text-red-600 dark:text-red-400",
        ringClass: "ring-red-500/20 bg-red-500/10",
        barClass: "bg-red-500/8 border-b border-red-500/20",
      };
    }
    if (status === "refunded") {
      return {
        title: "Payment refunded",
        description: "This payment has been refunded.",
        icon: AlertTriangle,
        iconClass: "text-amber-600 dark:text-amber-400",
        ringClass: "ring-amber-500/20 bg-amber-500/10",
        barClass: "bg-amber-500/8 border-b border-amber-500/20",
      };
    }
    return {
      title: "Waiting for confirmation",
      description: autoRefresh
        ? "We are checking the latest payment status with the selected provider."
        : "QR created. Complete payment first, then refresh status manually.",
      icon: Clock3,
      iconClass: "text-blue-600 dark:text-blue-400",
      ringClass: "ring-blue-500/20 bg-blue-500/10",
      barClass: "bg-blue-500/8 border-b border-blue-500/20",
    };
  }, [autoRefresh, status]);

  const StatusIcon = statusMeta.icon;

  return (
    <>
      {!showSuccessExperience && (
        <div className="mx-auto max-w-lg space-y-5 motion-preset-slide-up-sm motion-duration-500">
          <div className="pb-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Payment Status
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Checking your payment with{" "}
              {payment?.provider?.replace("_", " ") || "the provider"}&hellip;
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_8px_32px_rgba(0,0,0,0.04)]">
            <div className={`px-6 py-6 ${statusMeta.barClass}`}>
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ring-1 ${statusMeta.ringClass} ${statusMeta.iconClass}`}
                >
                  <StatusIcon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-base font-semibold text-foreground">
                    {statusMeta.title}
                  </p>
                  <p className="mt-0.5 max-w-75 text-sm text-muted-foreground">
                    {statusMeta.description}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-background px-6 py-5">
              {isLoading && (
                <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  Syncing latest status&hellip;
                </div>
              )}

              {error && (
                <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              {payment && (
                <div className="space-y-2.5 rounded-xl border border-border/40 bg-muted/20 p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-semibold text-foreground">
                      {usd.format(Number(payment.amount || 0))}{" "}
                      {payment.currency}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Provider</span>
                    <span className="font-medium capitalize text-foreground">
                      {payment.provider.replace("_", " ")}
                    </span>
                  </div>
                </div>
              )}

              <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
                {!isTerminal && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => refetch()}
                    className="h-11 flex-1 rounded-xl border-border/60 hover:bg-muted/50"
                  >
                    <RefreshCw
                      className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                    />
                    Refresh Status
                  </Button>
                )}
                {payment?.booking_id && status === "completed" && (
                  <Button asChild className="h-11 flex-1 rounded-xl shadow-sm">
                    <Link href={`/payment/${payment.booking_id}`}>
                      View Confirmation
                    </Link>
                  </Button>
                )}
                {payment?.booking_id && status !== "completed" && (
                  <Button
                    asChild
                    variant="secondary"
                    className="h-11 flex-1 rounded-xl"
                  >
                    <Link href={`/payment/${payment.booking_id}`}>
                      Try Payment Again
                    </Link>
                  </Button>
                )}
              </div>

              <div className="mt-3 text-center">
                <Button
                  asChild
                  variant="link"
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  <Link href="/bookings">Return to My Bookings</Link>
                </Button>
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
