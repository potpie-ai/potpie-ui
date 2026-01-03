import type { MCQQuestion } from "@/services/QuestionService";

// Re-export MCQQuestion
export type { MCQQuestion };

// QuestionAnswer with camelCase properties for component usage
export interface QuestionAnswer {
  question_id?: string;
  questionId?: string; // For backward compatibility with component state
  textAnswer?: string;
  mcqAnswer?: string;
  is_user_modified?: boolean;
  is_skipped?: boolean;
  // For internal component state
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
