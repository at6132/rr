import axios from 'axios';
import * as cheerio from 'cheerio';
import { openaiService } from './openai-service';
import { PlatformRating, AggregatedScore } from '@shared/schema';

class RatingAggregatorService {
  /**
   * Aggregates ratings from multiple e-commerce platforms for a given product
   * @param productTitle The product title to search for
   * @param productUrl The URL of the product (used to determine source website)
   * @returns An aggregated score object with overall rating and platform breakdown
   */
  async getAggregatedScore(productTitle: string, productUrl: string): Promise<AggregatedScore> {
    try {
      // Get platform ratings
      const platformRatings = await this.fetchPlatformRatings(productTitle, productUrl);
      
      // Normalize the platform ratings and calculate weighted average
      let totalWeightedRating = 0;
      let totalReviewCount = 0;
      
      for (const rating of platformRatings) {
        totalWeightedRating += rating.rating * rating.reviewCount;
        totalReviewCount += rating.reviewCount;
      }
      
      // Calculate overall rating (normalized to 5 stars)
      const overallScore = totalReviewCount > 0
        ? (totalWeightedRating / totalReviewCount)
        : 0;
      
      return {
        overallScore,
        totalReviewCount,
        confidenceScore: 0.85, // Default confidence score
        platformBreakdown: this.getUniquePlatformRatings(platformRatings),
      };
    } catch (error) {
      console.error('Error aggregating ratings:', error);
      
      // Return a default object if we can't get ratings
      return {
        overallScore: 0,
        totalReviewCount: 0,
        confidenceScore: 0,
        platformBreakdown: [],
      };
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
      const sourcePlatform = this.getPlatformFromUrl(productUrl);
      
      // First try to extract rating directly from the source URL if possible
      const extractedRating = await this.extractRatingFromProductPage(productUrl);
      
      // Get ratings from other platforms using OpenAI's websearch feature
      // to find real ratings from across the web
      const platformsToSearch = [
        'Amazon', 
        'Walmart', 
        'Best Buy', 
        'Target', 
        'Newegg'
      ].filter(platform => 
        !sourcePlatform.toLowerCase().includes(platform.toLowerCase())
      );
      
      // Use OpenAI to get ratings from multiple platforms
      const openAiRatings = await openaiService.fetchPlatformRatings(
        productTitle,
        platformsToSearch
      );
      
      // Combine the source rating with other platform ratings
      let allRatings: PlatformRating[] = [];
      
      if (extractedRating && extractedRating.rating !== null) {
        // Ensure reviewCount is a number and never undefined
        const reviewCount: number = typeof extractedRating.reviewCount === 'number' ? 
          extractedRating.reviewCount : 0;
          
        allRatings.push({
          platform: sourcePlatform,
          rating: extractedRating.rating,
          reviewCount: reviewCount,
          url: productUrl,
          weight: 5, // Default weight for source platform
          verified: true // Mark as verified since we extracted it directly
        });
      }
      
      // Add the OpenAI fetched ratings
      allRatings = [...allRatings, ...openAiRatings];
      
      return allRatings;
    } catch (error) {
      console.error('Error fetching platform ratings:', error);
      return [];
    }
  }
  
  /**
   * Returns only unique platform ratings, keeping the one with the highest review count
   */
  private getUniquePlatformRatings(ratings: PlatformRating[]): PlatformRating[] {
    const platformMap = new Map<string, PlatformRating>();
    
    for (const rating of ratings) {
      const platform = rating.platform.toLowerCase();
      
      if (!platformMap.has(platform) || 
          platformMap.get(platform)!.reviewCount < rating.reviewCount) {
        platformMap.set(platform, rating);
      }
    }
    
    return Array.from(platformMap.values());
  }
  
  /**
   * Process async functions in batches to limit concurrent requests
   */
  private async processInBatches<T>(
    items: any[], 
    fn: (item: any) => Promise<T>, 
    batchSize: number = 3
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(item => fn(item)));
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
      const hostname = new URL(url).hostname;
      
      if (hostname.includes('amazon')) return 'Amazon';
      if (hostname.includes('walmart')) return 'Walmart';
      if (hostname.includes('bestbuy')) return 'Best Buy';
      if (hostname.includes('target')) return 'Target';
      if (hostname.includes('ebay')) return 'eBay';
      if (hostname.includes('newegg')) return 'Newegg';
      
      // Extract domain name without TLD as a fallback
      const domainMatch = hostname.match(/([^.]+)\.\w+$/);
      if (domainMatch && domainMatch[1]) {
        return domainMatch[1].charAt(0).toUpperCase() + domainMatch[1].slice(1);
      }
      
      return hostname;
    } catch (error) {
      return 'Unknown Platform';
    }
  }
  
  /**
   * Attempts to extract rating information directly from a product page
   * @param productUrl The URL of the product page
   * @returns A partial platform rating object or null if no rating found
   */
  private async extractRatingFromProductPage(productUrl: string): Promise<Partial<PlatformRating> | null> {
    try {
      const response = await axios.get(productUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 5000
      });
      
      const $ = cheerio.load(response.data);
      
      if (productUrl.includes('amazon')) {
        return this.extractAmazonRating($);
      } else if (productUrl.includes('walmart')) {
        return this.extractWalmartRating($);
      } else if (productUrl.includes('bestbuy')) {
        return this.extractBestBuyRating($);
      } else if (productUrl.includes('target')) {
        return this.extractTargetRating($);
      } else if (productUrl.includes('newegg')) {
        return this.extractNeweggRating($);
      }
      
      // Try a generic extraction approach for other sites
      return this.extractGenericRating($);
    } catch (error) {
      console.error(`Error extracting rating from ${productUrl}:`, error);
      return null;
    }
  }
  
  /**
   * Searches for a product on a platform and extracts rating from the first result
   */
  private async searchAndExtractFromPlatform(
    productTitle: string,
    platform: string
  ): Promise<PlatformRating | null> {
    // This would implement platform-specific search and rating extraction
    // Simplified implementation for now - could be expanded later
    return null;
  }
  
  private extractAmazonRating($: cheerio.CheerioAPI): Partial<PlatformRating> | null {
    try {
      // Try different selectors that Amazon might use
      const ratingText = $('#acrPopover').attr('title') || 
                          $('.a-icon-alt').first().text();
      
      if (ratingText) {
        const ratingMatch = ratingText.match(/([\d.]+) out of ([\d.]+)/);
        if (ratingMatch) {
          const rating = parseFloat(ratingMatch[1]);
          
          // Extract review count
          const reviewCountText = $('#acrCustomerReviewText').text() || 
                                 $('.totalRatingCount').text();
          let reviewCount = 0;
          
          if (reviewCountText) {
            const countMatch = reviewCountText.match(/(\d+(?:,\d+)*)/);
            if (countMatch) {
              reviewCount = parseInt(countMatch[1].replace(/,/g, ''));
            }
          }
          
          return { rating, reviewCount };
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting Amazon rating:', error);
      return null;
    }
  }
  
  private extractBestBuyRating($: cheerio.CheerioAPI): Partial<PlatformRating> | null {
    try {
      const ratingText = $('.customer-rating').text();
      
      if (ratingText) {
        const ratingMatch = ratingText.match(/([\d.]+)/);
        if (ratingMatch) {
          const rating = parseFloat(ratingMatch[1]);
          
          // Extract review count
          const reviewCountText = $('.customer-review-count').text();
          let reviewCount = 0;
          
          if (reviewCountText) {
            const countMatch = reviewCountText.match(/(\d+(?:,\d+)*)/);
            if (countMatch) {
              reviewCount = parseInt(countMatch[1].replace(/,/g, ''));
            }
          }
          
          return { rating, reviewCount };
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting Best Buy rating:', error);
      return null;
    }
  }
  
  private extractWalmartRating($: cheerio.CheerioAPI): Partial<PlatformRating> | null {
    try {
      const ratingText = $('[itemprop="ratingValue"]').attr('content') || 
                         $('.stars-container').attr('aria-label');
      
      if (ratingText) {
        const rating = parseFloat(ratingText);
        
        if (!isNaN(rating)) {
          // Extract review count
          const reviewCountText = $('[itemprop="reviewCount"]').text() || 
                                 $('.stars-reviews-count').text();
          let reviewCount = 0;
          
          if (reviewCountText) {
            const countMatch = reviewCountText.match(/(\d+(?:,\d+)*)/);
            if (countMatch) {
              reviewCount = parseInt(countMatch[1].replace(/,/g, ''));
            }
          }
          
          return { rating, reviewCount };
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting Walmart rating:', error);
      return null;
    }
  }
  
  private extractTargetRating($: cheerio.CheerioAPI): Partial<PlatformRating> | null {
    try {
      const ratingText = $('[data-test="ratingValue"]').text() || 
                         $('.h-padding-h-default').text();
      
      if (ratingText) {
        const ratingMatch = ratingText.match(/([\d.]+)/);
        if (ratingMatch) {
          const rating = parseFloat(ratingMatch[1]);
          
          // Extract review count
          const reviewCountText = $('[data-test="reviewCount"]').text();
          let reviewCount = 0;
          
          if (reviewCountText) {
            const countMatch = reviewCountText.match(/(\d+(?:,\d+)*)/);
            if (countMatch) {
              reviewCount = parseInt(countMatch[1].replace(/,/g, ''));
            }
          }
          
          return { rating, reviewCount };
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting Target rating:', error);
      return null;
    }
  }
  
  private extractNeweggRating($: cheerio.CheerioAPI): Partial<PlatformRating> | null {
    try {
      const ratingText = $('.product-rating-num').text();
      
      if (ratingText) {
        const rating = parseFloat(ratingText);
        
        if (!isNaN(rating)) {
          // Extract review count
          const reviewCountText = $('.product-rating-count').text();
          let reviewCount = 0;
          
          if (reviewCountText) {
            const countMatch = reviewCountText.match(/(\d+(?:,\d+)*)/);
            if (countMatch) {
              reviewCount = parseInt(countMatch[1].replace(/,/g, ''));
            }
          }
          
          return { rating, reviewCount };
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting Newegg rating:', error);
      return null;
    }
  }
  
  private extractGenericRating($: cheerio.CheerioAPI): Partial<PlatformRating> | null {
    try {
      // Try common rating patterns
      // Look for rating in meta tags
      const metaRating = $('meta[itemprop="ratingValue"]').attr('content');
      if (metaRating) {
        const rating = parseFloat(metaRating);
        
        // Try to find review count
        const metaReviewCount = $('meta[itemprop="reviewCount"]').attr('content');
        const reviewCount = metaReviewCount ? parseInt(metaReviewCount) : 0;
        
        return { rating, reviewCount };
      }
      
      // Look for rating in spans with common classes
      const ratingSelectors = [
        '.rating', '.stars', '.product-rating', 
        '[class*="rating"]', '[class*="stars"]', 
        '[class*="review"]'
      ];
      
      for (const selector of ratingSelectors) {
        const ratingElement = $(selector);
        if (ratingElement.length) {
          const ratingText = ratingElement.text();
          const ratingMatch = ratingText.match(/([\d.]+)/);
          
          if (ratingMatch) {
            const rating = parseFloat(ratingMatch[1]);
            
            // For review count, look at nearby elements
            let reviewCount = 0;
            const reviewCountText = ratingElement.next().text() || 
                                   ratingElement.parent().text();
            
            if (reviewCountText) {
              const countMatch = reviewCountText.match(/(\d+(?:,\d+)*)/);
              if (countMatch) {
                reviewCount = parseInt(countMatch[1].replace(/,/g, ''));
              }
            }
            
            return { rating, reviewCount };
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting generic rating:', error);
      return null;
    }
  }
}

export const ratingAggregatorService = new RatingAggregatorService();