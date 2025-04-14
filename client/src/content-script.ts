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
const DEBUG = false;

const log = (message: string) => {
  if (DEBUG) {
    console.log(`[ReviewRadar] ${message}`);
  }
};

// Product detection strategies
const detectProductTitle = (): string | null => {
  log('Detecting product title...');
  
  // Strategy 1: Look for product title in h1 elements
  const h1Elements = document.querySelectorAll('h1');
  // Using Array.from to avoid iteration issues with NodeList
  Array.from(h1Elements).forEach(h1 => {
    if (h1.textContent && h1.textContent.length > 10 && h1.textContent.length < 200) {
      const title = h1.textContent.trim();
      log(`Found product title in h1: ${title}`);
      return title;
    }
  });

  // Strategy 2: Look for product title in meta tags
  const metaTitleTags = [
    'meta[property="og:title"]',
    'meta[name="twitter:title"]',
    'meta[name="title"]',
    'meta[name="product:title"]'
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
  const foundTitle = Array.from(structuredDataElements).find(element => {
    try {
      const data = JSON.parse(element.textContent || '');
      
      // Check for direct product type
      if (data['@type'] === 'Product' && data.name) {
        log(`Found product title in structured data: ${data.name}`);
        return data.name;
      }
      
      // Check for array of types that may contain product
      if (Array.isArray(data['@graph'])) {
        const foundInGraph = data['@graph'].find(item => {
          if (item['@type'] === 'Product' && item.name) {
            log(`Found product title in structured data graph: ${item.name}`);
            return true;
          }
          return false;
        });
        
        if (foundInGraph) {
          return foundInGraph.name;
        }
      }
      return false;
    } catch (e) {
      // Ignore parsing errors
      log(`Error parsing structured data: ${e}`);
      return false;
    }
  });
  
  if (foundTitle) return foundTitle;

  // Strategy 4: Look for title element (least reliable, but fallback)
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
    '[data-main-image]', '[data-image-large]', '[data-zoom-image]'
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

// Main detection function
const detectProduct = () => {
  const title = detectProductTitle();
  const imageUrl = detectProductImage();
  const source = detectSourceName();
  const url = window.location.href;

  if (title) {
    return {
      title,
      url,
      source,
      imageUrl: imageUrl || undefined
    };
  }
  
  return null;
};

// Listen for messages from popup or background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'DETECT_PRODUCT') {
    const product = detectProduct();
    sendResponse({ product });
  }
  return true; // Keep the message channel open for async responses
});

// Automatically detect product when page loads and send to background script
window.addEventListener('load', () => {
  const product = detectProduct();
  if (product) {
    chrome.runtime.sendMessage({
      type: 'PRODUCT_DETECTED',
      product
    });
  }
});
