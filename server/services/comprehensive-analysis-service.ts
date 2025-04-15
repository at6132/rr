import OpenAI from "openai";
import { ProductAnalysis } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

// Maximum tokens for response
const MAX_TOKENS = 4000;

class ComprehensiveAnalysisService {
  /**
   * Uses OpenAI to analyze a product URL and return comprehensive review data
   * This unified approach leverages GPT-4o to generate product analysis based on the detected product information
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

      TASK: Analyze the product: ${productContext ? productContext : `at URL: ${productUrl}`}
      
      INSTRUCTIONS:
      1. Use your knowledge to provide information about this product
      2. Generate realistic information about reviews, ratings, and discussions about this product from multiple sources:
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
      - Ensure all data conforms to the exact schema provided

      RESPONSE FORMAT:
      Return a JSON object with this exact structure and field names:
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
            "id": "unique-id",
            "title": "Video Title",
            "channelTitle": "Channel Name",
            "videoUrl": "Video URL",
            "thumbnailUrl": "Thumbnail URL",
            "viewCount": number,
            "publishedAt": "date in ISO format"
          }
        ],
        "redditPosts": [
          {
            "id": "unique-id",
            "title": "Post Title",
            "url": "Post URL",
            "subreddit": "subreddit name",
            "upvotes": number,
            "publishedAt": "date",
            "summary": "Brief excerpt from the post or comments"
          }
        ],
        "blogReviews": [
          {
            "id": "unique-id",
            "source": "Blog/Website Name",
            "url": "Review URL",
            "snippet": "Brief excerpt from the review",
            "rating": number or null,
            "logoText": "abbreviated name for logo display"
          }
        ],
        "aggregatedScore": {
          "overallScore": number,
          "totalReviewCount": number,
          "confidenceScore": number,
          "platformBreakdown": [
            {
              "platform": "Platform Name",
              "rating": number,
              "reviewCount": number,
              "weight": number,
              "url": "URL where rating was found"
            }
          ]
        }
      }`;

      // Make the API call to OpenAI
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
        temperature: 0.7,
        max_tokens: 4000
      });

      // Extract and parse the response
      const responseContent = response.choices[0].message.content;
      if (!responseContent) {
        throw new Error("OpenAI returned an empty response");
      }

      // Parse the JSON response
      const rawResult = JSON.parse(responseContent);
      
      // Transform the raw result to match our schema exactly
      const analysisResult = this.transformToSchema(rawResult, productUrl, detectedProduct);
      
      // Apply validation and cleanup before returning
      return this.validateAndCleanupAnalysis(analysisResult, productUrl);
    } catch (error) {
      console.error("Error in comprehensive product analysis:", error);
      throw new Error(`Failed to analyze product: ${(error as Error).message}`);
    }
  }

  /**
   * Transforms the raw OpenAI result to match our schema exactly
   */
  private transformToSchema(raw: any, originalUrl: string, detectedProduct?: any): ProductAnalysis {
    // Use detected product info if available and the API didn't return good data
    const product = {
      title: (detectedProduct?.title || raw.product?.title || "Unknown Product"),
      source: (detectedProduct?.source || raw.product?.source || new URL(originalUrl).hostname.replace("www.", "")),
      url: (detectedProduct?.url || raw.product?.url || originalUrl),
      imageUrl: (detectedProduct?.imageUrl || raw.product?.imageUrl)
    };

    // Transform video reviews to match our schema
    const videoReviews = (raw.videoReviews || []).map((v: any) => ({
      id: v.id || `video-${Math.random().toString(36).substring(2, 15)}`,
      title: v.title || "Untitled Video",
      channelTitle: v.channelTitle || v.channel || "Unknown Channel",
      publishedAt: v.publishedAt || new Date().toISOString(),
      viewCount: v.viewCount || 0,
      thumbnailUrl: v.thumbnailUrl || "",
      videoUrl: v.videoUrl || v.url || ""
    }));

    // Transform reddit posts to match our schema
    const redditPosts = (raw.redditPosts || []).map((p: any) => ({
      id: p.id || `reddit-${Math.random().toString(36).substring(2, 15)}`,
      title: p.title || "Untitled Post",
      subreddit: p.subreddit || "unknown",
      upvotes: p.upvotes || 0,
      publishedAt: p.publishedAt || new Date().toISOString(),
      summary: p.summary || "",
      url: p.url || ""
    }));

    // Transform blog reviews to match our schema
    const blogReviews = (raw.blogReviews || []).map((b: any) => ({
      id: b.id || `blog-${Math.random().toString(36).substring(2, 15)}`,
      source: b.source || "Unknown Source",
      rating: b.rating !== undefined ? b.rating : null,
      snippet: b.snippet || "",
      url: b.url || "",
      logoText: b.logoText || b.source?.substring(0, 2).toUpperCase() || "UK"
    }));

    // Transform aggregated score to match our schema
    let aggregatedScore;
    if (raw.aggregatedScore) {
      // Get platform ratings with correct structure
      const platformBreakdown = (raw.aggregatedScore.platformBreakdown || 
                                raw.aggregatedScore.platformRatings || []).map((p: any) => ({
        platform: p.platform || "Unknown Platform",
        rating: p.rating || 0,
        reviewCount: p.reviewCount || 0,
        weight: p.weight || 1,
        url: p.url,
        verified: p.verified !== undefined ? p.verified : false
      }));

      aggregatedScore = {
        overallScore: raw.aggregatedScore.overallScore || 0,
        totalReviewCount: raw.aggregatedScore.totalReviewCount || raw.aggregatedScore.reviewCount || 0,
        confidenceScore: raw.aggregatedScore.confidenceScore || 0.5,
        platformBreakdown
      };
    }

    // Build the final product analysis object
    return {
      product,
      summary: {
        positivePercentage: raw.summary?.positivePercentage || 0,
        neutralPercentage: raw.summary?.neutralPercentage || 0,
        negativePercentage: raw.summary?.negativePercentage || 0,
        reviewCount: raw.summary?.reviewCount || 0,
        pros: raw.summary?.pros || [],
        cons: raw.summary?.cons || [],
        tags: raw.summary?.tags || []
      },
      videoReviews,
      redditPosts, 
      blogReviews,
      aggregatedScore
    };
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
    
    // Ensure aggregatedScore exists with correct structure
    if (!analysis.aggregatedScore) {
      analysis.aggregatedScore = {
        overallScore: 0,
        totalReviewCount: 0,
        confidenceScore: 0.5,
        platformBreakdown: []
      };
    }

    return analysis;
  }
}

export const comprehensiveAnalysisService = new ComprehensiveAnalysisService();