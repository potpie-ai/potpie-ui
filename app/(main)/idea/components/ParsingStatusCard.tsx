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
    <Card className="rounded-lg border border-zinc-300 bg-[#FFFDFC] shadow-lg dark:border-zinc-600 dark:bg-zinc-900">
      <CardContent className="p-4 bg-[#FFFDFC] dark:bg-zinc-900">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3
              className="text-xs font-bold uppercase tracking-wide"
              style={{ color: "var(--foreground-color, #022D2C)" }}
            >
              {isComplete ? "Repository analysis complete!" : "Analyzing repository..."}
            </h3>
            {!isComplete && (
              <Loader2
                className="h-4 w-4 animate-spin"
                style={{ color: "var(--foreground-color, #022D2C)" }}
              />
            )}
            {isComplete && (
              <CheckCircle2
                className="h-4 w-4 flex-shrink-0"
                style={{ color: "var(--foreground-color, #022D2C)" }}
              />
            )}
          </div>

          {/* Progress Steps */}
          <div className="space-y-1.5">
            {ALL_STEPS.map((step, index) => {
              const isCompleted = index < completedCount;
              const isCurrent = index === completedCount;

              return (
                <div
                  key={`${step}-${index}`}
                  className={`flex items-center gap-2 text-xs ${
                    isCompleted ? "" : "text-zinc-400"
                  }`}
                  style={
                    isCompleted || isCurrent
                      ? { color: "var(--foreground-color, #022D2C)" }
                      : undefined
                  }
                >
                  {isCompleted ? (
                    <CheckCircle2
                      className="h-3.5 w-3.5 flex-shrink-0"
                      style={{ color: "var(--foreground-color, #022D2C)" }}
                    />
                  ) : isCurrent ? (
                    <Loader2
                      className="h-3.5 w-3.5 animate-spin flex-shrink-0"
                      style={{ color: "var(--foreground-color, #022D2C)" }}
                    />
                  ) : (
                    <div className="h-3.5 w-3.5 flex-shrink-0 rounded-full border-2 border-zinc-200 dark:border-zinc-600" />
                  )}
                  <span className={isCurrent ? "font-semibold" : ""}>
                    {step}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Progress Bar - thin dark fill to match terminal theme */}
          <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-700">
            <div
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: `${cappedProgress}%`,
                backgroundColor: "var(--foreground-color, #022D2C)",
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              {Math.round(cappedProgress)}% complete
            </div>

            {/* Continue Button - same as New chat / primary */}
            {isComplete && onContinue && (
              <Button
                onClick={onContinue}
                size="sm"
                className="h-8 rounded-lg px-4 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
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

