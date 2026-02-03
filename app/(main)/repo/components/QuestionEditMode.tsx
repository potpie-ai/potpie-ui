"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
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
  const isMultipleChoice = question.multipleChoice ?? false;
  const [textValue, setTextValue] = useState(currentAnswer.textAnswer || "");
  const [mcqValue, setMcqValue] = useState(currentAnswer.mcqAnswer || "");
  const [selectedIndices, setSelectedIndices] = useState<number[]>(
    currentAnswer.selectedOptionIndices ?? []
  );
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
    if (isMultipleChoice) {
      // For multiple choice, build text answer from selected indices
      const options = Array.isArray(question.options)
        ? question.options.map((o) => (typeof o === "string" ? { label: o } : o))
        : [];
      const selectedLabels = selectedIndices
        .map((idx) => {
          const opt = options[idx];
          return typeof opt === "string" ? opt : opt?.label;
        })
        .filter(Boolean)
        .join(", ");
      
      onAnswerChangeRef.current({
        textAnswer: customAnswer || selectedLabels || undefined,
        mcqAnswer: selectedIndices.map((idx) => String.fromCharCode(65 + idx)).join(",") || undefined,
        selectedOptionIndices: selectedIndices.length > 0 ? selectedIndices : undefined,
        selectedOptionIdx: undefined,
      });
    } else {
      onAnswerChangeRef.current({
        textAnswer: textValue || customAnswer || undefined,
        mcqAnswer: mcqValue || undefined,
        selectedOptionIdx: mcqValue ? (mcqValue.charCodeAt(0) - 65) : undefined,
        selectedOptionIndices: undefined,
      });
    }
  }, [textValue, mcqValue, customAnswer, selectedIndices, isMultipleChoice, question.options]);

  const handleToggleOption = (index: number) => {
    if (isMultipleChoice) {
      const isSelected = selectedIndices.includes(index);
      const newIndices = isSelected
        ? selectedIndices.filter(i => i !== index)
        : [...selectedIndices, index].sort((a, b) => a - b);
      setSelectedIndices(newIndices);
      setCustomAnswer(""); // Clear custom answer when option is selected
    } else {
      const optionLabel = String.fromCharCode(65 + index);
      setMcqValue(optionLabel);
      setCustomAnswer(""); // Clear custom answer when MCQ option is selected
    }
  };

  return (
    <div className="space-y-3 mt-3 bg-zinc-50/50 rounded-lg p-4 border border-zinc-200">
      {question.options && question.options.length > 0 ? (
        <>
          {isMultipleChoice ? (
            // Multiple choice with checkboxes
            <div className="space-y-1.5">
              {question.options.map((option, index) => {
                const optionLabel = String.fromCharCode(65 + index); // A, B, C, D
                // Strip prefix if already present (e.g., "A. Monolithic" -> "Monolithic")
                const cleanOption = typeof option === "string" 
                  ? stripOptionPrefix(option)
                  : option.label;
                const description = typeof option === "string" ? undefined : option.description;
                const isSelected = selectedIndices.includes(index);
                
                return (
                  <div
                    key={index}
                    className={`flex items-start gap-3 text-xs p-2.5 rounded-lg transition-all cursor-pointer ${
                      isSelected
                        ? "bg-primary/10 border border-primary/30"
                        : "bg-background border border-zinc-200 hover:border-zinc-300"
                    }`}
                    onClick={() => handleToggleOption(index)}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggleOption(index)}
                      id={`option-${question.id}-${index}`}
                      className="mt-0.5 shrink-0"
                    />
                    <Label
                      htmlFor={`option-${question.id}-${index}`}
                      className="text-xs cursor-pointer flex-1 text-primary leading-relaxed"
                    >
                      <span className="font-bold mr-2">{optionLabel}.</span>
                      {cleanOption}
                      {description && (
                        <span className="block mt-1 text-zinc-500 font-normal">
                          {description}
                        </span>
                      )}
                    </Label>
                  </div>
                );
              })}
            </div>
          ) : (
            // Single choice with radio buttons
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
                  const cleanOption = typeof option === "string"
                    ? stripOptionPrefix(option)
                    : option.label;
                  const description = typeof option === "string" ? undefined : option.description;
                  
                  return (
                    <div
                      key={index}
                      className="flex items-center space-x-2 p-2.5 rounded-lg hover:bg-background bg-background border border-zinc-200 hover:border-zinc-300 transition-all cursor-pointer"
                    >
                      <RadioGroupItem value={optionLabel} id={`option-${question.id}-${index}`} />
                      <Label
                        htmlFor={`option-${question.id}-${index}`}
                        className="text-xs cursor-pointer flex-1 text-primary leading-relaxed"
                      >
                        <span className="font-bold mr-2">{optionLabel}.</span>
                        {cleanOption}
                        {description && (
                          <span className="block mt-1 text-zinc-500 font-normal">
                            {description}
                          </span>
                        )}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </RadioGroup>
          )}
          
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
                  if (isMultipleChoice) {
                    setSelectedIndices([]);
                  } else {
                    setMcqValue("");
                  }
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


