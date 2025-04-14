export interface Product {
  title: string;
  source: string;
  url: string;
  imageUrl?: string;
}

export interface Summary {
  positivePercentage: number;
  neutralPercentage: number;
  negativePercentage: number;
  reviewCount: number;
  pros: string[];
  cons: string[];
  tags: string[];
}

export interface VideoReview {
  id: string;
  title: string;
  channelTitle: string;
  publishedAt: string;
  viewCount?: number;
  thumbnailUrl: string;
  videoUrl: string;
  type: "all" | "in-depth" | "short";
}

export interface RedditPost {
  id: string;
  title: string;
  subreddit: string;
  upvotes: number;
  publishedAt: string;
  summary: string;
  url: string;
}

export interface BlogReview {
  id: string;
  source: string;
  rating?: number;
  snippet: string;
  url: string;
  logoText: string;
}

export interface ProductAnalysis {
  product: Product;
  summary: Summary;
  videoReviews: VideoReview[];
  redditPosts: RedditPost[];
  blogReviews: BlogReview[];
}

export interface ChatMessage {
  id: string;
  message: string;
  isUser: boolean;
  createdAt: Date;
}

export type VideoReviewType = "all" | "in-depth" | "short";

export interface DetectedProduct {
  title: string;
  url: string;
  source: string;
  imageUrl?: string;
}
