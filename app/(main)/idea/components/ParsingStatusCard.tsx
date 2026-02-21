"use client";

import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ParsingStatusCardProps {
  steps: string[];
  progress: number;
  onContinue?: () => void;
}

export default function ParsingStatusCard({
  progress,
  onContinue,
}: ParsingStatusCardProps) {
  // Cap progress at 100%
  const cappedProgress = Math.min(progress, 100);
  const isComplete = cappedProgress >= 100;

  // Get the current step text based on progress
  const getCurrentStepText = () => {
    if (progress < 30) return "Cloning repository";
    if (progress < 60) return "Analyzing directory structure";
    if (progress < 80) return "Parsing routing files";
    if (progress < 100) return "Analyzing database schema";
    return "Repository analysis complete";
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <h3 className="text-sm font-medium text-zinc-900">
        {isComplete ? "Repository analysis complete!" : "Analysing repository...."}
      </h3>

      <Card className="rounded-lg border border-zinc-200 bg-white shadow-sm">
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Progress info row */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-700">
                {getCurrentStepText()}
              </span>
              <span className="text-sm font-medium text-zinc-900">
                {Math.round(cappedProgress)}% complete
              </span>
            </div>

            {/* Progress Bar - brand green (#B6E343) */}
            <div className="h-2 w-full rounded-full bg-zinc-200">
              <div
                className="h-2 rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${cappedProgress}%`,
                  backgroundColor: "#B6E343",
                }}
              />
            </div>

            {/* Continue Button */}
            {isComplete && onContinue && (
              <div className="flex justify-end pt-2">
                <Button
                  onClick={onContinue}
                  size="sm"
                  className="h-8 rounded-lg px-4 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Continue
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
