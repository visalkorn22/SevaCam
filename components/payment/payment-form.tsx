"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toDataURL } from "qrcode";
import { format } from "date-fns";
import {
  ArrowUpRight,
  CheckCircle2,
  Loader2,
  QrCode,
  ShieldCheck,
} from "lucide-react";
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
  provider?: PaymentProvider | string | null;
  payment_url?: string | null;
  payment_id?: string | null;
  transaction_id?: string | null;
  merchant_id?: string | null;
  gateway_mode?: string | null;
  settlement_destination?: string | null;
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
  merchantId: string | null;
  gatewayMode: string | null;
  settlementDestination: string | null;
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
    if (typeof value === "number" && Number.isFinite(value))
      return String(value);
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
  const merchantId = pickString(record, ["merchant_id", "merchantId"]);
  const gatewayMode = pickString(record, ["gateway_mode", "gatewayMode"]);
  const settlementDestination = pickString(record, [
    "settlement_destination",
    "settlementDestination",
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
    merchantId ? { label: "PayWay Merchant", value: merchantId } : null,
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
    merchantId ||
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
    merchantId,
    gatewayMode,
    settlementDestination,
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
  }[] = [
    {
      value: "aba_payway",
      title: "ABA PayWay",
      description: "Scan a QR on this page.",
    },
    {
      value: "stripe",
      title: "Stripe",
      description: "Card via hosted checkout.",
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
          payload.detail ||
            payload.error ||
            "Failed to mark sandbox payment paid",
        );
      }
      router.push(`/payment/${booking.id}?payment_id=${abaIntent.paymentId}`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Sandbox payment confirmation failed",
      );
      setIsProcessing(false);
    }
  };

  const startDate = new Date(booking.start_time_utc);
  const deposit = Number(booking.services.deposit_amount || 0);
  const price = Number(booking.services.price || 0);

  return (
    <div className="space-y-4">
      <div className="pb-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Complete payment
        </h1>
      </div>

      {/* ── Main payment panel ──────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">

        {/* Booking summary strip */}
        <div className="px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground">
                {booking.services.name}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                with {booking.staff?.full_name || "Staff Member"}
                {" · "}
                {format(startDate, "MMM d, yyyy")}
                {" · "}
                {format(startDate, "h:mm a")}
                {" · "}
                {booking.services.duration_minutes} min
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xl font-bold tabular-nums">
                {usd.format(amount)}
              </p>
              {deposit > 0 && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  deposit now
                </p>
              )}
            </div>
          </div>
          {deposit > 0 && (
            <div className="mt-3 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              Full price {usd.format(price)} · Remaining{" "}
              {usd.format(price - deposit)} due at appointment
            </div>
          )}
        </div>

        {/* Payment method */}
        <div className="border-t border-border px-6 py-5">
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Payment method
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {providerOptions.map((option) => {
              const selected = provider === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setProvider(option.value)}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3.5 text-left transition-colors ${
                    selected
                      ? "border-foreground/25 bg-foreground/[0.04] text-foreground"
                      : "border-border text-foreground/70 hover:border-foreground/20 hover:bg-muted/40"
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold leading-tight">
                      {option.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                  <div
                    className={`ml-3 h-4 w-4 shrink-0 rounded-full border-2 transition-colors ${
                      selected
                        ? "border-foreground bg-foreground"
                        : "border-border"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <div className="border-t border-border px-6 py-5">
          {isAlreadyPaid ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Payment already completed.
              </div>
              <Button
                onClick={() => router.push(`/payment/${booking.id}`)}
                className="w-full"
                size="lg"
              >
                View confirmation
              </Button>
            </div>
          ) : (
            <>
              <Button
                onClick={handleStartPayment}
                disabled={isProcessing}
                className="w-full"
                size="lg"
              >
                {isProcessing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="mr-2 h-4 w-4" />
                )}
                {isProcessing
                  ? provider === "stripe"
                    ? "Redirecting to Stripe…"
                    : "Generating QR…"
                  : `Pay ${usd.format(amount)} · ${provider === "stripe" ? "Stripe" : "ABA PayWay"}`}
              </Button>
              {errorMessage && (
                <p className="mt-3 text-sm text-destructive">{errorMessage}</p>
              )}
              <p className="mt-3 text-center text-xs text-muted-foreground">
                {provider === "stripe"
                  ? "You'll be redirected to Stripe's secure checkout."
                  : "A scannable QR will appear on this page."}
              </p>
            </>
          )}
        </div>
      </div>

      {/* ── ABA generating spinner ───────────────────────────────────── */}
      {provider === "aba_payway" && isProcessing && !abaIntent && (
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-6 py-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          Requesting ABA PayWay QR — keep this page open.
        </div>
      )}

      {/* ── ABA QR panel ─────────────────────────────────────────────── */}
      {abaIntent && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">

          {/* QR display */}
          <div className="flex flex-col items-center px-6 py-8">
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
              {abaQrImageSrc ? (
                <img
                  src={abaQrImageSrc}
                  alt="ABA PayWay QR"
                  className="h-auto w-full max-w-[240px] object-contain"
                />
              ) : isGeneratingQrImage ? (
                <div className="flex h-56 w-56 flex-col items-center justify-center gap-3 text-sm text-slate-500">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <p>Rendering QR…</p>
                </div>
              ) : (
                <div className="flex h-56 w-56 flex-col items-center justify-center gap-3 p-4 text-center text-sm text-slate-500">
                  <QrCode className="h-8 w-8 opacity-30" />
                  <p>No QR image returned. Use the ABA deeplink below.</p>
                </div>
              )}
            </div>

            <div className="mt-4 text-center">
              <p className="text-xl font-bold tabular-nums">
                {usd.format(amount)}
              </p>
              <p className="text-sm text-muted-foreground">
                {booking.services.name}
              </p>
            </div>
          </div>

          {/* Instruction + metadata */}
          <div className="border-t border-border px-6 py-4">
            <p className="text-sm text-muted-foreground">
              Scan with{" "}
              <span className="font-medium text-foreground">ABA Mobile</span>{" "}
              from another device. Keep this screen open.
            </p>

            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {abaIntent.gatewayMode && (
                <span>
                  Mode:{" "}
                  <span className="text-foreground">{abaIntent.gatewayMode}</span>
                </span>
              )}
              {abaExpiresAt && (
                <span>
                  Expires:{" "}
                  <span className="text-foreground">{abaExpiresAt}</span>
                </span>
              )}
            </div>

            {abaIntent.gatewayMode?.toLowerCase() === "sandbox" && (
              <div className="mt-3 rounded-lg bg-blue-500/8 px-3 py-2.5 text-xs text-blue-700 dark:text-blue-400">
                Sandbox — real ABA app may show "transaction not found". Complete
                the sandbox flow first, then check payment status.
              </div>
            )}

            {qrRenderError && (
              <div className="mt-3 rounded-lg bg-destructive/8 px-3 py-2.5 text-xs text-destructive">
                {qrRenderError}
              </div>
            )}

            {!hasAbaQrPayload && !qrRenderError && (
              <div className="mt-3 rounded-lg bg-amber-500/8 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-400">
                No QR payload returned. Check backend response alignment.
              </div>
            )}
          </div>

          {/* Reference IDs (compact) */}
          {abaIntent.references.length > 0 && (
            <div className="border-t border-border px-6 py-3">
              <div className="flex flex-wrap gap-x-5 gap-y-1">
                {abaIntent.references.map((ref) => (
                  <div
                    key={`${ref.label}-${ref.value}`}
                    className="flex items-baseline gap-1.5"
                  >
                    <span className="text-xs text-muted-foreground">
                      {ref.label}
                    </span>
                    <span className="font-mono text-xs text-foreground">
                      {ref.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Settlement destination */}
          {abaIntent.settlementDestination && (
            <div className="border-t border-border px-6 py-3 text-sm text-emerald-700 dark:text-emerald-400">
              {abaIntent.settlementDestination}
            </div>
          )}

          {/* Actions */}
          <div className="border-t border-border px-6 py-4">
            <div className="flex flex-wrap gap-2">
              {abaIntent.deeplink && (
                <Button asChild size="sm">
                  <a
                    href={abaIntent.deeplink}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open ABA App
                    <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
                  </a>
                </Button>
              )}
              {abaIntent.paymentUrl && (
                <Button asChild variant="secondary" size="sm">
                  <a
                    href={abaIntent.paymentUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    PayWay Checkout
                    <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
                  </a>
                </Button>
              )}
              {abaIntent.paymentId && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    router.push(
                      `/payment/${booking.id}?payment_id=${abaIntent.paymentId}`,
                    )
                  }
                >
                  Check payment status
                </Button>
              )}
              {isLocalDev && abaIntent.paymentId && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isProcessing}
                  onClick={handleMarkSandboxPaid}
                >
                  {isProcessing && (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  )}
                  Mark paid (sandbox)
                </Button>
              )}
            </div>

            {(abaIntent.appStore || abaIntent.playStore) && (
              <div className="mt-3 flex gap-4 text-xs">
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
          </div>
        </div>
      )}
    </div>
  );
}
