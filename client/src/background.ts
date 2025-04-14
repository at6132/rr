// Keep track of the active tab
let activeTabId: number | null = null;

// Update active tab when it changes
chrome.tabs.onActivated.addListener((activeInfo) => {
  activeTabId = activeInfo.tabId;
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PRODUCT_DETECTED' && sender.tab && sender.tab.id) {
    // Store the detected product in extension storage
    chrome.storage.local.set({
      [sender.tab.url]: message.product
    });

    // Send product information to popup if it's open
    chrome.runtime.sendMessage(message);
  }
  
  return true; // Keep the message channel open for async responses
});

// Handle command to search with ReviewRadar from context menu
chrome.contextMenus?.create({
  id: "search-with-reviewradar",
  title: "Search with ReviewRadar",
  contexts: ["selection"]
});

chrome.contextMenus?.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "search-with-reviewradar" && info.selectionText && tab?.id) {
    // User selected text and right-clicked to search
    const selectedText = info.selectionText;
    
    // Create product object from selection
    const product = {
      title: selectedText,
      url: tab.url || "",
      source: new URL(tab.url || "").hostname,
    };
    
    // Store in local storage
    if (tab.url) {
      chrome.storage.local.set({
        [tab.url]: product
      });
    }
    
    // Notify the popup if open
    chrome.runtime.sendMessage({
      type: 'PRODUCT_DETECTED',
      product
    });
  }
});

// Open popup when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    // Ask content script to detect product
    chrome.tabs.sendMessage(tab.id, { action: 'DETECT_PRODUCT' });
  }
});
