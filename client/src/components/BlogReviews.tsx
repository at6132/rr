import React from "react";
import { BlogReview } from "../types";

interface BlogReviewsProps {
  blogReviews: BlogReview[];
}

const BlogReviews: React.FC<BlogReviewsProps> = ({ blogReviews }) => {
  // Function to format rating display
  const formatRating = (rating?: number) => {
    if (!rating) return null;
    
    // If rating is out of 10
    if (rating > 5) {
      return `${rating.toFixed(1)}/10`;
    }
    
    // If rating is out of 5
    return `${rating.toFixed(1)}/5`;
  };

  return (
    <div className="p-4 border-b border-gray-700">
      <h3 className="font-semibold mb-3 text-base">Expert Reviews</h3>

      {blogReviews.length === 0 ? (
        <div className="bg-card-bg rounded-xl p-3 shadow-card text-center py-6">
          <p className="text-sm text-secondary-text">No expert reviews available.</p>
        </div>
      ) : (
        blogReviews.map((review) => (
          <div
            key={review.id}
            className="bg-card-bg rounded-xl p-3 shadow-card mb-3 last:mb-0"
          >
            <div className="flex items-start">
              <div className="w-8 h-8 rounded bg-white flex items-center justify-center flex-shrink-0">
                <span className="font-bold text-deep-indigo text-xs">
                  {review.logoText}
                </span>
              </div>
              <div className="ml-3 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">{review.source}</h4>
                  {review.rating && (
                    <div className="flex items-center bg-deep-indigo rounded-full px-2 py-0.5">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-3 h-3 text-sunset-gold"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                      </svg>
                      <span className="text-xs ml-1 text-sunset-gold">
                        {formatRating(review.rating)}
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-xs my-1 text-secondary-text">
                  "{review.snippet}"
                </p>
                <a
                  href={review.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-teal-glow hover:underline"
                >
                  Read More →
                </a>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default BlogReviews;
