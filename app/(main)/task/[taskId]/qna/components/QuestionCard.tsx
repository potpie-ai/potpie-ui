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
  /** Root element id for scroll-into-view (e.g. `question-${question.id}`). */
  id?: string;
  onHover: () => void;
  onHoverLeave: () => void;
  onAnswerChange: (answer: Partial<QuestionAnswer>) => void;
  onSave?: () => void;
  onCancel?: () => void;
  onToggleOptions?: () => void;
  onToggleSkip?: () => void;
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
  id: idProp,
  onHover,
  onHoverLeave,
  onAnswerChange,
  onSave: _onSave,
  onCancel: _onCancel,
  onToggleOptions,
  onToggleSkip: _onToggleSkip,
}: QuestionCardProps) {
  const options = getOptions(question);
  const isMultipleChoice = question.multipleChoice ?? false;
  const selectedIdx = answer?.selectedOptionIdx;
  const selectedIndices = answer?.selectedOptionIndices ?? [];
  const isOther = answer?.isOther ?? false;
  const otherText = answer?.otherText ?? "";
  const hasAnswer =
    (answer?.textAnswer != null && answer.textAnswer.trim() !== "" && !answer.isOther) || // free-text answer (no options)
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
    "p-4 rounded-xl border transition-all duration-200 relative",
    isSkipped && "bg-neutral-100/60 border-neutral-200 opacity-50",
    !isSkipped && "bg-neutral-100 border-neutral-200",
    isUnanswered && !isSkipped && "ring-2 ring-amber-400/60 border-amber-300",
    isHovered && !isSkipped && "border-neutral-300",
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

  const handleFreeTextChange = (value: string) => {
    if (isSkipped) return;
    onAnswerChange({
      textAnswer: value,
      isOther: false,
      selectedOptionIdx: undefined,
      selectedOptionIndices: undefined,
      otherText: undefined,
      isUserModified: true,
    });
  };

  const isFreeTextOnly = options.length === 0;
  const freeTextValue = isFreeTextOnly ? (answer?.textAnswer ?? "") : "";

  return (
    <div
      id={idProp}
      className={cardClasses}
      onMouseEnter={onHover}
      onMouseLeave={onHoverLeave}
    >
      <div className="space-y-4">
        {/* Question */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-1">
            <p
              className={`text-sm font-bold leading-relaxed ${
                isSkipped ? "text-zinc-400 line-through" : "text-primary-color"
              }`}
            >
              {question.question}
            </p>
            {question.multipleChoice && options.length > 0 && !isSkipped && (
              <p className="text-xs text-muted-foreground">
                (Select all that apply)
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
            {isSkipped && (
              <span className="px-1.5 py-0.5 bg-zinc-200 border border-zinc-300 rounded text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Skipped
              </span>
            )}
            {!isSkipped && (needsInput || (isFreeTextOnly && !hasAnswer)) && (
              <span
                className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider"
                style={{
                  backgroundColor: "#F9FFE9",
                  border: "1px solid #B6E343",
                  color: "#4a6b00",
                  fontFamily: "'Roboto Mono', monospace",
                }}
              >
                Input Needed
              </span>
            )}
          </div>
        </div>

        {/* Free-text input when question has no options (input-needed / open-ended) */}
        {isFreeTextOnly && (
          <div className="pt-1">
            <Input
              value={freeTextValue}
              onChange={(e) => handleFreeTextChange(e.target.value)}
              placeholder="Enter your answer..."
              className="min-h-[40px] text-sm border-zinc-200 focus:border-primary rounded-lg"
              disabled={isSkipped}
            />
          </div>
        )}

        {/* Options - radio or checkbox selection */}
        {options.length > 0 && (
          <>
            {isMultipleChoice ? (
              // Multiple choice: each option in its own white pill-style box
              <div className="space-y-2">
                {options.map((opt, index) => {
                  const label = typeof opt === "string" ? opt : opt.label;
                  const isSelected = selectedIndices.includes(index);

                  return (
                    <div
                      key={index}
                      className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-white border-neutral-300 shadow-sm text-primary-color"
                          : "bg-white border-neutral-200 hover:border-neutral-300 text-foreground"
                      } ${isSkipped ? "cursor-default" : ""}`}
                      onClick={() => !isSkipped && handleSelectOption(index)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => !isSkipped && handleSelectOption(index)}
                        onClick={(e) => e.stopPropagation()}
                        id={`${question.id ?? "q"}-opt-${index}`}
                        className="mt-0.5 shrink-0"
                        disabled={isSkipped}
                      />
                      <span className="text-sm font-normal flex-1">
                        {label}
                      </span>
                    </div>
                  );
                })}

                {/* Other (specify your own) */}
                <div
                  className={`flex flex-col gap-2 p-3 rounded-xl border transition-all ${
                    isOther
                      ? "bg-white border-neutral-300 shadow-sm text-primary-color"
                      : "bg-white border-neutral-200 hover:border-neutral-300 text-foreground"
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
                    <span className="text-sm font-normal">
                      Other (specify your own)
                    </span>
                  </div>
                  {isOther && (
                    <Input
                      value={otherText}
                      onChange={(e) => handleOtherTextChange(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Enter your preferred option..."
                      className="min-h-[36px] min-w-0 max-w-full text-sm border-neutral-200 focus:border-primary rounded-lg ml-7 w-[calc(100%-1.75rem)]"
                      disabled={isSkipped}
                    />
                  )}
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
                className="space-y-2"
                disabled={isSkipped}
              >
                {options.map((opt, index) => {
                  const label = typeof opt === "string" ? opt : opt.label;

                  return (
                    <div
                      key={index}
                      className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                        !isOther && selectedIdx === index
                          ? "bg-white border-neutral-300 shadow-sm text-primary-color"
                          : "bg-white border-neutral-200 hover:border-neutral-300 text-foreground"
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
                        className="text-sm font-normal cursor-pointer flex-1"
                      >
                        {label}
                      </Label>
                    </div>
                  );
                })}

                {/* Other (specify your own) */}
                <div
                  className={`flex flex-col gap-2 p-3 rounded-xl border transition-all ${
                    isOther
                      ? "bg-white border-neutral-300 shadow-sm text-primary-color"
                      : "bg-white border-neutral-200 hover:border-neutral-300 text-foreground"
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
                    <span className="text-sm font-normal">
                      Other (specify your own)
                    </span>
                  </div>
                  {isOther && (
                    <Input
                      value={otherText}
                      onChange={(e) => handleOtherTextChange(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Enter your preferred option..."
                      className="min-h-[36px] min-w-0 max-w-full text-sm border-neutral-200 focus:border-primary rounded-lg ml-7 w-[calc(100%-1.75rem)]"
                      disabled={isSkipped}
                    />
                  )}
                </div>
              </RadioGroup>
            )}
          </>
        )}
      </div>
    </div>
  );
}
