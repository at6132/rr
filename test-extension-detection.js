/**
 * Test Script for ReviewRadar Chrome Extension Product Detection
 * 
 * This script simulates the content script's product detection logic for testing.
 * To use it:
 * 1. Visit a product page in Chrome
 * 2. Open Chrome DevTools (F12 or Ctrl+Shift+I)
 * 3. Copy-paste this entire script into the Console tab
 * 4. Press Enter to run
 * 
 * It will output:
 * - Detected product information
 * - Detection method used
 * - Debug details
 */

// Debug flag
const DEBUG = true;

// Logging function
const log = (message) => {
  if (DEBUG) {
    console.log(`[ReviewRadar-Test] ${message}`);
  }
};

// Detect source name from URL
const detectSourceName = () => {
  // Get the domain name from the current URL
  const hostname = window.location.hostname;
  
  // Remove www. prefix if present
  const domainParts = hostname.split('.');
  if (domainParts[0] === 'www') {
    domainParts.shift();
  }
  
  // Get the main domain name (e.g., amazon from amazon.com)
  const mainDomain = domainParts[0];
  
  // Capitalize the first letter
  return mainDomain.charAt(0).toUpperCase() + mainDomain.slice(1) + '.com';
};

// Extract from structured data
const extractStructuredData = () => {
  const structuredDataElements = document.querySelectorAll('script[type="application/ld+json"]');
  
  for (const element of Array.from(structuredDataElements)) {
    try {
      const data = JSON.parse(element.textContent || '');
      
      // Handle single product schema
      if (data['@type'] === 'Product' && data.name) {
        log(`Found product in structured data with @type=Product: ${data.name}`);
        return {
          title: data.name,
          image: typeof data.image === 'string' ? data.image : 
                 Array.isArray(data.image) ? data.image[0] : null
        };
      }

      // Handle breadcrumbList that might indicate product
      if (data['@type'] === 'BreadcrumbList' && Array.isArray(data.itemListElement)) {
        // Usually the last item in the breadcrumb is the product
        const lastItem = data.itemListElement[data.itemListElement.length - 1];
        if (lastItem && lastItem.item && lastItem.item.name) {
          log(`Found product in breadcrumb: ${lastItem.item.name}`);
          return {
            title: lastItem.item.name,
            image: null
          };
        }
      }
      
      // Handle array of schemas
      if (Array.isArray(data['@graph'])) {
        for (const item of data['@graph']) {
          if (item['@type'] === 'Product' && item.name) {
            log(`Found product in structured data @graph: ${item.name}`);
            return {
              title: item.name,
              image: typeof item.image === 'string' ? item.image : 
                     Array.isArray(item.image) ? item.image[0] : null
            };
          }
        }
      }
      
      // Handle variation in schema format - some sites don't use standard format
      if (data.name && (data.offers || data.price || data.sku)) {
        log(`Found product-like schema with name+offers/price: ${data.name}`);
        return {
          title: data.name,
          image: typeof data.image === 'string' ? data.image : 
                 Array.isArray(data.image) ? item.image[0] : null
        };
      }
    } catch (e) {
      log(`Error parsing structured data: ${e}`);
    }
  }
  
  return null;
};

// Extract from meta tags
const extractFromMetaTags = () => {
  const metaTitleTags = [
    'meta[property="og:title"]',
    'meta[name="twitter:title"]',
    'meta[name="title"]',
    'meta[property="product:title"]',
    'meta[itemprop="name"]'
  ];
  
  for (const selector of metaTitleTags) {
    const metaElement = document.querySelector(selector);
    if (metaElement && metaElement.getAttribute('content')) {
      const content = metaElement.getAttribute('content').trim();
      
      // Skip very short titles or ones that seem to be website names
      if (content.length > 5 && !content.includes(' - ') && !content.includes(' | ')) {
        log(`Found product title in meta tag ${selector}: ${content}`);
        return content;
      } else if (content.includes(' - ') || content.includes(' | ')) {
        // Try to extract product name from title with separator
        const parts = content.split(/\s[-|]\s/);
        if (parts[0] && parts[0].length > 5) {
          log(`Found product title in meta tag ${selector} (after splitting): ${parts[0].trim()}`);
          return parts[0].trim();
        }
      }
    }
  }
  
  return null;
};

// Extract from common selectors
const extractFromCommonSelectors = () => {
  // Common selectors for product titles
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
    
    // Newegg selectors
    '.product-title', '.product-name',
    
    // Other common H1 patterns
    'h1.title', 'h1.name', 'h1.main-title'
  ];
  
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element && element.textContent) {
      const text = element.textContent.trim();
      
      // Verify that the text looks like a product title
      if (text.length > 5 && text.length < 250) {
        log(`Found product using selector ${selector}: ${text}`);
        return { title: text, selector };
      }
    }
  }
  
  // If no matches from specific selectors, try generic h1 elements
  const h1Elements = document.querySelectorAll('h1');
  for (const h1 of Array.from(h1Elements)) {
    if (h1.textContent) {
      const text = h1.textContent.trim();
      
      // Check if this h1 looks like a product title
      if (text.length > 10 && text.length < 200 && 
          !text.includes('Shopping Cart') && 
          !text.includes('Checkout') &&
          !text.includes('Login') &&
          !text.includes('Sign in')) {
        log(`Found product in generic h1: ${text}`);
        return { title: text, selector: 'h1' };
      }
    }
  }
  
  return null;
};

// Extract from page title as a last resort
const extractFromPageTitle = () => {
  const pageTitle = document.title;
  
  if (!pageTitle || pageTitle.length < 5) {
    return null;
  }
  
  log(`Page title: ${pageTitle}`);
  
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
      log(`Found separator '${separator}' - extracted: ${cleanTitle}`);
      break;
    }
  }
  
  // Remove common site suffixes
  for (const suffix of siteSuffixes) {
    if (cleanTitle.endsWith(suffix)) {
      cleanTitle = cleanTitle.substring(0, cleanTitle.length - suffix.length).trim();
      log(`Removed suffix '${suffix}' from end - result: ${cleanTitle}`);
    }
    if (cleanTitle.startsWith(suffix)) {
      cleanTitle = cleanTitle.substring(suffix.length).trim();
      log(`Removed suffix '${suffix}' from start - result: ${cleanTitle}`);
    }
  }
  
  // Remove pricing patterns often found in titles
  cleanTitle = cleanTitle.replace(/\$\d+(\.\d+)?/, '').trim();
  cleanTitle = cleanTitle.replace(/\(\d+% Off\)/i, '').trim();
  
  // If after cleaning we still have a reasonable length title, return it
  if (cleanTitle.length > 5 && cleanTitle.length < 200) {
    log(`Extracted final title from page title: ${cleanTitle}`);
    return cleanTitle;
  }
  
  return null;
};

// Main detection function
const detectProduct = () => {
  console.log('===== ReviewRadar Product Detection Test =====');
  console.log(`Testing on URL: ${window.location.href}`);
  console.log('=============================================');
  
  // Track detection method for debugging
  let detectionMethod = '';
  let detectionSelector = '';
  let detectionDetails = '';

  // First try our specialized site-specific detectors
  let title = null;
  let imageUrl = null;
  
  try {
    // Step 1: Try to extract product information from the page's structured data first (most reliable)
    log('Trying structured data detection');
    const structuredData = extractStructuredData();
    if (structuredData && structuredData.title) {
      title = structuredData.title;
      imageUrl = structuredData.image || null;
      detectionMethod = 'structured_data';
      detectionDetails = 'Product extracted from structured data using JSON-LD';
      log(`Found product in structured data: ${title}`);
    }
    
    // Step 2: If no structured data, try meta tags
    if (!title) {
      log('Trying meta tag detection');
      const metaTitle = extractFromMetaTags();
      if (metaTitle) {
        title = metaTitle;
        detectionMethod = 'meta_tags';
        detectionDetails = 'Product extracted from meta tags in the page head';
        log(`Found product in meta tags: ${title}`);
      }
    }
    
    // Step 3: If still no title, try common selectors
    if (!title) {
      log('Trying common selector detection');
      const result = extractFromCommonSelectors();
      if (result) {
        title = result.title;
        detectionMethod = 'common_selectors';
        detectionSelector = result.selector;
        detectionDetails = `Product title found in DOM using selector: ${result.selector}`;
        log(`Found product using common selector ${result.selector}: ${title}`);
      }
    }
    
    // Step 4: If still no title, try page title as last resort
    if (!title) {
      log('Trying page title detection');
      const pageTitleResult = extractFromPageTitle();
      if (pageTitleResult) {
        title = pageTitleResult;
        detectionMethod = 'page_title';
        detectionDetails = 'Product extracted from page title with cleaning';
        log(`Extracted product from page title: ${title}`);
      }
    }
    
    // Clean up and post-process the title
    if (title) {
      // Remove excessive whitespace
      title = title.replace(/\s+/g, ' ').trim();
      
      // Remove common price patterns sometimes included in titles
      title = title.replace(/\s*\$\d+(\.\d+)?\s*/g, ' ').trim();
      title = title.replace(/\s*\(\d+% Off\)\s*/i, ' ').trim();
      
      // Remove SKU/model numbers if at the end of title
      title = title.replace(/\s+#\w+$/i, '').trim();
      title = title.replace(/\s+\(\w+\)$/i, '').trim();
      
      // Cut titles if they're too long (over 150 chars)
      if (title.length > 150) {
        title = title.substring(0, 150) + '...';
      }
    }
  } catch (error) {
    console.error(`Error during product detection: ${error}`);
    detectionDetails = `Error: ${error.message}`;
  }
  
  // Get source name and current URL
  const source = detectSourceName();
  const url = window.location.href;

  if (title) {
    // Detected product with debug information
    const debugInfo = {
      method: detectionMethod,
      selector: detectionSelector,
      details: detectionDetails || `Detected on ${window.location.hostname} at ${new Date().toISOString()}`
    };
    
    const product = {
      title,
      url,
      source,
      imageUrl: imageUrl || undefined
    };
    
    // Print detection results
    console.log('=============================================');
    console.log('DETECTION SUCCESSFUL!');
    console.log('=============================================');
    console.log(`Product Title: ${product.title}`);
    console.log(`Source: ${product.source}`);
    console.log(`Image URL: ${product.imageUrl || '(none detected)'}`);
    console.log('\nDetection Method: ' + debugInfo.method);
    if (debugInfo.selector) {
      console.log('Selector Used: ' + debugInfo.selector);
    }
    console.log('Detection Details: ' + debugInfo.details);
    console.log('=============================================');
    
    return { product, debug: debugInfo };
  }
  
  console.log('=============================================');
  console.log('NO PRODUCT DETECTED ON THIS PAGE');
  console.log('=============================================');
  return null;
};

// Run the detection
detectProduct();

// Note: You could add this to a bookmark with the javascript: prefix to run it easily on any page
// javascript:(function(){var s=document.createElement('script');s.src='https://your-url.com/test-extension-detection.js';document.body.appendChild(s);})();