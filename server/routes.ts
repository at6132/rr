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
        
        // Function to attempt to fetch URL with multiple approaches
        const attemptFetch = async (targetUrl) => {
          // List of realistic user agents to try
          const userAgents = [
            // Chrome on Windows
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            // Firefox on Windows
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
            // Safari on macOS
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
            // Edge on Windows
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0',
            // Mobile Chrome on Android
            'Mozilla/5.0 (Linux; Android 13; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36'
          ];
          
          // Set standard headers for every request
          const standardHeaders = {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1'
          };
          
          // List of potential URL modifications to try (some sites use different paths for the same product)
          const urlModifications = [
            url => url, // Original URL
            url => {
              // Sometimes removing tracking parameters helps
              const urlObj = new URL(url);
              // Remove common tracking parameters
              ['utm_source', 'utm_medium', 'utm_campaign', 'ref', 'ref_', 'fbclid', 'gclid', 'msclkid'].forEach(param => {
                urlObj.searchParams.delete(param);
              });
              return urlObj.toString();
            },
            url => {
              // For some sites, using mobile subdomain helps
              const urlObj = new URL(url);
              if (!urlObj.hostname.startsWith('m.')) {
                urlObj.hostname = 'm.' + urlObj.hostname;
              }
              return urlObj.toString();
            }
          ];
          
          // Try different combinations of user agents and URL modifications
          for (const userAgent of userAgents) {
            for (const modifyUrl of urlModifications) {
              try {
                const modifiedUrl = modifyUrl(targetUrl);
                console.log(`Attempting to fetch: ${modifiedUrl} with UA: ${userAgent.substring(0, 20)}...`);
                
                const headers = {
                  ...standardHeaders,
                  'User-Agent': userAgent
                };
                
                // Add additional headers for specific sites
                if (modifiedUrl.includes('target.com')) {
                  // Target.com specific headers
                  headers['DNT'] = '1';
                  headers['Connection'] = 'keep-alive';
                  headers['Cookie'] = '';  // Empty cookie to start fresh
                } else if (modifiedUrl.includes('newegg.com')) {
                  // Newegg specific headers
                  headers['DNT'] = '1';
                  headers['Connection'] = 'keep-alive';
                }
                
                const response = await axios.default.get(modifiedUrl, {
                  headers,
                  timeout: 15000,
                  maxRedirects: 5
                });
                
                if (response.status === 200 && response.data) {
                  return response;
                }
              } catch (error) {
                console.log(`Attempt failed: ${error.message}`);
                // Continue to the next attempt
              }
            }
          }
          
          // If we reach here, all attempts failed
          throw new Error('All fetch attempts failed');
        };
        
        // Try to fetch the page using our enhanced approach
        const response = await attemptFetch(url);
        
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
