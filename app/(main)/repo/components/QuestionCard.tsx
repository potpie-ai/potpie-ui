"use client";

import { useState } from "react";
import { Edit2, ChevronDown, ChevronUp, EyeOff, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import QuestionAnswerDisplay from "./QuestionAnswerDisplay";
import QuestionEditMode from "./QuestionEditMode";
import type { MCQQuestion, QuestionAnswer } from "@/types/question";

interface QuestionCardProps {
  question: MCQQuestion;
  answer?: QuestionAnswer;
  isHovered: boolean;
  isExpanded: boolean;
  isSkipped: boolean;
  onHover: () => void;
  onHoverLeave: () => void;
  onAnswerChange: (answer: Partial<QuestionAnswer>) => void;
  onSave: () => void;
  onCancel: () => void;
  onToggleOptions: () => void;
  onToggleSkip: () => void;
}

export default function QuestionCard({
  question,
  answer,
  isHovered,
  isExpanded,
  isSkipped,
  onHover,
  onHoverLeave,
  onAnswerChange,
  onSave,
  onCancel,
  onToggleOptions,
  onToggleSkip,
}: QuestionCardProps) {
  const [localAnswer, setLocalAnswer] = useState<Partial<QuestionAnswer>>(
    answer || { questionId: question.id, isEditing: false, isUserModified: false }
  );

  const isAIAssumed = question.assumed && !answer?.isUserModified;
  const isUserEdited = answer?.isUserModified || false;
  const hasAnswer = answer?.textAnswer || answer?.mcqAnswer;

  // Determine card styling based on state
  let cardClasses = "p-4 rounded-xl border transition-all duration-200 ";
  if (isSkipped) {
    cardClasses += "bg-zinc-50/50 border-zinc-200 opacity-50";
  } else if (isUserEdited) {
    cardClasses += "bg-background border-[#D3E5E5] ring-1 ring-primary";
  } else if (isAIAssumed) {
    cardClasses += "bg-background border-[#D3E5E5]";
  } else {
    cardClasses += "bg-background border-[#D3E5E5]";
  }
  if (isHovered && !isSkipped) {
    cardClasses += " border-[#D3E5E5]";
  }

  const handleEdit = () => {
    setLocalAnswer({ ...answer, isEditing: true });
    onAnswerChange({ isEditing: true });
  };

  const handleSave = () => {
    onAnswerChange(localAnswer);
    onSave();
  };

  const handleCancel = () => {
    setLocalAnswer(answer || { questionId: question.id, isEditing: false, isUserModified: false });
    onCancel();
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
              <p className={`text-sm font-medium leading-relaxed flex-1 ${isSkipped ? "text-zinc-400 line-through" : "text-primary"}`}>
                {question.question}
              </p>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {isSkipped && (
                  <span className="px-1.5 py-0.5 bg-zinc-100 border border-zinc-200 rounded text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Skipped
                  </span>
                )}

                {!isSkipped && question.needsInput && !hasAnswer && (
                  <span className="px-1.5 py-0.5 bg-accent/20 border border-accent/40 rounded text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
                    Needs Input
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
          <div className="flex items-center gap-1">
            {/* Skip/Unskip button - always visible on hover */}

            {/* Edit button - only when not skipped */}
            {!answer?.isEditing && !isSkipped && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEdit}
                className="h-8 w-8 p-0"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Answer Display or Edit Mode */}
        {answer?.isEditing ? (
          <QuestionEditMode
            question={question}
            currentAnswer={localAnswer}
            onAnswerChange={setLocalAnswer}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        ) : (
          <>
            {hasAnswer && answer != null && (
              <QuestionAnswerDisplay
                answer={answer}
                question={question}
              />
            )}
            {question.options && question.options.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleOptions}
                className="text-xs h-7 hover:bg-zinc-50 text-zinc-500"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Hide options
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    Show {question.options.length} options
                  </>
                )}
              </Button>
            )}
            {isExpanded && question.options && (
              <div className="mt-3 space-y-1.5">
                {question.options.map((option, index) => {
                  const optionLabel = String.fromCharCode(65 + index); // A, B, C, D
                  const isSelected = answer?.mcqAnswer === optionLabel;
                  // Strip prefix if already present (e.g., "A. Monolithic" -> "Monolithic")
                  const cleanOption = option.replace(/^[A-Z]\.\s*/, "");
                  return (
                    <div
                      key={index}
                      onClick={() => {
                        if (!isSkipped && !answer?.isEditing) {
                          onAnswerChange({
                            mcqAnswer: optionLabel,
                            textAnswer: undefined,
                            isUserModified: true,
                          });
                          // Don't auto-save - answers will be submitted when generating plan
                          // onSave() is only needed for the old project-based flow
                        }
                      }}
                      className={`text-xs p-2.5 rounded-lg transition-all ${
                        isSelected
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "text-zinc-600 bg-background border border-zinc-200 hover:border-zinc-300"
                      } ${
                        !isSkipped && !answer?.isEditing ? "cursor-pointer" : "cursor-default"
                      }`}
                    >
                      <span className="font-bold mr-2">{optionLabel}.</span>
                      {cleanOption}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}


