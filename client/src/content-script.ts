// Define Chrome extension types
declare const chrome: {
  runtime: {
    onMessage: {
      addListener: (callback: (message: any, sender: any, sendResponse: any) => void) => void;
      removeListener: (callback: (message: any, sender: any, sendResponse: any) => void) => void;
    };
    sendMessage: (message: any) => void;
    lastError?: any;
  }
};

// Debug flag - set to true to log detection steps
const DEBUG = true; // Enabling debug mode to diagnose detection issues

const log = (message: string) => {
  if (DEBUG) {
    console.log(`[ReviewRadar] ${message}`);
  }
};

// Product detection strategies
const detectProductTitle = (): string | null => {
  log('Detecting product title...');
  
  // Site-specific strategies first
  if (window.location.hostname.includes('bestbuy.com')) {
    log('Detected BestBuy website, using specialized selectors');
    
    try {
      // Log the page title for debugging
      const pageTitle = document.title;
      log(`Page title: ${pageTitle}`);
      
      // Log all h1 elements on the page
      const allH1s = document.querySelectorAll('h1');
      log(`Found ${allH1s.length} h1 elements on the page`);
      Array.from(allH1s).forEach((h1, index) => {
        if (h1.textContent) {
          log(`H1 ${index + 1}: ${h1.textContent.trim()}`);
        }
      });
    } catch (error) {
      log(`Error during debug logging: ${error}`);
    }
    
    // BestBuy specific selectors
    const bestBuySelectors = [
      // BestBuy product page selectors (based on screenshot)
      'h1.heading-5', // Most likely selector based on the screenshot
      '.sku-title h1',
      '.shop-product-title h1',
      '[data-track="product-title"]',
      '.heading-5.v-fw-regular',
      // Additional fallbacks for BestBuy
      '[data-testid="heading-product-title"]',
      '.fulfillment-add-to-cart-button + h1',
      '.c-heading-module h1'
    ];
    
    for (const selector of bestBuySelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent) {
        const title = element.textContent.trim();
        log(`Found BestBuy product title in ${selector}: ${title}`);
        return title;
      }
    }
    
    // Try to extract from page title as a BestBuy-specific fallback
    if (document.title && document.title.includes('Best Buy')) {
      const title = document.title.replace('Best Buy', '').replace(/^\s*[-:]\s*/, '').trim();
      log(`Extracted product title from page title: ${title}`);
      return title;
    }
  }
  
  // Strategy 1: Look for product title in h1 elements
  const h1Elements = document.querySelectorAll('h1');
  // Using Array.from to avoid iteration issues with NodeList
  for (const h1 of Array.from(h1Elements)) {
    if (h1.textContent && h1.textContent.length > 10 && h1.textContent.length < 200) {
      const title = h1.textContent.trim();
      log(`Found product title in h1: ${title}`);
      return title;
    }
  }

  // Strategy 2: Look for product title in meta tags
  const metaTitleTags = [
    'meta[property="og:title"]',
    'meta[name="twitter:title"]',
    'meta[name="title"]',
    'meta[name="product:title"]',
    'meta[itemprop="name"]'
  ];
  
  for (const selector of metaTitleTags) {
    const metaElement = document.querySelector(selector);
    if (metaElement && metaElement.getAttribute('content')) {
      const title = metaElement.getAttribute('content')!.trim();
      log(`Found product title in ${selector}: ${title}`);
      return title;
    }
  }

  // Strategy 3: Look for product title in structured data
  const structuredDataElements = document.querySelectorAll('script[type="application/ld+json"]');
  for (const element of Array.from(structuredDataElements)) {
    try {
      const data = JSON.parse(element.textContent || '');
      
      // Check for direct product type
      if (data['@type'] === 'Product' && data.name) {
        log(`Found product title in structured data: ${data.name}`);
        return data.name;
      }
      
      // Check for array of types that may contain product
      if (Array.isArray(data['@graph'])) {
        for (const item of data['@graph']) {
          if (item['@type'] === 'Product' && item.name) {
            log(`Found product title in structured data graph: ${item.name}`);
            return item.name;
          }
        }
      }
    } catch (e) {
      // Ignore parsing errors
      log(`Error parsing structured data: ${e}`);
    }
  }

  // Strategy 4: Look for common product title selectors across e-commerce sites
  const commonSelectors = [
    '.product-title', 
    '.product-name',
    '.product_title',
    '#productTitle',
    '[data-testid="product-title"]',
    '[data-automation="product-title"]',
    '.title[itemprop="name"]',
    '[itemprop="name"]'
  ];
  
  for (const selector of commonSelectors) {
    const element = document.querySelector(selector);
    if (element && element.textContent) {
      const title = element.textContent.trim();
      log(`Found product title in common selector ${selector}: ${title}`);
      return title;
    }
  }

  // Strategy 5: Look for title element (least reliable, but fallback)
  const titleElement = document.querySelector('title');
  if (titleElement && titleElement.textContent) {
    // Clean up the title - often has site name
    let title = titleElement.textContent.trim();
    
    // Remove common site name patterns
    const siteSeparators = [' - ', ' | ', ' – ', ' • ', ' › ', ' :: '];
    for (const separator of siteSeparators) {
      if (title.includes(separator)) {
        // Take the first part as it's typically the product name
        title = title.split(separator)[0].trim();
      }
    }
    
    log(`Using page title as fallback: ${title}`);
    return title;
  }

  log('No product title found');
  return null;
};

const detectProductImage = (): string | null => {
  log('Detecting product image...');

  // Site-specific strategies first
  if (window.location.hostname.includes('bestbuy.com')) {
    // BestBuy specific selectors
    const bestBuySelectors = [
      '.primary-image img', 
      '.picture-wrapper img',
      '[data-testid="carousel-main-image"]',
      '.shop-media-gallery img',
      '.carousel-main-wrapper img'
    ];
    
    for (const selector of bestBuySelectors) {
      const element = document.querySelector(selector) as HTMLImageElement;
      if (element && element.src) {
        const imageUrl = element.src;
        log(`Found BestBuy product image in ${selector}: ${imageUrl}`);
        return imageUrl;
      }
    }
  }

  // Strategy 1: Look for product image in meta tags
  const metaImageSelectors = [
    'meta[property="og:image"]',
    'meta[property="og:image:secure_url"]',
    'meta[name="twitter:image"]',
    'meta[property="product:image"]',
    'meta[itemprop="image"]'
  ];
  
  for (const selector of metaImageSelectors) {
    const metaElement = document.querySelector(selector);
    if (metaElement && metaElement.getAttribute('content')) {
      const imageUrl = metaElement.getAttribute('content')!;
      log(`Found product image in ${selector}: ${imageUrl}`);
      return imageUrl;
    }
  }

  // Strategy 2: Look for product image in structured data
  const structuredDataElements = document.querySelectorAll('script[type="application/ld+json"]');
  for (const element of structuredDataElements) {
    try {
      const data = JSON.parse(element.textContent || '');
      
      // Check for direct product type
      if (data['@type'] === 'Product' && data.image) {
        const imageUrl = typeof data.image === 'string' ? data.image : Array.isArray(data.image) ? data.image[0] : null;
        if (imageUrl) {
          log(`Found product image in structured data: ${imageUrl}`);
          return imageUrl;
        }
      }
      
      // Check for array of types
      if (Array.isArray(data['@graph'])) {
        for (const item of data['@graph']) {
          if (item['@type'] === 'Product' && item.image) {
            const imageUrl = typeof item.image === 'string' ? item.image : Array.isArray(item.image) ? item.image[0] : null;
            if (imageUrl) {
              log(`Found product image in structured data graph: ${imageUrl}`);
              return imageUrl;
            }
          }
        }
      }
    } catch (e) {
      // Ignore parsing errors
      log(`Error parsing structured data for image: ${e}`);
    }
  }

  // Strategy 3: Look for common product image selectors
  const commonProductImageSelectors = [
    // Amazon
    '#landingImage', '#imgBlkFront', '.a-dynamic-image',
    // Other common e-commerce sites
    '.product-image img', '.product-image-primary', '.product-featured-image',
    '#product-image', '.gallery-image', '.main-product-image',
    '[data-main-image]', '[data-image-large]', '[data-zoom-image]',
    // Additional common selectors
    '.product-gallery__image', '.product__photo img', '.product-single__photo',
    '[data-testid="product-image"]', '[data-cy="product-image"]',
    '.product-image-container img', '.product-detail__image'
  ];
  
  for (const selector of commonProductImageSelectors) {
    const element = document.querySelector(selector) as HTMLImageElement;
    if (element && element.src) {
      log(`Found product image using selector ${selector}: ${element.src}`);
      return element.src;
    }
  }
  
  // Strategy 4: Look for largest image on the page (above a certain size threshold)
  let largestImage = null;
  let largestArea = 0;
  const minimumSize = 5000; // Minimum pixel area to consider
  
  const images = document.querySelectorAll('img');
  for (const img of images) {
    const area = img.naturalWidth * img.naturalHeight;
    
    // Skip tiny images, icons, logos, and tracking pixels
    if (area < minimumSize || !img.src || 
        img.src.includes('logo') || 
        img.src.includes('icon') ||
        img.src.includes('pixel') || 
        img.src.includes('tracking') ||
        img.src.includes('banner') ||
        img.width < 100 || img.height < 100) {
      continue;
    }
    
    if (area > largestArea) {
      largestArea = area;
      largestImage = img.src;
    }
  }
  
  if (largestImage) {
    log(`Found product image using largest image strategy: ${largestImage}`);
    return largestImage;
  }

  log('No product image found');
  return null;
};

const detectSourceName = (): string => {
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

// A more comprehensive approach that combines multiple detection strategies
const detectProduct = () => {
  log('Starting product detection');
  
  // Track detection method for debugging
  let detectionMethod = '';
  let detectionSelector = '';

  // First try our specialized site-specific detectors
  let title = null;
  let debugInfo = {};
  
  try {
    // Try to extract product information from the page's structured data first (most reliable)
    log('Trying structured data detection');
    const structuredData = extractStructuredData();
    if (structuredData && structuredData.title) {
      title = structuredData.title;
      detectionMethod = 'structured_data';
      log(`Found product in structured data: ${title}`);
    }
    
    // If no structured data, try meta tags
    if (!title) {
      log('Trying meta tag detection');
      const metaTitle = extractFromMetaTags();
      if (metaTitle) {
        title = metaTitle;
        detectionMethod = 'meta_tags';
        log(`Found product in meta tags: ${title}`);
      }
    }
    
    // If still no title, try common selectors
    if (!title) {
      log('Trying common selector detection');
      const result = extractFromCommonSelectors();
      if (result) {
        title = result.title;
        detectionMethod = 'common_selectors';
        detectionSelector = result.selector;
        log(`Found product using common selector ${result.selector}: ${title}`);
      }
    }
    
    // If still no title, try page title as last resort
    if (!title) {
      log('Trying page title detection');
      const pageTitleResult = extractFromPageTitle();
      if (pageTitleResult) {
        title = pageTitleResult;
        detectionMethod = 'page_title';
        log(`Extracted product from page title: ${title}`);
      }
    }
  } catch (error) {
    log(`Error during product detection: ${error}`);
  }
  
  const imageUrl = detectProductImage();
  const source = detectSourceName();
  const url = window.location.href;

  if (title) {
    // Return the detected product with debug information
    debugInfo = {
      method: detectionMethod,
      selector: detectionSelector,
      details: `Detected on ${window.location.hostname} at ${new Date().toISOString()}`
    };
    
    return {
      product: {
        title,
        url,
        source,
        imageUrl: imageUrl || undefined
      },
      debug: debugInfo
    };
  }
  
  log('No product detected on this page');
  return null;
};

// Extract product information from structured data
const extractStructuredData = () => {
  const structuredDataElements = document.querySelectorAll('script[type="application/ld+json"]');
  
  for (const element of Array.from(structuredDataElements)) {
    try {
      const data = JSON.parse(element.textContent || '');
      
      // Handle single product schema
      if (data['@type'] === 'Product' && data.name) {
        return {
          title: data.name,
          image: typeof data.image === 'string' ? data.image : 
                 Array.isArray(data.image) ? data.image[0] : null
        };
      }
      
      // Handle array of schemas
      if (Array.isArray(data['@graph'])) {
        for (const item of data['@graph']) {
          if (item['@type'] === 'Product' && item.name) {
            return {
              title: item.name,
              image: typeof item.image === 'string' ? item.image : 
                     Array.isArray(item.image) ? item.image[0] : null
            };
          }
        }
      }
    } catch (e) {
      log(`Error parsing structured data: ${e}`);
    }
  }
  
  return null;
};

// Extract product title from meta tags
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
      const content = metaElement.getAttribute('content')!.trim();
      
      // Skip very short titles or ones that seem to be website names
      if (content.length > 5 && !content.includes(' - ') && !content.includes(' | ')) {
        return content;
      } else if (content.includes(' - ') || content.includes(' | ')) {
        // Try to extract product name from title with separator
        const parts = content.split(/\s[-|]\s/);
        if (parts[0] && parts[0].length > 5) {
          return parts[0].trim();
        }
      }
    }
  }
  
  return null;
};

// Extract product title from common selectors used across e-commerce sites
const extractFromCommonSelectors = () => {
  // Common selectors for product titles across popular e-commerce sites
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
        return { title: text, selector: 'h1' };
      }
    }
  }
  
  return null;
};

// Extract product name from page title as a last resort
const extractFromPageTitle = () => {
  const pageTitle = document.title;
  
  if (!pageTitle || pageTitle.length < 5) {
    return null;
  }
  
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
  
  // If after cleaning we still have a reasonable length title, return it
  if (cleanTitle.length > 5 && cleanTitle.length < 200) {
    return cleanTitle;
  }
  
  return null;
};

// Listen for messages from popup or background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'DETECT_PRODUCT') {
    log('Received DETECT_PRODUCT message, running detection...');
    const detectionResult = detectProduct();
    
    if (detectionResult) {
      log(`Detection successful: ${detectionResult.product.title}`);
      sendResponse({
        product: detectionResult.product,
        debug: detectionResult.debug
      });
    } else {
      log('No product detected');
      sendResponse({ product: null });
    }
  }
  return true; // Keep the message channel open for async responses
});

// Automatically detect product when page loads and send to background script
window.addEventListener('load', () => {
  // Short delay to ensure page is fully loaded
  setTimeout(() => {
    log('Page loaded, running automatic product detection');
    const detectionResult = detectProduct();
    
    if (detectionResult) {
      log(`Automatic detection successful: ${detectionResult.product.title}`);
      chrome.runtime.sendMessage({
        type: 'PRODUCT_DETECTED',
        product: detectionResult.product,
        debug: detectionResult.debug
      });
    } else {
      log('Automatic detection found no product');
    }
  }, 500); // Half second delay for page to settle
});
