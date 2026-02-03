"use client";

import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { MCQQuestion, QuestionAnswer } from "@/types/question";
import type { MCQOption } from "@/services/QuestionService";

interface QuestionCardProps {
  question: MCQQuestion;
  answer?: QuestionAnswer;
  isHovered: boolean;
  isExpanded: boolean;
  isSkipped: boolean;
  isUnanswered?: boolean;
  onHover: () => void;
  onHoverLeave: () => void;
  onAnswerChange: (answer: Partial<QuestionAnswer>) => void;
  onToggleOptions?: () => void;
}

/** Normalize options to MCQOption[] */
function getOptions(question: MCQQuestion): MCQOption[] {
  const opts = question.options;
  if (!opts || opts.length === 0) return [];
  return opts.map((o) =>
    typeof o === "string" ? { label: o, description: undefined } : o
  );
}

export default function QuestionCard({
  question,
  answer,
  isHovered,
  isExpanded,
  isSkipped,
  isUnanswered = false,
  onHover,
  onHoverLeave,
  onAnswerChange,
  onToggleOptions,
}: QuestionCardProps) {
  const options = getOptions(question);
  const isMultipleChoice = question.multipleChoice ?? false;
  const selectedIdx = answer?.selectedOptionIdx;
  const selectedIndices = answer?.selectedOptionIndices ?? [];
  const isOther = answer?.isOther ?? false;
  const otherText = answer?.otherText ?? "";
  const hasAnswer =
    (isOther && otherText.trim()) ||
    (isMultipleChoice
      ? selectedIndices.length > 0 && selectedIndices.some(idx => idx >= 0 && idx < options.length)
      : selectedIdx != null && selectedIdx >= 0 && selectedIdx < options.length);

  // Show "Input needed" when: no answer_recommendation.idx AND user hasn't selected
  const needsInput =
    question.needsInput &&
    !hasAnswer &&
    (question.answerRecommendationIdx == null ||
      question.answerRecommendationIdx < 0);

  const cardClasses = [
    "p-4 rounded-xl border transition-all duration-200",
    isSkipped && "bg-zinc-50/50 border-zinc-200 opacity-50",
    !isSkipped && "bg-background border-[#D3E5E5]",
    isUnanswered && !isSkipped && "ring-2 ring-amber-400/60 border-amber-300",
    isHovered && !isSkipped && "border-[#D3E5E5]",
  ]
    .filter(Boolean)
    .join(" ");

  const handleSelectOption = (idx: number) => {
    if (isSkipped) return;
    const opt = options[idx];
    const label = typeof opt === "string" ? opt : opt.label;
    
    if (isMultipleChoice) {
      // Toggle selection for multiple choice
      const currentIndices = selectedIndices;
      const isSelected = currentIndices.includes(idx);
      const newIndices = isSelected
        ? currentIndices.filter(i => i !== idx)
        : [...currentIndices, idx].sort((a, b) => a - b);
      
      // Build text answer from selected options
      const selectedLabels = newIndices
        .map(i => {
          const o = options[i];
          return typeof o === "string" ? o : o.label;
        })
        .join(", ");
      
      onAnswerChange({
        selectedOptionIndices: newIndices,
        selectedOptionIdx: undefined, // Clear single selection
        isOther: false,
        otherText: undefined,
        textAnswer: selectedLabels || undefined,
        mcqAnswer: newIndices.map(i => String.fromCharCode(65 + i)).join(","),
        isUserModified: true,
      });
    } else {
      // Single selection
      onAnswerChange({
        selectedOptionIdx: idx,
        selectedOptionIndices: undefined, // Clear multiple selections
        isOther: false,
        otherText: undefined,
        textAnswer: label,
        mcqAnswer: String.fromCharCode(65 + idx),
        isUserModified: true,
      });
    }
  };

  const handleSelectOther = () => {
    if (isSkipped) return;
    onAnswerChange({
      isOther: true,
      selectedOptionIdx: -1,
      selectedOptionIndices: undefined, // Clear multiple selections
      mcqAnswer: undefined,
      textAnswer: undefined,
      isUserModified: true,
    });
  };

  const handleOtherTextChange = (value: string) => {
    if (isSkipped) return;
    onAnswerChange({
      isOther: true,
      otherText: value,
      textAnswer: value.trim() ? `Other: ${value.trim()}` : undefined,
      isUserModified: true,
    });
  };

  return (
    <div
      className={cardClasses}
      onMouseEnter={onHover}
      onMouseLeave={onHoverLeave}
    >
      <div className="space-y-3">
        {/* Question Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <div className="flex items-start gap-2 flex-wrap">
              <p
                className={`text-sm font-medium leading-relaxed flex-1 ${
                  isSkipped ? "text-zinc-400 line-through" : "text-primary"
                }`}
              >
                {question.question}
              </p>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {isSkipped && (
                  <span className="px-1.5 py-0.5 bg-zinc-100 border border-zinc-200 rounded text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Skipped
                  </span>
                )}
                {!isSkipped && needsInput && (
                  <span className="px-1.5 py-0.5 bg-accent/20 border border-accent/40 rounded text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
                    Input needed
                  </span>
                )}
              </div>
            </div>
            {!isSkipped && question.reasoning && (
              <div className="bg-zinc-50/50 rounded-lg p-3 border-l-2 border-zinc-200">
                <p className="text-xs text-zinc-500 leading-relaxed">
                  {question.reasoning}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Options - radio or checkbox selection */}
        {options.length > 0 && (
          <>
            {isMultipleChoice ? (
              // Multiple choice with checkboxes
              <div className="space-y-1.5">
                {options.map((opt, index) => {
                  const label = typeof opt === "string" ? opt : opt.label;
                  const description =
                    typeof opt === "string" ? undefined : opt.description;
                  const isSelected = selectedIndices.includes(index);

                  return (
                    <div
                      key={index}
                      className={`flex items-start gap-3 text-xs p-2.5 rounded-lg transition-all cursor-pointer ${
                        isSelected
                          ? "bg-primary/10 border border-primary/30"
                          : "text-zinc-600 bg-background border border-zinc-200 hover:border-zinc-300"
                      } ${isSkipped ? "cursor-default" : ""}`}
                      onClick={() => !isSkipped && handleSelectOption(index)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => !isSkipped && handleSelectOption(index)}
                        id={`${question.id ?? "q"}-opt-${index}`}
                        className="mt-0.5 shrink-0"
                        disabled={isSkipped}
                      />
                      <Label
                        htmlFor={`${question.id ?? "q"}-opt-${index}`}
                        className="flex-1 cursor-pointer font-normal"
                      >
                        {label}
                        {description && (
                          <span className="block mt-1 text-zinc-500 font-normal">
                            {description}
                          </span>
                        )}
                      </Label>
                    </div>
                  );
                })}

                {/* Other (specify your own) */}
                <div className="pt-2 border-t border-zinc-200">
                  <div
                    className={`flex flex-col gap-2 text-xs p-2.5 rounded-lg transition-all ${
                      isOther
                        ? "bg-primary/10 border border-primary/30"
                        : "text-zinc-600 bg-background border border-zinc-200 hover:border-zinc-300"
                    } ${!isSkipped ? "cursor-pointer" : "cursor-default"}`}
                    onClick={(e) => {
                      if (!isSkipped && !(e.target instanceof HTMLInputElement))
                        handleSelectOther();
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isOther}
                        onCheckedChange={() => !isSkipped && handleSelectOther()}
                        id={`${question.id ?? "q"}-opt-other`}
                        className="mt-0.5 shrink-0"
                        disabled={isSkipped}
                      />
                      <Label
                        htmlFor={`${question.id ?? "q"}-opt-other`}
                        className="flex-1 cursor-pointer font-normal"
                      >
                        Other (specify your own)
                      </Label>
                    </div>
                    {isOther && (
                      <Input
                        value={otherText}
                        onChange={(e) => handleOtherTextChange(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="Enter your preferred option..."
                        className="min-h-[36px] min-w-0 max-w-full text-xs border-zinc-200 focus:border-zinc-300 rounded-lg ml-7 w-[calc(100%-1.75rem)]"
                        disabled={isSkipped}
                      />
                    )}
                  </div>
                </div>
              </div>
            ) : (
              // Single choice with radio buttons
              <RadioGroup
                value={
                  isOther
                    ? "other"
                    : selectedIdx != null && selectedIdx >= 0
                      ? String(selectedIdx)
                      : ""
                }
                onValueChange={(value) => {
                  if (isSkipped) return;
                  if (value === "other") {
                    handleSelectOther();
                  } else {
                    const idx = parseInt(value, 10);
                    if (!Number.isNaN(idx)) handleSelectOption(idx);
                  }
                }}
                className="space-y-1.5"
                disabled={isSkipped}
              >
                {options.map((opt, index) => {
                  const label = typeof opt === "string" ? opt : opt.label;
                  const description =
                    typeof opt === "string" ? undefined : opt.description;

                  return (
                    <div
                      key={index}
                      className={`flex items-start gap-3 text-xs p-2.5 rounded-lg transition-all cursor-pointer ${
                        !isOther && selectedIdx === index
                          ? "bg-primary/10 border border-primary/30"
                          : "text-zinc-600 bg-background border border-zinc-200 hover:border-zinc-300"
                      } ${isSkipped ? "cursor-default" : ""}`}
                      onClick={() => !isSkipped && handleSelectOption(index)}
                    >
                      <RadioGroupItem
                        value={String(index)}
                        id={`${question.id ?? "q"}-opt-${index}`}
                        className="mt-0.5 shrink-0"
                      />
                      <Label
                        htmlFor={`${question.id ?? "q"}-opt-${index}`}
                        className="flex-1 cursor-pointer font-normal"
                      >
                        {label}
                        {description && (
                          <span className="block mt-1 text-zinc-500 font-normal">
                            {description}
                          </span>
                        )}
                      </Label>
                    </div>
                  );
                })}

                {/* Other (specify your own) */}
                <div className="pt-2 border-t border-zinc-200">
                  <div
                    className={`flex flex-col gap-2 text-xs p-2.5 rounded-lg transition-all ${
                      isOther
                        ? "bg-primary/10 border border-primary/30"
                        : "text-zinc-600 bg-background border border-zinc-200 hover:border-zinc-300"
                    } ${!isSkipped ? "cursor-pointer" : "cursor-default"}`}
                    onClick={(e) => {
                      if (!isSkipped && !(e.target instanceof HTMLInputElement))
                        handleSelectOther();
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <RadioGroupItem
                        value="other"
                        id={`${question.id ?? "q"}-opt-other`}
                        className="mt-0.5 shrink-0"
                      />
                      <Label
                        htmlFor={`${question.id ?? "q"}-opt-other`}
                        className="flex-1 cursor-pointer font-normal"
                      >
                        Other (specify your own)
                      </Label>
                    </div>
                    {isOther && (
                      <Input
                        value={otherText}
                        onChange={(e) => handleOtherTextChange(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="Enter your preferred option..."
                        className="min-h-[36px] min-w-0 max-w-full text-xs border-zinc-200 focus:border-zinc-300 rounded-lg ml-7 w-[calc(100%-1.75rem)]"
                        disabled={isSkipped}
                      />
                    )}
                  </div>
                </div>
              </RadioGroup>
            )}
          </>
        )}
      </div>
    </div>
  );
}
