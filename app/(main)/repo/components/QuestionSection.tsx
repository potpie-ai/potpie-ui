"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import QuestionCard from "./QuestionCard";
import type { MCQQuestion, QuestionAnswer } from "@/types/question";

interface QuestionSectionProps {
  section: string;
  questions: MCQQuestion[];
  answers: Map<string, QuestionAnswer>;
  hoveredQuestion: string | null;
  expandedOptions: Set<string>;
  skippedQuestions: Set<string>;
  onHover: (questionId: string | null) => void;
  onAnswerChange: (questionId: string, answer: Partial<QuestionAnswer>) => void;
  onSave: (questionId: string) => void;
  onCancel: (questionId: string) => void;
  onToggleOptions: (questionId: string) => void;
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

  return (
    <Card className="border-zinc-200 bg-white rounded-xl">
      <CardHeader className="pb-3">
        <h2 className="text-xs font-bold text-zinc-900 uppercase tracking-wide">{section}</h2>
      </CardHeader>
      <CardContent className="space-y-3">
        {questions.map((question) => (
          <QuestionCard
            key={question.id}
            question={question}
            answer={answers.get(question.id)}
            isHovered={hoveredQuestion === question.id}
            isExpanded={expandedOptions.has(question.id)}
            isSkipped={skippedQuestions.has(question.id)}
            onHover={() => onHover(question.id)}
            onHoverLeave={() => onHover(null)}
            onAnswerChange={(answer) => onAnswerChange(question.id, answer)}
            onSave={() => onSave(question.id)}
            onCancel={() => onCancel(question.id)}
            onToggleOptions={() => onToggleOptions(question.id)}
            onToggleSkip={() => onToggleSkip(question.id)}
          />
        ))}
      </CardContent>
    </Card>
  );
}


