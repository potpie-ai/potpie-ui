"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import type { MCQQuestion, QuestionAnswer } from "@/types/question";

interface QuestionEditModeProps {
  question: MCQQuestion;
  currentAnswer: Partial<QuestionAnswer>;
  onAnswerChange: (answer: Partial<QuestionAnswer>) => void;
  onSave: () => void;
  onCancel: () => void;
}

export default function QuestionEditMode({
  question,
  currentAnswer,
  onAnswerChange,
  onSave,
  onCancel,
}: QuestionEditModeProps) {
  const [textValue, setTextValue] = useState(currentAnswer.textAnswer || "");
  const [mcqValue, setMcqValue] = useState(currentAnswer.mcqAnswer || "");
  const [customAnswer, setCustomAnswer] = useState("");

  // Store onAnswerChange in a ref to avoid dependency issues
  const onAnswerChangeRef = useRef(onAnswerChange);

  // Update ref when onAnswerChange changes
  useEffect(() => {
    onAnswerChangeRef.current = onAnswerChange;
  }, [onAnswerChange]);

  // Helper to strip option prefix (A., B., etc.) if already present
  const stripOptionPrefix = (option: string): string => {
    // Remove patterns like "A. ", "B. ", etc. from the start
    return option.replace(/^[A-Z]\.\s*/, "");
  };

  // Effect depends only on answer values, not onAnswerChange
  useEffect(() => {
    onAnswerChangeRef.current({
      textAnswer: textValue || customAnswer || undefined,
      mcqAnswer: mcqValue || undefined,
    });
  }, [textValue, mcqValue, customAnswer]);

  return (
    <div className="space-y-3 mt-3 bg-zinc-50/50 rounded-lg p-4 border border-zinc-200">
      {question.options && question.options.length > 0 ? (
        <>
          <RadioGroup
            value={mcqValue}
            onValueChange={(value) => {
              setMcqValue(value);
              // Clear custom answer when MCQ option is selected
              setCustomAnswer("");
            }}
          >
            <div className="space-y-1.5">
              {question.options.map((option, index) => {
                const optionLabel = String.fromCharCode(65 + index); // A, B, C, D
                // Strip prefix if already present (e.g., "A. Monolithic" -> "Monolithic")
                const cleanOption = stripOptionPrefix(option);
                return (
                  <div key={index} className="flex items-center space-x-2 p-2.5 rounded-lg hover:bg-background bg-background border border-zinc-200 hover:border-zinc-300 transition-all cursor-pointer">
                    <RadioGroupItem value={optionLabel} id={`option-${question.id}-${index}`} />
                    <Label
                      htmlFor={`option-${question.id}-${index}`}
                      className="text-xs cursor-pointer flex-1 text-primary leading-relaxed"
                    >
                      <span className="font-bold mr-2">{optionLabel}.</span>
                      {cleanOption}
                    </Label>
                  </div>
                );
              })}
            </div>
          </RadioGroup>
          
          {/* Other option text input */}
          <div className="pt-3 border-t border-zinc-200">
            <Label className="text-[10px] text-zinc-400 mb-1.5 block font-bold uppercase tracking-wider">
              Other (specify your own):
            </Label>
            <Textarea
              value={customAnswer}
              onChange={(e) => {
                setCustomAnswer(e.target.value);
                // Clear MCQ selection if custom answer is entered
                if (e.target.value) {
                  setMcqValue("");
                }
              }}
              placeholder="Enter your preferred option..."
              className="min-h-[60px] text-xs border-zinc-200 focus:border-zinc-300 rounded-lg"
            />
          </div>
        </>
      ) : (
        <Textarea
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          placeholder="Enter your answer..."
          className="min-h-[80px] text-xs border-zinc-200 focus:border-zinc-300 rounded-lg"
        />
      )}

      <div className="flex items-center gap-2 pt-2">
        <Button
          size="sm"
          onClick={onSave}
          className="h-8 px-4 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded-lg"
        >
          Save
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onCancel}
          className="h-8 px-4 border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-primary text-xs rounded-lg"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}


