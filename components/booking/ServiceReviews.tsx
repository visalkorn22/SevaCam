import { format } from "date-fns";

type ServiceReview = {
  rating: number;
  comment: string | null;
  created_at: string;
  customer_name: string;
};

export type ServiceReviewsData = {
  average_rating: number | null;
  review_count: number;
  reviews: ServiceReview[];
};

function StarDisplay({ rating, max = 5 }: { rating: number; max?: number }) {
  const filled = Math.round(rating);
  return (
    <span
      aria-label={`${rating} out of ${max} stars`}
      className="text-amber-400"
    >
      {"★".repeat(filled)}
      {"☆".repeat(max - filled)}
    </span>
  );
}

export function ServiceReviews({ data }: { data: ServiceReviewsData | null }) {
  if (!data || data.review_count === 0) {
    return (
      <div className="rounded-2xl border border-border/60 bg-muted/20 p-5">
        <h2 className="text-sm font-semibold text-foreground">Reviews</h2>
        <p className="mt-2 text-sm text-muted-foreground">No reviews yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-muted/20 p-5">
      <h2 className="text-sm font-semibold text-foreground">Reviews</h2>

      {/* Summary row */}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-2xl font-semibold text-foreground">
          {data.average_rating?.toFixed(1)}
        </span>
        <StarDisplay rating={data.average_rating ?? 0} />
        <span className="text-xs text-muted-foreground">
          · {data.review_count} review{data.review_count !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Reviews list */}
      <div className="mt-4 space-y-3">
        {data.reviews.map((review, i) => (
          <div
            key={i}
            className="rounded-xl border border-border/40 bg-background/60 p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <StarDisplay rating={review.rating} />
              <span className="text-xs text-muted-foreground">
                {review.customer_name} ·{" "}
                {format(new Date(review.created_at), "MMM d, yyyy")}
              </span>
            </div>
            {review.comment && (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {review.comment}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
