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
  MapPin,
  QrCode,
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
import dynamic from "next/dynamic";
const LocationMapView = dynamic(
  () => import("@/components/booking/LocationMapView"),
  { ssr: false }
);

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
  location?: {
    name: string;
    address: string;
    latitude: number | null;
    longitude: number | null;
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

const SECTION_LABEL_CLASS = "sevacam-booking-label text-(--text-secondary)";
const PRIMARY_ACTION_CLASS =
  "sevacam-booking-primary-action inline-flex items-center justify-center gap-2 px-4 py-3 text-[11px] font-medium uppercase tracking-[0.18em] disabled:cursor-not-allowed disabled:opacity-100";
const SECONDARY_ACTION_CLASS =
  "sevacam-booking-secondary-action inline-flex items-center justify-center gap-2 px-4 py-3 text-[11px] font-medium uppercase tracking-[0.18em] disabled:cursor-not-allowed disabled:opacity-100";

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
  const qrStatusTone =
    activeQrStatus === "completed"
      ? "available"
      : activeQrStatus === "failed"
        ? "unavailable"
        : "today";

  return (
    <>
      <div className="mx-auto max-w-2xl space-y-6 text-(--text-primary) motion-preset-slide-up-sm motion-duration-500">
            <div className="sevacam-booking-rail overflow-hidden shadow-[0_24px_54px_rgba(0,0,0,0.22)]">
              {/* Booking summary */}
              <div className="px-6 py-5 sm:px-8">
                <p className={SECTION_LABEL_CLASS}>Your Booking</p>
                <div className="mt-3 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-base font-medium text-(--text-primary)">{booking.services.name}</p>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-(--text-secondary)">
                      <span>{staffName}</span>
                      <span className="text-(--border-subtle)">·</span>
                      <span>{formatDateInTimeZone(startDate, timeZone)}</span>
                      <span className="text-(--border-subtle)">·</span>
                      <span>{formatTimeInTimeZone(startDate, timeZone)}</span>
                      <span className="text-(--border-subtle)">·</span>
                      <span>{booking.services.duration_minutes} min</span>
                    </div>
                    {booking.location && (booking.location.name || booking.location.address) && (
                      <div className="mt-1.5 flex items-start gap-1.5 text-xs text-(--text-secondary)">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-(--accent-primary)" />
                        <div>
                          <span className="font-medium text-(--text-primary)">
                            {booking.location.name || booking.location.address}
                          </span>
                          {booking.location.name && booking.location.address && (
                            <p className="mt-0.5 text-(--text-secondary)">{booking.location.address}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xl font-medium tracking-[-0.03em] text-(--text-primary)">{usd.format(amount)}</p>
                    <p className="mt-0.5 text-[0.65rem] text-(--text-secondary)">
                      {deposit > 0 ? "deposit" : "due now"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-(--booking-frame)" />

              {/* Payment method */}
              <div className="space-y-4 px-6 py-6 sm:px-8">
                {isAlreadyPaid && (
                  <div className="flex items-center gap-3 rounded-xl border border-(--booking-frame) bg-(--booking-pill-available-surface) px-4 py-3 text-(--accent-primary)">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-(--accent-primary)" />
                    <p className="text-sm font-medium">Payment already received</p>
                  </div>
                )}

                <p className={SECTION_LABEL_CLASS}>Payment Method</p>

                <div className="space-y-2">
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
                          "sevacam-booking-card sevacam-interactive-card flex w-full items-center gap-4 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-primary)/20",
                          isSelected
                            ? "sevacam-booking-card-selected border-(--accent-primary)"
                            : "hover:border-(--accent-primary)/40",
                        )}
                      >
                        <div className="rounded-lg bg-white/95 px-2.5 py-1.5 shadow-[0_4px_10px_rgba(0,0,0,0.08)]">
                          <Image
                            src={option.logo}
                            alt={option.logoAlt}
                            width={72}
                            height={22}
                            className="h-5 w-auto object-contain"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-(--text-primary)">{option.title}</p>
                          <p className="text-xs text-(--text-secondary)">{option.description}</p>
                        </div>
                        <div className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                          isSelected
                            ? "border-(--accent-primary) bg-(--booking-pill-available-surface)"
                            : "border-(--booking-frame)",
                        )}>
                          {isSelected && <span className="h-2 w-2 rounded-full bg-(--accent-primary)" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {errorMessage && (
                  <div className="flex items-start gap-3 rounded-xl border border-(--booking-frame) bg-(--state-warning-subtle) px-4 py-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-(--state-warning)" />
                    <p className="text-sm text-(--text-secondary)">{errorMessage}</p>
                  </div>
                )}

                <Button
                  type="button"
                  onClick={handleStartPayment}
                  disabled={isProcessing || isAlreadyPaid}
                  className={`${PRIMARY_ACTION_CLASS} w-full min-h-12 px-6`}
                >
                  {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
                  {paymentActionLabel}
                </Button>
              </div>
            </div>

            {abaIntent && (
              <div ref={qrSectionRef} className="sevacam-booking-rail overflow-hidden shadow-[0_20px_44px_rgba(0,0,0,0.16)] scroll-mt-8">
                <div className="px-6 py-6 sm:px-8 sm:py-7">

                  {/* Header: provider + status */}
                  <div className="flex items-center justify-between gap-3">
                    <p className={SECTION_LABEL_CLASS}>{qrProviderMeta.title}</p>
                    <span data-tone={qrStatusTone} className="sevacam-booking-pill">
                      {qrStatusLabel}
                    </span>
                  </div>

                  {/* Booking summary strip */}
                  <div className="mt-4 flex items-start justify-between gap-3 rounded-xl bg-(--bg-elevated) px-4 py-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-(--text-primary)">{booking.services.name}</p>
                      <p className="mt-0.5 text-xs text-(--text-secondary)">
                        {staffName} · {formatDateInTimeZone(startDate, timeZone)} · {formatTimeInTimeZone(startDate, timeZone)} · {booking.services.duration_minutes} min
                      </p>
                    </div>
                    <p className="shrink-0 text-base font-medium text-(--text-primary)">{usd.format(amount)}</p>
                  </div>

                  {/* QR + info side by side */}
                  <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start">

                    {/* QR code */}
                    <div className="mx-auto w-full max-w-55 shrink-0 rounded-xl bg-white p-4 shadow-[0_12px_28px_rgba(0,0,0,0.14)] sm:mx-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-normal uppercase tracking-[0.18em] text-slate-500">Scan to pay</p>
                        <QrCode className="h-3.5 w-3.5 text-slate-400" />
                      </div>
                      <div className="mt-3 flex aspect-square items-center justify-center rounded-xl bg-slate-50 p-2">
                        {abaQrImageSrc ? (
                          <img
                            src={abaQrImageSrc}
                            alt={`${qrProviderMeta.title} QR code`}
                            className="h-auto w-full object-contain"
                          />
                        ) : isGeneratingQrImage ? (
                          <div className="flex flex-col items-center gap-2 text-slate-500">
                            <Loader2 className="h-6 w-6 animate-spin" />
                            <p className="text-xs">Generating…</p>
                          </div>
                        ) : (
                          <p className="text-center text-xs leading-5 text-slate-500">
                            {hasAbaQrPayload ? "Preview unavailable on this device" : "Use the link below to open checkout"}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Status + actions */}
                    <div className="flex flex-1 flex-col gap-4">

                      {/* Status rows */}
                      <div className="rounded-xl bg-(--bg-elevated) px-4 py-4 space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-(--text-secondary)">Status</span>
                          <span className="font-medium text-(--text-primary)">{qrStatusLabel}</span>
                        </div>
                        <div className="border-t border-(--booking-frame)" />
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-(--text-secondary)">Provider</span>
                          <div className="rounded-md bg-white/95 px-2 py-1 shadow-[0_2px_6px_rgba(0,0,0,0.08)]">
                            <Image
                              src={qrProviderMeta.logo}
                              alt={qrProviderMeta.logoAlt}
                              width={64}
                              height={18}
                              className="h-4 w-auto object-contain"
                            />
                          </div>
                        </div>
                        {abaExpiresAt && (
                          <>
                            <div className="border-t border-(--booking-frame)" />
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-(--text-secondary)">Expires</span>
                              <span className="font-medium text-(--text-primary)">{abaExpiresAt}</span>
                            </div>
                          </>
                        )}
                      </div>

                      {qrRenderError && (
                        <div className="rounded-xl border border-(--booking-frame) bg-(--state-warning-subtle) px-4 py-3">
                          <p className="text-xs leading-5 text-(--text-secondary)">{qrRenderError}</p>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex flex-wrap gap-2">
                        {abaIntent.deeplink && (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => { window.location.href = abaIntent.deeplink!; }}
                            className={`${PRIMARY_ACTION_CLASS} min-h-10 px-4`}
                          >
                            Open in app
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {abaIntent.paymentUrl && (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => { window.location.href = abaIntent.paymentUrl!; }}
                            className={`${SECONDARY_ACTION_CLASS} min-h-10 px-4`}
                          >
                            Open payment page
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {abaIntent.paymentId && (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => router.push(`/payment/${booking.id}?payment_id=${abaIntent.paymentId}`)}
                            className={`${SECONDARY_ACTION_CLASS} min-h-10 px-4`}
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
                            className={`${SECONDARY_ACTION_CLASS} min-h-10 px-4`}
                          >
                            {isProcessing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            Mark sandbox paid
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}
            {booking.location && (booking.location.name || booking.location.address) && (
              <div className="print:hidden">
                <div className="sevacam-booking-rail overflow-hidden shadow-[0_20px_44px_rgba(0,0,0,0.16)]">
                  <div className="px-6 py-5 sm:px-7 sm:py-6">
                    <p className={SECTION_LABEL_CLASS}>Appointment Location</p>
                    <div className="mt-4">
                      {booking.location.latitude != null && booking.location.longitude != null ? (
                        <LocationMapView
                          location={{
                            name: booking.location.name,
                            address: booking.location.address,
                            latitude: booking.location.latitude,
                            longitude: booking.location.longitude,
                          }}
                        />
                      ) : (
                        <div className="sevacam-booking-card p-4">
                          <div className="flex items-start gap-2">
                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-(--accent-primary)" />
                            <div>
                              <p className="text-sm font-medium text-(--text-primary)">
                                {booking.location.name || booking.location.address}
                              </p>
                              {booking.location.name && booking.location.address && (
                                <p className="mt-1 text-xs text-(--text-secondary)">
                                  {booking.location.address}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
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
