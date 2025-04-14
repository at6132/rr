import React, { useState } from "react";
import { Product } from "../types";
import { Button } from "./ui/button";
import { ShoppingBag } from "lucide-react";
import { generateAffiliateLink } from "@/lib/utils";

interface ProductInfoProps {
  product: Product;
}

const ProductInfo: React.FC<ProductInfoProps> = ({ product }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleBuyNow = async () => {
    try {
      setIsLoading(true);
      
      // Generate affiliate link
      const affiliateLink = await generateAffiliateLink(product.url);
      
      // Open the affiliate link in the same tab
      window.open(affiliateLink, "_self");
    } catch (error) {
      console.error("Error handling Buy Now:", error);
      
      // If there's an error, just open the original URL
      window.open(product.url, "_self");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 border-b border-gray-700">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-secondary-text mb-1">
            {product.source}
          </p>
          <h2 className="font-semibold text-lg leading-tight mb-1">
            {product.title}
          </h2>
        </div>
        {product.imageUrl && (
          <div className="flex-shrink-0 ml-2">
            <img
              src={product.imageUrl}
              alt={`${product.title} thumbnail`}
              className="w-14 h-14 rounded-md object-cover"
            />
          </div>
        )}
      </div>
      
      {/* Buy Now button */}
      <div className="mt-3">
        <Button 
          onClick={handleBuyNow} 
          className="w-full bg-primary hover:bg-primary/90"
          disabled={isLoading}
        >
          <ShoppingBag className="mr-2 h-4 w-4" />
          {isLoading ? "Loading..." : "Buy Now"}
        </Button>
      </div>
    </div>
  );
};

export default ProductInfo;
