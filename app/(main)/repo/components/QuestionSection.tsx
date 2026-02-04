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
