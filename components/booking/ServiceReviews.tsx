import { formatDistanceToNow } from "date-fns";
import { StarRating } from "@/components/ui/star-rating";

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

export function ServiceReviews({ data }: { data: ServiceReviewsData | null }) {
  if (!data || data.review_count === 0) {
    return (
      <div>
        <h2 className="text-sm font-medium text-(--text-primary)">Reviews</h2>
        <p className="mt-2 text-sm text-(--text-secondary)">No reviews yet.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-base font-medium text-(--text-primary)">Reviews</h2>
        {data.average_rating != null && (
          <>
            <StarRating
              rating={data.average_rating}
              showValue
              valueClassName="text-sm font-medium text-(--text-primary)"
            />
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
            className="sevacam-booking-card p-4"
          >
            <StarRating rating={review.rating} />
            {review.comment && (
              <p className="mt-2 text-sm leading-relaxed text-(--text-secondary)">
                {review.comment}
              </p>
            )}
            <p className="mt-3 text-[0.65rem] text-(--text-secondary)">
              {review.customer_name} ·{" "}
              {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
