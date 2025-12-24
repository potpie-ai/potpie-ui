"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Paperclip, Link as LinkIcon, Check } from "lucide-react";
import { Loader2 } from "lucide-react";

interface AdditionalContextSectionProps {
  context: string;
  onContextChange: (context: string) => void;
  onGeneratePlan: () => void;
  isGenerating: boolean;
}

export default function AdditionalContextSection({
  context,
  onContextChange,
  onGeneratePlan,
  isGenerating,
}: AdditionalContextSectionProps) {
  return (
    <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200">
      <div className="max-w-4xl mx-auto">
        <Card className="border-blue-200 bg-gradient-to-br from-card to-card/50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-blue-600 rounded" />
              <h2 className="text-sm font-semibold text-gray-900">Additional Context</h2>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Textarea
                value={context}
                onChange={(e) => onContextChange(e.target.value)}
                placeholder="Add any additional context, requirements, or notes here..."
                className="min-h-[80px] text-sm pr-20"
              />
              <div className="absolute bottom-2 right-2 flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-md"
                  disabled
                  title="File attachment (coming soon)"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-md"
                  disabled
                  title="Link attachment (coming soon)"
                >
                  <LinkIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Button
              onClick={onGeneratePlan}
              disabled={isGenerating}
              className="w-full h-10 bg-black text-white hover:bg-gray-800"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Plan...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Generate Implementation Plan →
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


