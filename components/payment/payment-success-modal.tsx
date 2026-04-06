"use client";

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
import { Check } from "lucide-react";

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
        overlayClassName="bg-[#131313]/99 backdrop-blur-xl"
        className="w-[min(92vw,30rem)] animate-scale-in overflow-hidden rounded-[1.3rem] border border-white/8 bg-[#151515] p-0 text-[#f0eeeb] shadow-[0_38px_110px_rgba(0,0,0,0.66)] motion-duration-300"
      >
        {/* Animation + header */}
        <div className="flex flex-col items-center px-6 pb-5 pt-7">
          {/* Animation circle */}
          <div className="relative h-40 w-40 rounded-full ring-1 ring-white/8">
            <SuccessAnimation />
          </div>

          {/* Pill badge */}
          <span className="mt-4 inline-flex min-h-7 items-center rounded-full bg-[rgba(122,213,221,0.14)] px-3.5 text-[0.55rem] font-semibold uppercase tracking-[0.2em] text-[#7ad5dd]">
            Reservation secured
          </span>

          {/* Title + description */}
          <AlertDialogHeader className="mt-3 items-center gap-2 text-center">
            <AlertDialogTitle className="sevacam-display text-[clamp(1.8rem,6vw,2.6rem)] leading-[1] tracking-[-0.04em] text-[#f0eeeb]">
              Payment received
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[0.85rem] leading-6 text-[rgba(240,238,235,0.72)]">
              Your payment is approved and the appointment is locked in.
            </AlertDialogDescription>
          </AlertDialogHeader>
        </div>

        {/* Footer bar */}
        <div className="border-t border-white/6 bg-[#171717] px-6 py-5">
          {/* Amount row */}
          <div className="mb-4 flex items-center justify-between rounded-[0.8rem] bg-[#1f1f1f] px-4 py-3.5">
            <div>
              <p className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-[rgba(240,238,235,0.5)]">
                Amount paid
              </p>
              <p className="mt-1 text-[1.7rem] font-semibold tracking-[-0.04em] text-[#f0eeeb]">
                {formatAmount(amount, currency)}
              </p>
            </div>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(122,213,221,0.14)] text-[#7ad5dd]">
              <Check className="h-4 w-4" />
            </span>
          </div>

          {/* CTA */}
          <AlertDialogFooter className="mt-0">
            <AlertDialogAction
              onClick={onConfirm}
              className="h-12 w-full rounded-[0.5rem] border-0 bg-[#7ad5dd] px-6 text-[0.62rem] font-semibold uppercase tracking-[0.19em] text-[#07292d] shadow-[0_12px_24px_rgba(122,213,221,0.2)] hover:bg-[#92dfe5]"
            >
              View booking confirmation
            </AlertDialogAction>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
