import axios from "axios";
import { BlogReview } from "@shared/schema";
import { openaiService } from "./openai-service";

class SearchService {
  private googleApiKey: string;
  private googleSearchEngineId: string;
  private bingApiKey: string;
  
  constructor() {
    this.googleApiKey = process.env.GOOGLE_API_KEY || "";
    this.googleSearchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID || "";
    this.bingApiKey = process.env.BING_API_KEY || "";
  }

  async getExpertReviews(productTitle: string): Promise<BlogReview[]> {
    try {
      // First try to get reviews using OpenAI's websearch API for real data
      try {
        const blogReviews = await this.getOpenAIExpertReviews(productTitle);
        if (blogReviews.length > 0) {
          return blogReviews;
        }
      } catch (openaiError) {
        console.error("Error using OpenAI websearch for expert reviews:", openaiError);
        // Continue to fallback methods if OpenAI fails
      }
      
      // Fall back to traditional search APIs if OpenAI doesn't return results
      if (this.googleApiKey && this.googleSearchEngineId) {
        return this.getGoogleExpertReviews(productTitle);
      } else if (this.bingApiKey) {
        return this.getBingExpertReviews(productTitle);
      } else {
        throw new Error("No search API credentials configured");
      }
    } catch (error) {
      console.error("Error fetching expert reviews:", error);
      throw new Error(`Failed to fetch expert reviews: ${(error as Error).message}`);
    }
  }
  
  private async getOpenAIExpertReviews(productTitle: string): Promise<BlogReview[]> {
    // Use OpenAI's websearch to get real blog reviews with authentic data
    const blogReviewResults = await openaiService.fetchBlogReviews(productTitle, 5);
    
    // Convert the blog review results to our BlogReview format
    return blogReviewResults.map(review => {
      // Normalize ratings to a 0-5 scale if provided
      let normalizedRating = review.rating;
      if (normalizedRating && normalizedRating > 5) {
        normalizedRating = 5 * (normalizedRating / 10);
      }
      
      return {
        id: `blog-${Math.random().toString(36).substring(2, 11)}`,
        source: review.source,
        rating: normalizedRating,
        snippet: review.snippet,
        url: review.url,
        logoText: this.getLogoText(review.source)
      };
    });
  }

  private async getGoogleExpertReviews(productTitle: string): Promise<BlogReview[]> {
    // Expert review sites to search for
    const reviewSites = [
      "wirecutter.com",
      "techradar.com",
      "tomsguide.com",
      "rtings.com",
      "cnet.com",
      "theverge.com",
      "engadget.com",
      "pcmag.com",
      "digitaltrends.com",
    ];
    
    // Create site restriction for query
    const siteQuery = reviewSites.map(site => `site:${site}`).join(" OR ");
    
    // Full search query
    const searchQuery = `${productTitle} review (${siteQuery})`;
    
    const response = await axios.get("https://www.googleapis.com/customsearch/v1", {
      params: {
        key: this.googleApiKey,
        cx: this.googleSearchEngineId,
        q: searchQuery,
        num: 10,
      },
    });
    
    return this.processSearchResults(response.data.items || [], productTitle);
  }

  private async getBingExpertReviews(productTitle: string): Promise<BlogReview[]> {
    // Expert review sites to search for
    const reviewSites = [
      "wirecutter.com",
      "techradar.com",
      "tomsguide.com",
      "rtings.com",
      "cnet.com",
      "theverge.com",
      "engadget.com",
      "pcmag.com",
      "digitaltrends.com",
    ];
    
    // Create site restriction for query
    const siteQuery = reviewSites.map(site => `site:${site}`).join(" OR ");
    
    // Full search query
    const searchQuery = `${productTitle} review (${siteQuery})`;
    
    const response = await axios.get("https://api.bing.microsoft.com/v7.0/search", {
      headers: {
        "Ocp-Apim-Subscription-Key": this.bingApiKey,
      },
      params: {
        q: searchQuery,
        count: 10,
        responseFilter: "Webpages",
      },
    });
    
    return this.processSearchResults(response.data.webPages?.value || [], productTitle);
  }

  private async processSearchResults(results: any[], productTitle: string): Promise<BlogReview[]> {
    const reviewPromises = results.map(async (result) => {
      const url = new URL(result.link || result.url);
      const domain = url.hostname.replace("www.", "");
      const source = this.getDomainDisplayName(domain);
      const logoText = this.getLogoText(source);
      
      // Extract rating if present in the title or snippet
      const ratingMatch = (result.title + result.snippet).match(/(\d+(\.\d+)?)\s*\/?(\s*out of\s*)?(\d+)?/i);
      const scoreOutOf = ratingMatch && ratingMatch[4] ? parseInt(ratingMatch[4], 10) : (ratingMatch ? 10 : null);
      let rating = null;
      
      if (ratingMatch && ratingMatch[1]) {
        rating = parseFloat(ratingMatch[1]);
        // Normalize to a scale of 10 if it's out of 5
        if (scoreOutOf === 5) {
          rating = rating * 2;
        }
      }
      
      // Generate a concise snippet with AI
      let snippet = result.snippet || "";
      
      if (snippet.length > 50) {
        try {
          const enhancedSnippet = await openaiService.askAboutProduct(
            productTitle,
            `Based on this expert review snippet, give a concise 1-sentence summary of what the reviewer thinks about ${productTitle}:`,
            snippet
          );
          
          snippet = enhancedSnippet;
        } catch (error) {
          // If AI enhancement fails, use the original snippet but truncate it
          snippet = snippet.length > 150 ? snippet.substring(0, 147) + "..." : snippet;
        }
      }
      
      return {
        id: result.cacheId || result.id || `blog-${Math.random().toString(36).substring(2, 11)}`,
        source,
        rating: rating,
        snippet,
        url: result.link || result.url,
        logoText,
      };
    });
    
    return await Promise.all(reviewPromises);
  }

  private getDomainDisplayName(domain: string): string {
    const domainMap: Record<string, string> = {
      "wirecutter.com": "Wirecutter",
      "techradar.com": "TechRadar",
      "tomsguide.com": "Tom's Guide",
      "rtings.com": "RTINGS",
      "cnet.com": "CNET",
      "theverge.com": "The Verge",
      "engadget.com": "Engadget",
      "pcmag.com": "PCMag",
      "digitaltrends.com": "Digital Trends",
    };
    
    return domainMap[domain] || domain.split(".")[0].charAt(0).toUpperCase() + domain.split(".")[0].slice(1);
  }

  private getLogoText(source: string): string {
    // Get initials or abbreviated text for logo
    const words = source.split(" ");
    if (words.length === 1) {
      return source.substring(0, 2).toUpperCase();
    }
    
    return words.map(word => word[0]).join("").toUpperCase();
  }
}

export const searchService = new SearchService();
