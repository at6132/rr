import { ProductAnalysis, videoReviewSchema, redditPostSchema, blogReviewSchema } from "@shared/schema";
import { youtubeService } from "./youtube-service";
import { redditService } from "./reddit-service";
import { searchService } from "./search-service";
import { openaiService } from "./openai-service";

class ProductService {
  async analyzeProduct(url?: string, productInfo?: any): Promise<ProductAnalysis> {
    try {
      // Extract product details from URL or provided info
      const product = productInfo || await this.extractProductFromUrl(url || "");
      
      if (!product || !product.title) {
        throw new Error("Could not detect product information");
      }
      
      // Fetch data from different sources in parallel
      const [videos, redditPosts, blogReviews] = await Promise.all([
        youtubeService.getProductReviews(product.title),
        redditService.getProductDiscussions(product.title),
        searchService.getExpertReviews(product.title)
      ]);
      
      // Gather review texts for AI processing
      const reviewTexts = [
        ...blogReviews.map(review => review.snippet),
        ...redditPosts.map(post => post.summary),
        // We don't have text transcripts of videos, so we can't include them
      ];
      
      // Generate AI summary
      const summary = await openaiService.summarizeReviews(product.title, reviewTexts);
      
      // Create final product analysis
      const productAnalysis: ProductAnalysis = {
        product: {
          title: product.title,
          source: product.source,
          url: product.url,
          imageUrl: product.imageUrl,
        },
        summary: {
          positivePercentage: summary.positivePercentage,
          neutralPercentage: summary.neutralPercentage,
          negativePercentage: summary.negativePercentage,
          reviewCount: reviewTexts.length,
          pros: summary.pros,
          cons: summary.cons,
          tags: summary.tags,
        },
        videoReviews: videos,
        redditPosts: redditPosts,
        blogReviews: blogReviews,
      };
      
      return productAnalysis;
    } catch (error) {
      console.error("Error analyzing product:", error);
      throw new Error(`Failed to analyze product: ${(error as Error).message}`);
    }
  }

  private async extractProductFromUrl(url: string): Promise<{
    title: string;
    url: string;
    source: string;
    imageUrl?: string;
  }> {
    // In a real implementation, this would make a request to the URL
    // and extract product details using DOM parsing or other methods
    // For simplicity, we'll just parse the URL to get basic info
    
    try {
      const parsedUrl = new URL(url);
      const hostname = parsedUrl.hostname;
      let productTitle = "";
      let source = "";
      
      // Extract domain for source
      if (hostname.includes("amazon")) {
        source = "Amazon.com";
        // For Amazon, try to extract ASIN from the URL
        const asinMatch = url.match(/\/([A-Z0-9]{10})(?:\/|\?|$)/);
        if (asinMatch && asinMatch[1]) {
          productTitle = `Product ${asinMatch[1]}`;
        }
      } else if (hostname.includes("walmart")) {
        source = "Walmart.com";
      } else if (hostname.includes("bestbuy")) {
        source = "BestBuy.com";
      } else {
        // Extract domain name for source
        const domainParts = hostname.split(".");
        if (domainParts[0] === "www") {
          domainParts.shift();
        }
        source = domainParts[0].charAt(0).toUpperCase() + domainParts[0].slice(1) + ".com";
      }
      
      // If we couldn't extract a product title from the URL structure
      if (!productTitle) {
        // Get the last path segment which often contains the product name
        const pathSegments = parsedUrl.pathname.split("/").filter(segment => segment.length > 0);
        if (pathSegments.length > 0) {
          productTitle = pathSegments[pathSegments.length - 1]
            .replace(/-/g, " ")
            .replace(/_/g, " ")
            .split("?")[0]; // Remove query string if present
            
          // Capitalize first letter of each word
          productTitle = productTitle
            .split(" ")
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
        } else {
          productTitle = "Unknown Product";
        }
      }
      
      return {
        title: productTitle,
        url: url,
        source: source,
      };
    } catch (error) {
      console.error("Error extracting product from URL:", error);
      throw new Error("Invalid product URL");
    }
  }
}

export const productService = new ProductService();
