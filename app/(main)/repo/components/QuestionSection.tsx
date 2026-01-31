"use client";

import QuestionCard from "./QuestionCard";
import type { MCQQuestion, QuestionAnswer } from "@/types/question";

interface QuestionSectionProps {
  section: string;
  questions: MCQQuestion[];
  answers: Map<string, QuestionAnswer>;
  hoveredQuestion: string | null;
  skippedQuestions: Set<string>;
  unansweredQuestionIds: Set<string>;
  onHover: (questionId: string | null) => void;
  onAnswerChange: (questionId: string, answer: Partial<QuestionAnswer>) => void;
  onToggleSkip: (questionId: string) => void;
}

export default function QuestionSection({
  section,
  questions,
  answers,
  hoveredQuestion,
  skippedQuestions,
  unansweredQuestionIds,
  onHover,
  onAnswerChange,
  onToggleSkip,
}: QuestionSectionProps) {
  if (questions.length === 0) return null;

  return (
    <>
      {questions.map((question) => (
        <QuestionCard
          key={question.id}
          question={question}
          answer={answers.get(question.id)}
          isHovered={hoveredQuestion === question.id}
          isExpanded={true}
          isSkipped={skippedQuestions.has(question.id)}
          isUnanswered={unansweredQuestionIds.has(question.id)}
          onHover={() => onHover(question.id)}
          onHoverLeave={() => onHover(null)}
          onAnswerChange={(answer) => onAnswerChange(question.id, answer)}
        />
      ))}
    </>
  );
}
