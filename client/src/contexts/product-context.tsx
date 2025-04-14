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
  
  const {
    data: productAnalysis,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['/api/analyze', productUrl],
    queryFn: async () => {
      if (!detectedProduct) {
        throw new Error('No product detected');
      }
      
      // Use apiRequest to ensure the proper API URL is used from config
      const response = await apiRequest(
        'POST',
        '/api/analyze',
        {
          url: productUrl,
          productInfo: detectedProduct,
        }
      );
      
      return await response.json();
    },
    enabled: !!productUrl && !!detectedProduct,
    gcTime: 1000 * 60 * 10, // Cache for 10 minutes
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
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
