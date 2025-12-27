"use client";

import { Sparkles } from "lucide-react";

export default function AIAnalysisBanner() {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-blue-100/50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-900 mb-1">
            AI Agent Analysis
          </h3>
          <p className="text-xs text-gray-600">
            The AI agent has analyzed your requirements and made assumptions for each question. 
            Hover over any question to edit. Questions marked with &apos;Needs input&apos; require your confirmation.
          </p>
        </div>
      </div>
    </div>
  );
}


