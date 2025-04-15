import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ProductAnalysis, DetectedProduct } from '../types';
import { useQuery } from '@tanstack/react-query';
import config from '../config';
import { apiRequest } from '../lib/queryClient';

interface ProductContextType {
  productUrl: string | null;
  isLoading: boolean;
  isError: boolean;
  productAnalysis: ProductAnalysis | null;
  setProductUrl: (url: string) => void;
  refreshAnalysis: () => void;
  detectedProduct: DetectedProduct | null;
  setDetectedProduct: (product: DetectedProduct) => void;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

interface ProductProviderProps {
  children: ReactNode;
}

export const ProductProvider: React.FC<ProductProviderProps> = ({ children }) => {
  const [productUrl, setProductUrl] = useState<string | null>(null);
  const [detectedProduct, setDetectedProduct] = useState<DetectedProduct | null>(null);

  // Use the imported config and apiRequest from the top
  
  // Helper function to check if a URL matches known product URL patterns
  const isLikelyProductUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;
      const hostname = urlObj.hostname;

      // Amazon product pattern
      if (hostname.includes('amazon.') && (
        path.includes('/dp/') || 
        path.includes('/gp/product/') || 
        path.includes('/product/')
      )) {
        return true;
      }

      // Best Buy product pattern
      if (hostname.includes('bestbuy.') && path.includes('/site/') && path.includes('/p')) {
        return true;
      }

      // Walmart product pattern
      if (hostname.includes('walmart.') && path.includes('/ip/')) {
        return true;
      }
      
      // Target product pattern
      if (hostname.includes('target.') && path.includes('/p/')) {
        return true;
      }

      // Newegg product pattern
      if (hostname.includes('newegg.') && path.includes('/p/')) {
        return true;
      }

      // General product patterns
      if (
        path.match(/\/p\/[a-zA-Z0-9-]+\/?$/) || // /p/product-id
        path.match(/\/product\/[a-zA-Z0-9-]+\/?$/) || // /product/product-id
        path.match(/\/item\/[a-zA-Z0-9-]+\/?$/) || // /item/item-id
        path.includes('/skuId=') ||
        path.includes('/productId=')
      ) {
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error checking if URL is a product URL:", error);
      return false;
    }
  };
  
  const {
    data: productAnalysis,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['/api/analyze', productUrl],
    queryFn: async () => {
      if (!productUrl) {
        throw new Error('No URL provided');
      }
      
      try {
        // Check if the URL is likely a product page based on pattern matching
        const urlLikelyProduct = isLikelyProductUrl(productUrl);
        console.log(`URL pattern check: ${productUrl} - Likely product: ${urlLikelyProduct}`);
        
        // Use apiRequest to ensure the proper API URL is used from config
        const response = await apiRequest(
          'POST',
          '/api/analyze',
          {
            url: productUrl,
            productInfo: detectedProduct,
          }
        );
        
        const data = await response.json();
        
        // Double-check: If our client-side pattern matching says it's a product but API says no,
        // we'll trust our pattern matching for known e-commerce URLs
        if (!data.isProduct && urlLikelyProduct) {
          console.log('API says not a product, but URL pattern suggests it is. Overriding.');
          data.isProduct = true;
          
          // If product title looks generic ("Product from amazon.com"), try to extract better title
          if (data.product.title.startsWith("Product from") && productUrl) {
            // Extract a descriptive title from the URL if possible
            try {
              const urlObj = new URL(productUrl);
              const path = urlObj.pathname;
              const segments = path.split('/').filter(segment => segment.length > 0);
              
              // For Amazon, we can extract a better title from the URL path
              if (urlObj.hostname.includes('amazon')) {
                // Find segments that aren't 'dp' or product IDs (alphanumeric)
                const titleSegments = segments.filter(segment => 
                  !['dp', 'gp', 'product'].includes(segment) && 
                  !segment.match(/^[A-Z0-9]{10}$/)
                );
                
                if (titleSegments.length > 0) {
                  const extractedTitle = titleSegments[0]
                    .replace(/-/g, ' ')
                    .split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                    .join(' ');
                  
                  if (extractedTitle.length > 5) {
                    data.product.title = extractedTitle;
                  }
                }
              }
            } catch (e) {
              console.error('Error improving generic title:', e);
            }
          }
        }
        
        return data;
      } catch (error) {
        console.error('Error analyzing URL:', error);
        // Return a valid product analysis with isProduct = false to avoid errors
        return {
          isProduct: false,
          product: {
            title: "Error analyzing page",
            source: new URL(productUrl).hostname,
            url: productUrl,
          },
          summary: {
            positivePercentage: 0,
            neutralPercentage: 0,
            negativePercentage: 0,
            reviewCount: 0,
            pros: [],
            cons: [],
            tags: []
          },
          videoReviews: [],
          redditPosts: [],
          blogReviews: [],
          aggregatedScore: null
        };
      }
    },
    enabled: !!productUrl, // Only need the URL, not necessarily a detected product
    gcTime: 1000 * 60 * 10, // Cache for 10 minutes
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    retry: false, // Don't retry failures
  });

  const refreshAnalysis = () => {
    if (productUrl) {
      refetch();
    }
  };

  // Listen for messages from content script in extension context
  useEffect(() => {
    // Check if we're in a browser extension environment
    const isExtensionEnv = typeof window !== 'undefined' && 
                          'chrome' in window && 
                          (window as any).chrome.runtime && 
                          (window as any).chrome.runtime.onMessage;
    
    if (isExtensionEnv) {
      // Cast window.chrome to any to avoid TypeScript errors
      const chrome = (window as any).chrome;
      
      // Get the current tab URL and analyze immediately when extension opens
      const getCurrentTabAndAnalyze = async () => {
        try {
          // Query for the active tab in the current window
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          
          if (tabs && tabs.length > 0 && tabs[0].url) {
            const currentUrl = tabs[0].url;
            console.log('Extension opened, automatically analyzing URL:', currentUrl);
            
            // Create a basic product object with just the URL
            const basicProduct = {
              title: "Product from " + new URL(currentUrl).hostname,
              url: currentUrl,
              source: new URL(currentUrl).hostname,
            };
            
            // Set the detected product and URL
            setDetectedProduct(basicProduct);
            setProductUrl(currentUrl);
          }
        } catch (error) {
          console.error('Error getting current tab:', error);
        }
      };
      
      // Run this immediately when the extension is opened
      getCurrentTabAndAnalyze();
      
      // Also continue to listen for message-based product detection
      const listener = (message: any) => {
        if (message.type === 'PRODUCT_DETECTED') {
          setDetectedProduct(message.product);
          setProductUrl(message.product.url);
        }
      };
      
      // Add the listener
      chrome.runtime.onMessage.addListener(listener);
      
      // Return cleanup function
      return () => {
        chrome.runtime.onMessage.removeListener(listener);
      };
    }
    
    return undefined;
  }, []);

  return (
    <ProductContext.Provider
      value={{
        productUrl,
        isLoading,
        isError,
        productAnalysis: productAnalysis || null,
        setProductUrl,
        refreshAnalysis,
        detectedProduct,
        setDetectedProduct,
      }}
    >
      {children}
    </ProductContext.Provider>
  );
};

export const useProduct = (): ProductContextType => {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error('useProduct must be used within a ProductProvider');
  }
  return context;
};
