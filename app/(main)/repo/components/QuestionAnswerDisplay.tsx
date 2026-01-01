"use client";

import type { MCQQuestion, QuestionAnswer } from "@/types/question";

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
    // MCQ answer - validate before indexing
    const mcqAnswer = answer.mcqAnswer.trim().toUpperCase();
    // Check if it's a single uppercase letter (A-Z)
    if (mcqAnswer.length === 1 && mcqAnswer >= "A" && mcqAnswer <= "Z") {
      const optionIndex = mcqAnswer.charCodeAt(0) - 65;
      // Validate index is within bounds
      if (optionIndex >= 0 && optionIndex < question.options.length) {
        const optionText = question.options[optionIndex];
        const cleanOption = stripOptionPrefix(optionText);
        displayText = `${mcqAnswer}. ${cleanOption}`;
      } else {
        // Index out of bounds - fallback to just the letter
        displayText = mcqAnswer;
      }
    } else {
      // Invalid format - fallback to displaying as-is
      displayText = answer.mcqAnswer;
    }
  } else if (answer.mcqAnswer) {
    // Just the letter
    displayText = answer.mcqAnswer;
  }

  if (!displayText) return null;

  return (
    <div className="p-3 bg-zinc-50/50 border-l-2 border-zinc-900 rounded-lg">
      <p className="text-xs text-zinc-900 font-medium leading-relaxed">{displayText}</p>
    </div>
  );
}


