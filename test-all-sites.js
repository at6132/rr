/**
 * Test script to validate product detection across multiple e-commerce sites
 * 
 * This script tests both the server-side API endpoint and content-script detection methods
 * to verify we can detect products from all major e-commerce platforms.
 * 
 * Usage: 
 * node test-all-sites.js
 */

import axios from 'axios';
import chalk from 'chalk';

// List of test URLs to validate product detection
const TEST_URLS = [
  // Amazon
  'https://www.amazon.com/Apple-MacBook-16-inch-10%E2%80%91core-16%E2%80%91core/dp/B0CHX2K9J4/',
  'https://www.amazon.com/Sony-WH-1000XM5-Canceling-Headphones-Hands-Free/dp/B09XS7JWHH/',
  
  // Best Buy
  'https://www.bestbuy.com/site/apple-airpods-pro-2nd-generation-white/4900964.p',
  'https://www.bestbuy.com/site/sony-playstation-5-slim-disc-console/6571398.p',
  
  // Walmart
  'https://www.walmart.com/ip/SAMSUNG-65-Class-Crystal-UHD-4K-Smart-Television-with-HDR-UN65TU690TFXZA/308872503',
  'https://www.walmart.com/ip/Xbox-Series-X-Video-Game-Console-Black/443574645',
  
  // Target
  'https://www.target.com/p/apple-watch-series-9-gps-41mm-midnight-aluminum-case-with-midnight-sport-band-s-m/-/A-88195719',
  'https://www.target.com/p/nintendo-switch-with-neon-blue-and-neon-red-joy-con/-/A-77464001',
  
  // Newegg
  'https://www.newegg.com/corsair-32gb-288-pin-ddr5-sdram/p/N82E16820236865',
  'https://www.newegg.com/asus-geforce-rtx-4070-rog-strix-rtx4070-o12g-gaming/p/N82E16814126633',
  
  // eBay
  'https://www.ebay.com/itm/394487207438',
  
  // Etsy
  'https://www.etsy.com/listing/1025288599/personalized-cutting-board-wedding-gift'
];

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

// Test server endpoint for a single URL
async function testUrl(url) {
  try {
    console.log(`\n${colors.bright}${colors.blue}Testing URL:${colors.reset} ${url}`);
    
    const startTime = Date.now();
    const response = await axios.post('http://localhost:5000/api/test-detection', { url }, {
      timeout: 30000 // Increase timeout for difficult sites
    });
    const duration = Date.now() - startTime;
    
    if (response.data.product) {
      console.log(`${colors.green}✓ DETECTED${colors.reset} (${duration}ms): ${colors.bright}${response.data.product.title}${colors.reset}`);
      console.log(`  Source: ${response.data.product.source}`);
      console.log(`  Method: ${response.data.detectionMethod || 'unknown'}`);
      
      if (response.data.product.imageUrl) {
        console.log(`  Image: ${response.data.product.imageUrl.substring(0, 80)}...`);
      } else {
        console.log(`  ${colors.yellow}No image detected${colors.reset}`);
      }
      
      return {
        url,
        success: true,
        title: response.data.product.title,
        source: response.data.product.source,
        method: response.data.detectionMethod,
        duration
      };
    } else {
      console.log(`${colors.red}✗ FAILED${colors.reset} (${duration}ms): No product detected`);
      
      // Print additional debug info if available
      if (response.data.pageTitle) {
        console.log(`  Page title: ${response.data.pageTitle}`);
      }
      
      // Show detection attempts
      if (response.data.detectionResults) {
        const { structuredData, metaTags, headings } = response.data.detectionResults;
        
        if (structuredData && structuredData.length > 0) {
          console.log(`  Structured data attempts (${structuredData.length}):`);
          structuredData.forEach((item, i) => {
            if (i < 2) console.log(`    - ${item.title?.substring(0, 50)}`);
          });
          if (structuredData.length > 2) console.log(`    ... and ${structuredData.length - 2} more`);
        }
        
        if (metaTags && metaTags.length > 0) {
          console.log(`  Meta tag attempts (${metaTags.length}):`);
          metaTags.forEach((item, i) => {
            if (i < 2) console.log(`    - ${item.title?.substring(0, 50)}`);
          });
          if (metaTags.length > 2) console.log(`    ... and ${metaTags.length - 2} more`);
        }
        
        if (headings && headings.length > 0) {
          console.log(`  Heading attempts (${headings.length}):`);
          headings.forEach((item, i) => {
            if (i < 2) console.log(`    - ${item.title?.substring(0, 50)}`);
          });
          if (headings.length > 2) console.log(`    ... and ${headings.length - 2} more`);
        }
      }
      
      return {
        url,
        success: false,
        duration
      };
    }
  } catch (error) {
    console.log(`${colors.red}✗ ERROR${colors.reset}: ${error.message}`);
    
    if (error.response) {
      console.log(`  Status: ${error.response.status}`);
      console.log(`  Details: ${JSON.stringify(error.response.data).substring(0, 100)}`);
    }
    
    return {
      url,
      success: false,
      error: error.message
    };
  }
}

// Run tests on all URLs
async function runTests() {
  console.log(`${colors.bright}${colors.magenta}=== ReviewRadar Product Detection Test ====${colors.reset}`);
  console.log(`Testing ${TEST_URLS.length} URLs...\n`);
  
  const results = [];
  
  for (const url of TEST_URLS) {
    const result = await testUrl(url);
    results.push(result);
  }
  
  // Summarize results
  const successCount = results.filter(r => r.success).length;
  const failCount = results.length - successCount;
  const successRate = Math.round((successCount / results.length) * 100);
  
  console.log(`\n${colors.bright}${colors.magenta}=== Test Summary ====${colors.reset}`);
  console.log(`Total URLs tested: ${results.length}`);
  console.log(`Success: ${colors.green}${successCount}${colors.reset}`);
  console.log(`Failed: ${colors.red}${failCount}${colors.reset}`);
  console.log(`${colors.bright}Success rate: ${successRate}%${colors.reset}`);
  
  // Group by domain
  const domainResults = {};
  
  for (const result of results) {
    const domain = new URL(result.url).hostname.replace('www.', '');
    if (!domainResults[domain]) {
      domainResults[domain] = { total: 0, success: 0 };
    }
    
    domainResults[domain].total += 1;
    if (result.success) {
      domainResults[domain].success += 1;
    }
  }
  
  console.log(`\n${colors.bright}${colors.magenta}=== Results by Domain ====${colors.reset}`);
  for (const [domain, stats] of Object.entries(domainResults)) {
    const rate = Math.round((stats.success / stats.total) * 100);
    const color = rate === 100 ? colors.green : rate >= 50 ? colors.yellow : colors.red;
    console.log(`${domain}: ${color}${stats.success}/${stats.total} (${rate}%)${colors.reset}`);
  }
  
  // Success rate goal
  if (successRate === 100) {
    console.log(`\n${colors.bright}${colors.green}🎉 GOAL ACHIEVED: 100% detection rate! 🎉${colors.reset}`);
  } else {
    console.log(`\n${colors.bright}${colors.yellow}Goal: Achieve 100% detection rate (current: ${successRate}%)${colors.reset}`);
  }
}

// Start the tests
runTests().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});