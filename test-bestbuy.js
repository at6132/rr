import axios from 'axios';

const url = 'https://www.bestbuy.com/site/lenovo-yoga-7i-2-in-1-16-2k-touchscreen-laptop-intel-core-ultra-7-155u-with-16gb-memory-1tb-ssd-storm-grey/6571369.p?skuId=6571369';

console.log(`Testing product detection for URL: ${url}`);

async function testUrl() {
  try {
    const response = await axios.post('http://localhost:5000/api/analyze', {
      url: url
    });
    
    console.log('Response status:', response.status);
    
    const data = response.data;
    
    console.log('\n===== PRODUCT DETECTION RESULTS =====');
    console.log(`Is Product: ${data.isProduct}`);
    console.log(`Product Title: ${data.product.title}`);
    console.log(`Product Source: ${data.product.source}`);
    
    // Log more details
    if (data.isProduct) {
      console.log('\n===== PLATFORM RATINGS =====');
      if (data.aggregatedScore && data.aggregatedScore.platformBreakdown) {
        data.aggregatedScore.platformBreakdown.forEach(platform => {
          console.log(`${platform.platform}: ${platform.rating.toFixed(1)} (${platform.reviewCount} reviews)`);
        });
      } else {
        console.log('No platform ratings available');
      }
    }
    
  } catch (error) {
    console.error('Error during API call:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testUrl();