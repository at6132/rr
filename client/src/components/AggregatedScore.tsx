import React from "react";
import { Summary, AggregatedScore as AggregatedScoreType } from "../types";
import { Star, StarHalf } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface AggregatedScoreProps {
  summary: Summary;
  aggregatedScore?: AggregatedScoreType;
}

const AggregatedScore: React.FC<AggregatedScoreProps> = ({ summary, aggregatedScore }) => {
  // If we have the aggregated score from the API, use it
  // Otherwise calculate from sentiment percentages
  const overallScore = aggregatedScore 
    ? aggregatedScore.overallScore.toFixed(1)
    : (
        summary.positivePercentage * 5 / 100 + 
        summary.neutralPercentage * 3 / 100 + 
        summary.negativePercentage * 1 / 100
      ).toFixed(1);

  // Function to render stars based on rating
  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    return (
      <div className="flex items-center">
        {Array(fullStars).fill(0).map((_, i) => (
          <Star key={`full-${i}`} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
        ))}
        
        {hasHalfStar && <StarHalf className="h-5 w-5 fill-yellow-400 text-yellow-400" />}
        
        {Array(5 - fullStars - (hasHalfStar ? 1 : 0)).fill(0).map((_, i) => (
          <Star key={`empty-${i}`} className="h-5 w-5 text-gray-300" />
        ))}
        
        <span className="ml-2 font-semibold">{overallScore}</span>
      </div>
    );
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex justify-between items-center">
          <span>Aggregated User Score</span>
          <Badge className="ml-auto" variant={
            parseFloat(overallScore) >= 4 ? "default" : 
            parseFloat(overallScore) >= 3 ? "outline" : "destructive"
          }>
            {parseFloat(overallScore) >= 4 ? "Highly Rated" : 
             parseFloat(overallScore) >= 3 ? "Mixed Reviews" : "Low Rated"}
          </Badge>
        </CardTitle>
        <CardDescription>
          Based on {aggregatedScore ? aggregatedScore.totalReviewCount : summary.reviewCount} reviews across multiple platforms
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="mt-2">
          {renderStars(parseFloat(overallScore))}
        </div>
        
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-green-600">
              Positive ({summary.positivePercentage}%)
            </span>
            <Progress value={summary.positivePercentage} className="w-3/4 h-2 bg-gray-200" />
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-amber-600">
              Neutral ({summary.neutralPercentage}%)
            </span>
            <Progress value={summary.neutralPercentage} className="w-3/4 h-2 bg-gray-200" />
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-red-600">
              Negative ({summary.negativePercentage}%)
            </span>
            <Progress value={summary.negativePercentage} className="w-3/4 h-2 bg-gray-200" />
          </div>
        </div>
        
        {/* Display platform breakdown if available */}
        {aggregatedScore && aggregatedScore.platformBreakdown && aggregatedScore.platformBreakdown.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium mb-2">Platform Breakdown</h4>
            <div className="space-y-2">
              {aggregatedScore.platformBreakdown.map((platform, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{platform.platform}</span>
                    {platform.verified && (
                      <Badge variant="outline" className="text-xs px-1 py-0">Verified</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center">
                      {Array(Math.floor(platform.rating)).fill(0).map((_, i) => (
                        <Star key={`p-${index}-s-${i}`} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      ))}
                      {platform.rating % 1 >= 0.5 && (
                        <StarHalf className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      ({platform.reviewCount})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AggregatedScore;