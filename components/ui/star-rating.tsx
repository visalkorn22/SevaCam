import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

type StarRatingProps = {
  rating: number;
  max?: number;
  className?: string;
  iconClassName?: string;
  valueClassName?: string;
  showValue?: boolean;
};

export function StarRating({
  rating,
  max = 5,
  className,
  iconClassName,
  valueClassName,
  showValue = false,
}: StarRatingProps) {
  const filled = Math.round(rating);

  return (
    <span
      aria-label={`${rating.toFixed(1)} out of ${max} stars`}
      className={cn("inline-flex items-center gap-1", className)}
    >
      <span className="flex items-center gap-0.5">
        {Array.from({ length: max }).map((_, index) => (
          <Star
            key={index}
            className={cn(
              "h-3 w-3",
              index < filled
                ? "fill-amber-400 text-amber-400"
                : "text-(--border-muted)",
              iconClassName,
            )}
          />
        ))}
      </span>
      {showValue && (
        <span className={cn("text-inherit", valueClassName)}>
          {rating.toFixed(1)}
        </span>
      )}
    </span>
  );
}
