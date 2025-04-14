import { apiRequest } from "./queryClient";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user

export async function summarizeReviews(
  productTitle: string,
  reviewTexts: string[]
): Promise<{
  positivePercentage: number;
  neutralPercentage: number;
  negativePercentage: number;
  pros: string[];
  cons: string[];
  tags: string[];
  confidence: number;
}> {
  try {
    const response = await apiRequest(
      "POST",
      "/api/ai/summarize",
      {
        productTitle,
        reviewTexts
      }
    );
    
    return await response.json();
  } catch (error) {
    console.error("Error summarizing reviews:", error);
    throw error;
  }
}

export async function askAIAboutProduct(
  productTitle: string,
  question: string,
  productContext?: string
): Promise<string> {
  try {
    const response = await apiRequest(
      "POST",
      "/api/ai/ask",
      {
        productTitle,
        question,
        productContext
      }
    );
    
    const data = await response.json();
    return data.answer;
  } catch (error) {
    console.error("Error asking AI:", error);
    throw error;
  }
}

export async function analyzeSentiment(text: string): Promise<{
  rating: number;
  confidence: number;
}> {
  try {
    const response = await apiRequest(
      "POST",
      "/api/ai/sentiment",
      { text }
    );
    
    return await response.json();
  } catch (error) {
    console.error("Error analyzing sentiment:", error);
    throw error;
  }
}
