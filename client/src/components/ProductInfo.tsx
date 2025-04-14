import React from "react";
import { Product } from "../types";

interface ProductInfoProps {
  product: Product;
}

const ProductInfo: React.FC<ProductInfoProps> = ({ product }) => {
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
    </div>
  );
};

export default ProductInfo;
