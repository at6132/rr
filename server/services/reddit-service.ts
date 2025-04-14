import axios from "axios";
import { RedditPost } from "@shared/schema";
import { openaiService } from "./openai-service";

class RedditService {
  private clientId: string;
  private clientSecret: string;
  private username: string;
  private password: string;
  private accessToken: string | null = null;
  private tokenExpiration: Date | null = null;
  
  constructor() {
    this.clientId = process.env.REDDIT_CLIENT_ID || "";
    this.clientSecret = process.env.REDDIT_CLIENT_SECRET || "";
    this.username = process.env.REDDIT_USERNAME || "";
    this.password = process.env.REDDIT_PASSWORD || "";
  }

  private async getAccessToken(): Promise<string> {
    // Return existing token if valid
    if (this.accessToken && this.tokenExpiration && this.tokenExpiration > new Date()) {
      return this.accessToken;
    }

    try {
      // Get new token
      const response = await axios.post(
        "https://www.reddit.com/api/v1/access_token",
        `grant_type=password&username=${this.username}&password=${this.password}`,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "ReviewRadar/1.0.0",
          },
          auth: {
            username: this.clientId,
            password: this.clientSecret,
          },
        }
      );

      this.accessToken = response.data.access_token;
      // Set expiration (token is valid for 1 hour)
      this.tokenExpiration = new Date(Date.now() + response.data.expires_in * 1000);
      
      return this.accessToken;
    } catch (error) {
      console.error("Error getting Reddit access token:", error);
      throw new Error(`Failed to authenticate with Reddit: ${(error as Error).message}`);
    }
  }

  async getProductDiscussions(productTitle: string): Promise<RedditPost[]> {
    try {
      // If credentials not set, use a fallback approach
      if (!this.clientId || !this.clientSecret) {
        return this.getProductDiscussionsAlternate(productTitle);
      }

      const token = await this.getAccessToken();
      
      // Search for posts about the product
      const searchQuery = encodeURIComponent(`${productTitle} review`);
      const searchResponse = await axios.get(
        `https://oauth.reddit.com/search?q=${searchQuery}&sort=relevance&limit=10&t=year`,
        {
          headers: {
            "Authorization": `Bearer ${token}`,
            "User-Agent": "ReviewRadar/1.0.0",
          },
        }
      );
      
      const posts = [];
      
      for (const post of searchResponse.data.data.children) {
        // Get comments for this post
        const commentsResponse = await axios.get(
          `https://oauth.reddit.com/r/${post.data.subreddit}/comments/${post.data.id}?limit=10&sort=top`,
          {
            headers: {
              "Authorization": `Bearer ${token}`,
              "User-Agent": "ReviewRadar/1.0.0",
            },
          }
        );
        
        // Extract comment texts
        const commentTexts = commentsResponse.data[1].data.children
          .filter((comment: any) => comment.kind === "t1" && !comment.data.stickied)
          .map((comment: any) => comment.data.body)
          .join("\n\n");
        
        // Generate summary of comments with AI
        const summary = commentTexts
          ? await openaiService.askAboutProduct(
              productTitle,
              `Summarize the main points from these Reddit comments about ${productTitle} in one paragraph:`,
              commentTexts
            )
          : "No detailed comments available for this post.";
        
        posts.push({
          id: post.data.id,
          title: post.data.title,
          subreddit: `r/${post.data.subreddit}`,
          upvotes: post.data.ups,
          publishedAt: new Date(post.data.created_utc * 1000).toISOString(),
          summary: summary,
          url: `https://www.reddit.com${post.data.permalink}`,
        });
      }
      
      return posts;
    } catch (error) {
      console.error("Error fetching Reddit discussions:", error);
      return this.getProductDiscussionsAlternate(productTitle);
    }
  }

  // Alternative method that doesn't use OAuth
  private async getProductDiscussionsAlternate(productTitle: string): Promise<RedditPost[]> {
    try {
      // Use the public JSON API
      const searchQuery = encodeURIComponent(`${productTitle} review`);
      const searchResponse = await axios.get(
        `https://www.reddit.com/search.json?q=${searchQuery}&sort=relevance&limit=10&t=year`,
        {
          headers: {
            "User-Agent": "ReviewRadar/1.0.0",
          },
        }
      );
      
      const posts = [];
      
      for (const post of searchResponse.data.data.children) {
        // Generate a mock summary since we can't easily get comments with this method
        const summaryText = post.data.selftext || "Discussion about the product with multiple user opinions.";
        
        posts.push({
          id: post.data.id,
          title: post.data.title,
          subreddit: `r/${post.data.subreddit}`,
          upvotes: post.data.ups,
          publishedAt: new Date(post.data.created_utc * 1000).toISOString(),
          summary: summaryText.length > 200 ? summaryText.substring(0, 197) + "..." : summaryText,
          url: `https://www.reddit.com${post.data.permalink}`,
        });
      }
      
      return posts;
    } catch (error) {
      console.error("Error in alternate Reddit fetch:", error);
      throw new Error(`Failed to fetch Reddit discussions: ${(error as Error).message}`);
    }
  }
}

export const redditService = new RedditService();
