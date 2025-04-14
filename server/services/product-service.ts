import { ProductAnalysis, videoReviewSchema, redditPostSchema, blogReviewSchema } from "@shared/schema";
import { youtubeService } from "./youtube-service";
import { redditService } from "./reddit-service";
import { searchService } from "./search-service";
import { openaiService } from "./openai-service";
import { ratingAggregatorService } from "./rating-aggregator-service";

class ProductService {
  async analyzeProduct(url?: string, productInfo?: any): Promise<ProductAnalysis> {
    try {
      // Extract product details from URL or provided info
      const product = productInfo || await this.extractProductFromUrl(url || "");
      
      if (!product || !product.title) {
        throw new Error("Could not detect product information");
      }
      
      // Fetch data from different sources in parallel
      const [videos, redditPosts, blogReviews, aggregatedScore] = await Promise.all([
        youtubeService.getProductReviews(product.title),
        redditService.getProductDiscussions(product.title),
        searchService.getExpertReviews(product.title),
        ratingAggregatorService.getAggregatedScore(product.title, product.url)
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
        aggregatedScore: aggregatedScore,
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
    // For this implementation, we'll parse the URL to get basic info
    
    try {
      const parsedUrl = new URL(url);
      const hostname = parsedUrl.hostname.toLowerCase();
      let productTitle = "";
      let source = "";
      let imageUrl: string | undefined = undefined;
      
      // Extract domain for source
      if (hostname.includes("amazon")) {
        source = "Amazon.com";
        
        // For Amazon, try to extract ASIN from the URL
        const asinMatch = url.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:\/|\?|$)/);
        if (asinMatch && asinMatch[1]) {
          const asin = asinMatch[1];
          productTitle = `Amazon Product ${asin}`;
          // We could also fetch product details using Amazon API here if we had access
          imageUrl = `https://images-na.ssl-images-amazon.com/images/I/${asin}.jpg`;
        }
        
        // Try to extract product title from query parameters
        const urlParams = new URLSearchParams(parsedUrl.search);
        if (!productTitle && urlParams.has('title')) {
          productTitle = urlParams.get('title') || productTitle;
        }
        
      } else if (hostname.includes("walmart")) {
        source = "Walmart.com";
        
        // For Walmart, try to extract product ID
        const productIdMatch = url.match(/\/ip\/(?:.*?)\/(\d+)(?:\/|\?|$)/);
        if (productIdMatch && productIdMatch[1]) {
          productTitle = `Walmart Product ${productIdMatch[1]}`;
        }
        
      } else if (hostname.includes("bestbuy")) {
        source = "BestBuy.com";
        
        // For Best Buy, try to extract SKU
        const skuMatch = url.match(/\/(?:.*?)\/(\d+)\.p(?:\/|\?|$)/);
        if (skuMatch && skuMatch[1]) {
          productTitle = `Best Buy Product ${skuMatch[1]}`;
        }
        
      } else if (hostname.includes("target")) {
        source = "Target.com";
        
        // For Target, try to extract product ID
        const targetIdMatch = url.match(/\/p\/(?:.*?)-\/A-(\d+)(?:\/|\?|$)/);
        if (targetIdMatch && targetIdMatch[1]) {
          productTitle = `Target Product ${targetIdMatch[1]}`;
        }
        
      } else if (hostname.includes("ebay")) {
        source = "eBay.com";
        
        // For eBay, try to extract item ID
        const itemIdMatch = url.match(/\/itm\/(?:.*?)\/(\d+)(?:\/|\?|$)/);
        if (itemIdMatch && itemIdMatch[1]) {
          productTitle = `eBay Item ${itemIdMatch[1]}`;
        }
        
      } else if (hostname.includes("newegg")) {
        source = "Newegg.com";
        
        // For Newegg, try to extract item ID
        const itemIdMatch = url.match(/\/Product\/Product\.aspx\?Item=([A-Za-z0-9]+)(?:\/|\?|$)/);
        if (itemIdMatch && itemIdMatch[1]) {
          productTitle = `Newegg Item ${itemIdMatch[1]}`;
        }
        
      } else if (hostname.includes("etsy")) {
        source = "Etsy.com";
        
        // For Etsy, try to extract listing ID
        const listingIdMatch = url.match(/\/listing\/(\d+)\/(?:.*?)(?:\/|\?|$)/);
        if (listingIdMatch && listingIdMatch[1]) {
          productTitle = `Etsy Listing ${listingIdMatch[1]}`;
        }
        
      } else {
        // Extract domain name for source
        const domainParts = hostname.split(".");
        if (domainParts[0] === "www") {
          domainParts.shift();
        }
        
        if (domainParts.length > 0) {
          source = domainParts[0].charAt(0).toUpperCase() + domainParts[0].slice(1) + ".com";
        } else {
          source = "Unknown Source";
        }
      }
      
      // If we couldn't extract a product title from specific URL patterns
      if (!productTitle) {
        // Try to extract it from query parameters first (common in many e-commerce sites)
        const urlParams = new URLSearchParams(parsedUrl.search);
        if (urlParams.has('title')) {
          productTitle = urlParams.get('title') || "";
        } else if (urlParams.has('product')) {
          productTitle = urlParams.get('product') || "";
        } else if (urlParams.has('name')) {
          productTitle = urlParams.get('name') || "";
        } else if (urlParams.has('q')) {
          // If it's a search query, use it with qualifier
          const query = urlParams.get('q') || "";
          if (query.length > 0) {
            productTitle = query;
          }
        }
        
        // If still no title, get the last path segment which often contains the product name
        if (!productTitle) {
          const pathSegments = parsedUrl.pathname.split("/").filter(segment => segment.length > 0);
          if (pathSegments.length > 0) {
            productTitle = pathSegments[pathSegments.length - 1]
              .replace(/-/g, " ")
              .replace(/_/g, " ")
              .replace(/\..*$/, "") // Remove file extension if present
              .split("?")[0]; // Remove query string if present
              
            // Capitalize first letter of each word
            productTitle = productTitle
              .split(" ")
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" ");
          }
        }
        
        // If still no title, use a generic fallback
        if (!productTitle) {
          productTitle = "Unknown Product";
        }
      }
      
      return {
        title: productTitle,
        url: url,
        source: source,
        imageUrl
      };
    } catch (error) {
      console.error("Error extracting product from URL:", error);
      throw new Error("Invalid product URL");
    }
  }
}

export const productService = new ProductService();
