import React, { useState, useRef } from "react";
import { askAIAboutProduct } from "../lib/openai";

interface AIChatProps {
  productTitle: string;
}

const AIChat: React.FC<AIChatProps> = ({ productTitle }) => {
  const [question, setQuestion] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestedQuestions = [
    "Is it good for travel?",
    "Battery life?",
    "Better than Bose?",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question || isSubmitting) return;

    setIsSubmitting(true);
    setResponse(null);

    try {
      const answer = await askAIAboutProduct(productTitle, question);
      setResponse(answer);
      setQuestion("");
    } catch (error) {
      console.error("Error asking AI:", error);
      setResponse("Sorry, I couldn't process your question. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    setQuestion(question);
    // Focus on the input after setting the question
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className="sticky bottom-0 border-t border-gray-700 bg-deep-indigo">
      <div className="p-4">
        <h3 className="font-semibold mb-2 text-base">Ask AI About This Product</h3>
        
        {response && (
          <div className="mb-3 bg-card-bg rounded-xl p-3 shadow-card">
            <p className="text-sm">{response}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="relative">
          <input
            ref={inputRef}
            type="text"
            placeholder="E.g., How does it compare to Bose 700?"
            className="w-full bg-card-bg border-none rounded-xl py-3 px-4 pr-10 text-sm focus:ring-2 focus:ring-teal-glow focus:outline-none"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={isSubmitting}
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-teal-glow p-1 rounded-md hover:bg-teal-glow hover:bg-opacity-10 transition-colors disabled:opacity-50"
            disabled={isSubmitting || !question}
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-teal-glow border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m22 2-7 20-4-9-9-4Z"></path>
                <path d="M22 2 11 13"></path>
              </svg>
            )}
          </button>
        </form>
        <div className="flex flex-wrap gap-2 mt-2">
          {suggestedQuestions.map((q, index) => (
            <button
              key={`question-${index}`}
              className="text-xs px-2 py-1 bg-card-bg rounded-md hover:bg-opacity-80 transition-colors"
              onClick={() => handleSuggestedQuestion(q)}
              disabled={isSubmitting}
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AIChat;
