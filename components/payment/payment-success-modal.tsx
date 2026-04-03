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
        className="w-[min(94vw,42rem)] animate-scale-in overflow-hidden rounded-[1.3rem] border border-white/8 bg-[#151515] p-0 text-[#f0eeeb] shadow-[0_38px_110px_rgba(0,0,0,0.66)] motion-duration-300"
      >
        <div className="relative px-7 py-8 sm:px-10 sm:py-10">
          <div className="relative">
            <div className="mx-auto flex min-h-[12rem] items-center justify-center overflow-visible sm:min-h-[13.5rem]">
              <div className="relative h-52 w-52 rounded-full sm:h-64 sm:w-64 ring-1 ring-white/8">
                <SuccessAnimation />
              </div>
            </div>

            <AlertDialogHeader className="mt-4 items-center gap-4 text-center sm:mt-6">
              <span className="inline-flex min-h-8 items-center rounded-full bg-[rgba(122,213,221,0.14)] px-4 text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-[#7ad5dd]">
                Reservation secured
              </span>
              <div className="space-y-2.5">
                <AlertDialogTitle className="sevacam-display text-[clamp(2.6rem,7vw,4.2rem)] leading-[0.9] tracking-[-0.05em] text-[#f0eeeb]">
                  Payment received
                </AlertDialogTitle>
                <AlertDialogDescription className="mx-auto max-w-2xl text-[0.98rem] leading-7 text-[rgba(240,238,235,0.82)]">
                  Your payment has been approved and the appointment is now
                  locked in. Continue to the confirmation page for the final
                  details and next steps.
                </AlertDialogDescription>
              </div>
            </AlertDialogHeader>
          </div>
        </div>

        <div className="border-t border-white/6 bg-[#171717] px-7 py-6 sm:px-10 sm:py-7">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_15rem] sm:items-center">
            <div className="rounded-[0.95rem] bg-[#1f1f1f] px-5 py-5 text-left">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[rgba(240,238,235,0.66)]">
                Amount paid
              </p>
              <p className="mt-3 text-[2.35rem] font-semibold tracking-[-0.05em] text-[#f0eeeb]">
                {formatAmount(amount, currency)}
              </p>
              <div className="mt-3 flex items-center gap-2.5 text-[#f0eeeb]">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[rgba(122,213,221,0.14)] text-[#7ad5dd]">
                  <Check className="h-3.5 w-3.5" />
                </span>
                <span className="text-[0.94rem] font-medium text-[rgba(240,238,235,0.84)]">
                  Confirmed now
                </span>
              </div>
            </div>

            <AlertDialogFooter className="mt-0 sm:justify-end">
              <AlertDialogAction
                onClick={onConfirm}
                className="h-14 w-full rounded-[0.22rem] border-0 bg-[#7ad5dd] px-6 text-[0.64rem] font-semibold uppercase tracking-[0.19em] text-[#07292d] shadow-[0_18px_32px_rgba(122,213,221,0.2)] hover:bg-[#92dfe5] sm:min-w-60"
              >
                View booking confirmation
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
