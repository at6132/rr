import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

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

class OpenAIService {
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
