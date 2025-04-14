import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

// Default timeout for web search requests
const WEB_SEARCH_TIMEOUT = 30000; // 30 seconds

interface SummarizeResponse {
  positivePercentage: number;
  neutralPercentage: number;
  negativePercentage: number;
  pros: string[];
  cons: string[];
  tags: string[];
  confidence: number;
}

interface SentimentResponse {
  rating: number;
  confidence: number;
}

interface BlogReviewResult {
  source: string;
  title: string;
  url: string;
  snippet: string;
  rating: number | null; // Rating might not be available in all blog reviews
}

class OpenAIService {
  /**
   * Fetches real blog reviews for a product using OpenAI's websearch capability
   * @param productTitle The product title to search for
   * @param limit Maximum number of blog reviews to fetch
   * @returns An array of blog review results
   */
  async fetchBlogReviews(productTitle: string, limit: number = 5): Promise<BlogReviewResult[]> {
    try {
      console.log(`Fetching real blog reviews for "${productTitle}" using websearch...`);
      
      // Create a search query that's likely to find review articles
      const searchQuery = `${productTitle} review in-depth honest expert`;
      
      // Use OpenAI with websearch capability to find real blog reviews
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a helpful research assistant that finds real product reviews from reputable blogs and websites.
            Find ${limit} real, published blog reviews for the product: "${productTitle}".
            For each review you find, extract:
            1. The source website/blog name
            2. The review title
            3. The URL of the review
            4. A short snippet from the review (1-2 sentences that give insight about the product)
            5. The rating given (as a number out of 5, or null if not specified)
            
            Only include REAL reviews that actually exist online from legitimate sources.
            NO fictional or made-up reviews. If you can't find enough reviews, return fewer results.
            
            Respond with JSON only in this exact format:
            [
              {
                "source": "blog/website name",
                "title": "review title",
                "url": "full URL to the review",
                "snippet": "brief excerpt from the review",
                "rating": number or null
              },
              ...
            ]`
          },
          {
            role: "user",
            content: `Find real published reviews for: ${productTitle}`
          }
        ],
        response_format: { type: "json_object" },
        // Using websearch tool to get real data from the web
        tools: [{ type: "web_search" }],
        tool_choice: { type: "web_search" },
        timeout: WEB_SEARCH_TIMEOUT
      });
      
      // Parse the response to get the blog reviews
      const responseContent = response.choices[0].message.content;
      if (!responseContent) {
        return [];
      }
      
      try {
        const reviews = JSON.parse(responseContent) as BlogReviewResult[];
        return reviews.slice(0, limit);
      } catch (parseError) {
        console.error("Error parsing blog reviews response:", parseError);
        return [];
      }
    } catch (error) {
      console.error("Error fetching blog reviews:", error);
      return [];
    }
  }
  
  /**
   * Gets platform ratings for a product using OpenAI's websearch capability
   * @param productTitle The product title
   * @param platformNames Array of platform names to search for
   * @returns An array of platform ratings
   */
  async fetchPlatformRatings(
    productTitle: string, 
    platformNames: string[]
  ): Promise<{ platform: string; rating: number; reviewCount: number; url: string }[]> {
    try {
      console.log(`Fetching real platform ratings for "${productTitle}" using websearch...`);
      
      // Use OpenAI with websearch capability to find real ratings
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a helpful shopping assistant that finds accurate product ratings from e-commerce platforms.
            Find the current user ratings for the product: "${productTitle}" on these platforms: ${platformNames.join(', ')}.
            
            For each platform, provide:
            1. The platform name
            2. The star rating (out of 5)
            3. The number of reviews
            4. The URL where this information was found
            
            Only include REAL data that you can verify. If you can't find information for a platform, exclude it.
            NO estimated or made-up ratings. Only real data.
            
            Respond with JSON only in this exact format:
            [
              {
                "platform": "platform name",
                "rating": number,
                "reviewCount": number,
                "url": "product page URL"
              },
              ...
            ]`
          },
          {
            role: "user",
            content: `Find current ratings for: ${productTitle} on ${platformNames.join(', ')}`
          }
        ],
        response_format: { type: "json_object" },
        // Using websearch tool to get real data from the web
        tools: [{ type: "web_search" }],
        tool_choice: { type: "web_search" },
        timeout: WEB_SEARCH_TIMEOUT
      });
      
      // Parse the response to get the platform ratings
      const responseContent = response.choices[0].message.content;
      if (!responseContent) {
        return [];
      }
      
      try {
        return JSON.parse(responseContent);
      } catch (parseError) {
        console.error("Error parsing platform ratings response:", parseError);
        return [];
      }
    } catch (error) {
      console.error("Error fetching platform ratings:", error);
      return [];
    }
  }
  async summarizeReviews(
    productTitle: string,
    reviewTexts: string[]
  ): Promise<SummarizeResponse> {
    try {
      const concatenatedReviews = reviewTexts.join("\n\n");
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert at analyzing product reviews and providing balanced, helpful summaries. 
            Analyze the following reviews for ${productTitle} and provide:
            1. The percentage of positive, neutral, and negative sentiment (must add up to 100%)
            2. Top 3 pros mentioned by reviewers
            3. Top 3 cons mentioned by reviewers
            4. 2-3 tags that describe what this product is best for (e.g., "Best for travelers", "Budget pick", etc.)
            5. A confidence score (0-1) for your analysis based on the quantity and quality of reviews

            Respond with JSON only in the exact format:
            {
              "positivePercentage": number,
              "neutralPercentage": number,
              "negativePercentage": number, 
              "pros": ["pro1", "pro2", "pro3"],
              "cons": ["con1", "con2", "con3"],
              "tags": ["tag1", "tag2"],
              "confidence": number
            }`
          },
          {
            role: "user",
            content: concatenatedReviews
          }
        ],
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content);
      
      return {
        positivePercentage: result.positivePercentage,
        neutralPercentage: result.neutralPercentage,
        negativePercentage: result.negativePercentage,
        pros: result.pros,
        cons: result.cons,
        tags: result.tags,
        confidence: result.confidence
      };
    } catch (error) {
      console.error("Error summarizing reviews:", error);
      throw new Error(`Failed to summarize reviews: ${(error as Error).message}`);
    }
  }

  async analyzeSentiment(text: string): Promise<SentimentResponse> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a sentiment analysis expert. Analyze the sentiment of the text and provide a rating from 1 to 5 stars and a confidence score between 0 and 1. Respond with JSON in this format: { \"rating\": number, \"confidence\": number }"
          },
          {
            role: "user",
            content: text
          }
        ],
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content);
      
      return {
        rating: Math.max(1, Math.min(5, Math.round(result.rating))),
        confidence: Math.max(0, Math.min(1, result.confidence))
      };
    } catch (error) {
      console.error("Error analyzing sentiment:", error);
      throw new Error(`Failed to analyze sentiment: ${(error as Error).message}`);
    }
  }

  async askAboutProduct(
    productTitle: string,
    question: string,
    productContext?: string
  ): Promise<string> {
    try {
      const contextMessage = productContext 
        ? `Based on the following information about ${productTitle}:\n\n${productContext}` 
        : `About the product ${productTitle}`;
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an AI product assistant that helps shoppers make informed decisions. 
            ${contextMessage}
            
            Answer questions factually and helpfully, focusing on objective information. 
            If the answer is not clear from the available information, acknowledge the limitations 
            but still provide the most helpful response possible based on general knowledge about similar products.
            Keep answers concise but informative, around 2-3 sentences unless more detail is clearly needed.`
          },
          {
            role: "user",
            content: question
          }
        ]
      });

      return response.choices[0].message.content || "I'm not sure about that. Could you ask another question?";
    } catch (error) {
      console.error("Error asking about product:", error);
      throw new Error(`Failed to answer question: ${(error as Error).message}`);
    }
  }
}

export const openaiService = new OpenAIService();
