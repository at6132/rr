import { useEffect, useState } from 'react';
import { DetectedProduct } from '../types';

export const useProductDetection = () => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedProduct, setDetectedProduct] = useState<DetectedProduct | null>(null);
  const [error, setError] = useState<string | null>(null);

  const detectProductFromPage = async () => {
    setIsDetecting(true);
    setError(null);

    try {
      // Check if we're in a browser extension environment with access to tabs
      const isExtensionEnv = typeof window !== 'undefined' && 
                             'chrome' in window && 
                             (window as any).chrome.tabs;
                            
      if (isExtensionEnv) {
        // Cast window.chrome to any to avoid TypeScript errors
        const chrome = (window as any).chrome;
        
        // Request the content script to extract product information
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs: any[]) => {
          if (tabs[0]?.id) {
            chrome.tabs.sendMessage(
              tabs[0].id,
              { action: 'DETECT_PRODUCT' },
              (response: any) => {
                if (chrome.runtime.lastError) {
                  setError('Failed to connect to the page. Please refresh and try again.');
                } else if (response && response.product) {
                  setDetectedProduct(response.product);
                } else {
                  setError('No product detected on this page.');
                }
                setIsDetecting(false);
              }
            );
          }
        });
      } else {
        // For development outside extension - simulate different e-commerce platforms
        // Generate a random number between 0 and 4
        const randomPlatform = Math.floor(Math.random() * 5);
        
        let mockProduct: DetectedProduct;
        
        // Select a mock product based on the random number
        switch (randomPlatform) {
          case 0:
            // Amazon product
            mockProduct = {
              title: "Sony WH-1000XM4 Wireless Noise Canceling Headphones",
              url: "https://www.amazon.com/Sony-WH-1000XM4-Canceling-Headphones-phone-call/dp/B0863TXGM3",
              source: "Amazon.com",
              imageUrl: "https://m.media-amazon.com/images/I/71o8Q5XJS5L._AC_SL1500_.jpg"
            };
            break;
          case 1:
            // Walmart product
            mockProduct = {
              title: "Apple AirPods Pro (2nd Generation) Wireless Earbuds",
              url: "https://www.walmart.com/ip/Apple-AirPods-Pro-2nd-Generation-Wireless-Earbuds-with-MagSafe-Case-USB-C/2629576100",
              source: "Walmart.com",
              imageUrl: "https://i5.walmartimages.com/seo/Apple-AirPods-Pro-2nd-Generation-Wireless-Earbuds-with-MagSafe-Case-USB-C_4b56e80d-6fc8-44b3-96f9-62c12f95f35e.04ffa6db39c9fd2347888ddad3c8ef97.jpeg"
            };
            break;
          case 2:
            // Best Buy product
            mockProduct = {
              title: "Samsung - 65 Class S90C OLED 4K Smart TV",
              url: "https://www.bestbuy.com/site/samsung-65-class-s90c-oled-4k-uhd-smart-tizen-tv/6536927.p",
              source: "BestBuy.com",
              imageUrl: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6536/6536927_sd.jpg"
            };
            break;
          case 3:
            // Target product
            mockProduct = {
              title: "Dyson V8 Origin+ Cordless Vacuum",
              url: "https://www.target.com/p/dyson-v8-origin-cordless-vacuum/-/A-85307058",
              source: "Target.com",
              imageUrl: "https://target.scene7.com/is/image/Target/GUEST_1962ef96-06da-4cb5-8b28-5f84848359aa"
            };
            break;
          case 4:
            // eBay product
            mockProduct = {
              title: "Nintendo Switch OLED Model with White Joy-Con",
              url: "https://www.ebay.com/itm/185816888235",
              source: "eBay.com",
              imageUrl: "https://i.ebayimg.com/images/g/QgMAAOSwIhdkIxfk/s-l1600.jpg"
            };
            break;
          default:
            // Default to Amazon as fallback
            mockProduct = {
              title: "Sony WH-1000XM4 Wireless Noise Canceling Headphones",
              url: "https://www.amazon.com/Sony-WH-1000XM4-Canceling-Headphones-phone-call/dp/B0863TXGM3",
              source: "Amazon.com",
              imageUrl: "https://m.media-amazon.com/images/I/71o8Q5XJS5L._AC_SL1500_.jpg"
            };
        }
        
        setDetectedProduct(mockProduct);
        setIsDetecting(false);
      }
    } catch (err) {
      setError('An error occurred while detecting the product');
      setIsDetecting(false);
    }
  };

  // Automatically detect product when mounted
  useEffect(() => {
    detectProductFromPage();
  }, []);

  return {
    isDetecting,
    detectedProduct,
    error,
    detectProductFromPage
  };
};
