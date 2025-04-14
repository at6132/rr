/**
 * Service for generating affiliate links for various e-commerce platforms
 */
class AffiliateService {
  // Your affiliate IDs for different platforms
  private affiliateIds = {
    amazon: process.env.AMAZON_AFFILIATE_ID || 'reviewradar-20',
    bestbuy: process.env.BESTBUY_AFFILIATE_ID || 'reviewradar',
    walmart: process.env.WALMART_AFFILIATE_ID || 'reviewradar',
    target: process.env.TARGET_AFFILIATE_ID || 'reviewradar',
    newegg: process.env.NEWEGG_AFFILIATE_ID || 'reviewradar'
  };

  /**
   * Generate an affiliate link for a given product URL
   * @param productUrl Original product URL
   * @returns URL with affiliate parameters
   */
  generateAffiliateLink(productUrl: string): string {
    try {
      const url = new URL(productUrl);
      const hostname = url.hostname.toLowerCase();

      // Amazon affiliate links
      if (hostname.includes('amazon')) {
        // Remove existing tag if present
        const searchParams = new URLSearchParams(url.search);
        searchParams.delete('tag');
        
        // Add our affiliate tag
        searchParams.append('tag', this.affiliateIds.amazon);
        
        // Rebuild the URL
        url.search = searchParams.toString();
        return url.toString();
      }
      
      // Best Buy affiliate links
      else if (hostname.includes('bestbuy')) {
        const searchParams = new URLSearchParams(url.search);
        searchParams.delete('irclickid');
        searchParams.append('irclickid', this.affiliateIds.bestbuy);
        url.search = searchParams.toString();
        return url.toString();
      }
      
      // Walmart affiliate links
      else if (hostname.includes('walmart')) {
        const searchParams = new URLSearchParams(url.search);
        searchParams.delete('athrefid');
        searchParams.append('athrefid', this.affiliateIds.walmart);
        url.search = searchParams.toString();
        return url.toString();
      }
      
      // Target affiliate links
      else if (hostname.includes('target')) {
        const searchParams = new URLSearchParams(url.search);
        searchParams.delete('affiliate_id');
        searchParams.append('affiliate_id', this.affiliateIds.target);
        url.search = searchParams.toString();
        return url.toString();
      }
      
      // Newegg affiliate links
      else if (hostname.includes('newegg')) {
        const searchParams = new URLSearchParams(url.search);
        searchParams.delete('affid');
        searchParams.append('affid', this.affiliateIds.newegg);
        url.search = searchParams.toString();
        return url.toString();
      }
      
      // If not a supported platform, return the original URL
      return productUrl;
    } catch (error) {
      console.error('Error generating affiliate link:', error);
      return productUrl; // Return original URL if there's an error
    }
  }
}

export const affiliateService = new AffiliateService();