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
}

const statusConfig = {
  pending: {
    label: "Pending",
    className: "bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
  },
  confirmed: {
    label: "Confirmed",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
  },
  completed: {
    label: "Completed",
    className: "bg-blue-50 text-blue-700 border-blue-200/60 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-muted text-muted-foreground border-border/60",
  },
  "no-show": {
    label: "No Show",
    className: "bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20",
  },
};

export function BookingCard({
  id,
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
}: BookingCardProps) {
  const config = statusConfig[status];

  return (
    <div className="group overflow-hidden rounded-3xl border border-border/60 bg-card/80 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-border hover:bg-card/90 hover:shadow-md">
      <div className="flex flex-col sm:flex-row">
        {/* Image Section */}
        {serviceImage && (
          <div className="relative h-48 w-full overflow-hidden bg-muted sm:h-auto sm:w-48">
            <img
              src={serviceImage}
              alt={serviceName}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          </div>
        )}

        {/* Content Section */}
        <div className="flex flex-1 flex-col p-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-semibold">{serviceName}</h3>
                <span
                  className={cn(
                    "rounded-full border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] backdrop-blur-sm",
                    config.className,
                  )}
                >
                  {config.label}
                </span>
              </div>
              {providerName && (
                <p className="text-sm text-muted-foreground">
                  with {providerName}
                </p>
              )}
            </div>

            {/* Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
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
                    Edit Booking
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

          {/* Details Grid */}
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/70 px-4 py-3 backdrop-blur-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  Date
                </p>
                <p className="text-sm font-semibold">{date}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/70 px-4 py-3 backdrop-blur-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  Time
                </p>
                <p className="text-sm font-semibold">{time}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/70 px-4 py-3 backdrop-blur-sm">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  Price
                </p>
                <p className="text-sm font-semibold">${price}</p>
              </div>
            </div>
          </div>

          {location && (
            <p className="mt-4 text-sm text-muted-foreground">📍 {location}</p>
          )}

          {/* Action Buttons */}
          <div className="mt-6 flex flex-wrap gap-3">
            {status === "pending" && onBook && (
              <Button
                onClick={onBook}
                size="lg"
                className="rounded-full bg-primary shadow-lg shadow-primary/30 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/40"
              >
                Confirm Booking
              </Button>
            )}

            {status === "confirmed" && (
              <Button
                variant="outline"
                size="lg"
                onClick={onViewDetails}
                className="rounded-full border-border/60 bg-background/60 transition duration-300 hover:-translate-y-0.5 hover:bg-muted/60"
              >
                View Details
              </Button>
            )}

            {(status === "completed" ||
              status === "cancelled" ||
              status === "no-show") && onBook && (
              <Button
                variant="outline"
                size="lg"
                onClick={onBook}
                className="rounded-full border-border/60 bg-background/60 transition duration-300 hover:-translate-y-0.5 hover:bg-muted/60"
              >
                Book Again
              </Button>
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
      className="group flex w-full items-center justify-between gap-4 rounded-2xl border border-border/60 bg-card/70 p-4 text-left backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-border hover:bg-card/80 hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)]"
    >
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold">{serviceName}</h4>
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.3em]",
              config.className,
            )}
          >
            {config.label}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          <span>{date}</span>
          <span>•</span>
          <span>{time}</span>
          <span>•</span>
          <span className="font-semibold">${price}</span>
        </div>
      </div>
      <svg
        className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1"
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
