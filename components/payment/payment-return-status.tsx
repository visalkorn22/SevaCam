"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type PaymentStatus = "pending" | "completed" | "failed" | "refunded" | string;

type PaymentRecord = {
  id: string;
  booking_id: string;
  provider: string;
  provider_reference?: string | null;
  amount: string | number;
  currency: string;
  status: PaymentStatus;
  created_at: string;
};

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
  const hasNavigatedRef = useRef(false);
  const [payment, setPayment] = useState<PaymentRecord | null>(initialPayment);
  const [isLoading, setIsLoading] = useState(!initialPayment && !deferInitialFetch);
  const [error, setError] = useState<string | null>(null);

  const status = payment?.status || "pending";
  const isTerminal = ["completed", "failed", "refunded"].includes(status);

  // Auto-navigate to the payment page (no params) when status becomes completed.
  // The server will fetch the updated booking and render the confirmed view.
  useEffect(() => {
    if (status === "completed" && payment?.booking_id && !hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      router.push(`/payment/${payment.booking_id}`);
    }
  }, [status, payment?.booking_id, router]);

  const fetchPayment = async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const query = stripeSessionId
        ? `?stripe_session_id=${encodeURIComponent(stripeSessionId)}`
        : "";
      const res = await fetch(`/api/payments/${paymentId}${query}`, {
        method: "GET",
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as
        | PaymentRecord
        | { detail?: string; error?: string };

      if (!res.ok || !("status" in data)) {
        throw new Error(
          ("detail" in data && data.detail) ||
            ("error" in data && data.error) ||
            "Unable to load payment status",
        );
      }

      setPayment(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to load payment status";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!payment && !deferInitialFetch) {
      fetchPayment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId, deferInitialFetch]);

  useEffect(() => {
    if (!autoRefresh || isTerminal) return;

    const timer = window.setInterval(() => {
      fetchPayment(true);
    }, 3000);

    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId, isTerminal, autoRefresh]);

  const statusMeta = useMemo(() => {
    if (status === "completed") {
      return {
        title: "Payment successful",
        description:
          "Your payment has been confirmed. Your booking is now secured.",
        icon: CheckCircle2,
        tone: "text-emerald-600",
        box: "border-emerald-500/30 bg-emerald-500/10",
      };
    }
    if (status === "failed") {
      return {
        title: "Payment failed",
        description:
          "The payment was not completed. You can try again from your booking.",
        icon: XCircle,
        tone: "text-red-600",
        box: "border-red-500/30 bg-red-500/10",
      };
    }
    if (status === "refunded") {
      return {
        title: "Payment refunded",
        description: "This payment has been refunded.",
        icon: AlertTriangle,
        tone: "text-amber-600",
        box: "border-amber-500/30 bg-amber-500/10",
      };
    }
    return {
      title: "Waiting for confirmation",
      description:
        autoRefresh
          ? "We are checking the latest payment status with the selected provider."
          : "QR created. Complete payment first, then refresh status manually.",
      icon: Clock3,
      tone: "text-blue-600",
      box: "border-blue-500/30 bg-blue-500/10",
    };
  }, [autoRefresh, status]);

  const StatusIcon = statusMeta.icon;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Payment Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`rounded-lg border p-4 ${statusMeta.box}`}>
            <div className="flex items-start gap-3">
              <StatusIcon className={`mt-0.5 h-5 w-5 ${statusMeta.tone}`} />
              <div>
                <p className="font-semibold">{statusMeta.title}</p>
                <p className="text-sm text-muted-foreground">
                  {statusMeta.description}
                </p>
              </div>
            </div>
          </div>

          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading payment status...
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          {payment && (
            <div className="rounded-lg border p-3 text-sm">
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">Payment ID</span>
                <span className="font-mono text-xs">{payment.id}</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium">
                  {usd.format(Number(payment.amount || 0))} {payment.currency}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">Provider</span>
                <span className="font-medium capitalize">
                  {payment.provider.replace("_", " ")}
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {!isTerminal && (
              <Button
                type="button"
                variant="outline"
                onClick={() => fetchPayment()}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Status
              </Button>
            )}
            {payment?.booking_id && status === "completed" && (
              <Button asChild>
                <Link href={`/payment/${payment.booking_id}`}>
                  View Confirmation
                </Link>
              </Button>
            )}
            {payment?.booking_id && status !== "completed" && (
              <Button asChild variant="secondary">
                <Link href={`/payment/${payment.booking_id}`}>
                  Try Payment Again
                </Link>
              </Button>
            )}
            <Button asChild variant="ghost">
              <Link href="/bookings">My Bookings</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
