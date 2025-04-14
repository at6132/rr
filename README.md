# ReviewRadar: AI-Powered Product Review Assistant

ReviewRadar is a Chrome extension that provides comprehensive product review analysis by aggregating data from multiple sources and generating AI-powered insights to help users make informed purchase decisions.

## Features

- **Real-time Product Detection**: Automatically detects products on supported e-commerce websites
- **Cross-Platform Review Aggregation**: Collects and analyzes reviews from multiple sources
- **Verified Rating System**: Shows verified product ratings with weighted scoring
- **AI-Powered Summaries**: Provides concise pros and cons lists and sentiment analysis
- **Video Reviews**: Displays relevant YouTube product reviews
- **Reddit Highlights**: Shows discussions from Reddit about the product
- **Blog Reviews**: Collects expert opinions from trusted review sites
- **Interactive AI Chat**: Ask specific questions about the product

## Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Shadcn UI
- **Backend**: Node.js, Express
- **AI & ML**: OpenAI API (GPT models)
- **Data Sources**: YouTube API, Reddit data, Web search

## Development Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Configure environment variables:
   - Create a `.env` file with the following:
   ```
   OPENAI_API_KEY=your_openai_api_key
   YOUTUBE_API_KEY=your_youtube_api_key
   ```

3. Start the development server:
   
   **For Mac/Linux:**
   ```
   npm run dev
   ```
   
   **For Windows:**
   Use the provided batch file which handles environment variables correctly:
   ```
   start-server.bat
   ```
   
   Alternatively, for running on a different port (e.g., 3000):
   ```
   start-server-alt-port.bat
   ```
   
   These batch files include automatic dependency checks and proper environment variable handling for Windows systems.

## Building the Extension

1. Build the extension:
   ```
   npm run build
   ```

2. Load the unpacked extension from the `dist` folder into Chrome Extensions

## Project Structure

- `client/`: Frontend React application and extension code
- `server/`: Backend Express server for API endpoints
- `shared/`: Shared type definitions and utilities
- `attached_assets/`: Logo and other media assets

## License

MIT