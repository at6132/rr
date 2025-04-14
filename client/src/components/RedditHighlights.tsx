import React from "react";
import { RedditPost } from "../types";

interface RedditHighlightsProps {
  redditPosts: RedditPost[];
}

const RedditHighlights: React.FC<RedditHighlightsProps> = ({ redditPosts }) => {
  // Function to format the date (e.g., "2 months ago")
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays < 1) return "today";
    if (diffInDays === 1) return "yesterday";
    if (diffInDays < 30) return `${diffInDays} days ago`;
    
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths === 1) return "1 month ago";
    if (diffInMonths < 12) return `${diffInMonths} months ago`;
    
    const diffInYears = Math.floor(diffInDays / 365);
    if (diffInYears === 1) return "1 year ago";
    return `${diffInYears} years ago`;
  };

  return (
    <div className="p-4 border-b border-gray-700">
      <h3 className="font-semibold mb-3 text-base">Reddit Highlights</h3>

      {redditPosts.length === 0 ? (
        <div className="bg-card-bg rounded-xl p-3 shadow-card text-center py-6">
          <p className="text-sm text-secondary-text">No Reddit discussions found.</p>
        </div>
      ) : (
        redditPosts.map((post) => (
          <div
            key={post.id}
            className="bg-card-bg rounded-xl mb-3 shadow-card overflow-hidden last:mb-0"
          >
            <div className="p-3">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4 text-white"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M10.698 1.043l5.246 3.304a3 3 0 0 1 1.076 4.029l-.095.165-6.94 11.147a2.029 2.029 0 0 1-3.077.661l-.153-.14-3.563-3.805a2.1 2.1 0 0 1-.112-2.804l.122-.136 6.323-8.133a3 3 0 0 1 3.839-.796l.152.092-.218-.266a1 1 0 0 0-1.355-.167l-.12.09L5.95 8.6a1 1 0 0 0 .239 1.657l.125.06 3.112 1.225"></path>
                  </svg>
                </div>
                <div className="ml-2 flex-1">
                  <h4 className="font-medium text-sm mb-1">{post.title}</h4>
                  <div className="flex items-center text-xs text-secondary-text mb-2">
                    <span>{post.subreddit}</span>
                    <span className="mx-1">•</span>
                    <span>{post.upvotes} upvotes</span>
                    <span className="mx-1">•</span>
                    <span>{formatDate(post.publishedAt)}</span>
                  </div>
                  <p className="text-xs text-secondary-text mb-2">
                    "{post.summary}"
                  </p>
                  <a
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-teal-glow hover:underline"
                  >
                    View Thread →
                  </a>
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default RedditHighlights;
