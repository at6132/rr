import axios from "axios";
import { VideoReview } from "@shared/schema";

class YouTubeService {
  private apiKey: string;
  
  constructor() {
    this.apiKey = process.env.YOUTUBE_API_KEY || "";
  }

  async getProductReviews(productTitle: string): Promise<VideoReview[]> {
    try {
      if (!this.apiKey) {
        throw new Error("YouTube API key is not configured");
      }

      // Create search queries for different types of videos
      const queries = [
        { q: `${productTitle} review`, type: "all" },
        { q: `${productTitle} unboxing`, type: "short" },
        { q: `${productTitle} in-depth review`, type: "in-depth" },
        { q: `${productTitle} vs`, type: "in-depth" },
      ];
      
      // Collect all videos
      const allVideos: VideoReview[] = [];
      
      for (const query of queries) {
        const response = await axios.get("https://www.googleapis.com/youtube/v3/search", {
          params: {
            key: this.apiKey,
            q: query.q,
            part: "snippet",
            maxResults: 5,
            type: "video",
            relevanceLanguage: "en",
            videoEmbeddable: true,
            order: "relevance"
          }
        });

        if (response.data.items && response.data.items.length > 0) {
          // Get video IDs for detailed info
          const videoIds = response.data.items.map((item: any) => item.id.videoId).join(",");
          
          // Get video statistics
          const videoDetailsResponse = await axios.get("https://www.googleapis.com/youtube/v3/videos", {
            params: {
              key: this.apiKey,
              id: videoIds,
              part: "statistics,snippet",
            }
          });
          
          // Process video details
          const videos = videoDetailsResponse.data.items.map((item: any) => {
            return {
              id: item.id,
              title: item.snippet.title,
              channelTitle: item.snippet.channelTitle,
              publishedAt: item.snippet.publishedAt,
              viewCount: parseInt(item.statistics.viewCount, 10) || 0,
              thumbnailUrl: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
              videoUrl: `https://www.youtube.com/watch?v=${item.id}`,
              type: query.type as "all" | "in-depth" | "short",
            };
          });
          
          allVideos.push(...videos);
        }
      }
      
      // Remove duplicates based on video ID
      const uniqueVideos = Object.values(
        allVideos.reduce((acc, video) => {
          if (!acc[video.id]) {
            acc[video.id] = video;
          }
          return acc;
        }, {} as Record<string, VideoReview>)
      );
      
      // Sort by view count
      return uniqueVideos.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0)).slice(0, 10);
    } catch (error) {
      console.error("Error fetching YouTube reviews:", error);
      throw new Error(`Failed to fetch YouTube reviews: ${(error as Error).message}`);
    }
  }
}

export const youtubeService = new YouTubeService();
