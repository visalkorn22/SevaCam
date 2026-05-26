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
        overlayClassName="bg-black/70 backdrop-blur-xl"
        className="w-[min(92vw,30rem)] animate-scale-in overflow-hidden rounded-xl border border-(--booking-frame) bg-(--bg-elevated) p-0 text-(--text-primary) shadow-[0_38px_110px_rgba(0,0,0,0.66)] motion-duration-300"
      >
        {/* Animation + header */}
        <div className="flex flex-col items-center px-6 pb-5 pt-7">
          {/* Animation circle */}
          <div className="relative h-40 w-40 rounded-full border border-(--booking-frame)">
            <SuccessAnimation />
          </div>

          {/* Pill badge */}
          <span
            data-tone="available"
            className="sevacam-booking-pill mt-4"
          >
            Reservation secured
          </span>

          {/* Title + description */}
          <AlertDialogHeader className="mt-3 items-center gap-2 text-center">
            <AlertDialogTitle className="sevacam-display text-[clamp(1.8rem,6vw,2.6rem)] leading-[1] tracking-[-0.04em] text-(--text-primary)">
              Payment received
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[0.85rem] leading-6 text-(--text-secondary)">
              Your payment is approved and the appointment is locked in.
            </AlertDialogDescription>
          </AlertDialogHeader>
        </div>

        {/* Footer bar */}
        <div className="border-t border-(--booking-frame) bg-(--bg-base) px-6 py-5">
          {/* Amount row */}
          <div className="sevacam-booking-card mb-4 flex items-center justify-between p-4">
            <div>
              <p className="sevacam-booking-label text-(--text-secondary)">
                Amount paid
              </p>
              <p className="mt-1 text-[1.7rem] font-medium tracking-[-0.04em] text-(--text-primary)">
                {formatAmount(amount, currency)}
              </p>
            </div>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-(--booking-pill-available-surface) text-(--accent-primary)">
              <Check className="h-4 w-4" />
            </span>
          </div>

          {/* CTA */}
          <AlertDialogFooter className="mt-0">
            <AlertDialogAction
              onClick={onConfirm}
              className="sevacam-booking-primary-action h-12 w-full px-6 text-[11px] font-medium uppercase tracking-[0.18em]"
            >
              View booking confirmation
            </AlertDialogAction>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
