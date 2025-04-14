import React, { useEffect, useRef } from "react";
import { Summary } from "../types";

interface AggregatedScoreProps {
  summary: Summary;
}

const AggregatedScore: React.FC<AggregatedScoreProps> = ({ summary }) => {
  const positiveBarRef = useRef<HTMLDivElement>(null);
  const neutralBarRef = useRef<HTMLDivElement>(null);
  const negativeBarRef = useRef<HTMLDivElement>(null);
  const circlePathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    // Animate progress bars
    if (positiveBarRef.current) {
      positiveBarRef.current.style.width = `${summary.positivePercentage}%`;
    }
    if (neutralBarRef.current) {
      neutralBarRef.current.style.width = `${summary.neutralPercentage}%`;
    }
    if (negativeBarRef.current) {
      negativeBarRef.current.style.width = `${summary.negativePercentage}%`;
    }
    
    // Animate circle progress
    if (circlePathRef.current) {
      const circumference = 2 * Math.PI * 15.9155;
      const offset = circumference - (summary.positivePercentage / 100) * circumference;
      circlePathRef.current.style.strokeDashoffset = offset.toString();
    }
  }, [summary]);

  return (
    <div className="p-4 border-b border-gray-700">
      <h3 className="font-semibold mb-2 text-base">Overall Impression</h3>
      <div className="flex items-center mb-3">
        <div className="w-24 h-24 relative mr-4">
          <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
            <path
              className="stroke-current text-gray-700"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              strokeWidth="3"
              strokeDasharray="100, 100"
            />
            <path
              ref={circlePathRef}
              className="stroke-current text-sunset-gold transition-all duration-1000 ease-out"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              strokeWidth="3"
              strokeDasharray="100, 100"
              strokeDashoffset="100"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <span className="text-2xl font-bold text-sunset-gold">
              {summary.positivePercentage}%
            </span>
            <span className="text-xs text-secondary-text">Positive</span>
          </div>
        </div>
        <div className="flex-1">
          <p className="text-sm mb-2">
            Based on{" "}
            <span className="font-semibold text-teal-glow">
              {summary.reviewCount} reviews
            </span>{" "}
            analyzed across multiple sources:
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Positive</span>
              <div className="w-40 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  ref={positiveBarRef}
                  className="h-full bg-teal-glow transition-all duration-1000 ease-out"
                  style={{ width: "0%" }}
                ></div>
              </div>
              <span className="text-teal-glow">{summary.positivePercentage}%</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Neutral</span>
              <div className="w-40 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  ref={neutralBarRef}
                  className="h-full bg-secondary-text transition-all duration-1000 ease-out"
                  style={{ width: "0%" }}
                ></div>
              </div>
              <span>{summary.neutralPercentage}%</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Negative</span>
              <div className="w-40 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  ref={negativeBarRef}
                  className="h-full bg-error-red transition-all duration-1000 ease-out"
                  style={{ width: "0%" }}
                ></div>
              </div>
              <span className="text-error-red">{summary.negativePercentage}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AggregatedScore;
