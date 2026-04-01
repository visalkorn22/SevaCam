"use client";

import { Calendar, Clock, DollarSign, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type BookingStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no-show";

interface BookingCardProps {
  id: string;
  serviceName: string;
  serviceImage?: string;
  date: string;
  time: string;
  price: number;
  status: BookingStatus;
  location?: string;
  providerName?: string;
  onBook?: () => void;
  onEdit?: () => void;
  onCancel?: () => void;
  onViewDetails?: () => void;
  review?: { id: string; rating: number } | null;
  onReviewSubmit?: () => void;
}

const statusConfig = {
  pending: {
    label: "Pending",
    border: "border-l-amber-400",
    badge:
      "bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
  },
  confirmed: {
    label: "Confirmed",
    border: "border-l-emerald-400",
    badge:
      "bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
  },
  completed: {
    label: "Completed",
    border: "border-l-blue-400",
    badge:
      "bg-blue-50 text-blue-700 border-blue-200/60 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
  },
  cancelled: {
    label: "Cancelled",
    border: "border-l-border",
    badge: "bg-muted text-muted-foreground border-border/60",
  },
  "no-show": {
    label: "No Show",
    border: "border-l-rose-400",
    badge:
      "bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20",
  },
};

export function BookingCard({
  id: _id,
  serviceName,
  serviceImage,
  date,
  time,
  price,
  status,
  location,
  providerName,
  onBook,
  onEdit,
  onCancel,
  onViewDetails,
  review,
  onReviewSubmit,
}: BookingCardProps) {
  const config = statusConfig[status];

  return (
    <div
      className={cn(
        "group overflow-hidden rounded-2xl border border-border/60 border-l-4 bg-card shadow-(--shadow-card) transition-all duration-200 hover:border-border hover:shadow-(--shadow-card-hover)",
        config.border,
      )}
    >
      <div className="flex flex-col sm:flex-row">
        {/* Image */}
        {serviceImage && (
          <div className="relative h-44 w-full overflow-hidden bg-muted sm:h-auto sm:w-44 sm:shrink-0">
            <img
              src={serviceImage}
              alt={serviceName}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        )}

        {/* Content */}
        <div className="flex flex-1 flex-col p-6">
          {/* Header row */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="text-lg font-semibold text-foreground">
                  {serviceName}
                </h3>
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.3em]",
                    config.badge,
                  )}
                >
                  {config.label}
                </span>
              </div>
              {providerName && (
                <p className="mt-1 text-sm text-muted-foreground">
                  with {providerName}
                </p>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {onViewDetails && (
                  <DropdownMenuItem onClick={onViewDetails}>
                    View Details
                  </DropdownMenuItem>
                )}
                {onEdit &&
                  status !== "cancelled" &&
                  status !== "completed" &&
                  status !== "no-show" && (
                    <DropdownMenuItem onClick={onEdit}>
                      Reschedule
                    </DropdownMenuItem>
                  )}
                {onCancel &&
                  status !== "cancelled" &&
                  status !== "completed" &&
                  status !== "no-show" && (
                    <DropdownMenuItem
                      onClick={onCancel}
                      className="text-destructive"
                    >
                      Cancel Booking
                    </DropdownMenuItem>
                  )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Details row */}
          <div className="mt-5 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              {date}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              {time}
            </span>
            <span className="flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium text-foreground">${price}</span>
            </span>
            {location && (
              <span className="text-muted-foreground">{location}</span>
            )}
          </div>

          {/* Action buttons */}
          <div className="mt-5 flex flex-wrap gap-2.5">
            {status === "pending" && onBook && (
              <Button
                onClick={onBook}
                size="sm"
                className="rounded-full px-5 text-[11px] font-bold uppercase tracking-[0.15em]"
              >
                Confirm Booking
              </Button>
            )}
            {status === "confirmed" && (
              <Button
                variant="outline"
                size="sm"
                onClick={onViewDetails}
                className="rounded-full border-border/60 px-5 text-[11px] font-semibold uppercase tracking-[0.15em] hover:bg-muted/50"
              >
                View Details
              </Button>
            )}
            {(status === "completed" ||
              status === "cancelled" ||
              status === "no-show") &&
              onBook && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onBook}
                  className="rounded-full border-border/60 px-5 text-[11px] font-semibold uppercase tracking-[0.15em] hover:bg-muted/50"
                >
                  Book Again
                </Button>
              )}
            {status === "completed" && !review && onReviewSubmit && (
              <Button
                variant="outline"
                size="sm"
                onClick={onReviewSubmit}
                className="rounded-full border-border/60 px-5 text-[11px] font-semibold uppercase tracking-[0.15em] hover:bg-muted/50"
              >
                Leave a Review
              </Button>
            )}
            {status === "completed" && review && (
              <span className="flex items-center gap-1 rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-[11px] font-semibold text-amber-500">
                {"★".repeat(review.rating)}
                {"☆".repeat(5 - review.rating)} Reviewed
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Compact version for list views
export function BookingCardCompact({
  serviceName,
  date,
  time,
  price,
  status,
  onViewDetails,
}: Pick<
  BookingCardProps,
  "serviceName" | "date" | "time" | "price" | "status" | "onViewDetails"
>) {
  const config = statusConfig[status];

  return (
    <button
      onClick={onViewDetails}
      className={cn(
        "group flex w-full items-center justify-between gap-4 rounded-xl border border-l-4 border-border/60 bg-card p-4 text-left transition-all duration-200 hover:border-border hover:bg-muted/30",
        config.border,
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="font-semibold text-foreground">{serviceName}</h4>
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.3em]",
              config.badge,
            )}
          >
            {config.label}
          </span>
        </div>
        <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <span>{date}</span>
          <span className="opacity-40">&bull;</span>
          <span>{time}</span>
          <span className="opacity-40">&bull;</span>
          <span className="font-semibold text-foreground">${price}</span>
        </p>
      </div>
      <svg
        className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5l7 7-7 7"
        />
      </svg>
    </button>
  );
}
