"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toDataURL } from "qrcode";
import { format } from "date-fns";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Loader2,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePaymentPoller } from "@/hooks/use-payment-poller";
import { PaymentSuccessModal } from "@/components/payment/payment-success-modal";
import { cn } from "@/lib/utils";
import {
  formatDateInTimeZone,
  formatTimeInTimeZone,
  parseDateValue,
} from "@/lib/timezone";

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
  staff: { full_name?: string | null } | null;
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

type PaymentProvider = "aba_payway" | "stripe" | "bakong_khqr";
type ApiRecord = Record<string, unknown>;
type AbaReference = { label: string; value: string };

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
  timeZone?: string | null;
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
  if (compact.startsWith("PHN2Zy")) return `data:image/svg+xml;base64,${compact}`;
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
    providerReference ? { label: "Provider Ref", value: providerReference } : null,
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

export function PaymentForm({ booking, timeZone }: PaymentFormProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [provider, setProvider] = useState<PaymentProvider>("aba_payway");
  const [abaIntent, setAbaIntent] = useState<AbaQrIntent | null>(null);
  const [generatedQrImage, setGeneratedQrImage] = useState<string | null>(null);
  const [qrRenderError, setQrRenderError] = useState<string | null>(null);
  const [isGeneratingQrImage, setIsGeneratingQrImage] = useState(false);
  const [isLocalDev, setIsLocalDev] = useState(false);
  const [committedProvider, setCommittedProvider] =
    useState<PaymentProvider | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const router = useRouter();
  const qrSectionRef = useRef<HTMLDivElement>(null);

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
      color: { dark: "#000000", light: "#ffffffff" },
    })
      .then((dataUrl) => {
        if (!cancelled) setGeneratedQrImage(dataUrl);
      })
      .catch(() => {
        if (!cancelled) {
          setQrRenderError(
            "We created the ABA payment session, but could not render the QR preview from the returned payload.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsGeneratingQrImage(false);
      });

    return () => {
      cancelled = true;
    };
  }, [abaIntent]);

  const { payment: polledPayment } = usePaymentPoller(
    abaIntent?.paymentId ?? null,
    {
      enabled:
        committedProvider === "bakong_khqr" && Boolean(abaIntent?.paymentId),
    },
  );

  useEffect(() => {
    if (!abaIntent) return;
    const timer = setTimeout(() => {
      qrSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
    return () => clearTimeout(timer);
  }, [abaIntent]);

  useEffect(() => {
    if (polledPayment?.status !== "completed") return;
    const key = `payment_success_shown_${abaIntent?.paymentId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    setShowSuccess(true);
  }, [polledPayment?.status, abaIntent?.paymentId]);

  const abaQrImageSrc = abaIntent?.qrImageUrl || generatedQrImage;
  const abaExpiresAt = formatExpiresAt(abaIntent?.expiresAt || null);
  const hasAbaQrPayload = Boolean(abaIntent?.qrImageUrl || abaIntent?.qrRaw);

  const providerOptions = [
    {
      value: "aba_payway" as const,
      title: "ABA PayWay",
      description: "Scan a QR code on this page with ABA Mobile.",
      logo: "/Payway.png",
      logoAlt: "ABA PayWay logo",
      badge: "QR on page",
      actionLabel: "ABA PayWay",
    },
    {
      value: "bakong_khqr" as const,
      title: "Bakong KHQR",
      description: "Scan using any Bakong-compatible banking app.",
      logo: "/Bakong.png",
      logoAlt: "Bakong logo",
      badge: "Any Bakong app",
      actionLabel: "Bakong KHQR",
    },
    {
      value: "stripe" as const,
      title: "Stripe",
      description: "Continue to hosted card checkout via Stripe.",
      logo: "/Stripe.png",
      logoAlt: "Stripe logo",
      badge: "Hosted checkout",
      actionLabel: "Stripe",
    },
  ];

  const selectedProviderMeta =
    providerOptions.find((option) => option.value === provider) ??
    providerOptions[0];
  const qrProviderMeta =
    providerOptions.find((option) =>
      option.value ===
      (abaIntent?.provider === "bakong_khqr" ? "bakong_khqr" : "aba_payway"),
    ) ?? providerOptions[0];

  const handleStartPayment = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    setQrRenderError(null);

    if (provider === "aba_payway" || provider === "bakong_khqr") {
      setAbaIntent(null);
      setGeneratedQrImage(null);
      setCommittedProvider(null);
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

      if (provider === "aba_payway" || provider === "bakong_khqr") {
        const normalizedIntent = normalizeAbaIntent(payload);
        if (!normalizedIntent) {
          throw new Error(
            provider === "bakong_khqr"
              ? "Bakong KHQR created the payment request, but the response did not include a QR code."
              : "ABA PayWay created the payment request, but the response did not include usable QR or session details.",
          );
        }

        setAbaIntent(normalizedIntent);
        setCommittedProvider(provider);
        setIsProcessing(false);

        const shouldRedirect =
          provider === "aba_payway" &&
          !normalizedIntent.qrImageUrl &&
          !normalizedIntent.qrRaw &&
          Boolean(normalizedIntent.paymentUrl);

        if (shouldRedirect && normalizedIntent.paymentUrl) {
          window.location.href = normalizedIntent.paymentUrl;
        }
        return;
      }

      if ("payment_url" in payload && payload.payment_url) {
        window.location.href = payload.payment_url;
        return;
      }

      throw new Error("Payment provider did not return a valid checkout flow");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Payment failed");
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
        { method: "POST" },
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

  const startDate =
    parseDateValue(booking.start_time_utc) ?? new Date(booking.start_time_utc);
  const deposit = Number(booking.services.deposit_amount || 0);
  const price = Number(booking.services.price || 0);
  const staffName = booking.staff?.full_name || "Assigned curator";
  const activeQrStatus = (
    polledPayment?.status ||
    abaIntent?.paymentStatus ||
    "pending"
  ).toLowerCase();
  const qrStatusLabel =
    activeQrStatus === "completed"
      ? "Payment received"
      : activeQrStatus === "failed"
        ? "Needs attention"
        : committedProvider === "bakong_khqr"
          ? "Awaiting bank confirmation"
          : "Ready to scan";
  const paymentActionLabel = isAlreadyPaid
    ? "Payment received"
    : isProcessing
      ? provider === "stripe"
        ? "Preparing Stripe checkout..."
        : "Preparing secure QR..."
      : provider === "stripe"
        ? `Pay ${usd.format(amount)} via Stripe`
        : abaIntent && committedProvider === provider
          ? `Refresh ${selectedProviderMeta.actionLabel} session`
          : `Pay ${usd.format(amount)} via ${selectedProviderMeta.actionLabel}`;

  return (
    <>
      <div className="mx-auto max-w-[84rem] space-y-8 text-(--text-primary) motion-preset-slide-up-sm motion-duration-500">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.05fr)_21rem]">
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="sevacam-eyebrow">Payment Atelier</p>
              <h1 className="sevacam-display text-[clamp(2.7rem,5vw,4.8rem)] leading-[0.92] tracking-[-0.05em]">
                Complete your booking
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-(--text-secondary)">
                Review the reservation details, choose the payment rail you
                prefer, and secure the appointment with a calm, trusted
                checkout.
              </p>
            </div>

            <div className="sevacam-rail overflow-hidden shadow-[0_24px_54px_rgba(0,0,0,0.22)]">
              <div className="border-b border-(--border-subtle) bg-[radial-gradient(circle_at_top_right,rgba(122,213,221,0.12),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))] px-6 py-6 sm:px-8 sm:py-8">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex min-h-8 items-center rounded-full bg-(--accent-subtle) px-3 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-(--accent-primary)">
                    Reservation Summary
                  </span>
                  <span className="inline-flex min-h-8 items-center rounded-full bg-(--bg-elevated) px-3 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-(--text-secondary)">
                    {deposit > 0 ? "Deposit due today" : "Full payment due today"}
                  </span>
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_14rem] lg:items-end">
                  <div>
                    <h2 className="sevacam-display max-w-[14ch] text-[clamp(2.2rem,4vw,3.6rem)] leading-[0.94] tracking-[-0.05em] text-(--text-primary)">
                      {booking.services.name}
                    </h2>
                    <p className="mt-4 max-w-2xl text-sm leading-7 text-(--text-secondary)">
                      Reserved with {staffName} on{" "}
                      {formatDateInTimeZone(startDate, timeZone)} at{" "}
                      {formatTimeInTimeZone(startDate, timeZone)}. Choose the
                      payment method that matches how you want to complete the
                      booking today.
                    </p>
                  </div>

                  <div className="rounded-[0.7rem] bg-(--bg-elevated)/90 p-5 text-left shadow-[0_16px_30px_rgba(0,0,0,0.12)] lg:text-right">
                    <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-(--text-secondary)">
                      Due Now
                    </p>
                    <p className="mt-3 text-[2.3rem] font-semibold tracking-[-0.04em] text-(--text-primary)">
                      {usd.format(amount)}
                    </p>
                    <p className="mt-2 text-xs leading-6 text-(--text-secondary)">
                      {deposit > 0
                        ? `${usd.format(Math.max(price - deposit, 0))} settles at appointment`
                        : "Your full reservation is secured after payment"}
                    </p>
                  </div>
                </div>

                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[0.65rem] bg-(--bg-elevated)/88 px-4 py-4">
                    <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-(--text-secondary)">
                      Curator
                    </p>
                    <p className="mt-3 text-sm font-medium text-(--text-primary)">
                      {staffName}
                    </p>
                  </div>
                  <div className="rounded-[0.65rem] bg-(--bg-elevated)/88 px-4 py-4">
                    <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-(--text-secondary)">
                      Date & Time
                    </p>
                    <p className="mt-3 text-sm font-medium text-(--text-primary)">
                      {formatDateInTimeZone(startDate, timeZone)}
                    </p>
                    <p className="mt-1 text-xs text-(--text-secondary)">
                      {formatTimeInTimeZone(startDate, timeZone)}
                    </p>
                  </div>
                  <div className="rounded-[0.65rem] bg-(--bg-elevated)/88 px-4 py-4">
                    <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-(--text-secondary)">
                      Session
                    </p>
                    <p className="mt-3 text-sm font-medium text-(--text-primary)">
                      {booking.services.duration_minutes} minutes
                    </p>
                    <p className="mt-1 text-xs text-(--text-secondary)">
                      {deposit > 0 ? `${usd.format(price)} total investment` : "Immediate confirmation"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-6 px-6 py-6 sm:px-8 sm:py-8">
                {isAlreadyPaid && (
                  <div className="flex items-start gap-3 rounded-[0.7rem] bg-[rgba(122,213,221,0.14)] px-4 py-4 text-(--text-primary)">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-(--accent-primary)" />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">Payment already received</p>
                      <p className="text-sm leading-6 text-(--text-secondary)">
                        This reservation is already secured. You can review the
                        confirmation page instead of submitting another payment.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="sevacam-eyebrow">Payment Method</p>
                    <h3 className="mt-3 text-lg font-semibold text-(--text-primary)">
                      Choose the checkout rail that works best for you
                    </h3>
                  </div>
                  <p className="max-w-xs text-sm leading-6 text-(--text-secondary) sm:text-right">
                    QR payment stays on this page. Stripe continues to hosted
                    card checkout.
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  {providerOptions.map((option) => {
                    const isSelected = provider === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setProvider(option.value);
                          setErrorMessage(null);
                        }}
                        className={cn(
                          "sevacam-interactive-card relative flex min-h-[14rem] flex-col justify-between rounded-[0.85rem] p-5 text-left focus-visible:outline-none",
                          isSelected
                            ? "bg-(--accent-primary) text-(--text-on-accent) shadow-[0_22px_42px_rgba(122,213,221,0.12)]"
                            : "bg-(--bg-elevated) text-(--text-primary)",
                        )}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="rounded-[0.7rem] bg-white/95 px-3 py-2 shadow-[0_10px_18px_rgba(0,0,0,0.08)]">
                            <Image
                              src={option.logo}
                              alt={option.logoAlt}
                              width={88}
                              height={28}
                              className="h-7 w-auto object-contain"
                            />
                          </div>

                          <div
                            className={cn(
                              "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                              isSelected
                                ? "bg-black/12 text-(--text-on-accent)"
                                : "bg-(--bg-base) text-(--text-secondary)",
                            )}
                          >
                            {isSelected ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <span className="h-2.5 w-2.5 rounded-full bg-current/45" />
                            )}
                          </div>
                        </div>

                        <div className="mt-8 space-y-3">
                          <div className="space-y-1.5">
                            <p className="text-lg font-semibold">{option.title}</p>
                            <p
                              className={cn(
                                "text-sm leading-6",
                                isSelected
                                  ? "text-(--text-on-accent)/80"
                                  : "text-(--text-secondary)",
                              )}
                            >
                              {option.description}
                            </p>
                          </div>

                          <span
                            className={cn(
                              "inline-flex min-h-8 items-center rounded-full px-3 text-[0.58rem] font-semibold uppercase tracking-[0.16em]",
                              isSelected
                                ? "bg-black/10 text-(--text-on-accent)"
                                : "bg-(--bg-base) text-(--text-secondary)",
                            )}
                          >
                            {option.badge}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {errorMessage && (
                  <div className="flex items-start gap-3 rounded-[0.75rem] bg-[rgba(255,183,133,0.12)] px-4 py-4">
                    <AlertTriangle className="mt-0.5 h-5 w-5 text-(--state-warning)" />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-(--text-primary)">
                        Payment setup needs attention
                      </p>
                      <p className="text-sm leading-6 text-(--text-secondary)">
                        {errorMessage}
                      </p>
                    </div>
                  </div>
                )}

                <div className="rounded-[0.85rem] bg-(--bg-inset) px-5 py-5 sm:px-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-2">
                      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-(--text-secondary)">
                        Next Step
                      </p>
                      <p className="max-w-2xl text-sm leading-6 text-(--text-secondary)">
                        {provider === "stripe"
                          ? "You'll be redirected to Stripe's hosted checkout to complete card payment securely."
                          : provider === "bakong_khqr"
                            ? "We'll generate a Bakong KHQR that can be scanned by compatible banking apps."
                            : "We'll generate an ABA PayWay QR so you can pay directly from ABA Mobile."}
                      </p>
                    </div>

                    <Button
                      type="button"
                      onClick={handleStartPayment}
                      disabled={isProcessing || isAlreadyPaid}
                      className="sevacam-primary-button min-h-12 rounded-[0.22rem] px-6 text-[0.62rem] font-semibold uppercase tracking-[0.18em] disabled:cursor-not-allowed"
                    >
                      {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
                      {paymentActionLabel}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {abaIntent && (
              <div ref={qrSectionRef} className="sevacam-rail overflow-hidden shadow-[0_20px_44px_rgba(0,0,0,0.16)] scroll-mt-8">
                <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_18rem]">
                  <div className="space-y-6 px-6 py-6 sm:px-8 sm:py-8">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="sevacam-eyebrow">{qrProviderMeta.title} Session</p>
                      <span
                        className={cn(
                          "inline-flex min-h-8 items-center rounded-full px-3 text-[0.58rem] font-semibold uppercase tracking-[0.16em]",
                          activeQrStatus === "completed"
                            ? "bg-[rgba(122,213,221,0.14)] text-(--accent-primary)"
                            : activeQrStatus === "failed"
                              ? "bg-[rgba(255,183,133,0.12)] text-(--state-warning)"
                              : "bg-(--bg-elevated) text-(--text-secondary)",
                        )}
                      >
                        {qrStatusLabel}
                      </span>
                    </div>

                    <div className="grid gap-6 md:grid-cols-[22rem_minmax(0,1fr)] md:items-start">
                      <div className="rounded-[0.85rem] bg-white p-5 shadow-[0_18px_38px_rgba(0,0,0,0.16)]">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Scan to pay
                          </p>
                          <QrCode className="h-4 w-4 text-slate-500" />
                        </div>

                        <div className="mt-4 flex min-h-80 items-center justify-center rounded-[0.65rem] bg-slate-50 p-3">
                          {abaQrImageSrc ? (
                            <img
                              src={abaQrImageSrc}
                              alt={`${qrProviderMeta.title} QR code`}
                              className="h-auto w-full object-contain"
                            />
                          ) : isGeneratingQrImage ? (
                            <div className="flex flex-col items-center gap-3 text-center text-slate-600">
                              <Loader2 className="h-7 w-7 animate-spin" />
                              <p className="text-sm font-medium">
                                Rendering secure QR
                              </p>
                            </div>
                          ) : hasAbaQrPayload ? (
                            <p className="max-w-[12rem] text-center text-sm leading-6 text-slate-600">
                              The QR payload is ready, but the image preview
                              could not be drawn on this device.
                            </p>
                          ) : (
                            <p className="max-w-[12rem] text-center text-sm leading-6 text-slate-600">
                              Use the direct payment link below if your bank
                              prefers opening the checkout session.
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-5">
                        <div className="space-y-2">
                          <h3 className="text-xl font-semibold text-(--text-primary)">
                            Payment is ready for {qrProviderMeta.title}
                          </h3>
                          <p className="max-w-2xl text-sm leading-7 text-(--text-secondary)">
                            Scan the code with your banking app or open the
                            payment session directly. We keep watching the
                            payment and will confirm the reservation as soon as
                            the provider returns success.
                          </p>
                        </div>

                        {(qrRenderError || abaExpiresAt) && (
                          <div className="grid gap-3 sm:grid-cols-2">
                            {abaExpiresAt && (
                              <div className="rounded-[0.7rem] bg-(--bg-elevated)/88 px-4 py-4">
                                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-(--text-secondary)">
                                  Expires
                                </p>
                                <p className="mt-3 text-sm font-medium text-(--text-primary)">
                                  {abaExpiresAt}
                                </p>
                              </div>
                            )}
                            {qrRenderError && (
                              <div className="rounded-[0.7rem] bg-[rgba(255,183,133,0.12)] px-4 py-4">
                                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-(--state-warning)">
                                  QR preview
                                </p>
                                <p className="mt-3 text-sm leading-6 text-(--text-secondary)">
                                  {qrRenderError}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {abaIntent.references.length > 0 && (
                          <div className="grid gap-3 sm:grid-cols-2">
                            {abaIntent.references.map((reference) => (
                              <div
                                key={`${reference.label}-${reference.value}`}
                                className="rounded-[0.7rem] bg-(--bg-elevated)/88 px-4 py-4"
                              >
                                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-(--text-secondary)">
                                  {reference.label}
                                </p>
                                <p className="mt-3 break-all text-sm font-medium text-(--text-primary)">
                                  {reference.value}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex flex-wrap gap-3">
                          {abaIntent.deeplink && (
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => {
                                window.location.href = abaIntent.deeplink!;
                              }}
                              className="sevacam-primary-button min-h-11 rounded-[0.22rem] px-5 text-[0.58rem] font-semibold uppercase tracking-[0.18em]"
                            >
                              Open in app
                              <ArrowUpRight className="h-4 w-4" />
                            </Button>
                          )}

                          {abaIntent.paymentUrl && (
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => {
                                window.location.href = abaIntent.paymentUrl!;
                              }}
                              className="sevacam-secondary-button min-h-11 rounded-[0.22rem] px-5 text-[0.58rem] font-semibold uppercase tracking-[0.18em]"
                            >
                              Open payment page
                              <ArrowUpRight className="h-4 w-4" />
                            </Button>
                          )}

                          {abaIntent.paymentId && (
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() =>
                                router.push(
                                  `/payment/${booking.id}?payment_id=${abaIntent.paymentId}`,
                                )
                              }
                              className="sevacam-secondary-button min-h-11 rounded-[0.22rem] px-5 text-[0.58rem] font-semibold uppercase tracking-[0.18em]"
                            >
                              Check status
                            </Button>
                          )}

                          {isLocalDev && abaIntent.paymentId && (
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={handleMarkSandboxPaid}
                              disabled={isProcessing}
                              className="sevacam-secondary-button min-h-11 rounded-[0.22rem] px-5 text-[0.58rem] font-semibold uppercase tracking-[0.18em]"
                            >
                              {isProcessing && (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              )}
                              Mark sandbox paid
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <aside className="border-t border-(--border-subtle) bg-(--bg-elevated)/70 px-6 py-6 sm:px-7 lg:border-l lg:border-t-0">
                    <div className="rounded-[0.85rem] bg-(--bg-surface) px-5 py-5 shadow-[0_16px_30px_rgba(0,0,0,0.14)]">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-(--text-secondary)">
                          Reservation secured on payment
                        </p>
                        <div className="rounded-[0.55rem] bg-white/95 px-3 py-2">
                          <Image
                            src={qrProviderMeta.logo}
                            alt={qrProviderMeta.logoAlt}
                            width={84}
                            height={24}
                            className="h-6 w-auto object-contain"
                          />
                        </div>
                      </div>

                      <p className="mt-6 text-3xl font-semibold tracking-[-0.04em] text-(--text-primary)">
                        {usd.format(amount)}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-(--text-secondary)">
                        {deposit > 0
                          ? "Deposit captured now. The remaining balance stays attached to your appointment."
                          : "Full amount is attached to this booking and confirms immediately when payment succeeds."}
                      </p>

                      <div className="mt-6 space-y-3">
                        <div className="sevacam-side-stat">
                          <span>Status</span>
                          <span>{qrStatusLabel}</span>
                        </div>
                        <div className="sevacam-side-stat">
                          <span>Provider</span>
                          <span>{qrProviderMeta.title}</span>
                        </div>
                        <div className="sevacam-side-stat">
                          <span>Reference</span>
                          <span>{abaIntent.paymentId || "Pending"}</span>
                        </div>
                      </div>
                    </div>
                  </aside>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
            <div className="sevacam-rail px-6 py-6 sm:px-7">
              <p className="sevacam-eyebrow">Payment Summary</p>
              <h2 className="sevacam-display mt-4 text-[clamp(2rem,3vw,2.8rem)] leading-[0.96] text-(--text-primary)">
                Reserve your window
              </h2>
              <p className="mt-3 text-sm leading-7 text-(--text-secondary)">
                Your details stay attached to this booking only. Payment confirms
                the reservation instantly.
              </p>

              <div className="mt-6 space-y-3">
                <div className="sevacam-side-stat">
                  <span>Service</span>
                  <span>{booking.services.name}</span>
                </div>
                <div className="sevacam-side-stat">
                  <span>Curator</span>
                  <span>{staffName}</span>
                </div>
                <div className="sevacam-side-stat">
                  <span>Date</span>
                  <span>{formatDateInTimeZone(startDate, timeZone)}</span>
                </div>
                <div className="sevacam-side-stat">
                  <span>Time</span>
                  <span>{formatTimeInTimeZone(startDate, timeZone)}</span>
                </div>
                <div className="sevacam-side-stat">
                  <span>Duration</span>
                  <span>{booking.services.duration_minutes} min</span>
                </div>
                <div className="sevacam-side-stat">
                  <span>Due now</span>
                  <span>{usd.format(amount)}</span>
                </div>
                {deposit > 0 && (
                  <div className="sevacam-side-stat">
                    <span>Remaining later</span>
                    <span>{usd.format(Math.max(price - deposit, 0))}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="sevacam-rail px-6 py-6 sm:px-7">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-(--text-secondary)">
                Available rails
              </p>

              <div className="mt-5 space-y-3">
                {providerOptions.map((option) => (
                  <div
                    key={`sidebar-${option.value}`}
                    className="flex items-center justify-between rounded-[0.7rem] bg-(--bg-elevated)/90 px-4 py-3"
                  >
                    <div className="rounded-[0.55rem] bg-white/95 px-3 py-2 shadow-[0_10px_18px_rgba(0,0,0,0.08)]">
                      <Image
                        src={option.logo}
                        alt={option.logoAlt}
                        width={82}
                        height={24}
                        className="h-6 w-auto object-contain"
                      />
                    </div>
                    <span className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-(--text-secondary)">
                      {option.badge}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-[0.75rem] bg-(--bg-elevated) px-4 py-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 text-(--accent-primary)" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-(--text-primary)">
                      Secure payment handling
                    </p>
                    <p className="text-sm leading-6 text-(--text-secondary)">
                      Stripe uses hosted checkout for cards. ABA PayWay and
                      Bakong keep reference details attached to this booking so
                      you can track the session clearly.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <PaymentSuccessModal
        open={showSuccess}
        bookingId={booking.id}
        amount={amount}
        currency="USD"
        onConfirm={() => {
          setShowSuccess(false);
          router.replace(`/payment/${booking.id}`);
        }}
      />
    </>
  );
}
