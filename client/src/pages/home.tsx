import React, { useEffect } from "react";
import Header from "../components/Header";
import ProductInfo from "../components/ProductInfo";
import AggregatedScore from "../components/AggregatedScore";
import PlatformRatings from "../components/PlatformRatings";
import AISummary from "../components/AISummary";
import VideoReviews from "../components/VideoReviews";
import RedditHighlights from "../components/RedditHighlights";
import BlogReviews from "../components/BlogReviews";
import AIChat from "../components/AIChat";
import { useProduct } from "../contexts/product-context";

export default function Home() {
  const { 
    productAnalysis, 
    isLoading, 
    isError, 
    detectedProduct,
    productUrl 
  } = useProduct();

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen bg-deep-indigo text-soft-white">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-glow"></div>
        </div>
      </div>
    );
  }

  // Check if the page was analyzed and is not a product first, before showing error
  if (productAnalysis && productAnalysis.isProduct === false) {
    return (
      <div className="flex flex-col h-screen bg-deep-indigo text-soft-white">
        <Header />
        <div className="flex-1 p-4 flex flex-col items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 text-warning-amber mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h2 className="text-xl font-bold mb-2">Not a Product Page</h2>
          <p className="text-center text-secondary-text mb-4">
            This doesn't appear to be a product page. Please visit an e-commerce product page to use ReviewRadar.
          </p>
          
          {/* Check if this might be a product URL by pattern */}
          {productUrl && (
            productUrl.includes('/dp/') || 
            productUrl.includes('/product/') || 
            productUrl.includes('/p/') || 
            productUrl.includes('/skuId=')
          ) ? (
            <div className="mt-2 mb-4 p-3 bg-accent-purple bg-opacity-20 rounded-lg max-w-md">
              <p className="text-center text-warning-amber font-medium mb-2">
                This URL looks like a product page! Try refreshing to analyze again.
              </p>
              <button 
                onClick={() => {
                  window.location.reload();
                }}
                className="w-full py-2 bg-teal-glow hover:bg-teal-glow/80 text-white font-semibold rounded-md transition-colors"
              >
                Refresh Analysis
              </button>
            </div>
          ) : null}
          
          <p className="text-center text-sm text-accent-purple mb-2">
            URL analyzed: {productUrl || productAnalysis.product.url}
          </p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col h-screen bg-deep-indigo text-soft-white">
        <Header />
        <div className="flex-1 p-4 flex flex-col items-center justify-center">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-12 w-12 text-error-red mb-4" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor" 
            strokeWidth={2}
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
            />
          </svg>
          <h2 className="text-xl font-bold mb-2">Error Loading Reviews</h2>
          <p className="text-center text-secondary-text mb-4">
            We couldn't analyze this product. Please try refreshing or visit a different product page.
          </p>
          <button 
            className="px-4 py-2 bg-card-bg rounded-md hover:bg-opacity-80 transition-colors"
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!productAnalysis && !detectedProduct) {
    return (
      <div className="flex flex-col h-screen bg-deep-indigo text-soft-white">
        <Header />
        <div className="flex-1 p-4 flex flex-col items-center justify-center">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-12 w-12 text-teal-glow mb-4" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor" 
            strokeWidth={2}
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
            />
          </svg>
          <h2 className="text-xl font-bold mb-2">No Product Detected</h2>
          <p className="text-center text-secondary-text mb-4">
            Visit a product page or highlight a product name and right-click "Search with ReviewRadar"
          </p>
        </div>
      </div>
    );
  }

  // Use detected product if analysis is not available yet
  const product = productAnalysis?.product || detectedProduct;

  return (
    <div className="flex flex-col min-h-screen bg-deep-indigo text-soft-white w-[400px]">
      <Header />
      
      {product && <ProductInfo product={product} />}
      
      <div className="flex-1 overflow-auto">
        {productAnalysis && (
          <>
            <AggregatedScore 
              summary={productAnalysis.summary} 
              aggregatedScore={productAnalysis.aggregatedScore} 
            />
            {productAnalysis.aggregatedScore?.platformBreakdown && 
              productAnalysis.aggregatedScore.platformBreakdown.length > 0 && (
                <PlatformRatings ratings={productAnalysis.aggregatedScore.platformBreakdown} />
              )
            }
            <AISummary 
              summary={productAnalysis.summary} 
              productTitle={productAnalysis.product.title} 
            />
            <VideoReviews videos={productAnalysis.videoReviews} />
            <RedditHighlights redditPosts={productAnalysis.redditPosts} />
            <BlogReviews blogReviews={productAnalysis.blogReviews} />
          </>
        )}
      </div>
      
      <AIChat productTitle={product?.title || ""} />
    </div>
  );
}
