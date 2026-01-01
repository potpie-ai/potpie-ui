"use client";

import { Sparkles } from "lucide-react";

export default function AIAnalysisBanner() {
  return (
    <div className="bg-zinc-50/50 border border-zinc-100 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-6 h-6 bg-zinc-900 rounded flex items-center justify-center mt-0.5">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-xs font-bold text-zinc-900 mb-1 uppercase tracking-wide">
            AI Agent Analysis
          </h3>
          <p className="text-xs text-zinc-500 leading-relaxed">
            The AI agent has analyzed your requirements and made assumptions for each question. 
            Hover over any question to edit. Questions marked with &apos;Needs input&apos; require your confirmation.
          </p>
        </div>
      </div>
    </div>
  );
}
