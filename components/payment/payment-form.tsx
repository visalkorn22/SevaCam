"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toDataURL } from "qrcode";
import { format } from "date-fns";
import {
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  QrCode,
  ShieldCheck,
  User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PaymentReturnStatus } from "@/components/payment/payment-return-status";

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
  provider?: PaymentProvider | string | null;
  payment_url?: string | null;
  payment_id?: string | null;
  transaction_id?: string | null;
  qr_image?: string | null;
  qr_string?: string | null;
  deeplink?: string | null;
  app_store?: string | null;
  play_store?: string | null;
  payment_status?: string | null;
  expires_at?: string | null;
};

type PaymentProvider = "aba_payway" | "stripe";

type ApiRecord = Record<string, unknown>;

type AbaReference = {
  label: string;
  value: string;
};

type AbaQrIntent = {
  provider: string;
  paymentId: string | null;
  transactionId: string | null;
  providerReference: string | null;
  sessionReference: string | null;
  paymentUrl: string | null;
  qrImageUrl: string | null;
  qrRaw: string | null;
  deeplink: string | null;
  paymentStatus: string | null;
  expiresAt: string | null;
  appStore: string | null;
  playStore: string | null;
  references: AbaReference[];
};

interface PaymentFormProps {
  booking: PaymentBooking;
}

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function pickString(record: ApiRecord, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

function normalizeQrImageSource(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (
    trimmed.startsWith("data:image/") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/")
  ) {
    return trimmed;
  }

  if (trimmed.startsWith("<svg")) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(trimmed)}`;
  }

  const compact = trimmed.replace(/\s+/g, "");
  if (!/^[A-Za-z0-9+/=]+$/.test(compact)) return null;

  if (compact.startsWith("PHN2Zy")) {
    return `data:image/svg+xml;base64,${compact}`;
  }

  return `data:image/png;base64,${compact}`;
}

function normalizeAbaIntent(payload: unknown): AbaQrIntent | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as ApiRecord;

  const paymentId = pickString(record, ["payment_id", "paymentId", "id"]);
  const transactionId = pickString(record, [
    "transaction_id",
    "transactionId",
    "tran_id",
    "tranId",
  ]);
  const providerReference = pickString(record, [
    "provider_reference",
    "providerReference",
    "merchant_ref_no",
    "merchantRefNo",
    "reference",
    "ref",
  ]);
  const sessionReference = pickString(record, [
    "session_id",
    "sessionId",
    "checkout_session_id",
    "checkoutSessionId",
  ]);
  const paymentUrl = pickString(record, [
    "payment_url",
    "paymentUrl",
    "redirect_url",
    "redirectUrl",
    "checkout_url",
    "checkoutUrl",
    "url",
  ]);
  const qrImageUrl = normalizeQrImageSource(
    pickString(record, [
      "qr_image",
      "qrImage",
      "qr_image_url",
      "qrImageUrl",
      "qr_image_data",
      "qrImageData",
    ]),
  );
  const qrRaw = pickString(record, [
    "qr_string",
    "qrString",
    "qr_raw",
    "qrRaw",
    "qr_payload",
    "qrPayload",
    "payload",
  ]);
  const deeplink = pickString(record, [
    "deeplink",
    "deep_link",
    "deepLink",
    "abapay_deeplink",
    "abapayDeeplink",
    "aba_deeplink",
  ]);
  const paymentStatus = pickString(record, ["payment_status", "paymentStatus"]);
  const expiresAt = pickString(record, [
    "expires_at",
    "expiresAt",
    "expire_at",
    "expireAt",
    "expiration_time",
    "expirationTime",
  ]);
  const appStore = pickString(record, ["app_store", "appStore"]);
  const playStore = pickString(record, ["play_store", "playStore"]);
  const provider =
    pickString(record, ["provider", "payment_provider", "paymentProvider"]) ||
    "aba_payway";

  const references = [
    paymentId ? { label: "Payment ID", value: paymentId } : null,
    transactionId ? { label: "Transaction ID", value: transactionId } : null,
    providerReference
      ? { label: "Provider Ref", value: providerReference }
      : null,
    sessionReference ? { label: "Session Ref", value: sessionReference } : null,
  ].filter((value): value is AbaReference => Boolean(value));

  const hasAnyAbaData = Boolean(
    paymentId ||
      transactionId ||
      providerReference ||
      sessionReference ||
      paymentUrl ||
      qrImageUrl ||
      qrRaw ||
      deeplink,
  );

  if (!hasAnyAbaData) return null;

  return {
    provider,
    paymentId,
    transactionId,
    providerReference,
    sessionReference,
    paymentUrl,
    qrImageUrl,
    qrRaw,
    deeplink,
    paymentStatus,
    expiresAt,
    appStore,
    playStore,
    references,
  };
}

function formatExpiresAt(value: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return format(parsed, "PPP p");
}

function paymentBadgeVariant(
  status: string | null,
): "default" | "destructive" | "outline" | "secondary" {
  const normalized = (status || "").toLowerCase();
  if (normalized === "completed" || normalized === "paid" || normalized === "success") {
    return "default";
  }
  if (normalized === "failed" || normalized === "error") {
    return "destructive";
  }
  if (normalized === "refunded") {
    return "secondary";
  }
  return "outline";
}

export function PaymentForm({ booking }: PaymentFormProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [provider, setProvider] = useState<PaymentProvider>("aba_payway");
  const [abaIntent, setAbaIntent] = useState<AbaQrIntent | null>(null);
  const [generatedQrImage, setGeneratedQrImage] = useState<string | null>(null);
  const [qrRenderError, setQrRenderError] = useState<string | null>(null);
  const [isGeneratingQrImage, setIsGeneratingQrImage] = useState(false);
  const [isLocalDev, setIsLocalDev] = useState(false);
  const router = useRouter();

  const amount = useMemo(() => {
    const deposit = Number(booking.services.deposit_amount || 0);
    const price = Number(booking.services.price || 0);
    return deposit > 0 ? deposit : price;
  }, [booking.services.deposit_amount, booking.services.price]);

  const isAlreadyPaid = (booking.payment_status || "").toLowerCase() === "paid";

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsLocalDev(
      window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1",
    );
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!abaIntent?.qrRaw || abaIntent.qrImageUrl) {
      setGeneratedQrImage(null);
      setQrRenderError(null);
      setIsGeneratingQrImage(false);
      return () => {
        cancelled = true;
      };
    }

    setGeneratedQrImage(null);
    setQrRenderError(null);
    setIsGeneratingQrImage(true);

    void toDataURL(abaIntent.qrRaw, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 640,
      color: {
        dark: "#000000",
        light: "#ffffffff",
      },
    })
      .then((dataUrl) => {
        if (cancelled) return;
        setGeneratedQrImage(dataUrl);
      })
      .catch(() => {
        if (cancelled) return;
        setQrRenderError(
          "We created the ABA payment session, but could not render the QR preview from the returned payload.",
        );
      })
      .finally(() => {
        if (cancelled) return;
        setIsGeneratingQrImage(false);
      });

    return () => {
      cancelled = true;
    };
  }, [abaIntent]);

  const abaQrImageSrc = abaIntent?.qrImageUrl || generatedQrImage;
  const abaExpiresAt = formatExpiresAt(abaIntent?.expiresAt || null);
  const hasAbaQrPayload = Boolean(abaIntent?.qrImageUrl || abaIntent?.qrRaw);

  const providerOptions: {
    value: PaymentProvider;
    title: string;
    description: string;
    badge: string;
  }[] = [
    {
      value: "aba_payway",
      title: "ABA PayWay",
      description: "Generate a scannable ABA QR on this page.",
      badge: "QR / wallet",
    },
    {
      value: "stripe",
      title: "Stripe",
      description: "Redirect to Stripe Checkout for card payment.",
      badge: "Card checkout",
    },
  ];

  const handleStartPayment = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    setQrRenderError(null);
    if (provider === "aba_payway") {
      setAbaIntent(null);
      setGeneratedQrImage(null);
    }
    try {
      const res = await fetch("/api/payments/create-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: booking.id,
          amount,
          currency: "USD",
          provider,
        }),
      });

      const payload = (await res.json().catch(() => ({}))) as
        | PaymentIntentResponse
        | { detail?: string; error?: string };

      if (!res.ok) {
        throw new Error(
          ("detail" in payload && payload.detail) ||
            ("error" in payload && payload.error) ||
            "Unable to create payment intent",
        );
      }

      if (provider === "aba_payway") {
        const normalizedAbaIntent = normalizeAbaIntent(payload);
        if (!normalizedAbaIntent) {
          throw new Error(
            "ABA PayWay created the payment request, but the response did not include usable QR or session details.",
          );
        }

        setAbaIntent(normalizedAbaIntent);
        setIsProcessing(false);

        const shouldRedirect =
          !normalizedAbaIntent.qrImageUrl &&
          !normalizedAbaIntent.qrRaw &&
          Boolean(normalizedAbaIntent.paymentUrl);

        if (shouldRedirect && normalizedAbaIntent.paymentUrl) {
          window.location.href = normalizedAbaIntent.paymentUrl;
        }
        return;
      }

      if ("payment_url" in payload && payload.payment_url) {
        window.location.href = payload.payment_url;
        return;
      }

      throw new Error("Payment provider did not return a valid checkout flow");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Payment failed";
      setErrorMessage(message);
      setIsProcessing(false);
    }
  };

  const handleMarkSandboxPaid = async () => {
    if (!abaIntent?.paymentId) return;
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const res = await fetch(
        `/api/payments/${abaIntent.paymentId}/confirm?transaction_status=success`,
        {
          method: "POST",
        },
      );
      const payload = (await res.json().catch(() => ({}))) as {
        detail?: string;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(
          payload.detail || payload.error || "Failed to mark sandbox payment paid",
        );
      }
      router.push(`/payments?payment_id=${abaIntent.paymentId}`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Sandbox payment confirmation failed",
      );
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payment</h1>
        <p className="mt-2 text-muted-foreground">
          Choose a payment method and complete checkout using QR or hosted payment.
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
          <CardTitle>Payment Method</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {providerOptions.map((option) => {
            const selected = provider === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setProvider(option.value)}
                className={`rounded-xl border p-4 text-left transition ${
                  selected
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border hover:border-primary/40 hover:bg-muted/30"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{option.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                  <Badge variant={selected ? "default" : "secondary"}>
                    {option.badge}
                  </Badge>
                </div>
              </button>
            );
          })}
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
              onClick={handleStartPayment}
              disabled={isProcessing}
              className="w-full"
              size="lg"
            >
              {isProcessing ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <ShieldCheck className="mr-2 h-5 w-5" />
              )}
              {isProcessing
                ? provider === "stripe"
                  ? "Redirecting to Stripe..."
                  : "Generating ABA QR..."
                : provider === "stripe"
                  ? "Pay with Stripe"
                  : "Pay with ABA PayWay"}
            </Button>
          )}

          {errorMessage && (
            <p className="text-sm text-destructive">{errorMessage}</p>
          )}

          <p className="text-center text-xs text-muted-foreground">
            Use test credentials only. ABA generates a QR on this page. Stripe opens hosted checkout.
          </p>
        </CardContent>
      </Card>

      {provider === "aba_payway" && isProcessing && !abaIntent && (
        <Card className="shadow-(--shadow-card)">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Generating ABA QR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              We are requesting a fresh ABA PayWay QR from the backend. Keep this
              page open.
            </p>
          </CardContent>
        </Card>
      )}

      {abaIntent && (
        <>
          <Card className="shadow-(--shadow-card)">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                ABA PayWay QR
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-border/60 bg-white p-4 shadow-inner">
                <div className="mx-auto flex min-h-72 w-full max-w-sm items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-4">
                  {abaQrImageSrc ? (
                    <img
                      src={abaQrImageSrc}
                      alt="ABA PayWay QR"
                      className="mx-auto h-auto w-full max-w-[320px] object-contain sm:max-w-[360px]"
                    />
                  ) : isGeneratingQrImage ? (
                    <div className="space-y-3 text-center text-sm text-slate-600">
                      <Loader2 className="mx-auto h-7 w-7 animate-spin" />
                      <p>Rendering QR preview from the payment payload...</p>
                    </div>
                  ) : (
                    <div className="space-y-2 text-center text-sm text-slate-600">
                      <p className="font-medium text-slate-800">
                        QR payment created, but no renderable QR image was returned.
                      </p>
                      <p>
                        Use the ABA deeplink below if available, or refresh the
                        payment status while the backend/payment provider response is
                        being checked.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
                Scan this QR with ABA Mobile from another device, or open the ABA
                app directly from this page. Keep this screen open while we wait for
                payment confirmation.
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">ABA PayWay</Badge>
                {abaIntent.paymentStatus && (
                  <Badge variant={paymentBadgeVariant(abaIntent.paymentStatus)}>
                    {abaIntent.paymentStatus}
                  </Badge>
                )}
                {abaExpiresAt && <Badge variant="outline">Expires {abaExpiresAt}</Badge>}
              </div>

              {abaIntent.references.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {abaIntent.references.map((reference) => (
                    <div
                      key={`${reference.label}-${reference.value}`}
                      className="rounded-lg border border-border/60 bg-muted/30 p-3"
                    >
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {reference.label}
                      </p>
                      <p className="mt-1 break-all font-mono text-xs">
                        {reference.value}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {qrRenderError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  {qrRenderError}
                </div>
              )}

              {!hasAbaQrPayload && !qrRenderError && (
                <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-sm text-blue-700 dark:text-blue-300">
                  The payment request succeeded, but the backend did not include a QR
                  image or QR payload. If this was expected to be a QR flow, the
                  backend response shape still needs alignment.
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {abaIntent.deeplink && (
                  <Button asChild>
                    <a href={abaIntent.deeplink} target="_blank" rel="noreferrer">
                      Open ABA App
                      <ArrowUpRight className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                )}
                {abaIntent.paymentUrl && (
                  <Button asChild variant="secondary">
                    <a href={abaIntent.paymentUrl} target="_blank" rel="noreferrer">
                      Open PayWay Checkout
                      <ArrowUpRight className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                )}
                {abaIntent.paymentId && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      router.push(`/payments?payment_id=${abaIntent.paymentId}`)
                    }
                  >
                    View Payment Status
                  </Button>
                )}
                {isLocalDev && abaIntent.paymentId && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleMarkSandboxPaid}
                  >
                    Mark Sandbox Payment Paid
                  </Button>
                )}
              </div>

              {(abaIntent.appStore || abaIntent.playStore) && (
                <div className="flex flex-wrap gap-3 text-xs">
                  {abaIntent.appStore && (
                    <a
                      href={abaIntent.appStore}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      iPhone app
                    </a>
                  )}
                  {abaIntent.playStore && (
                    <a
                      href={abaIntent.playStore}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      Android app
                    </a>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {abaIntent.paymentId && (
            <PaymentReturnStatus
              paymentId={abaIntent.paymentId}
              initialPayment={null}
            />
          )}
        </>
      )}
    </div>
  );
}
