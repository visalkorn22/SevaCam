"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Send, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type State =
  | "idle"
  | "sending"
  | "not_connected"
  | "awaiting_start"
  | "sent"
  | "error";

interface TelegramShareButtonProps {
  bookingId: string;
}

export default function TelegramShareButton({ bookingId }: TelegramShareButtonProps) {
  const [state, setState] = useState<State>("idle");
  const [botUsername, setBotUsername] = useState("");
  const [connectToken, setConnectToken] = useState("");
  const [pollInterval, setPollInterval] = useState<ReturnType<typeof setInterval> | null>(null);
  const sendLocationRef = useRef<(() => Promise<void>) | null>(null);

  const stopPolling = useCallback(() => {
    if (pollInterval) {
      clearInterval(pollInterval);
      setPollInterval(null);
    }
  }, [pollInterval]);

  const sendLocation = useCallback(async () => {
    setState("sending");
    try {
      const res = await fetch("/api/telegram/send-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ booking_id: bookingId }),
      });
      const data = await res.json();
      if (data.connected === false) {
        setBotUsername(data.bot_username ?? "");
        setConnectToken(data.connect_token ?? "");
        setState("not_connected");
        return;
      }
      if (!res.ok) { setState("error"); return; }
      setState("sent");
      setTimeout(() => setState("idle"), 4000);
    } catch {
      setState("error");
    }
  }, [bookingId]);

  useEffect(() => {
    sendLocationRef.current = sendLocation;
  });

  const startPolling = useCallback(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/telegram/status", { credentials: "include" });
        const data = await res.json();
        if (data.connected) {
          stopPolling();
          setState("idle");
          sendLocationRef.current?.();
        }
      } catch {
        // ignore polling errors
      }
    }, 3000);
    setPollInterval(interval);
  }, [stopPolling]);

  const handleStartBot = () => {
    setState("awaiting_start");
    startPolling();
  };

  const botLink = botUsername
    ? `https://t.me/${botUsername}?start=${connectToken}`
    : "";

  if (state === "sent") {
    return (
      <div className="flex items-center gap-2 rounded-[0.7rem] border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-400">
        <CheckCircle className="h-4 w-4" />
        Location sent to your Telegram
      </div>
    );
  }

  if (state === "not_connected" || state === "awaiting_start") {
    return (
      <div className="space-y-3 rounded-[0.85rem] border border-(--border-subtle) bg-(--bg-inset) p-4">
        <p className="text-sm font-medium text-(--text-primary)">Connect Telegram first</p>
        <p className="text-xs text-(--text-disabled)">
          Open our Telegram bot and tap <strong>Start</strong> to link your account. Then come back here.
        </p>
        {botLink && (
          <a
            href={botLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-[0.55rem] bg-[#229ed9] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#1e8fc4]"
          >
            <Send className="h-3.5 w-3.5" />
            Open @{botUsername}
          </a>
        )}
        {state === "awaiting_start" && (
          <p className="flex items-center gap-1.5 text-xs text-(--text-disabled)">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Waiting for you to start the bot…
          </p>
        )}
        {state === "not_connected" && (
          <Button variant="ghost" size="sm" onClick={handleStartBot} className="text-xs">
            I&apos;ve started the bot
          </Button>
        )}
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={sendLocation}
      disabled={state === "sending"}
      className="gap-1.5 border-(--border-subtle) text-(--text-secondary)"
    >
      {state === "sending" ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Send className="h-4 w-4" />
      )}
      {state === "sending" ? "Sending…" : "Share Location to Telegram"}
    </Button>
  );
}
