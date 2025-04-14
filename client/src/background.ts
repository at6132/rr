// Define types for message passing
interface DetectedProductMessage {
  type: 'PRODUCT_DETECTED';
  product: {
    title: string;
    url: string;
    source: string;
    imageUrl?: string;
  };
}

interface DetectProductMessage {
  action: 'DETECT_PRODUCT';
}

type ChromeMessage = DetectedProductMessage | DetectProductMessage;

// For logging and debugging
const DEBUG = false;
const log = (message: string) => {
  if (DEBUG) {
    console.log(`[ReviewRadar Background] ${message}`);
  }
};

// Initialize extension when installed
chrome.runtime.onInstalled.addListener(() => {
  log('Extension installed');
  
  // Create context menu
  chrome.contextMenus.create({
    id: "search-with-reviewradar",
    title: "Search with ReviewRadar",
    contexts: ["selection"]
  });
});

// Keep track of the active tab
let activeTabId: number | null = null;

// Update active tab when it changes
chrome.tabs.onActivated.addListener((activeInfo) => {
  activeTabId = activeInfo.tabId;
  log(`Active tab changed: ${activeTabId}`);
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message: ChromeMessage, sender, sendResponse) => {
  if (message.type === 'PRODUCT_DETECTED' && sender.tab && sender.tab.id) {
    log(`Product detected on tab ${sender.tab.id}: ${message.product.title}`);
    
    // Store the detected product in extension storage
    if (sender.tab.url) {
      chrome.storage.local.set({
        [sender.tab.url]: message.product
      }, () => {
        if (chrome.runtime.lastError) {
          log(`Error storing product: ${chrome.runtime.lastError.message}`);
        } else {
          log(`Product stored for URL: ${sender.tab.url}`);
        }
      });
    }

    // Send product information to popup if it's open
    try {
      chrome.runtime.sendMessage(message);
      log('Product information sent to popup');
    } catch (error) {
      log(`Error sending to popup: ${error}`);
      // Popup might not be open - this is expected
    }
  }
  
  return true; // Keep the message channel open for async responses
});

// Handle command to search with ReviewRadar from context menu
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "search-with-reviewradar" && info.selectionText && tab?.id) {
    log(`Context menu search: ${info.selectionText}`);
    
    // User selected text and right-clicked to search
    const selectedText = info.selectionText.trim();
    
    // Get domain for source name
    let source = "Unknown";
    if (tab.url) {
      try {
        const urlObj = new URL(tab.url);
        // Remove www. prefix if present
        const hostname = urlObj.hostname.replace(/^www\./, '');
        // Get first part of domain and capitalize
        source = hostname.split('.')[0];
        source = source.charAt(0).toUpperCase() + source.slice(1) + '.com';
      } catch (error) {
        log(`Error parsing URL: ${error}`);
      }
    }
    
    // Create product object from selection
    const product = {
      title: selectedText,
      url: tab.url || "",
      source
    };
    
    // Store in local storage
    if (tab.url) {
      chrome.storage.local.set({
        [tab.url]: product
      }, () => {
        if (chrome.runtime.lastError) {
          log(`Error storing product from context menu: ${chrome.runtime.lastError.message}`);
        }
      });
    }
    
    // Open popup and notify about detected product
    chrome.action.setPopup({ tabId: tab.id, popup: "index.html" });
    
    // Notify popup if open
    chrome.runtime.sendMessage({
      type: 'PRODUCT_DETECTED',
      product
    });
    
    // Open popup
    chrome.action.openPopup();
  }
});

// Open popup when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    log(`Extension icon clicked on tab ${tab.id}`);
    
    // Check if we have a stored product for this URL
    if (tab.url) {
      chrome.storage.local.get([tab.url], (result) => {
        if (chrome.runtime.lastError) {
          log(`Error getting product from storage: ${chrome.runtime.lastError.message}`);
        } else if (result[tab.url]) {
          log(`Found stored product for ${tab.url}: ${result[tab.url].title}`);
          // We have a stored product, just open the popup
          chrome.action.setPopup({ tabId: tab.id, popup: "index.html" });
          chrome.action.openPopup();
        } else {
          // No stored product, ask content script to detect
          try {
            chrome.tabs.sendMessage(tab.id, { action: 'DETECT_PRODUCT' });
            log('Product detection requested');
          } catch (error) {
            log(`Error sending detection request: ${error}`);
          }
        }
      });
    }
  }
});
