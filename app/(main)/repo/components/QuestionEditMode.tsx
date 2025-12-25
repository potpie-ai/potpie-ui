"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import type { MCQQuestion } from "@/services/QuestionService";

interface QuestionAnswer {
  questionId: string;
  textAnswer?: string;
  mcqAnswer?: string;
  isEditing: boolean;
  isUserModified: boolean;
}

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
    <div className="space-y-3 mt-2">
      {question.options && question.options.length > 0 ? (
        <>
          <RadioGroup value={mcqValue} onValueChange={setMcqValue}>
            {question.options.map((option, index) => {
              const optionLabel = String.fromCharCode(65 + index); // A, B, C, D
              // Strip prefix if already present (e.g., "A. Monolithic" -> "Monolithic")
              const cleanOption = stripOptionPrefix(option);
              return (
                <div key={index} className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-50">
                  <RadioGroupItem value={optionLabel} id={`option-${question.id}-${index}`} />
                  <Label
                    htmlFor={`option-${question.id}-${index}`}
                    className="text-xs cursor-pointer flex-1"
                  >
                    <span className="font-medium mr-2">{optionLabel}.</span>
                    {cleanOption}
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
          
          {/* Other option text input */}
          <div className="pt-2 border-t border-gray-200">
            <Label className="text-xs text-gray-600 mb-1 block">
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
              className="min-h-[60px] text-sm"
            />
          </div>
        </>
      ) : (
        <Textarea
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          placeholder="Enter your answer..."
          className="min-h-[60px] text-sm"
        />
      )}

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={onSave}
          className="h-10"
        >
          Save
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onCancel}
          className="h-10"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}


