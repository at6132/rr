import axios from 'axios';
import * as cheerio from 'cheerio';
import { AggregatedScore, PlatformRating } from '@shared/schema';
import { openaiService } from './openai-service';

// Defines the trustworthiness weight of each platform (1-10)
const PLATFORM_WEIGHTS: Record<string, number> = {
  'Amazon.com': 9,
  'BestBuy.com': 8,
  'Walmart.com': 8,
  'Target.com': 7,
  'Newegg.com': 7,
  'Reddit': 6,
  'Expert Reviews': 8,
  'YouTube': 6,
  'Other': 4
};

// Maximum concurrent requests to avoid rate limiting
const MAX_CONCURRENT_REQUESTS = 3;

class RatingAggregatorService {
  /**
   * Aggregates ratings from multiple e-commerce platforms for a given product
   * @param productTitle The product title to search for
   * @param productUrl The URL of the product (used to determine source website)
   * @returns An aggregated score object with overall rating and platform breakdown
   */
  async getAggregatedScore(productTitle: string, productUrl: string): Promise<AggregatedScore> {
    try {
      // Get ratings from different platforms
      const platformRatings = await this.fetchPlatformRatings(productTitle, productUrl);
      
      if (platformRatings.length === 0) {
        // If no platform ratings could be found, return a minimal aggregated score
        return {
          overallScore: 0,
          totalReviewCount: 0,
          confidenceScore: 0,
          platformBreakdown: []
        };
      }
      
      // Calculate weighted average score
      let weightedSum = 0;
      let weightSum = 0;
      let totalReviewCount = 0;
      
      for (const rating of platformRatings) {
        // Weight by both platform trustworthiness and number of reviews (log scale to avoid domination by one platform)
        const effectiveWeight = rating.weight * Math.min(Math.log10(rating.reviewCount + 1), 5);
        weightedSum += rating.rating * effectiveWeight;
        weightSum += effectiveWeight;
        totalReviewCount += rating.reviewCount;
      }
      
      // Calculate overall score
      const overallScore = weightSum > 0 ? weightedSum / weightSum : 0;
      
      // Calculate confidence (higher with more reviews and more platforms)
      const platformCountFactor = Math.min(platformRatings.length / 5, 1);
      const reviewCountFactor = Math.min(Math.log10(totalReviewCount + 1) / 3, 1);
      const confidenceScore = (platformCountFactor * 0.5) + (reviewCountFactor * 0.5);
      
      return {
        overallScore: parseFloat(overallScore.toFixed(1)),
        totalReviewCount,
        confidenceScore: parseFloat(confidenceScore.toFixed(2)),
        platformBreakdown: platformRatings
      };
    } catch (error) {
      console.error("Error aggregating ratings:", error);
      throw new Error(`Failed to aggregate ratings: ${(error as Error).message}`);
    }
  }
  
  /**
   * Fetches ratings from various e-commerce platforms for a product
   * @param productTitle The product title to search for
   * @param productUrl The URL of the product
   * @returns An array of platform ratings
   */
  private async fetchPlatformRatings(productTitle: string, productUrl: string): Promise<PlatformRating[]> {
    try {
      // Determine the source platform from the URL
      const sourcePlatform = this.getPlatformFromUrl(productUrl);
      
      // Start with ratings array
      let ratings: PlatformRating[] = [];
      
      // First try to get real platform ratings using OpenAI's websearch capability
      try {
        console.log("Attempting to fetch platform ratings using OpenAI websearch...");
        
        // List of platforms to search for
        const platformsToSearch = [
          'Amazon.com', 
          'BestBuy.com', 
          'Walmart.com', 
          'Target.com', 
          'Newegg.com'
        ];
        
        // Get platform ratings using OpenAI
        const platformRatingsResults = await openaiService.fetchPlatformRatings(
          productTitle,
          platformsToSearch
        );
        
        // Convert to PlatformRating format
        if (platformRatingsResults.length > 0) {
          const webSearchRatings = platformRatingsResults.map(result => ({
            platform: result.platform,
            rating: result.rating,
            reviewCount: result.reviewCount,
            verified: true, // These are coming from actual product pages
            weight: PLATFORM_WEIGHTS[result.platform] || PLATFORM_WEIGHTS['Other'],
            url: result.url
          }));
          
          // Add to our ratings array
          ratings = ratings.concat(webSearchRatings);
          console.log(`Found ${webSearchRatings.length} platform ratings using OpenAI websearch`);
        }
      } catch (openaiError) {
        console.error("Error fetching platform ratings with OpenAI:", openaiError);
        // Continue with fallback methods if OpenAI fails
      }
      
      // If we don't have any ratings yet, try to extract from source URL
      if (ratings.length === 0) {
        // First try to extract rating from the current URL
        const sourceRating = await this.extractRatingFromProductPage(productUrl);
        if (sourceRating && sourceRating.rating !== undefined && sourceRating.reviewCount !== undefined) {
          ratings.push({
            platform: sourcePlatform,
            rating: sourceRating.rating,
            reviewCount: sourceRating.reviewCount,
            verified: true,
            weight: PLATFORM_WEIGHTS[sourcePlatform] || PLATFORM_WEIGHTS['Other'],
            url: productUrl
          });
        }
        
        // Prepare search queries for other platforms
        // We'll search for the exact product on each platform
        const searchTerm = productTitle.replace(/[^\w\s]/gi, ' ').trim();
        
        // List of platforms to search (excluding the current platform)
        const platformsToSearch = [
          { name: 'Amazon.com', searchUrl: 'https://www.amazon.com/s?k=' },
          { name: 'BestBuy.com', searchUrl: 'https://www.bestbuy.com/site/searchpage.jsp?st=' },
          { name: 'Walmart.com', searchUrl: 'https://www.walmart.com/search?q=' },
          { name: 'Target.com', searchUrl: 'https://www.target.com/s?searchTerm=' },
          { name: 'Newegg.com', searchUrl: 'https://www.newegg.com/p/pl?d=' }
        ].filter(p => p.name !== sourcePlatform);
        
        // We'll limit the concurrent requests to avoid overloading
        const platformRatings = await this.processInBatches(
          platformsToSearch.map(platform => 
            async () => this.searchAndExtractFromPlatform(searchTerm, platform.name, platform.searchUrl)
          ),
          MAX_CONCURRENT_REQUESTS
        );
        
        // Filter out null results and add to our ratings array
        const validPlatformRatings = platformRatings.filter(r => r !== null) as PlatformRating[];
        ratings = ratings.concat(validPlatformRatings);
      }
      
      // Only return unique platforms (in case of duplicates)
      return this.getUniquePlatformRatings(ratings);
    } catch (error) {
      console.error("Error fetching platform ratings:", error);
      return [];
    }
  }
  
  /**
   * Returns only unique platform ratings, keeping the one with the highest review count
   */
  private getUniquePlatformRatings(ratings: PlatformRating[]): PlatformRating[] {
    const platformMap = new Map<string, PlatformRating>();
    
    for (const rating of ratings) {
      const existing = platformMap.get(rating.platform);
      if (!existing || rating.reviewCount > existing.reviewCount) {
        platformMap.set(rating.platform, rating);
      }
    }
    
    return Array.from(platformMap.values());
  }
  
  /**
   * Process async functions in batches to limit concurrent requests
   */
  private async processInBatches<T>(
    tasks: (() => Promise<T>)[],
    batchSize: number
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(task => task()));
      results.push(...batchResults);
    }
    
    return results;
  }
  
  /**
   * Extracts platform name from a URL
   * @param url The product URL
   * @returns The platform name
   */
  private getPlatformFromUrl(url: string): string {
    try {
      const parsedUrl = new URL(url);
      const hostname = parsedUrl.hostname.toLowerCase();
      
      if (hostname.includes('amazon')) return 'Amazon.com';
      if (hostname.includes('bestbuy')) return 'BestBuy.com';
      if (hostname.includes('walmart')) return 'Walmart.com';
      if (hostname.includes('target')) return 'Target.com';
      if (hostname.includes('newegg')) return 'Newegg.com';
      if (hostname.includes('reddit')) return 'Reddit';
      if (hostname.includes('youtube')) return 'YouTube';
      
      // Extract the domain name for unknown platforms
      const domainParts = hostname.split(".");
      if (domainParts[0] === "www") {
        domainParts.shift();
      }
      
      if (domainParts.length > 0) {
        return domainParts[0].charAt(0).toUpperCase() + domainParts[0].slice(1) + ".com";
      }
      
      return 'Other';
    } catch {
      return 'Other';
    }
  }
  
  /**
   * Attempts to extract rating information directly from a product page
   * @param productUrl The URL of the product page
   * @returns A partial platform rating object or null if no rating found
   */
  private async extractRatingFromProductPage(productUrl: string): Promise<Partial<PlatformRating> | null> {
    try {
      // Fetch the page HTML
      const response = await axios.get(productUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 5000
      });
      
      const html = response.data;
      const $ = cheerio.load(html);
      
      // Extract based on platform
      const platform = this.getPlatformFromUrl(productUrl);
      
      if (platform === 'Amazon.com') {
        return this.extractAmazonRating($);
      } else if (platform === 'BestBuy.com') {
        return this.extractBestBuyRating($);
      } else if (platform === 'Walmart.com') {
        return this.extractWalmartRating($);
      } else if (platform === 'Target.com') {
        return this.extractTargetRating($);
      } else if (platform === 'Newegg.com') {
        return this.extractNeweggRating($);
      }
      
      // Generic extraction for other sites
      return this.extractGenericRating($);
      
    } catch (error) {
      console.error(`Error extracting from product page ${productUrl}:`, error);
      return null;
    }
  }
  
  /**
   * Searches for a product on a platform and extracts rating from the first result
   */
  private async searchAndExtractFromPlatform(
    searchTerm: string,
    platform: string,
    searchUrl: string
  ): Promise<PlatformRating | null> {
    try {
      // Encode the search term
      const encodedSearch = encodeURIComponent(searchTerm);
      const fullSearchUrl = `${searchUrl}${encodedSearch}`;
      
      // Fetch search results
      const response = await axios.get(fullSearchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 8000
      });
      
      const html = response.data;
      const $ = cheerio.load(html);
      
      // Extract the first product link based on platform
      let firstProductUrl: string | null = null;
      
      if (platform === 'Amazon.com') {
        // Amazon product cards with links
        const productCard = $('div[data-component-type="s-search-result"]').first();
        const link = productCard.find('a.a-link-normal[href*="/dp/"]').attr('href');
        if (link) {
          firstProductUrl = link.startsWith('http') ? link : `https://www.amazon.com${link}`;
        }
      } else if (platform === 'BestBuy.com') {
        // Best Buy product links
        const link = $('a.image-link[href*=".p?"]').first().attr('href');
        if (link) {
          firstProductUrl = link.startsWith('http') ? link : `https://www.bestbuy.com${link}`;
        }
      } else if (platform === 'Walmart.com') {
        // Walmart product links
        const link = $('a[link-identifier="linkText"][href*="/ip/"]').first().attr('href');
        if (link) {
          firstProductUrl = link.startsWith('http') ? link : `https://www.walmart.com${link}`;
        }
      } else if (platform === 'Target.com') {
        // Target product links
        const link = $('a[href*="/p/"][data-test="product-title"]').first().attr('href');
        if (link) {
          firstProductUrl = link.startsWith('http') ? link : `https://www.target.com${link}`;
        }
      } else if (platform === 'Newegg.com') {
        // Newegg product links
        const link = $('a.item-title[href*="/p/"]').first().attr('href');
        if (link) {
          firstProductUrl = link;
        }
      }
      
      // If we found a product URL, get its rating
      if (firstProductUrl) {
        const rating = await this.extractRatingFromProductPage(firstProductUrl);
        if (rating && rating.rating && rating.reviewCount) {
          return {
            platform,
            rating: rating.rating,
            reviewCount: rating.reviewCount,
            verified: false,
            weight: PLATFORM_WEIGHTS[platform] || PLATFORM_WEIGHTS['Other'],
            url: firstProductUrl
          };
        }
      }
      
      // If we couldn't extract from the first product, try extracting from search results directly
      let searchResultRating = null;
      
      if (platform === 'Amazon.com') {
        // Try to extract from the first search result
        const firstResult = $('div[data-component-type="s-search-result"]').first();
        const ratingText = firstResult.find('span.a-icon-alt').first().text();
        const ratingMatch = ratingText.match(/(\d+(\.\d+)?)/);
        const reviewCountText = firstResult.find('span.a-size-base').text();
        const reviewCountMatch = reviewCountText.match(/(\d+,?\d*)/);
        
        if (ratingMatch && reviewCountMatch) {
          return {
            platform,
            rating: parseFloat(ratingMatch[1]),
            reviewCount: parseInt(reviewCountMatch[1].replace(/,/g, '')),
            verified: false,
            weight: PLATFORM_WEIGHTS[platform],
            url: fullSearchUrl
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error(`Error searching on ${platform}:`, error);
      return null;
    }
  }
  
  // Platform-specific rating extraction methods
  
  private extractAmazonRating($: cheerio.CheerioAPI): Partial<PlatformRating> | null {
    try {
      // Amazon rating (out of 5 stars)
      const ratingElement = $('#acrPopover, .a-icon-star');
      let rating = 0;
      
      if (ratingElement.length) {
        const ratingText = ratingElement.attr('title') || ratingElement.text();
        const ratingMatch = ratingText.match(/(\d+(\.\d+)?)/);
        if (ratingMatch) {
          rating = parseFloat(ratingMatch[1]);
        }
      }
      
      // Amazon review count
      const reviewCountElement = $('#acrCustomerReviewText, .a-size-base.a-color-secondary');
      let reviewCount = 0;
      
      if (reviewCountElement.length) {
        const reviewText = reviewCountElement.text();
        const countMatch = reviewText.match(/(\d+,?\d*)/);
        if (countMatch) {
          reviewCount = parseInt(countMatch[1].replace(/,/g, ''));
        }
      }
      
      if (rating > 0 && reviewCount > 0) {
        return { rating, reviewCount };
      }
      
      return null;
    } catch (error) {
      console.error("Error extracting Amazon rating:", error);
      return null;
    }
  }
  
  private extractBestBuyRating($: cheerio.CheerioAPI): Partial<PlatformRating> | null {
    try {
      // Best Buy rating (out of 5 stars)
      const ratingText = $('.customer-review').first().text();
      const ratingMatch = ratingText.match(/(\d+(\.\d+)?) out of 5/);
      const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;
      
      // Best Buy review count
      const reviewCountText = $('.customer-review-count').first().text();
      const reviewCountMatch = reviewCountText.match(/(\d+,?\d*)/);
      const reviewCount = reviewCountMatch ? parseInt(reviewCountMatch[1].replace(/,/g, '')) : 0;
      
      if (rating > 0 && reviewCount > 0) {
        return { rating, reviewCount };
      }
      
      return null;
    } catch (error) {
      console.error("Error extracting Best Buy rating:", error);
      return null;
    }
  }
  
  private extractWalmartRating($: cheerio.CheerioAPI): Partial<PlatformRating> | null {
    try {
      // Walmart rating (out of 5 stars)
      const ratingText = $('[data-testid="customer-rating"]').first().text();
      const ratingMatch = ratingText.match(/(\d+(\.\d+)?)/);
      const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;
      
      // Walmart review count
      const reviewCountText = $('[data-testid="review-count"]').first().text();
      const reviewCountMatch = reviewCountText.match(/(\d+,?\d*)/);
      const reviewCount = reviewCountMatch ? parseInt(reviewCountMatch[1].replace(/,/g, '')) : 0;
      
      if (rating > 0 && reviewCount > 0) {
        return { rating, reviewCount };
      }
      
      return null;
    } catch (error) {
      console.error("Error extracting Walmart rating:", error);
      return null;
    }
  }
  
  private extractTargetRating($: cheerio.CheerioAPI): Partial<PlatformRating> | null {
    try {
      // Target rating (out of 5 stars)
      const ratingElement = $('[data-test="ratings-and-reviews"]');
      let rating = 0;
      
      if (ratingElement.length) {
        const ratingText = ratingElement.attr('aria-label') || ratingElement.text();
        const ratingMatch = ratingText.match(/(\d+(\.\d+)?)/);
        if (ratingMatch) {
          rating = parseFloat(ratingMatch[1]);
        }
      }
      
      // Target review count
      const reviewCountElement = $('[data-test="review-count"]');
      let reviewCount = 0;
      
      if (reviewCountElement.length) {
        const reviewText = reviewCountElement.text();
        const countMatch = reviewText.match(/(\d+,?\d*)/);
        if (countMatch) {
          reviewCount = parseInt(countMatch[1].replace(/,/g, ''));
        }
      }
      
      if (rating > 0 && reviewCount > 0) {
        return { rating, reviewCount };
      }
      
      return null;
    } catch (error) {
      console.error("Error extracting Target rating:", error);
      return null;
    }
  }
  
  private extractNeweggRating($: cheerio.CheerioAPI): Partial<PlatformRating> | null {
    try {
      // Newegg rating (out of 5 stars)
      const ratingElement = $('.product-rating');
      let rating = 0;
      
      if (ratingElement.length) {
        const ratingStyle = ratingElement.attr('style') || '';
        const ratingMatch = ratingStyle.match(/width:(\d+)%/);
        if (ratingMatch) {
          // Newegg shows rating as percentage width of the stars
          rating = Math.round((parseInt(ratingMatch[1]) / 100) * 5 * 10) / 10;
        }
      }
      
      // Newegg review count
      const reviewCountElement = $('.product-rating-num');
      let reviewCount = 0;
      
      if (reviewCountElement.length) {
        const reviewText = reviewCountElement.text();
        const countMatch = reviewText.match(/(\d+,?\d*)/);
        if (countMatch) {
          reviewCount = parseInt(countMatch[1].replace(/,/g, ''));
        }
      }
      
      if (rating > 0 && reviewCount > 0) {
        return { rating, reviewCount };
      }
      
      return null;
    } catch (error) {
      console.error("Error extracting Newegg rating:", error);
      return null;
    }
  }
  
  private extractGenericRating($: cheerio.CheerioAPI): Partial<PlatformRating> | null {
    try {
      // Try common rating patterns
      
      // Look for schema.org markup
      const schemaScript = $('script[type="application/ld+json"]');
      if (schemaScript.length) {
        try {
          const schemas = schemaScript.map((_, el) => {
            try {
              return JSON.parse($(el).html() || '{}');
            } catch {
              return {};
            }
          }).get();
          
          for (const schema of schemas) {
            // Check for Product schema
            if (schema['@type'] === 'Product' && schema.aggregateRating) {
              const rating = parseFloat(schema.aggregateRating.ratingValue);
              const reviewCount = parseInt(schema.aggregateRating.reviewCount);
              
              if (rating > 0 && reviewCount > 0) {
                return { rating, reviewCount };
              }
            }
          }
        } catch (e) {
          console.error("Error parsing schema.org data:", e);
        }
      }
      
      // Try common CSS selectors for ratings
      const ratingSelectors = [
        '.rating', '.stars', '.star-rating', 
        '[itemprop="ratingValue"]', '.product-rating'
      ];
      
      for (const selector of ratingSelectors) {
        const el = $(selector).first();
        if (el.length) {
          // Try to extract rating
          const ratingText = el.attr('content') || el.text();
          const ratingMatch = ratingText.match(/(\d+(\.\d+)?)/);
          if (ratingMatch) {
            const rating = parseFloat(ratingMatch[1]);
            
            // Try to find review count near the rating
            const parent = el.parent();
            const nearbyText = parent.text();
            const reviewCountMatch = nearbyText.match(/(\d+,?\d*)\s+reviews?/i);
            
            if (reviewCountMatch) {
              const reviewCount = parseInt(reviewCountMatch[1].replace(/,/g, ''));
              return { rating, reviewCount };
            }
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error("Error extracting generic rating:", error);
      return null;
    }
  }
}

export const ratingAggregatorService = new RatingAggregatorService();