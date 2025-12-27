"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import QuestionCard from "./QuestionCard";

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
    <Card className="border-blue-200 bg-gradient-to-br from-card to-card/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-blue-600 rounded" />
          <h2 className="text-sm font-semibold text-gray-900">{section}</h2>
        </div>
      </CardHeader>
      <CardContent className="space-y-2.5">
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


