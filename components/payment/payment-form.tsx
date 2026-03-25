"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type PaymentBooking = {
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
  staff: {
    full_name?: string | null;
  } | null;
};

type PaymentIntentResponse = {
  payment_url: string;
  payment_id: string;
  transaction_id: string;
};

interface PaymentFormProps {
  booking: PaymentBooking;
}

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function PaymentForm({ booking }: PaymentFormProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();

  const amount = useMemo(() => {
    const deposit = Number(booking.services.deposit_amount || 0);
    const price = Number(booking.services.price || 0);
    return deposit > 0 ? deposit : price;
  }, [booking.services.deposit_amount, booking.services.price]);

  const isAlreadyPaid = (booking.payment_status || "").toLowerCase() === "paid";

  const handlePayWithSandbox = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/payments/create-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: booking.id,
          amount,
          currency: "USD",
          provider: "aba_payway",
        }),
      });

      const payload = (await res.json().catch(() => ({}))) as
        | PaymentIntentResponse
        | { detail?: string; error?: string };

      if (!res.ok || !("payment_url" in payload) || !payload.payment_url) {
        throw new Error(
          ("detail" in payload && payload.detail) ||
            ("error" in payload && payload.error) ||
            "Unable to create payment intent",
        );
      }

      // Redirect customer to ABA PayWay sandbox checkout page.
      window.location.href = payload.payment_url;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Payment failed";
      setErrorMessage(message);
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payment</h1>
        <p className="mt-2 text-muted-foreground">
          Continue to ABA PayWay sandbox to complete your payment.
        </p>
      </div>

      <Card className="shadow-(--shadow-card)">
        <CardHeader>
          <CardTitle>Booking Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <User className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">{booking.services.name}</p>
              <p className="text-sm text-muted-foreground">
                with {booking.staff?.full_name || "Staff Member"}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">
                {format(new Date(booking.start_time_utc), "MMMM d, yyyy")}
              </p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(booking.start_time_utc), "h:mm a")}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">
                {booking.services.duration_minutes} minutes
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-(--shadow-card)">
        <CardHeader>
          <CardTitle>Payment Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Service Price</span>
            <span className="font-medium">
              {usd.format(Number(booking.services.price || 0))}
            </span>
          </div>

          {Number(booking.services.deposit_amount || 0) > 0 && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Deposit Amount</span>
                <span className="font-medium">
                  {usd.format(Number(booking.services.deposit_amount || 0))}
                </span>
              </div>
              <Badge variant="secondary" className="w-fit">
                Pay {usd.format(amount)} now,{" "}
                {usd.format(
                  Number(booking.services.price || 0) -
                    Number(booking.services.deposit_amount || 0),
                )}{" "}
                later
              </Badge>
            </>
          )}

          <div className="border-t pt-4">
            <div className="flex items-center justify-between text-lg font-bold">
              <span>Total Due Now</span>
              <span>{usd.format(amount)}</span>
            </div>
          </div>

          {isAlreadyPaid ? (
            <>
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
                <div className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  Payment already completed.
                </div>
              </div>
              <Button
                onClick={() => router.push(`/booking-confirmed/${booking.id}`)}
                className="w-full"
                size="lg"
              >
                View Booking Confirmation
              </Button>
            </>
          ) : (
            <Button
              onClick={handlePayWithSandbox}
              disabled={isProcessing}
              className="w-full"
              size="lg"
            >
              {isProcessing ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <CreditCard className="mr-2 h-5 w-5" />
              )}
              {isProcessing
                ? "Redirecting to PayWay..."
                : "Pay with ABA PayWay Sandbox"}
            </Button>
          )}

          {errorMessage && (
            <p className="text-sm text-destructive">{errorMessage}</p>
          )}

          <p className="text-center text-xs text-muted-foreground">
            Sandbox mode is for test payments only.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
