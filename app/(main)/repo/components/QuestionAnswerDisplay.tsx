"use client";

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

interface QuestionAnswerDisplayProps {
  answer: QuestionAnswer;
  question: MCQQuestion;
}

export default function QuestionAnswerDisplay({
  answer,
  question,
}: QuestionAnswerDisplayProps) {
  // Helper to strip option prefix (A., B., etc.) if already present
  const stripOptionPrefix = (option: string): string => {
    return option.replace(/^[A-Z]\.\s*/, "");
  };

  let displayText: string | undefined;
  
  if (answer.textAnswer) {
    // Custom text answer
    displayText = answer.textAnswer;
  } else if (answer.mcqAnswer && question.options) {
    // MCQ answer - get the option and strip prefix if present
    const optionIndex = answer.mcqAnswer.charCodeAt(0) - 65;
    const optionText = question.options[optionIndex] || "";
    const cleanOption = stripOptionPrefix(optionText);
    displayText = `${answer.mcqAnswer}. ${cleanOption}`;
  } else if (answer.mcqAnswer) {
    // Just the letter
    displayText = answer.mcqAnswer;
  }

  if (!displayText) return null;

  return (
    <div className="p-2 bg-white border border-gray-200 rounded-md">
      <p className="text-xs text-gray-900">{displayText}</p>
    </div>
  );
}


