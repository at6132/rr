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
        // For development outside extension
        const mockProduct: DetectedProduct = {
          title: "Sony WH-1000XM4 Wireless Noise Canceling Headphones",
          url: "https://www.amazon.com/Sony-WH-1000XM4-Canceling-Headphones-phone-call/dp/B0863TXGM3",
          source: "Amazon.com",
        };
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
