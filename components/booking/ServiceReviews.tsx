import { format } from "date-fns";
import { Star } from "lucide-react";

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
      className="flex items-center gap-1 text-amber-400"
    >
      {Array.from({ length: max }).map((_, index) => (
        <Star
          key={index}
          className={`h-3.5 w-3.5 ${
            index < filled ? "fill-current" : "text-white/20"
          }`}
        />
      ))}
    </span>
  );
}

export function ServiceReviews({ data }: { data: ServiceReviewsData | null }) {
  if (!data || data.review_count === 0) {
    return (
      <div className="sevacam-rail p-6">
        <h2 className="text-sm font-semibold text-(--text-primary)">Reviews</h2>
        <p className="mt-2 text-sm text-(--text-secondary)">No reviews yet.</p>
      </div>
    );
  }

  return (
    <div className="sevacam-rail p-6">
      <h2 className="text-sm font-semibold text-(--text-primary)">Reviews</h2>

      <div className="mt-3 flex items-center gap-2">
        <span className="text-2xl font-semibold text-(--text-primary)">
          {data.average_rating?.toFixed(1)}
        </span>
        <StarDisplay rating={data.average_rating ?? 0} />
        <span className="text-xs text-(--text-secondary)">
          - {data.review_count} review{data.review_count !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {data.reviews.map((review, index) => (
          <div
            key={index}
            className="rounded-xl border border-(--border-muted) bg-(--bg-elevated) p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <StarDisplay rating={review.rating} />
              <span className="text-xs text-(--text-secondary)">
                {review.customer_name} -{" "}
                {format(new Date(review.created_at), "MMM d, yyyy")}
              </span>
            </div>
            {review.comment ? (
              <p className="mt-2 text-sm leading-relaxed text-(--text-secondary)">
                {review.comment}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
