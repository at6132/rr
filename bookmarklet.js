/**
 * ReviewRadar Detection Bookmarklet
 * 
 * This file creates a bookmarklet that can be added to browser bookmarks
 * and clicked on any product page to test the detection.
 * 
 * To use:
 * 1. Create a new bookmark in your browser
 * 2. Set the name to "ReviewRadar Test"
 * 3. Copy the entire bookmarklet code (the javascript:... line) into the URL field
 * 4. Visit any product page and click the bookmark
 */

// Create the bookmarklet code
function createBookmarklet() {
  // First, minify the content-script-monitor.js
  fetch('content-script-monitor.js')
    .then(response => response.text())
    .then(code => {
      // Basic minification (remove comments and excess whitespace)
      const minified = code
        .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '') // Remove comments
        .replace(/\s{2,}/g, ' ')                // Collapse multiple spaces
        .replace(/\n/g, '')                     // Remove newlines
        .trim();
      
      // Create the bookmarklet
      const bookmarklet = `javascript:(function(){${minified}})();`;
      
      // Display the bookmarklet
      document.getElementById('bookmarklet-code').textContent = bookmarklet;
      document.getElementById('bookmarklet-link').href = bookmarklet;
    })
    .catch(error => {
      console.error('Error creating bookmarklet:', error);
      document.getElementById('error').textContent = `Error: ${error.message}`;
    });
}

// Create HTML output for the user
document.body.innerHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ReviewRadar Detection Bookmarklet</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    h1, h2 {
      color: #3a86ff;
    }
    .bookmarklet-container {
      margin: 20px 0;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 5px;
      border-left: 5px solid #3a86ff;
    }
    .bookmarklet {
      display: inline-block;
      padding: 10px 15px;
      background: #3a86ff;
      color: white;
      text-decoration: none;
      border-radius: 4px;
      font-weight: bold;
      margin: 10px 0;
    }
    .bookmarklet:hover {
      background: #2a75ff;
    }
    pre {
      background: #f5f5f5;
      padding: 10px;
      border-radius: 4px;
      overflow-x: auto;
      margin: 10px 0;
    }
    .instructions {
      margin-top: 20px;
      padding: 15px;
      background: #e6f7ff;
      border-radius: 5px;
    }
    .instructions ol {
      margin-left: 20px;
      padding-left: 0;
    }
    #error {
      color: red;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <h1>ReviewRadar Detection Bookmarklet</h1>
  
  <p>This bookmarklet allows you to test the ReviewRadar product detection on any e-commerce site by clicking it while on a product page.</p>
  
  <div class="bookmarklet-container">
    <p>Drag this link to your bookmarks bar:</p>
    <a id="bookmarklet-link" class="bookmarklet" href="#">ReviewRadar Test</a>
    <p>Or copy the code below and create a bookmark manually:</p>
    <pre id="bookmarklet-code">Generating bookmarklet code...</pre>
    <p id="error"></p>
  </div>
  
  <div class="instructions">
    <h2>How to Use</h2>
    <ol>
      <li>Add the bookmarklet to your browser by dragging the link above to your bookmarks bar or manually creating a bookmark with the code.</li>
      <li>Visit any product page on Amazon, Best Buy, Walmart, Target, Newegg, eBay, etc.</li>
      <li>Click the "ReviewRadar Test" bookmark.</li>
      <li>A floating panel will appear showing the detection results.</li>
      <li>You can click "Run Detection" again to retry or "Clear Logs" to reset the panel.</li>
      <li>Click the X to close the panel when done.</li>
    </ol>
    
    <h2>What It Tests</h2>
    <p>The bookmarklet tests the detection methods used in the ReviewRadar extension:</p>
    <ul>
      <li>Structured data (JSON-LD) extraction</li>
      <li>Meta tag extraction</li>
      <li>Common selectors specific to e-commerce sites</li>
      <li>Generic heading extraction</li>
      <li>Page title extraction</li>
      <li>Product image detection</li>
    </ul>
  </div>
</body>
</html>
`;

// Execute the bookmarklet creation
createBookmarklet();