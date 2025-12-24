"use client";

import { useState } from "react";
import { Edit2, ChevronDown, ChevronUp, EyeOff, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import QuestionAnswerDisplay from "./QuestionAnswerDisplay";
import QuestionEditMode from "./QuestionEditMode";

interface MCQQuestion {
  id: string;
  section: string;
  question: string;
  options: string[];
  needsInput: boolean;
  assumed?: string;
  reasoning?: string;
}

interface QuestionAnswer {
  questionId: string;
  textAnswer?: string;
  mcqAnswer?: string;
  isEditing: boolean;
  isUserModified: boolean;
}

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
  let cardClasses = "p-3 rounded-lg border transition-all duration-200 ";
  if (isSkipped) {
    cardClasses += "bg-gray-100 border-gray-300 opacity-60";
  } else if (isUserEdited) {
    cardClasses += "bg-blue-50 border-blue-300";
  } else if (isAIAssumed) {
    cardClasses += "bg-blue-50 border-blue-200";
  } else {
    cardClasses += "bg-gray-50/30 border-gray-200/50";
  }
  if (isHovered && !isSkipped) {
    cardClasses += " shadow-md";
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
      <div className="space-y-2">
        {/* Question Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className={`text-sm font-medium ${isSkipped ? "text-gray-500 line-through" : "text-gray-900"}`}>
                {question.question}
              </p>
              {isSkipped && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0.5 bg-gray-200 text-gray-600">
                  Skipped
                </Badge>
              )}
              {!isSkipped && isAIAssumed && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700">
                  AI
                </Badge>
              )}
              {!isSkipped && isUserEdited && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700">
                  Edited
                </Badge>
              )}
              {!isSkipped && question.needsInput && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700">
                  Needs Input
                </Badge>
              )}
            </div>
            {!isSkipped && question.reasoning && (
              <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                🤖 {question.reasoning}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1">
            {/* Skip/Unskip button - always visible on hover */}
            {isHovered && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleSkip}
                className="h-8 w-8 p-0"
                title={isSkipped ? "Include this question" : "Skip this question"}
              >
                {isSkipped ? (
                  <Eye className="h-4 w-4 text-green-600" />
                ) : (
                  <EyeOff className="h-4 w-4 text-gray-500" />
                )}
              </Button>
            )}
            {/* Edit button - only when not skipped */}
            {isHovered && !answer?.isEditing && !isSkipped && (
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
            {hasAnswer && (
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
                className="text-xs h-7"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Hide options
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    Show options
                  </>
                )}
              </Button>
            )}
            {isExpanded && question.options && (
              <div className="mt-2 space-y-1 pl-4 border-l-2 border-gray-200">
                {question.options.map((option, index) => {
                  const optionLabel = String.fromCharCode(65 + index); // A, B, C, D
                  const isSelected = answer?.mcqAnswer === optionLabel;
                  // Strip prefix if already present (e.g., "A. Monolithic" -> "Monolithic")
                  const cleanOption = option.replace(/^[A-Z]\.\s*/, "");
                  return (
                    <div
                      key={index}
                      className={`text-xs p-2 rounded-md ${
                        isSelected
                          ? "bg-blue-100 text-blue-900 font-medium"
                          : "text-gray-700"
                      }`}
                    >
                      <span className="font-medium mr-2">{optionLabel}.</span>
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


