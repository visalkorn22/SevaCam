# Payment Success Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a one-time success modal immediately when a KHQR Bakong or Stripe payment completes, without requiring the user to click "Check status" or navigate away.

**Architecture:** A shared `usePaymentPoller` hook encapsulates all fetch/poll logic (replacing duplicated inline `setInterval` code). A presentational `PaymentSuccessModal` built on the existing `AlertDialog` primitive handles the non-dismissible overlay. `PaymentForm` starts background KHQR polling the moment a QR intent is created; `PaymentReturnStatus` uses the same hook for Stripe. A `committedProvider` snapshot prevents the live provider selector from interfering with an in-flight KHQR poll. `sessionStorage` guards the "show once" invariant across remounts. The page server component removes the premature Stripe short-circuit so the modal can always fire first.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript (strict), `@radix-ui/react-alert-dialog` (already wrapped at `components/ui/alert-dialog.tsx`), Tailwind CSS, `lucide-react`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `hooks/use-payment-poller.ts` | **Create** | Polling + fetch logic; no UI or side-effects |
| `components/payment/payment-success-modal.tsx` | **Create** | Non-dismissible success overlay; purely presentational |
| `components/payment/payment-form.tsx` | **Modify** | Add `committedProvider` snapshot, hook usage, and modal render |
| `components/payment/payment-return-status.tsx` | **Modify** | Replace inline polling with hook, remove auto-push, add modal |
| `app/payment/[bookingId]/page.tsx` | **Modify** | Remove Stripe already-completed short-circuit |

---

## Task 1: `usePaymentPoller` hook

**Files:**
- Create: `hooks/use-payment-poller.ts`

### Background

This hook owns all payment status fetching. It replaces the duplicated `setInterval` + `fetchPayment` code that currently lives inline in `PaymentReturnStatus`. `PaymentForm` will also use it for background KHQR polling.

`PaymentRecord` mirrors the shape in both existing components:
```ts
type PaymentRecord = {
  id: string;
  booking_id: string;
  provider: string;
  provider_reference?: string | null;
  amount: string | number;
  currency: string;
  status: string;
  created_at: string;
};
```

Terminal statuses that stop polling: `"completed"`, `"failed"`, `"refunded"`.

Fetch URL pattern: `GET /api/payments/{paymentId}` — when `stripeSessionId` is provided, append `?stripe_session_id={stripeSessionId}`.

- [ ] **Step 1: Create the hook file**

Create `hooks/use-payment-poller.ts` with this exact content:

```ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type PaymentRecord = {
  id: string;
  booking_id: string;
  provider: string;
  provider_reference?: string | null;
  amount: string | number;
  currency: string;
  status: string;
  created_at: string;
};

type Options = {
  enabled: boolean;
  autoRefresh?: boolean;
  initialPayment?: PaymentRecord | null;
  deferInitialFetch?: boolean;
  stripeSessionId?: string | null;
};

type Result = {
  payment: PaymentRecord | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
};

const TERMINAL = new Set(["completed", "failed", "refunded"]);
const POLL_MS = 3_000;

export function usePaymentPoller(
  paymentId: string | null,
  options: Options,
): Result {
  const {
    enabled,
    autoRefresh = true,
    initialPayment = null,
    deferInitialFetch = false,
    stripeSessionId = null,
  } = options;

  const [payment, setPayment] = useState<PaymentRecord | null>(initialPayment);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep a stable ref so the interval callback always reads current values
  // without needing them as dependencies.
  const stateRef = useRef({ payment, enabled, paymentId, stripeSessionId });
  stateRef.current = { payment, enabled, paymentId, stripeSessionId };

  const doFetch = useCallback(async () => {
    const { paymentId: id, stripeSessionId: sid } = stateRef.current;
    if (!id) return;

    setIsLoading(true);
    setError(null);

    try {
      const query = sid ? `?stripe_session_id=${encodeURIComponent(sid)}` : "";
      const res = await fetch(`/api/payments/${id}${query}`, {
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as
        | PaymentRecord
        | { detail?: string; error?: string };

      if (!res.ok || !("status" in data)) {
        throw new Error(
          ("detail" in data && data.detail) ||
            ("error" in data && data.error) ||
            "Unable to load payment status",
        );
      }

      setPayment(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load payment status");
    } finally {
      setIsLoading(false);
    }
  }, []); // stable — reads from stateRef

  // Public refetch: always fetches, regardless of terminal state or autoRefresh.
  const refetch = useCallback(() => {
    if (!stateRef.current.enabled || !stateRef.current.paymentId) return;
    void doFetch();
  }, [doFetch]);

  // Initial fetch (unless deferred).
  useEffect(() => {
    if (!enabled || !paymentId || deferInitialFetch) return;
    void doFetch();
    // Re-run only when the payment identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, paymentId]);

  // Polling interval.
  useEffect(() => {
    if (!enabled || !paymentId || !autoRefresh) return;
    if (payment && TERMINAL.has(payment.status)) return;

    const id = window.setInterval(() => {
      if (stateRef.current.payment && TERMINAL.has(stateRef.current.payment.status)) {
        window.clearInterval(id);
        return;
      }
      void doFetch();
    }, POLL_MS);

    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, paymentId, autoRefresh, payment?.status]);

  return { payment, isLoading, error, refetch };
}
```

- [ ] **Step 2: Type-check**

```bash
cd c:/Personal/Y4T1/Internship/Dev/booking-schedule-system
npx tsc --noEmit
```

Expected: no errors in `hooks/use-payment-poller.ts`. Fix any TypeScript errors before continuing.

- [ ] **Step 3: Commit**

```bash
git add hooks/use-payment-poller.ts
git commit -m "feat: add usePaymentPoller hook for shared payment status polling"
```

---

## Task 2: `PaymentSuccessModal` component

**Files:**
- Create: `components/payment/payment-success-modal.tsx`

### Background

Uses the existing `AlertDialog` primitive from `components/ui/alert-dialog.tsx`. `AlertDialog` from `@radix-ui/react-alert-dialog` is non-dismissible by design — Escape and outside-click are blocked without any extra props. No close button is rendered.

The `onConfirm` callback is called when the user clicks "View booking confirmation". Navigation (`router.push` / `router.refresh`) happens in the parent, not here.

- [ ] **Step 1: Create the modal file**

Create `components/payment/payment-success-modal.tsx` with this exact content:

```tsx
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
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no new errors. Fix any before continuing.

- [ ] **Step 3: Commit**

```bash
git add components/payment/payment-success-modal.tsx
git commit -m "feat: add PaymentSuccessModal presentational component"
```

---

## Task 3: Modify `payment-form.tsx` — KHQR background polling + modal

**Files:**
- Modify: `components/payment/payment-form.tsx`

### Background

Three additions to this file:
1. `committedProvider` state — snapshot the selected provider at intent-creation time so the live selector does not affect the poller.
2. `usePaymentPoller` — enabled only when `committedProvider === "bakong_khqr"` and a `paymentId` is present.
3. `showSuccess` state + sessionStorage guard + `<PaymentSuccessModal>` render.

`onConfirm` calls `router.refresh()` — the user is already on `/payment/[bookingId]`, so a refresh causes the server to re-fetch the booking and render `ConfirmedView` when it sees `payment_status === "paid"`.

Read `components/payment/payment-form.tsx` before editing to confirm current line numbers.

- [ ] **Step 1: Add imports**

At the top of `components/payment/payment-form.tsx`, add the two new imports directly after the existing imports:

```tsx
import { usePaymentPoller } from "@/hooks/use-payment-poller";
import { PaymentSuccessModal } from "@/components/payment/payment-success-modal";
```

- [ ] **Step 2: Add `committedProvider` and `showSuccess` state**

Inside `PaymentForm`, after the existing state declarations (the block ending with `const router = useRouter();`), add:

```ts
const [committedProvider, setCommittedProvider] = useState<PaymentProvider | null>(null);
const [showSuccess, setShowSuccess] = useState(false);
```

- [ ] **Step 3: Snapshot `committedProvider` at intent creation**

Inside `handleStartPayment`, in the branch that calls `setAbaIntent(normalizedIntent)` (currently around line 400), add `setCommittedProvider(provider)` immediately after:

```ts
setAbaIntent(normalizedIntent);
setCommittedProvider(provider);   // snapshot provider at intent-creation time
setIsProcessing(false);
```

Also reset it when a new payment attempt starts. At the top of `handleStartPayment`, in the block that resets state before the try, add:

```ts
if (provider === "aba_payway" || provider === "bakong_khqr") {
  setAbaIntent(null);
  setGeneratedQrImage(null);
  setCommittedProvider(null);   // add this line
}
```

- [ ] **Step 4: Add `usePaymentPoller` call**

After the existing `useEffect` blocks (before the `abaQrImageSrc` derived values), add:

```ts
const { payment: polledPayment } = usePaymentPoller(
  abaIntent?.paymentId ?? null,
  {
    enabled: committedProvider === "bakong_khqr" && Boolean(abaIntent?.paymentId),
  },
);
```

- [ ] **Step 5: Add the success `useEffect`**

After the `usePaymentPoller` call, add:

```ts
useEffect(() => {
  if (polledPayment?.status !== "completed") return;
  const key = `payment_success_shown_${abaIntent?.paymentId}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, "1");
  setShowSuccess(true);
}, [polledPayment?.status, abaIntent?.paymentId]);
```

- [ ] **Step 6: Render `PaymentSuccessModal`**

At the very end of the returned JSX, just before the closing `</div>` of the outer wrapper, add:

```tsx
<PaymentSuccessModal
  open={showSuccess}
  bookingId={booking.id}
  amount={amount}
  onConfirm={() => router.refresh()}
/>
```

- [ ] **Step 7: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors. Fix any TypeScript errors before continuing.

- [ ] **Step 8: Smoke-test in dev**

Start the dev server (`pnpm dev` or `npm run dev`). Navigate to a booking payment page, select Bakong KHQR, click Pay. Confirm the QR appears. Verify no console errors from the poller.

- [ ] **Step 9: Commit**

```bash
git add components/payment/payment-form.tsx
git commit -m "feat: add KHQR background polling and success modal to PaymentForm"
```

---

## Task 4: Modify `payment-return-status.tsx` — replace inline polling with hook + modal

**Files:**
- Modify: `components/payment/payment-return-status.tsx`

### Background

Two things are replaced:
1. The inline `fetchPayment` async function + its two `useEffect` callers (initial fetch + `setInterval`) — replaced by `usePaymentPoller`.
2. The `useEffect` that calls `router.push` when `status === "completed"` — removed. The modal CTA handles navigation.

`stripeSessionId` is now passed into the hook (not appended manually). `deferInitialFetch` and `autoRefresh` are also forwarded to the hook.

`onConfirm` calls `router.replace('/payment/${payment.booking_id}')` — the `replace` removes the `?payment_id=...` URL from browser history.

Read `components/payment/payment-return-status.tsx` before editing to confirm current line numbers.

- [ ] **Step 1: Add imports, remove local `PaymentRecord` type, update React import**

Replace the existing `useEffect, useMemo, useRef, useState` import with:

```tsx
import { useEffect, useMemo, useState } from "react";
```

(`useRef` is no longer needed — the `hasNavigatedRef` goes away with the auto-push removal.)

Add after the existing imports:

```tsx
import { usePaymentPoller, type PaymentRecord } from "@/hooks/use-payment-poller";
import { PaymentSuccessModal } from "@/components/payment/payment-success-modal";
```

Delete the local `PaymentRecord` type definition that was already in this file (the one with `id`, `booking_id`, `provider`, etc.) — the hook now exports the canonical version with the same shape.

- [ ] **Step 2: Replace state declarations and fetch logic**

Remove these from the component body:
- `const hasNavigatedRef = useRef(false);`
- `const [payment, setPayment] = useState<PaymentRecord | null>(initialPayment);`
- `const [isLoading, setIsLoading] = useState(!initialPayment && !deferInitialFetch);`
- `const [error, setError] = useState<string | null>(null);`
- The entire `fetchPayment` async function
- All three `useEffect` blocks: initial-fetch effect, interval effect, and auto-push-on-completed effect

Replace them with:

```ts
const { payment, isLoading, error, refetch } = usePaymentPoller(paymentId, {
  enabled: Boolean(paymentId),
  autoRefresh,
  initialPayment,
  deferInitialFetch,
  stripeSessionId,
});

const [showSuccess, setShowSuccess] = useState(false);

useEffect(() => {
  if (payment?.status !== "completed") return;
  const key = `payment_success_shown_${paymentId}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, "1");
  setShowSuccess(true);
}, [payment?.status, paymentId]);
```

- [ ] **Step 3: Update `status` and `isTerminal` derived values**

These two lines were derived from `payment?.status`. They stay unchanged — just confirm they read from the hook's `payment`:

```ts
const status = payment?.status || "pending";
const isTerminal = ["completed", "failed", "refunded"].includes(status);
```

- [ ] **Step 4: Update the Refresh button to call `refetch()`**

Find the Refresh Status button (previously called `fetchPayment()`). Change its `onClick` to:

```tsx
onClick={() => refetch()}
```

- [ ] **Step 5: Render `PaymentSuccessModal`**

At the very end of the returned JSX, just before the closing `</div>` of the outer wrapper, add:

```tsx
<PaymentSuccessModal
  open={showSuccess}
  bookingId={payment?.booking_id ?? ""}
  amount={Number(payment?.amount ?? 0)}
  currency={payment?.currency}
  onConfirm={() => router.replace(`/payment/${payment?.booking_id}`)}
/>
```

- [ ] **Step 6: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors. In particular, confirm `useRef` is gone from the import and no "unused variable" errors for `hasNavigatedRef` or the old fetch function.

- [ ] **Step 7: Commit**

```bash
git add components/payment/payment-return-status.tsx
git commit -m "feat: replace inline polling with usePaymentPoller and add success modal in PaymentReturnStatus"
```

---

## Task 5: Modify `app/payment/[bookingId]/page.tsx` — remove Stripe short-circuit

**Files:**
- Modify: `app/payment/[bookingId]/page.tsx`

### Background

Currently, if `payment_id` is in the URL and the server fetches a `completed` payment, the page renders `ConfirmedView` directly — bypassing `PaymentReturnStatus` and therefore the success modal. For Stripe returns where Stripe has already confirmed by the time the user is redirected back, this skips the modal entirely.

The fix: when `payment_id` is present, always render `PaymentReturnStatus` regardless of status. `ConfirmedView` should only be reached via the clean URL `/payment/[bookingId]` with no `payment_id` param — which is where the modal CTA navigates to.

Read `app/payment/[bookingId]/page.tsx` before editing to confirm current line numbers.

- [ ] **Step 1: Remove the already-completed short-circuit block**

Find this block (currently around lines 251–259):

```ts
// Payment already completed server-side — skip polling, show confirmation
if (payment?.status === "completed") {
  const booking = await getBooking(bookingId);
  if (!booking?.services) notFound();
  return <ConfirmedView booking={booking} />;
}
```

Delete it entirely. The code that follows (`return <PaymentReturnStatus .../>`) now handles all cases where `payment_id` is present, including already-completed payments.

After deletion, the `paymentId` branch in the server component should look like:

```tsx
if (paymentId) {
  const payment = await getPayment(paymentId, stripeSessionId);

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-12">
        <div className="mx-auto max-w-2xl">
          <PaymentReturnStatus
            paymentId={paymentId}
            initialPayment={payment}
            stripeSessionId={stripeSessionId ?? null}
            autoRefresh
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors. In particular, confirm `ConfirmedView` is still used in the `booking.payment_status === "paid"` branch below (clean URL path) and the import is not flagged as unused.

- [ ] **Step 3: Commit**

```bash
git add app/payment/[bookingId]/page.tsx
git commit -m "feat: always render PaymentReturnStatus when payment_id present so Stripe modal can fire"
```

---

## Task 6: End-to-end smoke test

No code changes. Manual verification only.

- [ ] **Step 1: Start the dev server**

```bash
pnpm dev
```

- [ ] **Step 2: Test KHQR Bakong flow**

1. Navigate to a booking payment page.
2. Select **Bakong KHQR**, click **Pay** → QR appears.
3. Switch the provider selector to another option (e.g. Stripe) — the QR panel stays, the poller should remain active (keyed to `committedProvider`, not the live selector).
4. Complete the payment in the Bakong app (or use the sandbox "Mark Paid" button if available in dev).
5. **Expected:** success modal appears within ≤3 seconds, without the user clicking "Check status".
6. Click **View booking confirmation** → page refreshes and shows `ConfirmedView`.
7. Navigate back to the same payment URL — modal must NOT reappear (sessionStorage guard).

- [ ] **Step 3: Test Stripe flow**

1. Navigate to a booking payment page.
2. Select **Stripe**, click **Pay** → redirected to Stripe Checkout.
3. Complete payment in Stripe → redirected back to `/payment/[bookingId]?payment_id=...&stripe_session_id=...`.
4. **Expected:** `PaymentReturnStatus` renders (not `ConfirmedView` directly), and the success modal appears immediately (or within one poll if the webhook hasn't fired yet).
5. Click **View booking confirmation** → navigates to `/payment/[bookingId]` (clean URL, no query params) and shows `ConfirmedView`.
6. Hit browser back — the `?payment_id=...` URL is not in history (replaced, not pushed).

- [ ] **Step 4: Test "already paid" clean URL**

1. Navigate to `/payment/[bookingId]` (no query params) for a booking with `payment_status = "paid"`.
2. **Expected:** `ConfirmedView` renders directly — no modal, no polling.

- [ ] **Step 5: Final type-check**

```bash
npx tsc --noEmit
```

Expected: no errors across all five modified/created files.
