"use client";

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
import { cn } from "@/lib/utils";

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
      <AlertDialogContent className="motion-preset-slide-up-sm motion-duration-300 text-center">
        <AlertDialogHeader className="items-center gap-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
          <div className="space-y-1">
            <AlertDialogTitle className="text-xl font-semibold">
              Payment received
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              Your booking is now secured.
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>

        <div className="my-4 rounded-xl border border-border/40 bg-muted/20 px-4 py-3 text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Amount paid
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
            {formatAmount(amount, currency)}
          </p>
        </div>

        <AlertDialogFooter className={cn("sm:justify-center")}>
          <AlertDialogAction
            onClick={onConfirm}
            className="h-11 w-full rounded-xl bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 sm:w-auto sm:min-w-48"
          >
            View booking confirmation
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
