import { type FC, useCallback, useEffect, useState } from "react";
import { inject, observer } from "mobx-react";
import { Button, Tooltip } from "@humansignal/ui";
import { cn } from "../../utils/bem";
import "./ReviewPanel.prefix.css";

interface Review {
  id: number;
  annotation: number;
  created_by: number;
  created_by_username: string;
  display_name: string;
  text: string;
  is_resolved: boolean;
  created_at: string;
  updated_at: string;
}

interface ReviewPanelProps {
  store?: any;
}

const ReviewPanelComponent: FC<ReviewPanelProps> = ({ store }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newReviewText, setNewReviewText] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filterUnresolved, setFilterUnresolved] = useState(false);

  const currentUserId = store?.user?.id ?? (window as any).APP_SETTINGS?.user?.id ?? null;

  const annotationStore = store?.annotationStore;
  const selected = annotationStore?.selected;
  const annotationId = selected?.pk;

  const loadReviews = useCallback(async () => {
    if (!annotationId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/annotations/${annotationId}/reviews/`);
      if (response.ok) {
        const data = await response.json();
        setReviews(data);
      }
    } catch (e) {
      console.error("Failed to load reviews:", e);
    } finally {
      setLoading(false);
    }
  }, [annotationId]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const handleSubmitReview = useCallback(async () => {
    if (!newReviewText.trim() || !annotationId) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/annotations/${annotationId}/reviews/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCsrfToken(),
        },
        body: JSON.stringify({
          text: newReviewText.trim(),
          annotation: annotationId,
        }),
      });
      if (response.ok) {
        setNewReviewText("");
        await loadReviews();
      }
    } catch (e) {
      console.error("Failed to submit review:", e);
    } finally {
      setSubmitting(false);
    }
  }, [newReviewText, annotationId, loadReviews]);

  const handleToggleResolve = useCallback(
    async (review: Review) => {
      try {
        const response = await fetch(`/api/reviews/${review.id}/`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCsrfToken(),
          },
          body: JSON.stringify({
            is_resolved: !review.is_resolved,
          }),
        });
        if (response.ok) {
          await loadReviews();
        }
      } catch (e) {
        console.error("Failed to update review:", e);
      }
    },
    [loadReviews],
  );

  const handleDeleteReview = useCallback(
    async (reviewId: number) => {
      try {
        const response = await fetch(`/api/reviews/${reviewId}/`, {
          method: "DELETE",
          headers: {
            "X-CSRFToken": getCsrfToken(),
          },
        });
        if (response.ok) {
          await loadReviews();
        }
      } catch (e) {
        console.error("Failed to delete review:", e);
      }
    },
    [loadReviews],
  );

  const displayedReviews = filterUnresolved ? reviews.filter((r) => !r.is_resolved) : reviews;

  const unresolvedCount = reviews.filter((r) => !r.is_resolved).length;

  if (!annotationId) {
    return (
      <div className={cn("review-panel").toClassName()}>
        <div className={cn("review-panel").elem("empty").toClassName()}>
          Save the annotation first to enable reviews.
        </div>
      </div>
    );
  }

  return (
    <div className={cn("review-panel").toClassName()}>
      <div className={cn("review-panel").elem("header").toClassName()}>
        <span className={cn("review-panel").elem("title").toClassName()}>
          Reviews ({reviews.length})
          {unresolvedCount > 0 && (
            <span className={cn("review-panel").elem("unresolved-badge").toClassName()}>{unresolvedCount} unresolved</span>
          )}
        </span>
        <Tooltip title={filterUnresolved ? "Show all reviews" : "Show only unresolved"}>
          <Button
            look="string"
            size="small"
            variant={filterUnresolved ? "primary" : "neutral"}
            onClick={() => setFilterUnresolved(!filterUnresolved)}
          >
            {filterUnresolved ? "All" : "Unresolved"}
          </Button>
        </Tooltip>
      </div>

      <div className={cn("review-panel").elem("list").toClassName()}>
        {loading ? (
          <div className={cn("review-panel").elem("loading").toClassName()}>Loading reviews...</div>
        ) : displayedReviews.length === 0 ? (
          <div className={cn("review-panel").elem("empty").toClassName()}>
            {filterUnresolved ? "No unresolved reviews." : "No reviews yet. Be the first to add a review!"}
          </div>
        ) : (
          displayedReviews.map((review) => (
            <div
              key={review.id}
              className={cn("review-panel")
                .elem("item")
                .mod({ resolved: review.is_resolved })
                .toClassName()}
            >
              <div className={cn("review-panel").elem("item-header").toClassName()}>
                <span className={cn("review-panel").elem("item-author").toClassName()}>
                  {review.display_name || `User #${review.created_by}`}
                </span>
                <span className={cn("review-panel").elem("item-time").toClassName()}>
                  {formatTimeAgo(review.created_at)}
                </span>
              </div>
              <div className={cn("review-panel").elem("item-text").toClassName()}>{review.text}</div>
              <div className={cn("review-panel").elem("item-actions").toClassName()}>
                <Button
                  look="string"
                  size="small"
                  variant={review.is_resolved ? "neutral" : "primary"}
                  onClick={() => handleToggleResolve(review)}
                >
                  {review.is_resolved ? "Reopen" : "Resolve"}
                </Button>
                {currentUserId != null && review.created_by === currentUserId && (
                  <Button look="string" size="small" variant="neutral" onClick={() => handleDeleteReview(review.id)}>
                    Delete
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className={cn("review-panel").elem("form").toClassName()}>
        <textarea
          className={cn("review-panel").elem("textarea").toClassName()}
          placeholder="Write a review comment..."
          value={newReviewText}
          onChange={(e) => setNewReviewText(e.target.value)}
          rows={3}
        />
        <Button
          look="filled"
          size="small"
          variant="primary"
          disabled={!newReviewText.trim() || submitting}
          onClick={handleSubmitReview}
        >
          {submitting ? "Submitting..." : "Submit Review"}
        </Button>
      </div>
    </div>
  );
};

function getCsrfToken(): string {
  const cookie = document.cookie.split(";").find((c) => c.trim().startsWith("csrftoken="));
  return cookie ? cookie.split("=")[1] : "";
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export const ReviewPanel = inject("store")(observer(ReviewPanelComponent));
