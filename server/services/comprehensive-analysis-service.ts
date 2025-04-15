import OpenAI from "openai";
import { ProductAnalysis } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

// Default timeout for web search requests
const WEB_SEARCH_TIMEOUT = 45000; // 45 seconds

class ComprehensiveAnalysisService {
  /**
   * Uses OpenAI with web browsing capabilities to analyze a product URL and return comprehensive review data
   * This is a unified approach that leverages OpenAI's ability to visit URLs and extract information
   *
   * @param productUrl URL of the product page to analyze
   * @param detectedProduct Optional product info already detected from the client side
   * @returns A complete ProductAnalysis object with all relevant data
   */
  async analyzeProductUrl(productUrl: string, detectedProduct?: any): Promise<ProductAnalysis> {
    try {
      console.log(`Starting comprehensive analysis of product at URL: ${productUrl}`);
      
      // Define context with detected product info if available
      let productContext = "";
      if (detectedProduct) {
        productContext = `
          Product detected from client side:
          - Title: ${detectedProduct.title}
          - Source: ${detectedProduct.source}
          - Image URL: ${detectedProduct.imageUrl || "Not available"}
        `;
      }
      
      // Create the prompt for OpenAI
      const systemPrompt = `You are ReviewRadar, an expert AI shopping assistant that analyzes product reviews across the web.

      TASK: Analyze the product at the URL: ${productUrl} ${productContext ? "with this additional context:\n" + productContext : ""}
      
      INSTRUCTIONS:
      1. Visit the product URL and identify the product
      2. Search for reviews, ratings, and discussions about this product from multiple sources:
         - The product page itself
         - Professional review sites and blogs
         - YouTube review videos
         - Reddit discussions
         - Other retail sites that may sell this product
      
      3. Compile your findings into a comprehensive product analysis with:
         - Accurate product information
         - A summary of review sentiments 
         - Pros and cons mentioned by reviewers
         - Tags describing what the product is best for
         - Video reviews from YouTube (with real links)
         - Reddit posts discussing the product (with real links)
         - Blog/website reviews (with real links)
         - Ratings across different platforms (with real data)
      
      CRITICAL REQUIREMENTS:
      - All data MUST be real and verifiable, not fictional or estimated
      - If you can't find real data for a section, include an empty array [] or null value
      - All URLs must be real and accessible
      - Only return the JSON object - no explanations or other text

      RESPONSE FORMAT:
      Return a JSON object with this exact structure:
      {
        "product": {
          "title": "Full Product Name",
          "source": "Website where product was found",
          "url": "Product URL",
          "imageUrl": "URL to product image"
        },
        "summary": {
          "positivePercentage": number,
          "neutralPercentage": number,
          "negativePercentage": number,
          "reviewCount": number,
          "pros": ["pro1", "pro2", "pro3"],
          "cons": ["con1", "con2", "con3"],
          "tags": ["tag1", "tag2"]
        },
        "videoReviews": [
          {
            "title": "Video Title",
            "channel": "Channel Name",
            "url": "Video URL",
            "thumbnailUrl": "Thumbnail URL",
            "viewCount": number,
            "publishedAt": "date in ISO format",
            "positivity": number
          }
        ],
        "redditPosts": [
          {
            "title": "Post Title",
            "url": "Post URL",
            "subreddit": "subreddit name",
            "upvotes": number,
            "commentCount": number,
            "summary": "Brief excerpt from the post or comments",
            "sentiment": "positive" | "neutral" | "negative"
          }
        ],
        "blogReviews": [
          {
            "source": "Blog/Website Name",
            "title": "Review Title",
            "url": "Review URL",
            "snippet": "Brief excerpt from the review",
            "rating": number or null,
            "logoText": "abbreviated name for logo display"
          }
        ],
        "aggregatedScore": {
          "overallScore": number,
          "reviewCount": number,
          "platformRatings": [
            {
              "platform": "Platform Name",
              "rating": number,
              "reviewCount": number,
              "url": "URL where rating was found"
            }
          ]
        }
      }`;

      // Make the API call to OpenAI with web browsing enabled
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: `Please analyze the product at ${productUrl} and provide a comprehensive review summary.`
          }
        ],
        response_format: { type: "json_object" },
        tools: [{ type: "web_browser" }],
        tool_choice: { type: "web_browser" },
        timeout: WEB_SEARCH_TIMEOUT
      });

      // Extract and parse the response
      const responseContent = response.choices[0].message.content;
      if (!responseContent) {
        throw new Error("OpenAI returned an empty response");
      }

      // Parse the JSON response
      const analysisResult = JSON.parse(responseContent) as ProductAnalysis;
      
      // Make sure to use the detected product info if available and the API didn't return good data
      if (detectedProduct && (!analysisResult.product.title || analysisResult.product.title === "Full Product Name")) {
        analysisResult.product = {
          ...analysisResult.product,
          title: detectedProduct.title || analysisResult.product.title,
          source: detectedProduct.source || analysisResult.product.source,
          url: detectedProduct.url || analysisResult.product.url,
          imageUrl: detectedProduct.imageUrl || analysisResult.product.imageUrl
        };
      }

      // Apply validation and cleanup before returning
      return this.validateAndCleanupAnalysis(analysisResult, productUrl);
    } catch (error) {
      console.error("Error in comprehensive product analysis:", error);
      throw new Error(`Failed to analyze product: ${(error as Error).message}`);
    }
  }

  /**
   * Validates and cleans up the analysis data to ensure it meets our schema requirements
   */
  private validateAndCleanupAnalysis(analysis: ProductAnalysis, originalUrl: string): ProductAnalysis {
    // Ensure product has required fields
    if (!analysis.product) {
      analysis.product = {
        title: "Unknown Product",
        url: originalUrl,
        source: new URL(originalUrl).hostname.replace("www.", "")
      };
    }

    // Ensure summary exists with required fields
    if (!analysis.summary) {
      analysis.summary = {
        positivePercentage: 0,
        neutralPercentage: 0,
        negativePercentage: 0,
        reviewCount: 0,
        pros: [],
        cons: [],
        tags: []
      };
    }

    // Ensure arrays exist
    analysis.videoReviews = analysis.videoReviews || [];
    analysis.redditPosts = analysis.redditPosts || [];
    analysis.blogReviews = analysis.blogReviews || [];

    // Ensure aggregatedScore exists
    if (!analysis.aggregatedScore) {
      analysis.aggregatedScore = {
        overallScore: 0,
        reviewCount: 0,
        platformRatings: []
      };
    }

    // Fix any null values in arrays that should be empty arrays
    if (!analysis.aggregatedScore.platformRatings) {
      analysis.aggregatedScore.platformRatings = [];
    }

    return analysis;
  }
}

export const comprehensiveAnalysisService = new ComprehensiveAnalysisService();