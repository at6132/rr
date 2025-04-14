/**
 * Global application configuration
 * 
 * Edit this file to switch between development and production environments
 */

type Environment = 'development' | 'production';

// Set the current environment here
const CURRENT_ENV: Environment = 'development';

// Configuration for different environments
const config = {
  development: {
    apiBaseUrl: 'http://localhost:5000',
    debug: true,
  },
  production: {
    // Change this to your production API URL when deploying
    apiBaseUrl: 'https://reviewradar.repl.co',
    debug: false,
  }
};

// Export the current environment's configuration
export default config[CURRENT_ENV];