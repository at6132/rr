// Simple API testing script
import axios from 'axios';

const API_URL = 'http://localhost:5000';

async function testAPI() {
  try {
    console.log('Testing API connectivity to:', API_URL);
    
    // Test a basic API endpoint
    const response = await axios.post(`${API_URL}/api/analyze`, {
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
testAPI();