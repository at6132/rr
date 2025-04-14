/**
 * ReviewRadar Content Script Monitor
 * 
 * This script helps debug and develop the product detection logic
 * that will be used in the Chrome extension.
 * 
 * To use:
 * 1. Visit a product page
 * 2. Open browser devtools (F12)
 * 3. Copy paste this entire script into the console
 * 4. Watch the output as detection happens in realtime
 */

// Create a container for our UI
function createMonitorUI() {
  // Create container
  const container = document.createElement('div');
  container.id = 'rr-monitor';
  container.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 350px;
    max-height: 500px;
    background: #fff;
    color: #333;
    border: 2px solid #3a86ff;
    border-radius: 10px;
    z-index: 999999;
    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    font-family: Arial, sans-serif;
    font-size: 14px;
    padding: 15px;
    overflow-y: auto;
    transition: all 0.3s ease;
  `;
  
  // Create header
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #ddd;
    padding-bottom: 10px;
    margin-bottom: 10px;
  `;
  
  const title = document.createElement('h3');
  title.textContent = 'ReviewRadar Monitor';
  title.style.cssText = `
    margin: 0;
    color: #3a86ff;
    font-size: 16px;
    font-weight: bold;
  `;
  
  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'X';
  closeBtn.style.cssText = `
    background: none;
    border: none;
    color: #888;
    cursor: pointer;
    font-size: 16px;
    font-weight: bold;
  `;
  closeBtn.onclick = () => container.remove();
  
  header.appendChild(title);
  header.appendChild(closeBtn);
  container.appendChild(header);
  
  // Create content area
  const content = document.createElement('div');
  content.id = 'rr-monitor-content';
  container.appendChild(content);
  
  // Create controls
  const controls = document.createElement('div');
  controls.style.cssText = `
    display: flex;
    justify-content: space-between;
    margin-top: 15px;
    padding-top: 10px;
    border-top: 1px solid #ddd;
  `;
  
  const runBtn = document.createElement('button');
  runBtn.textContent = 'Run Detection';
  runBtn.style.cssText = `
    background: #3a86ff;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 8px 15px;
    cursor: pointer;
    font-weight: bold;
  `;
  runBtn.onclick = () => {
    clearLogs();
    if (window.reviewRadarDetection) {
      window.reviewRadarDetection();
    }
  };
  
  const clearBtn = document.createElement('button');
  clearBtn.textContent = 'Clear Logs';
  clearBtn.style.cssText = `
    background: #f5f5f5;
    color: #333;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 8px 15px;
    cursor: pointer;
  `;
  clearBtn.onclick = clearLogs;
  
  controls.appendChild(runBtn);
  controls.appendChild(clearBtn);
  container.appendChild(controls);
  
  document.body.appendChild(container);
  
  return content;
}

// Clear the log display
function clearLogs() {
  const content = document.getElementById('rr-monitor-content');
  if (content) {
    content.innerHTML = '';
  }
}

// Log a message to our UI
function log(message, type = 'info') {
  console.log(`[ReviewRadar] ${message}`);
  
  const content = document.getElementById('rr-monitor-content');
  if (!content) return;
  
  const logItem = document.createElement('div');
  logItem.style.cssText = `
    margin-bottom: 8px;
    padding: 5px;
    border-radius: 4px;
    font-family: monospace;
    font-size: 12px;
    word-break: break-word;
  `;
  
  // Color coding for different log types
  if (type === 'success') {
    logItem.style.background = '#d4edda';
    logItem.style.color = '#155724';
    logItem.innerHTML = `✅ ${message}`;
  } else if (type === 'error') {
    logItem.style.background = '#f8d7da';
    logItem.style.color = '#721c24';
    logItem.innerHTML = `❌ ${message}`;
  } else if (type === 'debug') {
    logItem.style.background = '#e2e3e5';
    logItem.style.color = '#383d41';
    logItem.innerHTML = `🔍 ${message}`;
  } else if (type === 'warning') {
    logItem.style.background = '#fff3cd';
    logItem.style.color = '#856404';
    logItem.innerHTML = `⚠️ ${message}`;
  } else if (type === 'highlight') {
    logItem.style.background = '#cce5ff';
    logItem.style.color = '#004085';
    logItem.style.fontWeight = 'bold';
    logItem.innerHTML = `${message}`;
  } else {
    logItem.style.background = '#f8f9fa';
    logItem.style.color = '#202529';
    logItem.innerHTML = `${message}`;
  }
  
  content.appendChild(logItem);
  content.scrollTop = content.scrollHeight;
}

// Create our UI
const monitorContent = createMonitorUI();

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

// Detect product image if available
const detectProductImage = () => {
  log('Looking for product image', 'debug');
  
  // Common selectors for product images
  const imageSelectors = [
    // Amazon selectors
    '#landingImage', '#imgBlkFront', '.image.featured-item', 
    
    // BestBuy selectors
    '.primary-image', '.carousel-main-img',
    
    // Walmart selectors
    '[data-testid="hero-image"]', '#main-image', 
    
    // Target selectors
    '[data-test="product-image"]', '[data-test="image"]',
    
    // Newegg selectors
    '.product-view-img-original', '.mainSlide img',
    
    // eBay selectors
    '#icImg', '.ux-image-carousel-item img',
    
    // Etsy selectors
    '.listing-page-image', '.carousel-image',
    
    // Generic selectors
    '.product-image', '.product-image img', '.product-photo', '.product-hero-image'
  ];
  
  let largestImageUrl = null;
  let largestArea = 0;
  
  // Try each selector
  for (const selector of imageSelectors) {
    const image = document.querySelector(selector);
    if (image && image.src) {
      log(`Found image with selector ${selector}`, 'debug');
      return image.src;
    }
  }
  
  // If no specific selector found, find largest image on page that's likely a product image
  const images = document.querySelectorAll('img');
  if (images.length > 0) {
    for (const img of Array.from(images)) {
      // Skip tiny images and icons
      if (!img.src || img.width < 100 || img.height < 100) continue;
      
      const area = img.width * img.height;
      if (area > largestArea) {
        largestArea = area;
        largestImageUrl = img.src;
      }
    }
  }
  
  if (largestImageUrl) {
    log(`Found largest image on page (${largestArea} pixels squared)`, 'debug');
  } else {
    log('No suitable product images found', 'warning');
  }
  
  return largestImageUrl;
};

// Extract product information from structured data
const extractStructuredData = () => {
  log('Examining structured data (JSON-LD)', 'debug');
  const structuredDataElements = document.querySelectorAll('script[type="application/ld+json"]');
  
  if (structuredDataElements.length === 0) {
    log('No structured data found', 'debug');
    return null;
  }
  
  log(`Found ${structuredDataElements.length} structured data blocks`, 'debug');
  
  for (const element of Array.from(structuredDataElements)) {
    try {
      const data = JSON.parse(element.textContent || '');
      
      // Handle single product schema
      if (data['@type'] === 'Product' && data.name) {
        log(`Found product in structured data with @type=Product: ${data.name}`, 'success');
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
          log(`Found product in breadcrumb: ${lastItem.item.name}`, 'success');
          return {
            title: lastItem.item.name,
            image: null
          };
        }
      }
      
      // Handle array of schemas
      if (Array.isArray(data['@graph'])) {
        log('Examining @graph array in structured data', 'debug');
        for (const item of data['@graph']) {
          if (item['@type'] === 'Product' && item.name) {
            log(`Found product in structured data @graph: ${item.name}`, 'success');
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
        log(`Found product-like schema with name+offers/price: ${data.name}`, 'success');
        return {
          title: data.name,
          image: typeof data.image === 'string' ? data.image : 
                 Array.isArray(data.image) ? data.image[0] : null
        };
      }
    } catch (e) {
      log(`Error parsing structured data: ${e}`, 'error');
    }
  }
  
  return null;
};

// Extract product title from meta tags
const extractFromMetaTags = () => {
  log('Examining meta tags', 'debug');
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
        log(`Found product in meta tag ${selector}: ${content}`, 'success');
        return content;
      } else if (content.includes(' - ') || content.includes(' | ')) {
        // Try to extract product name from title with separator
        const parts = content.split(/\s[-|]\s/);
        if (parts[0] && parts[0].length > 5) {
          log(`Found product in meta tag ${selector} (after splitting): ${parts[0].trim()}`, 'success');
          return parts[0].trim();
        }
      }
    }
  }
  
  log('No suitable meta tags found', 'debug');
  return null;
};

// Extract product title from common selectors used across e-commerce sites
const extractFromCommonSelectors = () => {
  log('Examining DOM for common product title selectors', 'debug');
  
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
    'h1[data-test="product-title"]', 'span[data-test="product-title"]',
    
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
        log(`Found product using selector ${selector}: ${text}`, 'success');
        return { title: text, selector };
      }
    }
  }
  
  // If no matches from specific selectors, try generic h1 elements
  log('No specific selectors matched, checking generic h1 elements', 'debug');
  const h1Elements = document.querySelectorAll('h1');
  if (h1Elements.length > 0) {
    log(`Found ${h1Elements.length} h1 elements`, 'debug');
    for (const h1 of Array.from(h1Elements)) {
      if (h1.textContent) {
        const text = h1.textContent.trim();
        
        // Check if this h1 looks like a product title
        if (text.length > 10 && text.length < 200 && 
            !text.includes('Shopping Cart') && 
            !text.includes('Checkout') &&
            !text.includes('Login') &&
            !text.includes('Sign in')) {
          log(`Found product in generic h1: ${text}`, 'success');
          return { title: text, selector: 'h1' };
        }
      }
    }
  }
  
  log('No suitable selectors or h1 elements found', 'debug');
  return null;
};

// Extract product name from page title as a last resort
const extractFromPageTitle = () => {
  const pageTitle = document.title;
  
  if (!pageTitle || pageTitle.length < 5) {
    return null;
  }
  
  log(`Examining page title: ${pageTitle}`, 'debug');
  
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
      log(`Found separator '${separator}' - extracted: ${cleanTitle}`, 'debug');
      break;
    }
  }
  
  // Remove common site suffixes
  for (const suffix of siteSuffixes) {
    if (cleanTitle.endsWith(suffix)) {
      cleanTitle = cleanTitle.substring(0, cleanTitle.length - suffix.length).trim();
      log(`Removed suffix '${suffix}' from end - result: ${cleanTitle}`, 'debug');
    }
    if (cleanTitle.startsWith(suffix)) {
      cleanTitle = cleanTitle.substring(suffix.length).trim();
      log(`Removed suffix '${suffix}' from start - result: ${cleanTitle}`, 'debug');
    }
  }
  
  // Remove pricing patterns often found in titles
  cleanTitle = cleanTitle.replace(/\$\d+(\.\d+)?/, '').trim();
  cleanTitle = cleanTitle.replace(/\(\d+% Off\)/i, '').trim();
  
  // If after cleaning we still have a reasonable length title, return it
  if (cleanTitle.length > 5 && cleanTitle.length < 200) {
    log(`Extracted final title from page title: ${cleanTitle}`, 'success');
    return cleanTitle;
  }
  
  log('Unable to extract meaningful title from page title', 'debug');
  return null;
};

// Main detection function
const detectProduct = () => {
  log('Starting product detection', 'highlight');
  
  // Track detection method for debugging
  let detectionMethod = '';
  let detectionSelector = '';
  let detectionDetails = '';

  // First try our specialized site-specific detectors
  let title = null;
  let imageUrl = null;
  let debugInfo = {};
  
  try {
    // Step 1: Try to extract product information from the page's structured data first (most reliable)
    log('Trying structured data detection', 'debug');
    const structuredData = extractStructuredData();
    if (structuredData && structuredData.title) {
      title = structuredData.title;
      imageUrl = structuredData.image || null;
      detectionMethod = 'structured_data';
      detectionDetails = 'Product extracted from structured data using JSON-LD';
      log(`Found product in structured data: ${title}`, 'success');
    }
    
    // Step 2: If no structured data, try meta tags
    if (!title) {
      log('Trying meta tag detection', 'debug');
      const metaTitle = extractFromMetaTags();
      if (metaTitle) {
        title = metaTitle;
        detectionMethod = 'meta_tags';
        detectionDetails = 'Product extracted from meta tags in the page head';
        log(`Found product in meta tags: ${title}`, 'success');
        
        // Since we found the title in meta tags, let's also look for image in meta tags
        if (!imageUrl) {
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
              imageUrl = metaElement.getAttribute('content');
              log(`Found image in meta tag: ${selector}`, 'debug');
              break;
            }
          }
        }
      }
    }
    
    // Step 3: If still no title, try common selectors
    if (!title) {
      log('Trying common selector detection', 'debug');
      const result = extractFromCommonSelectors();
      if (result) {
        title = result.title;
        detectionMethod = 'common_selectors';
        detectionSelector = result.selector;
        detectionDetails = `Product title found in DOM using selector: ${result.selector}`;
        log(`Found product using common selector ${result.selector}: ${title}`, 'success');
        
        // If we found title from a selector, look for nearby images
        if (!imageUrl) {
          try {
            const element = document.querySelector(result.selector);
            if (element) {
              // Look for nearby images (parent containers, siblings, etc.)
              const parent = element.parentElement;
              if (parent) {
                const nearbyImgs = parent.querySelectorAll('img');
                if (nearbyImgs.length > 0) {
                  // Find the largest nearby image
                  let largestArea = 0;
                  for (const img of Array.from(nearbyImgs)) {
                    const area = img.naturalWidth * img.naturalHeight;
                    if (area > largestArea && img.src) {
                      largestArea = area;
                      imageUrl = img.src;
                    }
                  }
                  if (imageUrl) {
                    log(`Found nearby image with area ${largestArea}px²`, 'debug');
                  }
                }
              }
            }
          } catch (e) {
            log(`Error looking for related images: ${e}`, 'error');
          }
        }
      }
    }
    
    // Step 4: If still no title, try page title as last resort
    if (!title) {
      log('Trying page title detection', 'debug');
      const pageTitleResult = extractFromPageTitle();
      if (pageTitleResult) {
        title = pageTitleResult;
        detectionMethod = 'page_title';
        detectionDetails = 'Product extracted from page title with cleaning';
        log(`Extracted product from page title: ${title}`, 'success');
      }
    }
    
    // Step 5: If we have a title but no image, try general image detection
    if (title && !imageUrl) {
      imageUrl = detectProductImage();
    }
    
    // Step 6: Clean up and post-process the title
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
      
      log(`Final title after cleanup: ${title}`, 'highlight');
    }
  } catch (error) {
    log(`Error during product detection: ${error}`, 'error');
    detectionDetails = `Error: ${error.message}`;
  }
  
  // Get source name and current URL
  const source = detectSourceName();
  const url = window.location.href;

  if (title) {
    // Return the detected product with debug information
    debugInfo = {
      method: detectionMethod,
      selector: detectionSelector,
      details: detectionDetails || `Detected on ${window.location.hostname} at ${new Date().toISOString()}`
    };
    
    log(`Successfully detected product: "${title}" via ${detectionMethod}`, 'highlight');
    log(`Source: ${source}`, 'debug');
    
    if (imageUrl) {
      log(`Image detected: ${imageUrl}`, 'debug');
    } else {
      log(`No image detected`, 'warning');
    }
    
    // Create a summary element
    const summaryEl = document.createElement('div');
    summaryEl.style.cssText = `
      margin-top: 15px;
      padding: 10px;
      background: #e6f7ff;
      border-radius: 5px;
      border-left: 4px solid #1890ff;
    `;
    summaryEl.innerHTML = `
      <p style="font-weight: bold; margin: 0 0 5px 0;">Detection Summary</p>
      <p style="margin: 0 0 5px 0;"><b>Product:</b> ${title}</p>
      <p style="margin: 0 0 5px 0;"><b>Source:</b> ${source}</p>
      <p style="margin: 0 0 5px 0;"><b>Method:</b> ${detectionMethod}</p>
      ${imageUrl ? `<p style="margin: 0;"><b>Image:</b> Found ✓</p>` : '<p style="margin: 0;"><b>Image:</b> Not found ✗</p>'}
    `;
    
    const content = document.getElementById('rr-monitor-content');
    if (content) {
      content.appendChild(summaryEl);
    }
    
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
  
  log('No product detected on this page', 'error');
  return null;
};

// Store detection function in the window for the button to call
window.reviewRadarDetection = detectProduct;

// Run detection immediately
detectProduct();