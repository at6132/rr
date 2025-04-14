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
  
  // Simple API test endpoint
  app.get('/api/ping', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ 
      status: 'success',
      message: 'API is working correctly',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  });
  
  // Product detection test endpoint
  app.get('/api/test-detection', async (req, res) => {
    try {
      const { url } = req.query;
      
      if (!url || typeof url !== 'string') {
        return res.status(400).json({
          message: 'Valid URL is required as a query parameter'
        });
      }
      
      console.log(`Testing product detection for URL: ${url}`);
      
      try {
        // Import required packages
        const axios = (await import('axios')).default;
        const { load } = await import('cheerio');
        
        // Fetch the page with a realistic user agent
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1'
          },
          timeout: 10000
        });
        
        const html = response.data;
        const $ = load(html);
        
        // Extract product information using a simplified version of our content script strategies
        const extractFromStructuredData = () => {
          const results = [];
          
          $('script[type="application/ld+json"]').each((i, elem) => {
            try {
              const data = JSON.parse($(elem).html() || '');
              
              if (data['@type'] === 'Product' && data.name) {
                results.push({
                  method: 'structured_data',
                  title: data.name,
                  image: typeof data.image === 'string' ? data.image : 
                         Array.isArray(data.image) ? data.image[0] : null
                });
              }
              
              if (Array.isArray(data['@graph'])) {
                data['@graph'].forEach(item => {
                  if (item['@type'] === 'Product' && item.name) {
                    results.push({
                      method: 'structured_data_graph',
                      title: item.name,
                      image: typeof item.image === 'string' ? item.image : 
                             Array.isArray(item.image) ? item.image[0] : null
                    });
                  }
                });
              }
            } catch (e) {
              // Ignore parsing errors
            }
          });
          
          return results;
        };
        
        const extractFromMetaTags = () => {
          const results = [];
          
          const metaTitleTags = [
            'meta[property="og:title"]',
            'meta[name="twitter:title"]',
            'meta[name="title"]',
            'meta[property="product:title"]',
            'meta[itemprop="name"]'
          ];
          
          metaTitleTags.forEach(selector => {
            const metaElement = $(selector);
            if (metaElement.length && metaElement.attr('content')) {
              results.push({
                method: 'meta_tag',
                selector,
                title: metaElement.attr('content')?.trim()
              });
            }
          });
          
          return results;
        };
        
        const extractFromHeadings = () => {
          const results = [];
          
          const selectors = [
            'h1.product-title', 'h1.product-name', 'h1.product_title', '#productTitle', 
            '.product-title h1', '.product-name h1', '.product_title h1',
            '[data-testid="product-title"]', '[data-automation="product-title"]',
            '.title[itemprop="name"]', '[itemprop="name"]',
            
            // BestBuy selectors 
            'h1.heading-5', '.sku-title h1', '.shop-product-title h1',
            '[data-track="product-title"]', '.heading-5.v-fw-regular',
            '[data-testid="heading-product-title"]'
          ];
          
          selectors.forEach(selector => {
            const element = $(selector);
            if (element.length && element.text()) {
              const text = element.text().trim();
              if (text.length > 5 && text.length < 250) {
                results.push({
                  method: 'common_selector',
                  selector,
                  title: text
                });
              }
            }
          });
          
          // Generic h1 elements
          $('h1').each((i, el) => {
            const text = $(el).text().trim();
            if (text.length > 10 && text.length < 200) {
              results.push({
                method: 'h1_element',
                selector: `h1:nth-child(${i+1})`,
                title: text
              });
            }
          });
          
          return results;
        };
        
        // Collect all detected products
        const structuredDataResults = extractFromStructuredData();
        const metaTagResults = extractFromMetaTags();
        const headingResults = extractFromHeadings();
        const pageTitle = $('title').text();
        
        // Determine the best product title
        let bestTitle = null;
        let detectionMethod = null;
        
        if (structuredDataResults.length > 0) {
          bestTitle = structuredDataResults[0].title;
          detectionMethod = structuredDataResults[0].method;
        } else if (metaTagResults.length > 0) {
          bestTitle = metaTagResults[0].title;
          detectionMethod = metaTagResults[0].method;
        } else if (headingResults.length > 0) {
          bestTitle = headingResults[0].title;
          detectionMethod = headingResults[0].method;
        }
        
        // Extract hostname for source name
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.replace(/^www\./, '');
        const source = hostname.split('.')[0];
        const sourceName = source.charAt(0).toUpperCase() + source.slice(1) + '.com';
        
        // Create a simplified product object
        const product = bestTitle ? {
          title: bestTitle,
          url,
          source: sourceName
        } : null;
        
        // Return both the final product and all the intermediate results for debugging
        return res.json({
          product,
          detectionMethod,
          url,
          pageTitle,
          detectionResults: {
            structuredData: structuredDataResults,
            metaTags: metaTagResults,
            headings: headingResults
          }
        });
        
      } catch (error: any) {
        console.error(`Error fetching URL: ${error.message}`);
        return res.status(500).json({ 
          message: "Error fetching URL", 
          details: error.message,
          url
        });
      }
    } catch (error: any) {
      console.error(`Error in test-detection: ${error.message}`);
      return res.status(500).json({ 
        message: "Server error during product detection test" 
      });
    }
  });

  return httpServer;
}
