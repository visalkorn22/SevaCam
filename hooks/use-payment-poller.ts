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

  // Mobile KHQR flows often bounce the user into a banking app and back.
  // Refresh immediately when the page becomes active again so the success
  // modal does not wait for the next interval tick.
  useEffect(() => {
    if (!enabled || !paymentId) return;

    const refreshIfPending = () => {
      if (!stateRef.current.enabled || !stateRef.current.paymentId) return;
      if (
        stateRef.current.payment &&
        TERMINAL.has(stateRef.current.payment.status)
      ) {
        return;
      }
      void doFetch();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshIfPending();
      }
    };

    const handleFocus = () => {
      refreshIfPending();
    };

    const handlePageShow = () => {
      refreshIfPending();
    };

    const handleOnline = () => {
      refreshIfPending();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("online", handleOnline);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("online", handleOnline);
    };
  }, [enabled, paymentId, doFetch]);

  return { payment, isLoading, error, refetch };
}
