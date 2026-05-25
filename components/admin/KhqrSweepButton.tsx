"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";

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
