"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import QuestionCard from "./QuestionCard";
import type { MCQQuestion, QuestionAnswer } from "@/types/question";

interface QuestionSectionProps {
  section: string;
  questions: MCQQuestion[];
  answers: Map<string, QuestionAnswer>;
  hoveredQuestion: string | null;
  expandedOptions?: Set<string>;
  skippedQuestions?: Set<string>;
  onHover: (questionId: string | null) => void;
  onAnswerChange: (questionId: string, answer: Partial<QuestionAnswer>) => void;
  onSave?: (questionId: string) => void;
  onCancel?: (questionId: string) => void;
  onToggleOptions?: (questionId: string) => void;
  onToggleSkip: (questionId: string) => void;
}

export default function QuestionSection({
  section,
  questions,
  answers,
  hoveredQuestion,
  expandedOptions,
  skippedQuestions,
  onHover,
  onAnswerChange,
  onSave,
  onCancel,
  onToggleOptions,
  onToggleSkip,
}: QuestionSectionProps) {
  if (questions.length === 0) return null;

  const safeExpandedOptions = expandedOptions ?? new Set<string>();
  const safeSkippedQuestions = skippedQuestions ?? new Set<string>();

  return (
    <>
      {questions.map((question) => (
        <QuestionCard
          key={question.id}
          question={question}
          answer={answers.get(question.id)}
          isHovered={hoveredQuestion === question.id}
          isExpanded={safeExpandedOptions.has(question.id)}
          isSkipped={safeSkippedQuestions.has(question.id)}
          onHover={() => onHover(question.id)}
          onHoverLeave={() => onHover(null)}
          onAnswerChange={(answer) => onAnswerChange(question.id, answer)}
          onToggleOptions={
            onToggleOptions ? () => onToggleOptions(question.id) : undefined
          }
        />
      ))}
    </>
  );
}
