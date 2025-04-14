import React, { useState } from "react";
import { VideoReview, VideoReviewType } from "../types";

interface VideoReviewsProps {
  videos: VideoReview[];
}

const VideoReviews: React.FC<VideoReviewsProps> = ({ videos }) => {
  const [activeFilter, setActiveFilter] = useState<VideoReviewType>("all");

  const filteredVideos = videos.filter(
    (video) => activeFilter === "all" || video.type === activeFilter
  );

  return (
    <div className="p-4 border-b border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-base">Top Video Reviews</h3>
        <div className="flex text-xs space-x-1">
          <button
            className={`px-2 py-1 rounded-md ${
              activeFilter === "all" ? "bg-card-bg" : "hover:bg-card-bg transition-colors"
            }`}
            onClick={() => setActiveFilter("all")}
          >
            All
          </button>
          <button
            className={`px-2 py-1 rounded-md ${
              activeFilter === "in-depth" ? "bg-card-bg" : "hover:bg-card-bg transition-colors"
            }`}
            onClick={() => setActiveFilter("in-depth")}
          >
            In-depth
          </button>
          <button
            className={`px-2 py-1 rounded-md ${
              activeFilter === "short" ? "bg-card-bg" : "hover:bg-card-bg transition-colors"
            }`}
            onClick={() => setActiveFilter("short")}
          >
            Short
          </button>
        </div>
      </div>

      {filteredVideos.length === 0 ? (
        <div className="bg-card-bg rounded-xl p-3 shadow-card text-center py-6">
          <p className="text-sm text-secondary-text">No video reviews available.</p>
        </div>
      ) : (
        filteredVideos.map((video) => (
          <div
            key={video.id}
            className="bg-card-bg rounded-xl p-3 shadow-card mb-3 last:mb-0"
          >
            <div className="flex">
              <div className="relative w-24 h-16 rounded-md overflow-hidden flex-shrink-0">
                <img
                  src={video.thumbnailUrl}
                  alt={`${video.title} thumbnail`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 bg-black bg-opacity-60 rounded-full flex items-center justify-center">
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
                      <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                  </div>
                </div>
              </div>
              <div className="ml-3 flex-1">
                <h4 className="font-medium text-sm line-clamp-2 mb-1">
                  {video.title}
                </h4>
                <div className="flex items-center text-xs text-secondary-text mb-1">
                  <span>{video.channelTitle}</span>
                  <span className="mx-1">•</span>
                  <span>{video.viewCount?.toLocaleString() || 0} views</span>
                </div>
                <a
                  href={video.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-2 py-1 bg-deep-indigo text-teal-glow border border-teal-glow rounded-md hover:bg-teal-glow hover:bg-opacity-10 transition-colors inline-block"
                >
                  Watch Now
                </a>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default VideoReviews;
