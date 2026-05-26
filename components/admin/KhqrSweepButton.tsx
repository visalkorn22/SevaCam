"use client";

import { useState } from "react";
import { CheckCircle2, RefreshCw } from "lucide-react";

export function KhqrSweepButton() {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<string | null>(null);

  const run = async () => {
    setState("loading");
    setResult(null);
    try {
      const res = await fetch("/api/payments/admin/sweep-khqr", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as {
        message?: string;
        results?: { expired?: number; completed?: number; still_pending?: number; errors?: number };
        detail?: string;
      };
      if (!res.ok) throw new Error(data.detail || "Sweep failed");
      const r = data.results ?? {};
      setResult(
        `Done — expired: ${r.expired ?? 0}, confirmed: ${r.completed ?? 0}, still pending: ${r.still_pending ?? 0}`,
      );
      setState("done");
    } catch (err) {
      setResult(err instanceof Error ? err.message : "Unknown error");
      setState("error");
    }
  };

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={run}
        disabled={state === "loading"}
        className="sevacam-secondary-button inline-flex h-9 items-center gap-1.5 rounded-[0.18rem] px-4 text-[0.58rem] font-semibold uppercase tracking-[0.18em] disabled:opacity-60"
      >
        <RefreshCw className={`size-3 ${state === "loading" ? "animate-spin" : ""}`} />
        {state === "loading" ? "Checking…" : "Sync KHQR status"}
      </button>
      {result && (
        <p className={`text-[0.64rem] ${state === "error" ? "text-(--seva-rose)" : "text-(--text-secondary)"}`}>
          {result}
        </p>
      )}
    </div>
  );
}

export function KhqrConfirmButton({ paymentId }: { paymentId: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  const confirm = async () => {
    if (!window.confirm("Confirm this KHQR payment as received? Only do this after verifying the transfer in your ACLEDA/Bakong app.")) return;
    setState("loading");
    try {
      const res = await fetch(`/api/payments/admin/${paymentId}/confirm-khqr`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { detail?: string };
      if (!res.ok) throw new Error(data.detail || "Confirm failed");
      setState("done");
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to confirm");
      setState("error");
    }
  };

  if (state === "done") return null;

  return (
    <button
      type="button"
      onClick={confirm}
      disabled={state === "loading"}
      className="inline-flex items-center gap-1 rounded-full border border-[rgba(122,213,221,0.3)] bg-[rgba(122,213,221,0.1)] px-2.5 py-1 text-[0.54rem] font-semibold uppercase tracking-[0.14em] text-(--seva-accent) hover:bg-[rgba(122,213,221,0.2)] disabled:opacity-60"
    >
      <CheckCircle2 className="size-3" />
      {state === "loading" ? "Confirming…" : "Mark paid"}
    </button>
  );
}
