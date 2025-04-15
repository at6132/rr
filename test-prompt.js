/**
 * Test script to verify OpenAI prompt handling for product detection
 * This script directly invokes our comprehensive analysis service
 */

import { comprehensiveAnalysisService } from './server/services/comprehensive-analysis-service.js';
import fs from 'fs';

async function testPrompt(url) {
  console.log(`Testing product detection for URL: ${url}`);
  
  try {
    // Call the comprehensive analysis service directly
    const result = await comprehensiveAnalysisService.analyzeProductUrl(url);
    
    // Log key information about the result
    console.log('\n===== PRODUCT DETECTION RESULTS =====');
    console.log(`Is Product: ${result.isProduct}`);
    console.log(`Product Title: ${result.product.title}`);
    console.log(`Product Source: ${result.product.source}`);
    
    // Log summary info if it's a product
    if (result.isProduct) {
      console.log('\n===== SUMMARY =====');
      console.log(`Positive: ${result.summary.positivePercentage}%`);
      console.log(`Neutral: ${result.summary.neutralPercentage}%`);
      console.log(`Negative: ${result.summary.negativePercentage}%`);
      console.log(`Review Count: ${result.summary.reviewCount}`);
      console.log(`Pros: ${result.summary.pros.join(', ')}`);
      console.log(`Cons: ${result.summary.cons.join(', ')}`);
      
      if (result.aggregatedScore) {
        console.log('\n===== AGGREGATED SCORE =====');
        console.log(`Overall Score: ${result.aggregatedScore.overallScore.toFixed(1)}`);
        console.log(`Total Reviews: ${result.aggregatedScore.totalReviewCount}`);
        console.log(`Confidence: ${result.aggregatedScore.confidenceScore.toFixed(2)}`);
        
        console.log('\n===== PLATFORM BREAKDOWN =====');
        result.aggregatedScore.platformBreakdown.forEach(platform => {
          console.log(`${platform.platform}: ${platform.rating.toFixed(1)} (${platform.reviewCount} reviews)`);
        });
      }
    }
    
    console.log('\nFull result available in result.json');
    fs.writeFileSync('result.json', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('Error during testing:', error);
  }
}

// Test the URL provided
const testUrl = process.argv[2] || 'https://www.bestbuy.com/site/lenovo-yoga-7i-2-in-1-16-2k-touchscreen-laptop-intel-core-ultra-7-155u-with-16gb-memory-1tb-ssd-storm-grey/6571369.p?skuId=6571369';
testPrompt(testUrl);