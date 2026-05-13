import { formatDistanceToNow } from "date-fns";
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
    <span aria-label={`${rating} out of ${max} stars`} className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, index) => (
        <Star
          key={index}
          className={`h-3 w-3 ${index < filled ? "fill-amber-400 text-amber-400" : "text-(--border-muted)"}`}
        />
      ))}
    </span>
  );
}

export function ServiceReviews({ data }: { data: ServiceReviewsData | null }) {
  if (!data || data.review_count === 0) {
    return (
      <div>
        <h2 className="text-sm font-semibold text-(--text-primary)">Reviews</h2>
        <p className="mt-2 text-sm text-(--text-secondary)">No reviews yet.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <h2 className="text-base font-semibold text-(--text-primary)">Reviews</h2>
        {data.average_rating != null && (
          <>
            <StarDisplay rating={data.average_rating} />
            <span className="text-sm font-semibold text-(--text-primary)">
              {data.average_rating.toFixed(1)}
            </span>
          </>
        )}
        <span className="text-xs text-(--text-secondary)">
          {data.review_count} total
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {data.reviews.map((review, index) => (
          <div
            key={index}
            className="rounded-xl border border-(--border-muted) bg-(--bg-elevated) p-4"
          >
            <StarDisplay rating={review.rating} />
            {review.comment && (
              <p className="mt-2 text-sm leading-relaxed text-(--text-secondary)">
                {review.comment}
              </p>
            )}
            <p className="mt-3 text-[0.65rem] text-(--text-secondary)/70">
              {review.customer_name} ·{" "}
              {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
