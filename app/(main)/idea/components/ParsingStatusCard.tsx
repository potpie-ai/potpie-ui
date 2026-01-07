"use client";

import { CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ParsingStatusCardProps {
  steps: string[];
  progress: number;
  onContinue?: () => void;
}

const ALL_STEPS = [
  "Cloning repository...",
  "Analyzing directory structure...",
  "Detecting tech stack...",
  "Parsing routing files...",
  "Extracting API endpoints...",
  "Analyzing database schema...",
  "Identifying components...",
  "Repository analysis complete!",
];

export default function ParsingStatusCard({
  steps,
  progress,
  onContinue,
}: ParsingStatusCardProps) {
  // Cap progress at 100%
  const cappedProgress = Math.min(progress, 100);
  // Use number of completed steps for accurate completion check
  const completedCount = steps.length;
  const isComplete = completedCount >= ALL_STEPS.length;

  return (
    <Card className="bg-background border border-zinc-200 rounded-xl">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">
              {isComplete ? "Repository analysis complete!" : "Analyzing repository..."}
            </h3>
            {!isComplete && (
              <Loader2 className="h-4 w-4 animate-spin text-foreground" />
            )}
            {isComplete && (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            )}
          </div>

          {/* Progress Steps */}
          <div className="space-y-1.5">
            {ALL_STEPS.map((step, index) => {
              // Use index-based checking instead of string matching to avoid any string comparison issues
              const isCompleted = index < completedCount;
              const isCurrent = index === completedCount;

              return (
                <div
                  key={`${step}-${index}`}
                  className={`flex items-center gap-2 text-xs ${
                    isCompleted ? "text-foreground" : "text-zinc-400"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                  ) : isCurrent ? (
                    <Loader2 className="h-3.5 w-3.5 text-foreground animate-spin flex-shrink-0" />
                  ) : (
                    <div className="h-3.5 w-3.5 rounded-full border-2 border-zinc-200 flex-shrink-0" />
                  )}
                  <span className={isCurrent ? "font-semibold text-foreground" : ""}>
                    {step}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-zinc-100 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${
                isComplete ? "bg-emerald-600" : "bg-zinc-900"
              }`}
              style={{ width: `${cappedProgress}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs text-zinc-500">
              {Math.round(cappedProgress)}% complete
            </div>
            
            {/* Continue Button - shows when complete */}
            {isComplete && onContinue && (
              <Button
                onClick={onContinue}
                size="sm"
                className="h-8 px-4 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-lg"
              >
                Continue
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

