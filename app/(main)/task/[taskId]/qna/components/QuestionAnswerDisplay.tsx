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

  const isMultipleChoice = question.multipleChoice ?? false;
  let displayText: string | undefined;
  
  if (answer.textAnswer) {
    // Custom text answer (works for both single and multiple)
    displayText = answer.textAnswer;
  } else if (isMultipleChoice && answer.selectedOptionIndices && answer.selectedOptionIndices.length > 0) {
    // Multiple choice: display all selected options
    const options = Array.isArray(question.options)
      ? question.options.map((o) => (typeof o === "string" ? { label: o } : o))
      : [];
    const selectedOptions = answer.selectedOptionIndices
      .filter(idx => idx >= 0 && idx < options.length)
      .map(idx => {
        const opt = options[idx];
        const label = typeof opt === "string" ? opt : opt.label;
        const letter = String.fromCharCode(65 + idx);
        const cleanLabel = typeof opt === "string" ? stripOptionPrefix(label) : label;
        return `${letter}. ${cleanLabel}`;
      });
    displayText = selectedOptions.join(", ");
  } else if (answer.mcqAnswer && question.options) {
    // Single choice MCQ answer - validate before indexing
    const mcqAnswer = answer.mcqAnswer.trim().toUpperCase();
    // Check if it's a single uppercase letter (A-Z) or comma-separated
    if (mcqAnswer.includes(",")) {
      // Multiple selections (fallback for legacy format)
      const letters = mcqAnswer.split(",").map(l => l.trim());
      const options = Array.isArray(question.options)
        ? question.options.map((o) => (typeof o === "string" ? { label: o } : o))
        : [];
      const selectedOptions = letters
        .filter(l => l.length === 1 && l >= "A" && l <= "Z")
        .map(l => {
          const idx = l.charCodeAt(0) - 65;
          if (idx >= 0 && idx < options.length) {
            const opt = options[idx];
            const label = typeof opt === "string" ? opt : opt.label;
            const cleanLabel = typeof opt === "string" ? stripOptionPrefix(label) : label;
            return `${l}. ${cleanLabel}`;
          }
          return l;
        });
      displayText = selectedOptions.join(", ");
    } else if (mcqAnswer.length === 1 && mcqAnswer >= "A" && mcqAnswer <= "Z") {
      const optionIndex = mcqAnswer.charCodeAt(0) - 65;
      // Validate index is within bounds
      if (optionIndex >= 0 && optionIndex < question.options.length) {
        const optionText = question.options[optionIndex];
        const cleanOption = typeof optionText === "string"
          ? stripOptionPrefix(optionText)
          : optionText.label;
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
    <div className="p-3 bg-zinc-50/50 border-l-2 border-primary rounded-lg">
      <p className="text-xs text-primary font-medium leading-relaxed">{displayText}</p>
    </div>
  );
}
