// Test product detection functionality
import axios from 'axios';
import cheerio from 'cheerio';

async function testProductDetection(url) {
  console.log(`Testing product detection for URL: ${url}`);
  
  try {
    // Fetch the page content
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      }
    });
    
    const html = response.data;
    const $ = cheerio.load(html);
    
    // Extract product information using a simplified version of our content script strategies
    const extractFromStructuredData = () => {
      const results = [];
      
      $('script[type="application/ld+json"]').each((i, elem) => {
        try {
          const data = JSON.parse($(elem).html() || '');
          
          if (data['@type'] === 'Product' && data.name) {
            results.push({
              method: 'structured_data',
              title: data.name,
              image: typeof data.image === 'string' ? data.image : 
                     Array.isArray(data.image) ? data.image[0] : null
            });
          }
          
          if (Array.isArray(data['@graph'])) {
            data['@graph'].forEach(item => {
              if (item['@type'] === 'Product' && item.name) {
                results.push({
                  method: 'structured_data_graph',
                  title: item.name,
                  image: typeof item.image === 'string' ? item.image : 
                         Array.isArray(item.image) ? item.image[0] : null
                });
              }
            });
          }
        } catch (e) {
          // Ignore parsing errors
        }
      });
      
      return results;
    };
    
    const extractFromMetaTags = () => {
      const results = [];
      
      const metaTitleTags = [
        'meta[property="og:title"]',
        'meta[name="twitter:title"]',
        'meta[name="title"]',
        'meta[property="product:title"]',
        'meta[itemprop="name"]'
      ];
      
      metaTitleTags.forEach(selector => {
        const metaElement = $(selector);
        if (metaElement.length && metaElement.attr('content')) {
          results.push({
            method: 'meta_tag',
            selector,
            title: metaElement.attr('content')?.trim()
          });
        }
      });
      
      return results;
    };
    
    const extractFromHeadings = () => {
      const results = [];
      
      const selectors = [
        'h1.product-title', 'h1.product-name', 'h1.product_title', '#productTitle', 
        '.product-title h1', '.product-name h1', '.product_title h1',
        '[data-testid="product-title"]', '[data-automation="product-title"]',
        '.title[itemprop="name"]', '[itemprop="name"]',
        
        // BestBuy selectors 
        'h1.heading-5', '.sku-title h1', '.shop-product-title h1',
        '[data-track="product-title"]', '.heading-5.v-fw-regular',
        '[data-testid="heading-product-title"]'
      ];
      
      selectors.forEach(selector => {
        const element = $(selector);
        if (element.length && element.text()) {
          const text = element.text().trim();
          if (text.length > 5 && text.length < 250) {
            results.push({
              method: 'common_selector',
              selector,
              title: text
            });
          }
        }
      });
      
      // Generic h1 elements
      $('h1').each((i, el) => {
        const text = $(el).text().trim();
        if (text.length > 10 && text.length < 200) {
          results.push({
            method: 'h1_element',
            selector: `h1:nth-child(${i+1})`,
            title: text
          });
        }
      });
      
      return results;
    };
    
    // Collect all detected products
    const structuredDataResults = extractFromStructuredData();
    const metaTagResults = extractFromMetaTags();
    const headingResults = extractFromHeadings();
    const pageTitle = $('title').text();
    
    // Determine the best product title
    let bestTitle = null;
    let detectionMethod = null;
    
    if (structuredDataResults.length > 0) {
      bestTitle = structuredDataResults[0].title;
      detectionMethod = structuredDataResults[0].method;
    } else if (metaTagResults.length > 0) {
      bestTitle = metaTagResults[0].title;
      detectionMethod = metaTagResults[0].method;
    } else if (headingResults.length > 0) {
      bestTitle = headingResults[0].title;
      detectionMethod = headingResults[0].method;
    }
    
    // Extract hostname for source name
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace(/^www\./, '');
    const source = hostname.split('.')[0];
    const sourceName = source.charAt(0).toUpperCase() + source.slice(1) + '.com';
    
    // Create a simplified product object
    const product = bestTitle ? {
      title: bestTitle,
      url,
      source: sourceName
    } : null;
    
    // Output the results
    console.log('\n================================');
    console.log('PRODUCT DETECTION RESULTS');
    console.log('================================\n');
    
    if (product) {
      console.log('DETECTED PRODUCT:');
      console.log(`Title: ${product.title}`);
      console.log(`Source: ${product.source}`);
      console.log(`Detection Method: ${detectionMethod}`);
    } else {
      console.log('NO PRODUCT DETECTED');
    }
    
    console.log('\nPAGE TITLE:');
    console.log(pageTitle);
    
    console.log('\nSTRUCTURED DATA RESULTS:');
    if (structuredDataResults.length > 0) {
      structuredDataResults.forEach((result, i) => {
        console.log(`  ${i+1}. ${result.title} (${result.method})`);
      });
    } else {
      console.log('  None found');
    }
    
    console.log('\nMETA TAG RESULTS:');
    if (metaTagResults.length > 0) {
      metaTagResults.forEach((result, i) => {
        console.log(`  ${i+1}. ${result.title} (${result.selector})`);
      });
    } else {
      console.log('  None found');
    }
    
    console.log('\nHEADING RESULTS:');
    if (headingResults.length > 0) {
      headingResults.forEach((result, i) => {
        console.log(`  ${i+1}. ${result.title} (${result.selector || 'h1'})`);
      });
    } else {
      console.log('  None found');
    }
    
    console.log('\n================================\n');
    
  } catch (error) {
    console.error(`Error testing product detection: ${error.message}`);
  }
}

// Check if URL was provided as command line argument
const url = process.argv[2];
if (!url) {
  console.log('Please provide a URL to test');
  console.log('Usage: node test-detection.js <url>');
  process.exit(1);
}

// Run the test
testProductDetection(url);

// Fix top-level await in ES modules
export {};