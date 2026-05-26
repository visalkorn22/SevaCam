"use client";

import type { CSSProperties } from "react";
import { SuccessAnimation } from "@/components/payment/success-animation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CheckCircle2 } from "lucide-react";

type Props = {
  open: boolean;
  bookingId: string;
  amount: number | string;
  currency?: string;
  onConfirm: () => void;
};

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

function formatAmount(amount: number | string, currency = "USD"): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return String(amount);
  if (currency.toUpperCase() === "USD") return usd.format(n);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 2,
  }).format(n);
}

export function PaymentSuccessModal({
  open,
  bookingId: _bookingId,
  amount,
  currency = "USD",
  onConfirm,
}: Props) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent
        overlayClassName="bg-black/72 backdrop-blur-xl"
        className="w-[min(92vw,30rem)] overflow-hidden rounded-[1rem] border border-white/10 bg-[#050708] p-0 text-white shadow-[0_38px_110px_rgba(0,0,0,0.62)]"
      >
        <div className="relative overflow-hidden px-6 pb-7 pt-8 sm:px-8">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(122,213,221,0.2),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_55%)]"
          />

          <div className="relative flex flex-col items-center">
            <div
              className="relative h-32 w-32 rounded-full border border-white/14 shadow-[0_0_0_1px_rgba(255,255,255,0.05)]"
              style={
                {
                  "--sa-circle-bg":
                    "radial-gradient(circle at 45% 38%, rgba(31,56,59,1), rgba(12,23,24,1))",
                  "--sa-shutter": "#0d1516",
                  "--sa-check-color": "#7ad5dd",
                  "--sa-glow-color": "rgba(122, 213, 221, 0.22)",
                } as CSSProperties
              }
            >
              <SuccessAnimation />
            </div>

            <AlertDialogHeader className="mt-5 items-center gap-2 text-center">
              <p className="text-[11px] font-normal uppercase tracking-[0.18em] text-white/68">
                Reservation secured
              </p>
              <AlertDialogTitle className="sevacam-display text-[clamp(2.35rem,7vw,3.25rem)] leading-[0.94] tracking-[-0.05em] text-white">
                Payment received
              </AlertDialogTitle>
              <AlertDialogDescription className="max-w-[23rem] text-[0.95rem] leading-7 text-white/76">
                Your payment is approved and the appointment is locked in.
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
        </div>

        <div className="border-t border-white/10 bg-[linear-gradient(180deg,rgba(7,10,11,0.84),rgba(4,5,6,0.96))] px-6 py-5 sm:px-8">
          <div className="rounded-[12px] border border-white/8 bg-white/[0.04] px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-normal uppercase tracking-[0.18em] text-white/58">
                  Amount paid
                </p>
                <p className="mt-2 text-[1.9rem] font-medium tracking-[-0.05em] text-white">
                  {formatAmount(amount, currency)}
                </p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[rgba(122,213,221,0.12)] text-[#7ad5dd]">
                <CheckCircle2 className="h-4 w-4" />
              </span>
            </div>
          </div>

          <AlertDialogFooter className="mt-5">
            <AlertDialogAction
              onClick={onConfirm}
              style={{
                background: "var(--sa-check-color)",
                borderColor:
                  "color-mix(in srgb, var(--sa-check-color) 72%, rgba(255,255,255,0.08))",
                color: "#062b2f",
              }}
              className="sevacam-booking-primary-action h-12 w-full px-6 text-[11px] font-medium uppercase tracking-[0.18em] shadow-[0_18px_36px_rgba(122,213,221,0.2)] hover:shadow-[0_22px_44px_rgba(122,213,221,0.26)]"
            >
              View booking confirmation
            </AlertDialogAction>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
