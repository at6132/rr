import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Star } from "lucide-react";
import { SiAmazon, SiWalmart, SiTarget, SiEbay } from "react-icons/si";
import { SiShopify } from "react-icons/si"; // Using Shopify icon as a fallback for Best Buy

interface PlatformRating {
  platform: string;
  rating: number;
  reviewCount: number;
  url: string;
}

interface PlatformRatingsProps {
  ratings: PlatformRating[];
}

const PlatformRatings: React.FC<PlatformRatingsProps> = ({ ratings }) => {
  // Function to get the appropriate icon for a platform
  const getPlatformIcon = (platform: string) => {
    const iconClass = "mr-2 h-5 w-5";
    
    if (platform.toLowerCase().includes("amazon")) {
      return <SiAmazon className={iconClass} />;
    } else if (platform.toLowerCase().includes("walmart")) {
      return <SiWalmart className={iconClass} />;
    } else if (platform.toLowerCase().includes("bestbuy") || platform.toLowerCase().includes("best buy")) {
      return <SiShopify className={iconClass} />;
    } else if (platform.toLowerCase().includes("target")) {
      return <SiTarget className={iconClass} />;
    } else if (platform.toLowerCase().includes("ebay")) {
      return <SiEbay className={iconClass} />;
    }
    
    // Default icon if no match
    return <Star className={iconClass} />;
  };
  
  // Function to render stars for a rating
  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const emptyStars = 5 - fullStars;
    
    return (
      <div className="flex items-center">
        {Array(fullStars).fill(0).map((_, i) => (
          <Star key={`full-${i}`} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
        ))}
        
        {Array(emptyStars).fill(0).map((_, i) => (
          <Star key={`empty-${i}`} className="h-4 w-4 text-gray-300" />
        ))}
        
        <span className="ml-2 text-sm">{rating.toFixed(1)}</span>
      </div>
    );
  };

  if (!ratings || ratings.length === 0) {
    return null;
  }

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Platform Ratings</CardTitle>
        <CardDescription>Ratings collected from different e-commerce platforms</CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {ratings.map((rating, index) => (
            <div key={index} className="flex items-center justify-between border-b pb-2 last:border-0">
              <div className="flex items-center">
                {getPlatformIcon(rating.platform)}
                <span className="font-medium">{rating.platform}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  ({rating.reviewCount} reviews)
                </span>
              </div>
              {renderStars(rating.rating)}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default PlatformRatings;