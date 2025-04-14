// Simulate Chrome extension environment and test the API connectivity
import axios from 'axios';
import config from './client/src/config.js';

async function testAPIConnectivity() {
  try {
    console.log('Testing API connectivity to:', config.default.apiBaseUrl);
    
    // Try to fetch the /api/analyze endpoint which is the main one used by the extension
    const response = await axios.post(`${config.default.apiBaseUrl}/api/analyze`, {
      productInfo: {
        title: 'Test Product',
        url: 'https://example.com/product',
        source: 'test',
        imageUrl: 'https://example.com/image.jpg'
      }
    });
    
    console.log('API Response Status:', response.status);
    console.log('API Response Data:', JSON.stringify(response.data, null, 2));
    
    return true;
  } catch (error) {
    console.error('API Connection Error:', error.message);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', error.response.data);
    }
    return false;
  }
}

// Run the test
testAPIConnectivity();