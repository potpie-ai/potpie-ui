import type { MCQQuestion } from "@/services/QuestionService";

// Re-export MCQQuestion
export type { MCQQuestion };

// QuestionAnswer with camelCase properties for component usage
export interface QuestionAnswer {
  question_id?: string;
  questionId?: string; // For backward compatibility with component state
  /** Selected option label (e.g., "Hybrid Auth Strategy") or "Other: <user_input>" */
  textAnswer?: string;
  /** Legacy: option letter (A, B, C). New: use selectedOptionIdx or isOther + otherText */
  mcqAnswer?: string;
  /** New: index of selected option (0-based), -1 or undefined = not selected (single selection) */
  selectedOptionIdx?: number;
  /** New: indices of selected options (0-based) for multiple choice questions */
  selectedOptionIndices?: number[];
  /** New: true when "Other (specify your own)" is selected */
  isOther?: boolean;
  /** New: user input when isOther is true - submitted as "Other: <value>" */
  otherText?: string;
  is_user_modified?: boolean;
  is_skipped?: boolean;
  isEditing?: boolean;
  isUserModified?: boolean;
}

/**
 * Page state for repository analysis
 */
export interface RepoPageState {
  pageState: "generating" | "questions" | "plan";
  questions: MCQQuestion[];
  visibleQuestions: Set<string>;
  answers: Map<string, QuestionAnswer>;
  sections: Map<string, MCQQuestion[]>;
  additionalContext: string;
  hoveredQuestion: string | null;
  expandedOptions: Set<string>;
  skippedQuestions: Set<string>;
  /** IDs of questions that need answers (for validation highlighting) */
  unansweredQuestionIds?: Set<string>;
  isGenerating: boolean;
}

/**
 * Default section order for UI display prioritization
 * All sections from questions will be displayed regardless of this list
 */
export const DEFAULT_SECTION_ORDER = [
  "Overview",
  "Requirements",
  "Architecture",
  "Implementation",
  "Testing",
  "Deployment",
  "Documentation",
];
