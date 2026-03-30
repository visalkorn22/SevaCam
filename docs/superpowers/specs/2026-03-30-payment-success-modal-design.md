# Payment Success Modal — Design Spec

**Date:** 2026-03-30
**Status:** Approved

## Goal

Show a one-time success popup/modal as soon as payment is confirmed, for both KHQR Bakong and Stripe. The user should not need to click "Check status" or navigate away to discover success. After dismissing the modal via its single CTA, the user lands on the full `ConfirmedView`.

---

## Scope

Five files change:

| File | Change type |
|---|---|
| `hooks/use-payment-poller.ts` | New |
| `components/payment/payment-success-modal.tsx` | New |
| `components/payment/payment-form.tsx` | Modified |
| `components/payment/payment-return-status.tsx` | Modified |
| `app/payment/[bookingId]/page.tsx` | Modified |

---

## 1. `hooks/use-payment-poller.ts`

### Signature

```ts
function usePaymentPoller(
  paymentId: string | null,
  options: {
    enabled: boolean;
    autoRefresh?: boolean;         // default true
    initialPayment?: PaymentRecord | null;
    deferInitialFetch?: boolean;   // default false
    stripeSessionId?: string | null; // when set, appended as ?stripe_session_id=...
  }
): {
  payment: PaymentRecord | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}
```

### Behaviour

- `enabled: false` → hook is completely dormant. No fetch, no interval. `refetch()` is a no-op.
- `enabled: true, deferInitialFetch: false` (default) → one immediate fetch on mount / when `paymentId` changes, then polling begins if `autoRefresh` is true.
- `enabled: true, deferInitialFetch: true` → no immediate fetch. First real fetch happens only when `refetch()` is called or the interval fires.
- `autoRefresh: false` → no interval. Only the initial fetch (if not deferred) and manual `refetch()` calls.
- `autoRefresh: false, deferInitialFetch: true` → no initial fetch and no interval; `refetch()` is the only trigger.
- Polling interval: 3 000 ms.
- Polling stops automatically when `payment.status` is `completed`, `failed`, or `refunded`.
- `refetch()` always triggers an immediate fetch regardless of `autoRefresh` or terminal state.
- Fetch URL: `GET /api/payments/{paymentId}` — when `stripeSessionId` is present, appends `?stripe_session_id={stripeSessionId}`. The hook owns this query-param logic; callers do not construct the URL.
- `PaymentRecord` type is defined locally in the hook (same shape as in the existing components).

### Responsibilities

- Fetching and polling only.
- No sessionStorage, no modal, no navigation.

---

## 2. `components/payment/payment-success-modal.tsx`

### Props

```ts
{
  open: boolean;
  bookingId: string;
  amount: number | string;
  currency?: string;         // default "USD"
  onConfirm: () => void;
}
```

### Behaviour

- Renders as a centered overlay dialog above the current page using the project's existing dialog/modal primitive (focus trap, scroll lock, accessibility handled by the primitive).
- Non-dismissible: outside click and Escape are blocked. No close button.
- Content:
  - Large green success icon (CheckCircle2 or similar)
  - Headline: "Payment received"
  - Subtitle: "Your booking is now secured."
  - Paid amount formatted as currency
  - Single primary CTA: "View booking confirmation"
- Animates in using `motion-preset-slide-up-sm` (consistent with the rest of the project).
- Presentation-only. Does not call `router.push` or interact with sessionStorage. The parent owns all of that.

---

## 3. `components/payment/payment-form.tsx`

### What changes

- Import `usePaymentPoller` and `PaymentSuccessModal`.
- Add `showSuccess: boolean` state (initialized `false`).
- Add a `committedProvider` state variable (`useState<PaymentProvider | null>(null)`). Set it to the current `provider` value at the same time `setAbaIntent(normalizedIntent)` is called inside `handleStartPayment`. This snapshots the provider at intent-creation time so subsequent selector changes do not affect polling.

```ts
setAbaIntent(normalizedIntent);
setCommittedProvider(provider);   // snapshot — survives selector changes
```

- Derive poller inputs from `committedProvider`, not the live `provider` state:

```ts
const { payment: polledPayment } = usePaymentPoller(
  abaIntent?.paymentId ?? null,
  {
    enabled: committedProvider === "bakong_khqr" && Boolean(abaIntent?.paymentId),
  }
);
```

This keeps `enabled` stable for the lifetime of the active KHQR intent regardless of what the user does with the provider selector. It also avoids any dependency on whether the backend intent response includes a `provider` field.

- `useEffect` watching `polledPayment?.status` (uses `abaIntent?.paymentId` as the key since that is the stable `paymentId` in this context):

```ts
useEffect(() => {
  if (polledPayment?.status !== "completed") return;
  const key = `payment_success_shown_${abaIntent?.paymentId}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, "1");
  setShowSuccess(true);
}, [polledPayment?.status, abaIntent?.paymentId]);
```

- Render at the bottom of JSX:

```tsx
<PaymentSuccessModal
  open={showSuccess}
  bookingId={booking.id}
  amount={amount}
  onConfirm={() => router.refresh()}
/>
```

- `router.refresh()` is correct here because the user is already on `/payment/[bookingId]`. The server re-fetches the booking, sees `payment_status === "paid"`, and renders `ConfirmedView` in place.

### What does not change

- ABA PayWay intent handling — whether inline QR display or `window.location.href` redirect, it is unaffected. The poller is gated to `provider === "bakong_khqr"`, so no ABA PayWay flow is inadvertently polled.
- QR display, deeplink button, PayWay checkout link, sandbox "Mark Paid" button, "Check status" button — all stay as fallbacks.
- All existing state and layout.

---

## 4. `components/payment/payment-return-status.tsx`

### What changes

- Replace all inline polling logic (the `setInterval` in `useEffect` and the `fetchPayment` function) with `usePaymentPoller`.
- Remove the `useEffect` that calls `router.push` when `status === "completed"`.
- Add `showSuccess: boolean` state (initialized `false`).

```ts
const { payment, isLoading, error, refetch } = usePaymentPoller(paymentId, {
  enabled: Boolean(paymentId),
  autoRefresh,
  initialPayment,
  deferInitialFetch,
  stripeSessionId,
});
```

- `useEffect` watching `payment?.status`:

```ts
useEffect(() => {
  if (payment?.status !== "completed") return;
  const key = `payment_success_shown_${paymentId}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, "1");
  setShowSuccess(true);
}, [payment?.status, paymentId]);
```

- Render `PaymentSuccessModal`:

```tsx
<PaymentSuccessModal
  open={showSuccess}
  bookingId={payment?.booking_id ?? ""}
  amount={Number(payment?.amount ?? 0)}
  currency={payment?.currency}
  onConfirm={() => router.replace(`/payment/${payment?.booking_id}`)}
/>
```

- `router.replace()` (not `push`) so the `?payment_id=...` URL is removed from browser history.

### What does not change

- All existing status card UI (pending/failed/refunded banners, payment details table).
- Refresh Status button — now calls `refetch()` from the hook.
- Try Again and View Confirmation fallback buttons.
- `autoRefresh`, `deferInitialFetch`, `stripeSessionId` props — all still accepted and passed directly to the hook. The hook owns the `?stripe_session_id=...` query param construction.

---

## 5. `app/payment/[bookingId]/page.tsx`

### Rule change

**Before:** when `payment_id` is in the URL and payment is already `completed` server-side, the page short-circuits directly to `ConfirmedView`, bypassing `PaymentReturnStatus` entirely.

**After:** when `payment_id` is in the URL, always render `PaymentReturnStatus` with `initialPayment`, regardless of payment status. This allows Stripe returns (where Stripe completes payment before the user returns) to show the success modal.

```ts
// Before
if (payment?.status === "completed") {
  const booking = await getBooking(bookingId);
  ...
  return <ConfirmedView booking={booking} />;
}
// Always render PaymentReturnStatus instead

// After
return (
  <PaymentReturnStatus
    paymentId={paymentId}
    initialPayment={payment}
    stripeSessionId={stripeSessionId ?? null}
    autoRefresh
  />
);
```

- `ConfirmedView` is still rendered at the clean URL `/payment/[bookingId]` with no `payment_id` param (the `router.replace()` call in the modal CTA lands here).

---

## "Show once" guard — summary

| Key format | `payment_success_shown_${paymentId}` |
|---|---|
| Storage | `sessionStorage` |
| Set | Immediately before `setShowSuccess(true)` |
| Read | Before setting state, in the `useEffect` |
| Scope | Per browser tab/session — resets on new session, which is the correct behaviour |

The `useRef` inside the hook is not used for this; sessionStorage survives remounts and React StrictMode double-invocations.

---

## Flow summary

### KHQR Bakong
1. User selects Bakong KHQR, clicks Pay → QR is displayed.
2. `committedProvider` is snapshotted as `"bakong_khqr"`. `usePaymentPoller` starts background polling (enabled by `committedProvider === "bakong_khqr"` — stable, unaffected by subsequent selector changes).
3. User opens Bakong app, scans QR, confirms payment.
4. Next poll (≤3 s) returns `completed`.
5. sessionStorage guard passes → `showSuccess = true` → modal appears on the same page.
6. User clicks "View booking confirmation" → `router.refresh()` → server re-renders `ConfirmedView`.

### Stripe
1. User selects Stripe, clicks Pay → redirected to Stripe Checkout.
2. User completes payment on Stripe → Stripe redirects back to `/payment/[bookingId]?payment_id=...&stripe_session_id=...`.
3. Page always renders `PaymentReturnStatus` with `initialPayment` (even if already `completed`).
4. If `initialPayment.status === "completed"`: the `useEffect` in `PaymentReturnStatus` fires on first render, sessionStorage guard passes → modal appears immediately.
5. If `initialPayment.status` is still pending: polling continues until `completed`, then modal appears.
6. User clicks "View booking confirmation" → `router.replace('/payment/${bookingId}')` → server renders `ConfirmedView`.
