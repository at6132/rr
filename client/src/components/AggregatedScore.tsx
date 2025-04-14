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
          {aggregatedScore ? (
            <>
              Based on {aggregatedScore.totalReviewCount.toLocaleString()} reviews
              {aggregatedScore.confidenceScore && (
                <span className="ml-1">
                  • {Math.round(aggregatedScore.confidenceScore * 100)}% confidence
                </span>
              )}
            </>
          ) : (
            `Based on ${summary.reviewCount.toLocaleString()} reviews`
          )}
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
      </CardContent>
    </Card>
  );
};

export default AggregatedScore;