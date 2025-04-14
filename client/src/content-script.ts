// Product detection strategies
const detectProductTitle = (): string | null => {
  // Strategy 1: Look for product title in h1 elements
  const h1Elements = document.querySelectorAll('h1');
  for (const h1 of h1Elements) {
    if (h1.textContent && h1.textContent.length > 10 && h1.textContent.length < 200) {
      return h1.textContent.trim();
    }
  }

  // Strategy 2: Look for product title in meta tags
  const metaTitleElement = document.querySelector('meta[property="og:title"]');
  if (metaTitleElement && metaTitleElement.getAttribute('content')) {
    return metaTitleElement.getAttribute('content')!.trim();
  }

  // Strategy 3: Look for product title in structured data
  const structuredDataElements = document.querySelectorAll('script[type="application/ld+json"]');
  for (const element of structuredDataElements) {
    try {
      const data = JSON.parse(element.textContent || '');
      if (data['@type'] === 'Product' && data.name) {
        return data.name;
      }
    } catch (e) {
      // Ignore parsing errors
    }
  }

  // Strategy 4: Look for title element
  const titleElement = document.querySelector('title');
  if (titleElement && titleElement.textContent) {
    return titleElement.textContent.trim();
  }

  return null;
};

const detectProductImage = (): string | null => {
  // Strategy 1: Look for product image in meta tags
  const metaImageElement = document.querySelector('meta[property="og:image"]');
  if (metaImageElement && metaImageElement.getAttribute('content')) {
    return metaImageElement.getAttribute('content')!;
  }

  // Strategy 2: Look for product image in structured data
  const structuredDataElements = document.querySelectorAll('script[type="application/ld+json"]');
  for (const element of structuredDataElements) {
    try {
      const data = JSON.parse(element.textContent || '');
      if (data['@type'] === 'Product' && data.image) {
        return typeof data.image === 'string' ? data.image : data.image[0];
      }
    } catch (e) {
      // Ignore parsing errors
    }
  }

  // Strategy 3: Look for largest image on the page
  let largestImage = null;
  let largestArea = 0;
  
  const images = document.querySelectorAll('img');
  for (const img of images) {
    const area = img.naturalWidth * img.naturalHeight;
    if (area > largestArea && img.src && !img.src.includes('logo') && !img.src.includes('icon')) {
      largestArea = area;
      largestImage = img.src;
    }
  }

  return largestImage;
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
