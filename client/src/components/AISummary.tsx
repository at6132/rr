import React from "react";
import { Summary } from "../types";

interface AISummaryProps {
  summary: Summary;
  productTitle: string;
}

const AISummary: React.FC<AISummaryProps> = ({ summary, productTitle }) => {
  return (
    <div className="p-4 border-b border-gray-700">
      <h3 className="font-semibold mb-2 text-base">AI Summary</h3>
      <div className="bg-card-bg rounded-xl p-3 shadow-card">
        <p className="text-sm mb-3">
          Here's what people are saying about {productTitle}:
        </p>

        <h4 className="text-sm font-medium mb-1 text-teal-glow">Pros</h4>
        <ul className="list-disc pl-5 mb-3 text-sm space-y-1">
          {summary.pros.map((pro, index) => (
            <li key={`pro-${index}`}>{pro}</li>
          ))}
        </ul>

        <h4 className="text-sm font-medium mb-1 text-error-red">Cons</h4>
        <ul className="list-disc pl-5 mb-3 text-sm space-y-1">
          {summary.cons.map((con, index) => (
            <li key={`con-${index}`}>{con}</li>
          ))}
        </ul>

        <div className="flex flex-wrap gap-2 mt-2">
          {summary.tags.map((tag, index) => (
            <span
              key={`tag-${index}`}
              className="inline-block px-2 py-1 rounded-full bg-deep-indigo text-sunset-gold text-xs border border-sunset-gold"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AISummary;
