/**
 * Service for generating affiliate links for various e-commerce platforms
 */
class AffiliateService {
  /**
   * Store affiliate IDs for different platforms
   * These would normally be stored in environment variables
   */
  private affiliateIds = {
    amazon: 'reviewradar-20', // Amazon Associates ID
    walmart: '12345', // Walmart Affiliate ID
    bestbuy: 'abcdef', // Best Buy Affiliate ID
    target: '54321', // Target Affiliate ID
    ebay: 'reviewradar', // eBay Partner Network ID
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
        // Clean the URL to remove existing parameters
        const cleanUrl = `${url.origin}${url.pathname}`;
        
        // Add affiliate tag
        return `${cleanUrl}?tag=${this.affiliateIds.amazon}`;
      }
      
      // Walmart affiliate links
      else if (hostname.includes('walmart')) {
        // Add or update affil parameter
        url.searchParams.set('affil', this.affiliateIds.walmart);
        return url.toString();
      }
      
      // Best Buy affiliate links
      else if (hostname.includes('bestbuy')) {
        // Add or update ref parameter
        url.searchParams.set('ref', this.affiliateIds.bestbuy);
        return url.toString();
      }
      
      // Target affiliate links
      else if (hostname.includes('target')) {
        // Add or update afid parameter
        url.searchParams.set('afid', this.affiliateIds.target);
        return url.toString();
      }
      
      // eBay affiliate links
      else if (hostname.includes('ebay')) {
        // Add or update mpre parameter
        url.searchParams.set('mpre', productUrl);
        url.searchParams.set('mplat', this.affiliateIds.ebay);
        return url.toString();
      }
      
      // For all other websites, return the original URL
      return productUrl;
    } catch (error) {
      console.error('Error generating affiliate link:', error);
      // If we encounter any error, return the original URL
      return productUrl;
    }
  }
}

export const affiliateService = new AffiliateService();