import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { openaiService } from "./services/openai-service";
import { youtubeService } from "./services/youtube-service";
import { redditService } from "./services/reddit-service";
import { searchService } from "./services/search-service";
import { productService } from "./services/product-service";
import { affiliateService } from "./services/affiliate-service";
import { z } from "zod";
import { productAnalysisSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Product analysis endpoint
  app.post('/api/analyze', async (req, res) => {
    try {
      const { url, productInfo } = req.body;
      
      if (!url && !productInfo) {
        return res.status(400).json({ 
          message: 'Either url or productInfo is required' 
        });
      }
      
      const productAnalysis = await productService.analyzeProduct(url, productInfo);
      return res.json(productAnalysis);
    } catch (error) {
      console.error('Error analyzing product:', error);
      return res.status(500).json({ 
        message: 'Failed to analyze product',
        error: (error as Error).message
      });
    }
  });

  // AI review summarization endpoint
  app.post('/api/ai/summarize', async (req, res) => {
    try {
      const { productTitle, reviewTexts } = req.body;
      
      if (!productTitle || !reviewTexts || !Array.isArray(reviewTexts)) {
        return res.status(400).json({ 
          message: 'productTitle and reviewTexts array are required' 
        });
      }
      
      const summary = await openaiService.summarizeReviews(productTitle, reviewTexts);
      return res.json(summary);
    } catch (error) {
      console.error('Error summarizing reviews:', error);
      return res.status(500).json({ 
        message: 'Failed to summarize reviews',
        error: (error as Error).message
      });
    }
  });

  // AI sentiment analysis endpoint
  app.post('/api/ai/sentiment', async (req, res) => {
    try {
      const { text } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ 
          message: 'text is required' 
        });
      }
      
      const sentiment = await openaiService.analyzeSentiment(text);
      return res.json(sentiment);
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      return res.status(500).json({ 
        message: 'Failed to analyze sentiment',
        error: (error as Error).message
      });
    }
  });

  // AI Q&A endpoint
  app.post('/api/ai/ask', async (req, res) => {
    try {
      const { productTitle, question, productContext } = req.body;
      
      if (!productTitle || !question) {
        return res.status(400).json({ 
          message: 'productTitle and question are required' 
        });
      }
      
      const answer = await openaiService.askAboutProduct(productTitle, question, productContext);
      return res.json({ answer });
    } catch (error) {
      console.error('Error answering question:', error);
      return res.status(500).json({ 
        message: 'Failed to answer question',
        error: (error as Error).message
      });
    }
  });

  // YouTube reviews endpoint
  app.get('/api/youtube/:productTitle', async (req, res) => {
    try {
      const { productTitle } = req.params;
      
      if (!productTitle) {
        return res.status(400).json({ 
          message: 'productTitle is required' 
        });
      }
      
      const videos = await youtubeService.getProductReviews(productTitle);
      return res.json(videos);
    } catch (error) {
      console.error('Error fetching YouTube reviews:', error);
      return res.status(500).json({ 
        message: 'Failed to fetch YouTube reviews',
        error: (error as Error).message
      });
    }
  });

  // Reddit discussions endpoint
  app.get('/api/reddit/:productTitle', async (req, res) => {
    try {
      const { productTitle } = req.params;
      
      if (!productTitle) {
        return res.status(400).json({ 
          message: 'productTitle is required' 
        });
      }
      
      const posts = await redditService.getProductDiscussions(productTitle);
      return res.json(posts);
    } catch (error) {
      console.error('Error fetching Reddit discussions:', error);
      return res.status(500).json({ 
        message: 'Failed to fetch Reddit discussions',
        error: (error as Error).message
      });
    }
  });

  // Blog reviews endpoint
  app.get('/api/blogs/:productTitle', async (req, res) => {
    try {
      const { productTitle } = req.params;
      
      if (!productTitle) {
        return res.status(400).json({ 
          message: 'productTitle is required' 
        });
      }
      
      const blogs = await searchService.getExpertReviews(productTitle);
      return res.json(blogs);
    } catch (error) {
      console.error('Error fetching blog reviews:', error);
      return res.status(500).json({ 
        message: 'Failed to fetch blog reviews',
        error: (error as Error).message
      });
    }
  });

  // Generate affiliate link endpoint
  app.post('/api/affiliate/link', (req, res) => {
    try {
      const { url } = req.body;
      
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ 
          message: 'Valid URL is required' 
        });
      }
      
      const affiliateLink = affiliateService.generateAffiliateLink(url);
      return res.json({ affiliateLink });
    } catch (error) {
      console.error('Error generating affiliate link:', error);
      return res.status(500).json({ 
        message: 'Failed to generate affiliate link',
        error: (error as Error).message
      });
    }
  });

  return httpServer;
}
