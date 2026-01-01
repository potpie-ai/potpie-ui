// types/question.ts
/**
 * Question and Answer type definitions for the repository analysis flow
 */

/**
 * Multiple Choice Question with AI analysis
 */
export interface MCQQuestion {
  id: string;
  section: string;
  question: string;
  options: string[];
  needsInput: boolean;
  assumed?: string;
  reasoning?: string;
}

/**
 * Answer state for a question
 */
export interface QuestionAnswer {
  questionId: string;
  textAnswer?: string;
  mcqAnswer?: string;
  isEditing: boolean;
  isUserModified: boolean;
}

/**
 * Page state for repository analysis
 */
export interface RepoPageState {
  pageState: "generating" | "questions";
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
  "Architecture",
  "Database",
  "API Design",
  "Security",
  "Performance",
  "Integration",
] as const;

