"use client";

import { Sparkles } from "lucide-react";

export default function AIAnalysisBanner() {
  return (
    <div className="bg-zinc-50/50 border border-zinc-100 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-6 h-6 bg-primary rounded flex items-center justify-center mt-0.5">
          <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <h3 className="text-xs font-bold text-primary mb-1 uppercase tracking-wide">
            AI Agent Analysis
          </h3>
          <p className="text-xs text-zinc-500 leading-relaxed">
            The AI agent has analyzed your requirements and recommended options for each question.
            Select your preferred option or specify your own. Answer all questions before saving.
          </p>
        </div>
      </div>
    </div>
  );
}
