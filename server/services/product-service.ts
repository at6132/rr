import { ProductAnalysis } from "@shared/schema";
import { comprehensiveAnalysisService } from "./comprehensive-analysis-service";

class ProductService {
  /**
   * Analyzes a product URL or detected product and returns comprehensive review data
   * 
   * This implementation uses the ComprehensiveAnalysisService which leverages OpenAI's
   * web browsing capabilities to extract data directly from the product URL
   * 
   * @param url The product URL to analyze
   * @param productInfo Optional product info already detected from the client side
   * @returns A complete ProductAnalysis object
   */
  async analyzeProduct(url?: string, productInfo?: any): Promise<ProductAnalysis> {
    try {
      // Validate that we have a URL to analyze
      if (!url && (!productInfo || !productInfo.url)) {
        throw new Error("A valid product URL is required for analysis");
      }
      
      // Use the product URL from productInfo if the url parameter is not provided
      const productUrl = url || productInfo.url;
      
      console.log(`Analyzing product at URL: ${productUrl}`);
      console.log(`Product info from detection:`, productInfo);

      // Pre-check if this is almost certainly a product URL based on known patterns
      // This will help ensure OpenAI correctly identifies product pages
      if (productUrl) {
        const isLikelyProductUrl = this.isLikelyProductUrl(productUrl);
        if (isLikelyProductUrl) {
          console.log(`URL matches known product pattern: ${productUrl}`);
          // If we detect a product URL pattern, we can enhance the product info
          if (!productInfo) {
            productInfo = {
              url: productUrl,
              title: "Product from " + new URL(productUrl).hostname,
              source: new URL(productUrl).hostname.replace("www.", ""),
            };
          }
        }
      }
      
      // Use the comprehensive analysis service to get all product data at once
      return await comprehensiveAnalysisService.analyzeProductUrl(productUrl, productInfo);
    } catch (error) {
      console.error("Error analyzing product:", error);
      throw new Error(`Failed to analyze product: ${(error as Error).message}`);
    }
  }
  
  /**
   * Checks if a URL matches known product URL patterns
   * This helps with pre-identifying product pages before sending to OpenAI
   */
  private isLikelyProductUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;
      const hostname = urlObj.hostname;

      // Amazon product pattern
      if (hostname.includes('amazon.') && (
        path.includes('/dp/') || 
        path.includes('/gp/product/') || 
        path.includes('/product/')
      )) {
        return true;
      }

      // Best Buy product pattern
      if (hostname.includes('bestbuy.') && path.includes('/site/') && path.includes('/p')) {
        return true;
      }

      // Walmart product pattern
      if (hostname.includes('walmart.') && path.includes('/ip/')) {
        return true;
      }
      
      // Target product pattern
      if (hostname.includes('target.') && path.includes('/p/')) {
        return true;
      }

      // Newegg product pattern
      if (hostname.includes('newegg.') && path.includes('/p/')) {
        return true;
      }

      // General product patterns
      if (
        path.match(/\/p\/[a-zA-Z0-9-]+\/?$/) || // /p/product-id
        path.match(/\/product\/[a-zA-Z0-9-]+\/?$/) || // /product/product-id
        path.match(/\/item\/[a-zA-Z0-9-]+\/?$/) || // /item/item-id
        path.includes('/skuId=') ||
        path.includes('/productId=')
      ) {
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error checking if URL is a product URL:", error);
      return false;
    }
  }

  private async extractProductFromUrl(url: string): Promise<{
    title: string;
    url: string;
    source: string;
    imageUrl?: string;
  }> {
    try {
      // Import required packages
      const axios = (await import('axios')).default;
      const { load } = await import('cheerio');
      
      // Function to attempt to fetch URL with multiple approaches
      const attemptFetch = async (targetUrl: string) => {
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
          (url: string) => url, // Original URL
          (url: string) => {
            // Sometimes removing tracking parameters helps
            const urlObj = new URL(url);
            // Remove common tracking parameters
            ['utm_source', 'utm_medium', 'utm_campaign', 'ref', 'ref_', 'fbclid', 'gclid', 'msclkid'].forEach(param => {
              urlObj.searchParams.delete(param);
            });
            return urlObj.toString();
          },
          (url: string) => {
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
              
              const response = await axios.get(modifiedUrl, {
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
      
      // First try URL-based detection (quick and doesn't require HTTP requests)
      const parsedUrl = new URL(url);
      const hostname = parsedUrl.hostname.toLowerCase();
      let productTitle = "";
      let source = "";
      let imageUrl: string | undefined = undefined;
      
      // Extract domain for source
      if (hostname.includes("amazon")) {
        source = "Amazon.com";
        
        // For Amazon, try to extract ASIN from the URL
        const asinMatch = url.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:\/|\?|$)/);
        if (asinMatch && asinMatch[1]) {
          const asin = asinMatch[1];
          productTitle = `Amazon Product ${asin}`;
          // We could also fetch product details using Amazon API here if we had access
          imageUrl = `https://images-na.ssl-images-amazon.com/images/I/${asin}.jpg`;
        }
      } else if (hostname.includes("walmart")) {
        source = "Walmart.com";
      } else if (hostname.includes("bestbuy")) {
        source = "BestBuy.com";
      } else if (hostname.includes("target")) {
        source = "Target.com";
      } else if (hostname.includes("ebay")) {
        source = "eBay.com";
      } else if (hostname.includes("newegg")) {
        source = "Newegg.com";
      } else if (hostname.includes("etsy")) {
        source = "Etsy.com";
      } else {
        // Extract domain name for source
        const domainParts = hostname.split(".");
        if (domainParts[0] === "www") {
          domainParts.shift();
        }
        
        if (domainParts.length > 0) {
          source = domainParts[0].charAt(0).toUpperCase() + domainParts[0].slice(1) + ".com";
        } else {
          source = "Unknown Source";
        }
      }
      
      // If we have a product title from URL patterns, return immediately
      if (productTitle) {
        return {
          title: productTitle,
          url: url,
          source: source,
          imageUrl
        };
      }
      
      // If we don't have a product title yet, try to fetch the page and extract it
      try {
        // Try to fetch the page using our enhanced approach
        const response = await attemptFetch(url);
        
        const html = response.data;
        const $ = load(html);
        
        // Method 1: Look for structured data (most reliable)
        $('script[type="application/ld+json"]').each((i, el) => {
          try {
            const data = JSON.parse($(el).html() || '');
            
            // Check for direct Product type
            if (data['@type'] === 'Product' && data.name) {
              productTitle = data.name;
              
              // Also try to get image URL if available
              if (!imageUrl && data.image) {
                imageUrl = typeof data.image === 'string' ? data.image : 
                          Array.isArray(data.image) ? data.image[0] : undefined;
              }
              
              return false; // break out of loop
            }
            
            // Handle BreadcrumbList that might indicate product
            if (data['@type'] === 'BreadcrumbList' && Array.isArray(data.itemListElement)) {
              // Usually the last item in the breadcrumb is the product
              const lastItem = data.itemListElement[data.itemListElement.length - 1];
              if (lastItem && lastItem.item && lastItem.item.name) {
                productTitle = lastItem.item.name;
                return false; // break out of loop
              }
            }
            
            // Some sites use @graph array
            if (Array.isArray(data['@graph'])) {
              for (const item of data['@graph']) {
                if (item['@type'] === 'Product' && item.name) {
                  productTitle = item.name;
                  
                  // Also try to get image URL if available
                  if (!imageUrl && item.image) {
                    imageUrl = typeof item.image === 'string' ? item.image : 
                              Array.isArray(item.image) ? item.image[0] : undefined;
                  }
                  
                  return false; // break out of loop
                }
              }
            }
            
            // Handle variation in schema format - some sites don't use standard format
            if (data.name && (data.offers || data.price || data.sku)) {
              productTitle = data.name;
              
              // Also try to get image URL if available
              if (!imageUrl && data.image) {
                imageUrl = typeof data.image === 'string' ? data.image : 
                          Array.isArray(data.image) ? data.image[0] : undefined;
              }
              
              return false; // break out of loop
            }
          } catch (e) {
            // Ignore JSON parse errors
          }
        });
        
        // Method 2: Look for meta tags
        if (!productTitle) {
          const metaTags = [
            'meta[property="og:title"]',
            'meta[name="twitter:title"]',
            'meta[name="title"]',
            'meta[property="product:title"]',
            'meta[itemprop="name"]'
          ];
          
          for (const selector of metaTags) {
            const metaEl = $(selector);
            if (metaEl.length && metaEl.attr('content')) {
              const content = metaEl.attr('content') as string;
              
              // Skip very short titles or ones that seem to be website names
              if (content.length > 5 && !content.includes(' - ') && !content.includes(' | ')) {
                productTitle = content;
                break;
              } else if (content.includes(' - ') || content.includes(' | ')) {
                // Try to extract product name from title with separator
                const parts = content.split(/\s[-|]\s/);
                if (parts[0] && parts[0].length > 5) {
                  productTitle = parts[0].trim();
                  break;
                }
              }
            }
          }
          
          // Also look for image in meta tags
          if (!imageUrl) {
            const metaImageSelectors = [
              'meta[property="og:image"]',
              'meta[property="og:image:secure_url"]',
              'meta[name="twitter:image"]',
              'meta[property="product:image"]',
              'meta[itemprop="image"]'
            ];
            
            for (const selector of metaImageSelectors) {
              const metaElement = $(selector);
              if (metaElement.length && metaElement.attr('content')) {
                imageUrl = metaElement.attr('content');
                break;
              }
            }
          }
        }
        
        // Method 3: Look for common title selectors
        if (!productTitle) {
          const selectors = [
            // General e-commerce selectors
            'h1.product-title', 'h1.product-name', 'h1.product_title', '#productTitle', 
            '.product-title h1', '.product-name h1', '.product_title h1',
            '[data-testid="product-title"]', '[data-automation="product-title"]',
            '.title[itemprop="name"]', '[itemprop="name"]',
            
            // BestBuy selectors 
            'h1.heading-5', '.sku-title h1', '.shop-product-title h1',
            '[data-track="product-title"]', '.heading-5.v-fw-regular',
            '[data-testid="heading-product-title"]',
            
            // Amazon selectors
            '#productTitle', '#title', '.product-title-word-break',
            
            // Walmart selectors
            '[data-testid="product-title"]', '.prod-ProductTitle', 
            
            // Target selectors
            '[data-test="product-title"]', '.Heading__StyledHeading-sc-1mp23s9-0',
            'h1[data-test="product-title"]', 'span[data-test="product-title"]',
            
            // Newegg selectors
            '.product-title', '.product-name'
          ];
          
          for (const selector of selectors) {
            const el = $(selector);
            if (el.length && el.text().trim()) {
              const text = el.text().trim();
              
              // Verify that the text looks like a product title
              if (text.length > 5 && text.length < 250) {
                productTitle = text;
                break;
              }
            }
          }
          
          // If we found title from a selector, look for nearby images
          if (productTitle && !imageUrl) {
            // Look for main product image in DOM
            const imgSelectors = [
              '#landingImage', // Amazon
              '.primary-image', // Best Buy
              '[data-testid="hero-image"]', // Walmart
              '[data-test="product-image"]', // Target
              '.product-view-img-original', // Newegg
              '.imgTagWrapper img', // Amazon alternate
              '[data-automation="product-image"] img', // General
              '.product-main-image img',
              '.gallery-image-container img',
              '.main-image img'
            ];
            
            for (const selector of imgSelectors) {
              const img = $(selector);
              if (img.length && img.attr('src')) {
                imageUrl = img.attr('src');
                break;
              }
            }
          }
        }
        
        // Method 4: Try generic h1 elements if still no title
        if (!productTitle) {
          $('h1').each((i, el) => {
            const text = $(el).text().trim();
            
            // Check if this h1's text looks like a product title
            if (text.length > 10 && text.length < 200 && 
                !text.includes('Shopping Cart') && 
                !text.includes('Checkout') &&
                !text.includes('Login') &&
                !text.includes('Sign in')) {
              productTitle = text;
              return false; // Break out of each loop
            }
          });
        }
        
        // Method 5: Fallback to page title
        if (!productTitle) {
          const pageTitle = $('title').text().trim();
          
          if (!pageTitle || pageTitle.length < 5) {
            // No usable title found
            productTitle = "Unknown Product";
          } else {
            // Common separators in page titles
            const siteSeparators = [' - ', ' | ', ' – ', ' • ', ' › ', ' :: '];
            
            // Common site names or suffixes to remove
            const siteSuffixes = [
              'Amazon.com', 'Amazon', 'Walmart.com', 'Walmart', 'Target', 'Best Buy',
              'Newegg.com', 'Newegg', 'eBay', 'Etsy', 'Home Depot', 'Lowe\'s',
              'Shop', 'Online Shopping', 'Free Shipping', 'Official Site'
            ];
            
            let cleanTitle = pageTitle;
            
            // Try to extract the product name from the page title
            for (const separator of siteSeparators) {
              if (cleanTitle.includes(separator)) {
                // Usually the product name is the first part
                const parts = cleanTitle.split(separator);
                cleanTitle = parts[0].trim();
                break;
              }
            }
            
            // Remove common site suffixes
            for (const suffix of siteSuffixes) {
              if (cleanTitle.endsWith(suffix)) {
                cleanTitle = cleanTitle.substring(0, cleanTitle.length - suffix.length).trim();
              }
              if (cleanTitle.startsWith(suffix)) {
                cleanTitle = cleanTitle.substring(suffix.length).trim();
              }
            }
            
            // Remove pricing patterns often found in titles
            cleanTitle = cleanTitle.replace(/\$\d+(\.\d+)?/, '').trim();
            cleanTitle = cleanTitle.replace(/\(\d+% Off\)/i, '').trim();
            
            // If after cleaning we still have a reasonable length title, use it
            if (cleanTitle.length > 5 && cleanTitle.length < 200) {
              productTitle = cleanTitle;
            }
          }
        }
        
        // Method 6: Find the largest image on the page if we still don't have one
        if (!imageUrl) {
          let largestImage = null;
          let largestSize = 0;
          
          $('img').each((i, el) => {
            const img = $(el);
            if (img.attr('src')) {
              // Try to get image dimensions
              const width = parseInt(img.attr('width') || '0', 10);
              const height = parseInt(img.attr('height') || '0', 10);
              const size = width * height;
              
              // Skip very small images, likely icons
              if (size > largestSize && size > 10000) {
                largestSize = size;
                largestImage = img.attr('src');
              }
            }
          });
          
          if (largestImage) {
            imageUrl = largestImage;
          }
        }
        
        // Post-process the title
        if (productTitle) {
          // Remove excessive whitespace
          productTitle = productTitle.replace(/\s+/g, ' ').trim();
          
          // Remove common price patterns sometimes included in titles
          productTitle = productTitle.replace(/\s*\$\d+(\.\d+)?\s*/g, ' ').trim();
          productTitle = productTitle.replace(/\s*\(\d+% Off\)\s*/i, ' ').trim();
          
          // Remove SKU/model numbers if at the end of title
          productTitle = productTitle.replace(/\s+#\w+$/i, '').trim();
          productTitle = productTitle.replace(/\s+\(\w+\)$/i, '').trim();
          
          // Cut titles if they're too long (over 150 chars)
          if (productTitle.length > 150) {
            productTitle = productTitle.substring(0, 150) + '...';
          }
        }
      } catch (error) {
        console.error(`Error fetching product page: ${error.message}`);
        
        // If fetching the page failed, fall back to URL-based detection
        if (!productTitle) {
          // Try to extract it from query parameters first (common in many e-commerce sites)
          const urlParams = new URLSearchParams(parsedUrl.search);
          if (urlParams.has('title')) {
            productTitle = urlParams.get('title') || "";
          } else if (urlParams.has('product')) {
            productTitle = urlParams.get('product') || "";
          } else if (urlParams.has('name')) {
            productTitle = urlParams.get('name') || "";
          } else if (urlParams.has('q')) {
            // If it's a search query, use it with qualifier
            const query = urlParams.get('q') || "";
            if (query.length > 0) {
              productTitle = query;
            }
          }
          
          // If still no title, get the last path segment which often contains the product name
          if (!productTitle) {
            const pathSegments = parsedUrl.pathname.split("/").filter(segment => segment.length > 0);
            if (pathSegments.length > 0) {
              productTitle = pathSegments[pathSegments.length - 1]
                .replace(/-/g, " ")
                .replace(/_/g, " ")
                .replace(/\..*$/, "") // Remove file extension if present
                .split("?")[0]; // Remove query string if present
                
              // Capitalize first letter of each word
              productTitle = productTitle
                .split(" ")
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ");
            }
          }
        }
      }
      
      // If still no title, use a generic fallback
      if (!productTitle) {
        productTitle = `Product from ${source}`;
      }
      
      return {
        title: productTitle,
        url: url,
        source: source,
        imageUrl
      };
    } catch (error) {
      console.error("Error extracting product from URL:", error);
      
      // If all extraction attempts fail, provide a basic fallback
      try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.replace(/^www\./, '');
        const source = hostname.split('.')[0];
        const sourceName = source.charAt(0).toUpperCase() + source.slice(1) + '.com';
        
        return {
          title: `Product from ${sourceName}`,
          url: url,
          source: sourceName
        };
      } catch (e) {
        return {
          title: 'Unknown Product',
          url: url,
          source: 'Unknown Source'
        };
      }
    }
  }
}

export const productService = new ProductService();
