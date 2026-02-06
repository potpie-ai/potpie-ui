/**
 * Type definitions for Question Service API endpoints
 * Based on API contract for workflows API
 */

/**
 * Request payload for generating questions
 * POST /api/v1/repos/analyze
 */
export interface GenerateQuestionsRequest {
  project_id: string; // Required
  feature_idea?: string; // Optional feature idea/description
}

/**
 * Question option format (supports both string and object formats)
 */
export interface QuestionOption {
  label: string;
  description?: string;
}

/**
 * Alias for QuestionOption for backward compatibility
 */
export type MCQOption = QuestionOption;

/**
 * Context reference for question context
 */
export interface QuestionContextRef {
  path?: string;
  type?: string;
  [key: string]: unknown;
}

/**
 * Question format returned by API
 * Supports both legacy (string options) and new (object options) formats
 */
export interface APIQuestion {
  id: string;
  section: string;
  question: string;
  options: string[] | QuestionOption[];
  needsInput: boolean;
  multipleChoice?: boolean;
  assumed?: string;
  reasoning?: string;
  answerRecommendationIdx?: number | null;
  expectedAnswerType?: string;
  contextRefs?: QuestionContextRef[] | null;
  criticality?: "BLOCKER" | "IMPORTANT" | "NICE_TO_HAVE";
}

/**
 * Response from POST /api/v1/repos/analyze
 * Generate questions for a project
 */
export interface GenerateQuestionsResponse {
  questions: APIQuestion[];
}

/**
 * Answer format for questions
 */
export interface QuestionAnswer {
  question_id: string;
  text_answer?: string;
  mcq_answer?: string;
  is_user_modified?: boolean;
  is_skipped?: boolean;
}

/**
 * Response from GET /api/v1/projects/{projectId}/questions
 * Get questions and answers for a project
 */
export interface GetQuestionsResponse {
  questions: APIQuestion[];
  answers: {
    [question_id: string]: QuestionAnswer;
  };
}

/**
 * Answer payload format for submitting answers
 */
export interface AnswerPayload {
  text_answer?: string;
  mcq_answer?: string;
}

/**
 * Request payload for submitting answers
 * POST /api/v1/projects/{projectId}/questions/answers
 */
export interface SubmitAnswersRequest {
  answers: {
    [question_id: string]: AnswerPayload;
  };
}

/**
 * Response from POST /api/v1/projects/{projectId}/questions/answers
 * Submit answers to questions
 */
export interface SubmitAnswersResponse {
  status: string;
  saved_count: number;
}

/**
 * Request payload for generating plan
 * POST /api/v1/plans/generate
 */
export interface GeneratePlanRequest {
  project_id: string;
  answers: {
    [question_id: string]: AnswerPayload;
  };
  additional_context?: string; // Optional, defaults to empty string
}

/**
 * Response from POST /api/v1/plans/generate
 * Generate implementation plan
 */
export interface GeneratePlanResponse {
  plan_id: string;
  plan_document: string;
}

/**
 * Recipe status values for question endpoints
 */
export type RecipeQuestionStatus =
  | "PENDING_QUESTIONS"
  | "QUESTIONS_READY"
  | "SPEC_IN_PROGRESS"
  | "IN_PROGRESS"
  | "ERROR";

// RecipeQuestionsResponse is exported from spec.ts since it's shared with SpecService
