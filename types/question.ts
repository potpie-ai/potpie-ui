import type { MCQQuestion, QuestionAnswer } from "@/services/QuestionService";

export type { MCQQuestion, QuestionAnswer };

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

export const DEFAULT_SECTION_ORDER = [
  "Overview",
  "Requirements",
  "Architecture",
  "Implementation",
  "Testing",
  "Deployment",
  "Documentation",
];

