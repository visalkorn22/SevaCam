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
        className="w-[min(92vw,30rem)] animate-scale-in overflow-hidden rounded-[1.3rem] border border-(--seva-border-subtle) bg-(--seva-surface) p-0 text-(--seva-text) shadow-[0_38px_110px_rgba(0,0,0,0.66)] motion-duration-300"
      >
        {/* Animation + header */}
        <div className="flex flex-col items-center px-6 pb-5 pt-7">
          {/* Animation circle */}
          <div className="relative h-40 w-40 rounded-full ring-1 ring-(--seva-border-subtle)">
            <SuccessAnimation />
          </div>

          {/* Pill badge */}
          <span className="mt-4 inline-flex min-h-7 items-center rounded-full bg-(--seva-accent-subtle) px-3.5 text-[0.55rem] font-semibold uppercase tracking-[0.2em] text-(--seva-accent)">
            Reservation secured
          </span>

          {/* Title + description */}
          <AlertDialogHeader className="mt-3 items-center gap-2 text-center">
            <AlertDialogTitle className="sevacam-display text-[clamp(1.8rem,6vw,2.6rem)] leading-[1] tracking-[-0.04em] text-(--seva-text)">
              Payment received
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[0.85rem] leading-6 text-(--seva-text-soft)">
              Your payment is approved and the appointment is locked in.
            </AlertDialogDescription>
          </AlertDialogHeader>
        </div>

        {/* Footer bar */}
        <div className="border-t border-(--seva-border-subtle) bg-(--seva-elevated) px-6 py-5">
          {/* Amount row */}
          <div className="mb-4 flex items-center justify-between rounded-[0.8rem] bg-(--seva-inset) px-4 py-3.5">
            <div>
              <p className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-(--seva-text-muted)">
                Amount paid
              </p>
              <p className="mt-1 text-[1.7rem] font-semibold tracking-[-0.04em] text-(--seva-text)">
                {formatAmount(amount, currency)}
              </p>
            </div>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-(--seva-accent-subtle) text-(--seva-accent)">
              <Check className="h-4 w-4" />
            </span>
          </div>

          {/* CTA */}
          <AlertDialogFooter className="mt-0">
            <AlertDialogAction
              onClick={onConfirm}
              className="h-12 w-full rounded-[0.5rem] border-0 bg-(--seva-accent) px-6 text-[0.62rem] font-semibold uppercase tracking-[0.19em] text-(--seva-accent-ink) shadow-[0_12px_24px_rgba(122,213,221,0.2)] hover:bg-(--seva-accent-deep)"
            >
              View booking confirmation
            </AlertDialogAction>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
