import React from "react";

const FlowAISpinner = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="relative">
        {/* Outer ring */}
        <div className="w-16 h-16 border-4 border-primary/20 rounded-full animate-spin">
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-primary rounded-full animate-spin"></div>
        </div>
        {/* Inner pulsing dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
        </div>
        {/* FlowAI text */}
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2">
          <span className="text-sm font-semibold text-text-primary">
            FlowAI
          </span>
        </div>
      </div>
    </div>
  );
};

export default FlowAISpinner;
