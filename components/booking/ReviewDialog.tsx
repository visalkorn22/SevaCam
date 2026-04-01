"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  serviceName: string;
  onSuccess: (review: { id: string; rating: number }) => void;
}

export function ReviewDialog({
  open,
  onOpenChange,
  bookingId,
  serviceName,
  onSuccess,
}: ReviewDialogProps) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const [rating, setRating] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = (nextOpen: boolean) => {
    if (!loading) onOpenChange(nextOpen);
  };

  const handleSubmit = async () => {
    if (!rating) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/api/reviews/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: bookingId,
          rating,
          comment: comment.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          detail?: string;
        };
        throw new Error(data.detail ?? "Failed to submit review");
      }
      const data = (await res.json()) as { id: string; rating: number };
      onSuccess({ id: data.id, rating: data.rating });
      onOpenChange(false);
      // Reset for potential re-open
      setRating(null);
      setComment("");
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to submit review",
      );
    } finally {
      setLoading(false);
    }
  };

  const displayRating = hovered ?? rating ?? 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Leave a Review</DialogTitle>
          <p className="text-sm text-muted-foreground">{serviceName}</p>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Star rating */}
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">
              Rating{" "}
              <span className="text-destructive" aria-hidden="true">
                *
              </span>
            </p>
            <div className="flex gap-0.5" role="group" aria-label="Star rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  aria-label={`${star} star${star !== 1 ? "s" : ""}`}
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => setRating(star)}
                  className={cn(
                    "text-3xl leading-none transition-colors duration-100",
                    displayRating >= star
                      ? "text-amber-400"
                      : "text-muted-foreground/25",
                  )}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div>
            <label
              htmlFor="review-comment"
              className="mb-2 block text-sm font-medium text-foreground"
            >
              Comment{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </label>
            <Textarea
              id="review-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="How was your experience?"
              className="resize-none"
              rows={3}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!rating || loading}>
            {loading ? "Submitting…" : "Submit Review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
