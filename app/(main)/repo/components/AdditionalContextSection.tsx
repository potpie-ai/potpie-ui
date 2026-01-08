"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, Loader2 } from "lucide-react";

interface AdditionalContextSectionProps {
  context: string;
  onContextChange: (context: string) => void;
  onGeneratePlan: () => void;
  isGenerating: boolean;
  recipeId: string | null;
}

export default function AdditionalContextSection({
  context,
  onContextChange,
  onGeneratePlan,
  isGenerating,
  recipeId,
}: AdditionalContextSectionProps) {
  return (
    <div className="bg-background border-zinc-100 px-6 py-4">
      <div className="max-w-3xl mx-auto">
        <div className="space-y-3">
          <div>
            <h2 className="text-xs font-bold text-primary-color uppercase tracking-wide mb-1">
              Additional Context
            </h2>
            <p className="text-[10px] text-zinc-400 mb-3">
              Add any extra requirements, constraints, or notes
            </p>
          </div>
          
          <Textarea
            value={context}
            onChange={(e) => onContextChange(e.target.value)}
            placeholder="Example: Use TypeScript for type safety, follow RESTful API conventions..."
            className="min-h-[80px] text-xs resize-none border-zinc-200 focus:border-zinc-300 rounded-lg leading-relaxed"
          />
          
          <div className="flex items-center justify-end">
            <Button
              onClick={onGeneratePlan}
              disabled={isGenerating || !recipeId}
              className="h-8 px-6 bg-accent-color text-primary-color hover:bg-[#006B66] hover:text-accent-color text-sm font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Check className="w-3 h-3 mr-1.5" />
                  Generate Implementation Plan
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
