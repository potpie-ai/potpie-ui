"use client";

import QuestionCard from "./QuestionCard";
import type { MCQQuestion, QuestionAnswer } from "@/types/question";

interface QuestionSectionProps {
  section: string;
  questions: MCQQuestion[];
  answers: Map<string, QuestionAnswer>;
  hoveredQuestion: string | null;
  expandedOptions: Set<string>;
  skippedQuestions: Set<string>;
  unansweredQuestionIds?: Set<string>;
  questionRefs?: React.MutableRefObject<Map<string, HTMLDivElement>>;
  onHover: (questionId: string | null) => void;
  onAnswerChange: (questionId: string, answer: Partial<QuestionAnswer>) => void;
  onToggleOptions: (questionId: string) => void;
}

export default function QuestionSection({
  section,
  questions,
  answers,
  hoveredQuestion,
  expandedOptions,
  skippedQuestions,
  unansweredQuestionIds,
  questionRefs,
  onHover,
  onAnswerChange,
  onToggleOptions,
}: QuestionSectionProps) {
  if (questions.length === 0) return null;

  // Check if a question was auto-selected (has an answer that was NOT user-modified)
  const isAutoSelected = (questionId: string): boolean => {
    const answer = answers.get(questionId);
    if (!answer) return false;
    // If the answer exists and was NOT user-modified, it was auto-selected
    return !answer.isUserModified && (
      answer.selectedOptionIdx != null ||
      (answer.selectedOptionIndices && answer.selectedOptionIndices.length > 0) ||
      !!answer.textAnswer
    );
  };

  return (
    <>
      {questions.map((question) => (
        <div
          key={question.id}
          ref={(el) => {
            if (el && questionRefs) {
              questionRefs.current.set(question.id, el);
            }
          }}
        >
          <QuestionCard
            question={question}
            answer={answers.get(question.id)}
            isHovered={hoveredQuestion === question.id}
            isExpanded={expandedOptions.has(question.id)}
            isSkipped={skippedQuestions.has(question.id)}
            isUnanswered={unansweredQuestionIds?.has(question.id) ?? false}
            isAutoSelected={isAutoSelected(question.id)}
            onHover={() => onHover(question.id)}
            onHoverLeave={() => onHover(null)}
            onAnswerChange={(answer) => onAnswerChange(question.id, answer)}
            onToggleOptions={() => onToggleOptions(question.id)}
          />
        </div>
      ))}
    </>
  );
}
