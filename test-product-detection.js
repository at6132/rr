// Test script for product detection
import axios from 'axios';

// Sample e-commerce site URLs to test
const TEST_URLS = [
  // Amazon
  'https://www.amazon.com/Sony-WH-1000XM4-Canceling-Headphones-phone-call/dp/B0863TXGM3/',
  
  // BestBuy
  'https://www.bestbuy.com/site/apple-airpods-max-silver/6373460.p?skuId=6373460',
  
  // Walmart
  'https://www.walmart.com/ip/PlayStation-5-Console-Marvel-s-Spider-Man-2-Bundle/3092844893',
  
  // Target
  'https://www.target.com/p/nintendo-switch-oled-model-with-white-joy-con/-/A-84797997',
  
  // Newegg
  'https://www.newegg.com/black-asus-tuf-gaming-f15-fx506hf-ss51-gaming/p/N82E16834236197',
];

/**
 * Test the product detection API for a single URL
 */
async function testUrl(url) {
  console.log(`Testing URL: ${url}`);
  
  try {
    // Use our API endpoint for detection
    const encodedUrl = encodeURIComponent(url);
    const response = await axios.get(`http://localhost:5000/api/test-detection?url=${encodedUrl}`);
    
    const { data } = response;
    
    console.log('\n------------------------------------------');
    console.log('DETECTION RESULTS');
    console.log('------------------------------------------');
    
    // Product information
    if (data.product) {
      console.log(`✅ Product Detected: "${data.product.title}"`);
      console.log(`   Source: ${data.product.source}`);
      console.log(`   Method: ${data.detectionMethod}`);
    } else {
      console.log('❌ No product detected');
    }
    
    // Detection methods
    console.log('\nDetection Methods:');
    
    const structuredResults = data.detectionResults?.structuredData || [];
    console.log(`   Structured Data: ${structuredResults.length > 0 ? '✅' : '❌'} (${structuredResults.length} results)`);
    
    const metaResults = data.detectionResults?.metaTags || [];
    console.log(`   Meta Tags: ${metaResults.length > 0 ? '✅' : '❌'} (${metaResults.length} results)`);
    
    const headingResults = data.detectionResults?.headings || [];
    console.log(`   Headings: ${headingResults.length > 0 ? '✅' : '❌'} (${headingResults.length} results)`);
    
    console.log('------------------------------------------\n');
    
    return !!data.product; // Return true if product was detected
  } catch (error) {
    console.error(`Error testing ${url}:`);
    if (error.response) {
      console.error(`  Status: ${error.response.status}`);
      console.error(`  Message: ${error.response.data.message || 'Unknown error'}`);
    } else if (error.request) {
      console.error('  No response received from server');
    } else {
      console.error(`  Error: ${error.message}`);
    }
    console.log('------------------------------------------\n');
    return false;
  }
}

/**
 * Run tests on all URLs and summarize results
 */
async function runTests() {
  console.log('Starting product detection tests...\n');
  
  const results = [];
  
  // Test each URL
  for (const url of TEST_URLS) {
    const success = await testUrl(url);
    results.push({ url, success });
  }
  
  // Print summary
  console.log('\n===========================================');
  console.log('TEST SUMMARY');
  console.log('===========================================');
  
  const successful = results.filter(r => r.success).length;
  console.log(`Total URLs: ${TEST_URLS.length}`);
  console.log(`Successful detections: ${successful}`);
  console.log(`Success rate: ${(successful / TEST_URLS.length * 100).toFixed(1)}%`);
  
  if (successful < TEST_URLS.length) {
    console.log('\nFailed URLs:');
    results.filter(r => !r.success).forEach((result, i) => {
      console.log(`  ${i+1}. ${result.url}`);
    });
  }
  
  console.log('===========================================');
}

runTests();