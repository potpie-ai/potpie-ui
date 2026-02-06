export type StepStatusValue =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "FAILED";

export type SpecGenerationStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "FAILED"
  | null;

export interface StepStatus {
  status: StepStatusValue;
  message: string;
}

export interface SpecFile {
  path: string;
  type: string;
}

export interface SpecItem {
  id: string;
  title: string;
  files: SpecFile[];
  dependencies: string[];
  externalConnections: string[];
  details: string;
  context: string;
}

export interface SpecOutput {
  add: SpecItem[];
  modify: SpecItem[];
  fix: SpecItem[];
}

export interface SpecProgress {
  recipe_id: string;
  spec_generation_step_status: SpecGenerationStatus;
  step_index: number | null;
  progress_percent: number | null;
  step_statuses: Record<number, StepStatus> | null;
  spec_output: SpecOutput | null;
  celery_task_id: string | null;
}

export interface QAAnswer {
  id?: string; // Optional, for existing questions
  question?: string; // For display/legacy support
  answer?: string; // For display/legacy support
  question_id?: string; // For backend reference
  text_answer?: string;
  mcq_answer?: string;
  is_user_modified?: boolean;
  is_skipped?: boolean;
}

/**
 * Request payload for POST /api/v1/recipe/spec (Legacy)
 * Submit QA answers and trigger spec generation
 */
export interface SpecPlanRequest {
  recipe_id: string;
  qa_answers: QAAnswer[];
}

/**
 * Response from POST /api/v1/recipe/spec (Legacy)
 * Submit QA answers and trigger spec generation
 */
export interface SpecPlanSubmitResponse {
  spec_id?: string;
  status: string;
  message?: string;
}

/**
 * Response from GET /api/v1/recipe/spec/{recipeId} (Legacy)
 * Get spec generation progress by recipe_id
 */
export interface SpecPlanStatusResponse {
  recipe_id: string;
  status: string;
  progress_percentage?: number;
  spec_document?: string;
  error_message?: string;
}

/**
 * Request payload for POST /api/v1/recipe (Legacy)
 */
export interface CreateRecipeRequest {
  project_id: string; // UUID, required
  user_prompt: string; // required
  user_requirements?: Record<string, any>; // Optional JSON object
}

/**
 * Response from POST /api/v1/recipe (Legacy)
 */
export interface CreateRecipeResponse {
  recipe_id: string;
}

/**
 * Request payload for POST /api/v1/recipes/
 * Create a new recipe
 */
export interface CreateRecipeCodegenRequest {
  user_prompt: string;
  project_id: string;
  additional_links?: string[];
}

/**
 * Response from POST /api/v1/recipes/
 * Create a new recipe
 */
export interface CreateRecipeCodegenResponse {
  recipe: {
    id: string;
    project_id: string;
    user_prompt: string;
    additional_links: string[];
    status: string;
    created_by: string;
    current_question_task_id: string | null;
    current_spec_task_id: string | null;
    current_plan_task_id: string | null;
  };
}

/**
 * Request payload for POST /api/v1/recipes/{recipe_id}/questions/generate
 * Trigger question generation for a recipe
 */
export interface TriggerQuestionGenerationRequest {
  user_prompt: string;
  additional_links?: string[];
}

/**
 * Response from POST /api/v1/recipes/{recipe_id}/questions/generate
 */
export interface TriggerQuestionGenerationResponse {
  recipe_id: string;
  status: string;
  created_at: string;
}

/** Option format for API (label + description + effort_estimate) */
export interface QuestionOption {
  label: string;
  description?: string;
  effort_estimate?: string | null;
}

/** AI recommendation with index and reasoning */
export interface AnswerRecommendation {
  idx: number | null;
  reasoning?: string;
}

/** Context reference for display */
export interface ContextReference {
  source?: string;
  reference?: string;
  description?: string;
  line_range?: string;
  path?: string;
  type?: string;
  [key: string]: unknown;
}

/** New API question format from GET /api/v1/recipes/{recipe_id}/questions */
export interface RecipeQuestionNew {
  id?: string;
  question: string;
  criticality?: "BLOCKER" | "IMPORTANT" | "NICE_TO_HAVE" | string;
  multiple_choice?: boolean;
  options?: QuestionOption[] | null;
  expected_answer_type?: string;
  answer_recommendation?: AnswerRecommendation | null;
  context_refs?: ContextReference[] | null;
}

/** Legacy question format (backward compatible) */
export interface RecipeQuestion {
  id: string;
  question: string;
  options: string[];
  preferred_option?: string;
  allow_custom_answer: boolean;
  optional: boolean;
  order: number;
}

/** Union type - API may return either format */
export type RecipeQuestionUnion = RecipeQuestion | (RecipeQuestionNew & { id: string });

/**
 * Response from GET /api/v1/recipes/{recipe_id}/questions
 * Get questions and generation status for a recipe
 */
export interface RecipeQuestionsResponse {
  recipe_id: string;
  generation_status: "pending" | "processing" | "completed" | "failed";
  questions: RecipeQuestionNew[];
  generated_at: string | null;
  error_message: string | null;
}

/**
 * Request payload for POST /api/v1/recipes/{recipe_id}/answers
 * Submit answers to recipe questions
 */
export interface SubmitRecipeAnswersRequest {
  answers: Record<string, string>; // question_id -> answer_text
}

/**
 * Response from POST /api/v1/recipes/{recipe_id}/answers
 */
export interface SubmitRecipeAnswersResponse {
  message: string;
  recipe_id: string;
  new_status: string;
}

/**
 * Response from POST /api/v1/recipes/{recipe_id}/spec/generate
 * Trigger spec generation
 */
export interface TriggerSpecGenerationResponse {
  recipe_id: string;
  status: string;
  created_at: string;
}

/**
 * Context structure within specification
 */
export interface SpecificationContext {
  original_request?: string;
  janus_analysis?: string;
  qa_answers?: string;
  research_findings?: string;
  [key: string]: any;
}

/**
 * Specification output structure from the API
 */
export interface SpecificationOutput {
  tl_dr?: string;
  context?: SpecificationContext | any;
  success_metrics?: string[];
  functional_requirements?: any[];
  non_functional_requirements?: any[];
  architectural_decisions?: any[];
  data_models?: any[];
  interfaces?: any[];
  external_dependencies_summary?: any[];
  [key: string]: any; // Allow any additional fields
}

/**
 * Response from GET /api/v1/recipes/{recipe_id}/spec
 * Get spec generation progress
 */
export interface SpecStatusResponse {
  recipe_id: string;
  generation_status: "pending" | "processing" | "completed" | "failed" | "not_started";
  specification: SpecificationOutput | null;
  generated_at: string | null;
  error_message: string | null;
}

// ====== Legacy types kept for backward compatibility ======

/**
 * @deprecated Use SubmitRecipeAnswersRequest + TriggerSpecGenerationResponse
 */
export interface SubmitSpecGenerationRequest {
  recipe_id: string;
  qa_answers: Array<{
    question_id: string;
    answer: string;
  }>;
}

/**
 * @deprecated Use TriggerSpecGenerationResponse
 */
export interface SubmitSpecGenerationResponse {
  recipe_id: string;
  status: string;
}

// Plan generation types
export interface PlanGenerationRequest {
  recipe_id: string; // Only recipe_id is supported in new API
}

/**
 * Response from POST /api/v1/recipes/{recipe_id}/plan/generate
 */
export interface PlanSubmitResponse {
  recipe_id: string;
  status: string; // "pending"
  created_at: string;
}

/**
 * New API plan item structure
 */
export interface PhasedPlanItem {
  plan_item_id: string;
  order: number;
  title: string;
  description: string;
  estimated_effort: string; // "S" | "M" | "L" | "XL"
  dependencies: string[];
  status: string; // "pending" | "in_progress" | "completed" | "failed"
  created_at: string;
}

/**
 * New API phase structure
 */
export interface PlanPhase {
  phase_id: string;
  name: string;
  description: string;
  summary: string; // 100-200 word summary
  plan_items: PhasedPlanItem[];
  dependencies: string[];
  is_final: boolean;
  iteration: number;
}

/**
 * New API plan structure
 */
export interface PhasedPlan {
  phases: PlanPhase[];
  current_phase_index: number;
  validation_history: any[];
  is_complete: boolean;
  summary: string; // 200-300 word overall summary
  estimated_total_effort: string;
}

/**
 * Response from GET /api/v1/recipes/{recipe_id}/plan
 */
export interface PlanStatusResponse {
  recipe_id: string;
  generation_status: "pending" | "processing" | "completed" | "failed" | "not_started";
  plan: PhasedPlan | null;
  generated_at: string | null;
  error_message: string | null;
}

// Legacy types for backward compatibility
export interface FileReference {
  path: string;
  type: "create" | "modify" | "delete";
}

/**
 * @deprecated Legacy plan item structure. New API uses PhasedPlanItem.
 */
export interface PlanItem {
  id: string;
  item_number: number;
  order: number;
  title: string;
  detailed_objective: string;
  implementation_steps: string[];
  description: string;
  verification_criteria: string;
  files: FileReference[];
  context_handoff: any;
  reasoning: string;
  architecture: string;
}

/**
 * @deprecated Legacy response type. Plan items are now nested in phases within PlanStatusResponse.
 */
export interface PlanItemsResponse {
  plan_id: string;
  plan_items: PlanItem[];
  next_start: number | null;
}

// Task splitting types
export interface SubmitTaskSplittingRequest {
  plan_item_id: string;
}

export interface SubmitTaskSplittingResponse {
  task_splitting_id: string;
  status: "SUBMITTED" | "ERROR";
  message: string;
}

export interface TaskSplittingStatusResponse {
  task_splitting_id: string;
  plan_item_id: number;
  status: "SUBMITTED" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  current_step: number;
  codegen_status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
}

export interface TaskTestResult {
  name: string;
  status: "PENDING" | "PASSED" | "FAILED";
}

export interface TaskItem {
  id: string;
  title: string;
  file: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  tests: {
    total: number;
    passed: number;
  };
  testCode: string;
  testResults: TaskTestResult[];
  changes?: Array<{
    path: string;
    lang: string;
    content: string;
  }>;
  logs?: string[];
}

export interface TaskLayer {
  id: string;
  title: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  layer_order: number;
  tasks: TaskItem[];
}

export interface TaskSplittingItemsResponse {
  task_splitting_id: string;
  layers: TaskLayer[];
  next_layer_order: number | null;
}

/**
 * Response from recipe details endpoint (may not exist in new API)
 */
export interface QuestionAnswerPair {
  question_id: string;
  question: string;
  answer: string | null;
}

export interface RecipeDetailsResponse {
  recipe_id: string;
  project_id: string;
  user_prompt: string;
  repo_name?: string | null;
  branch_name?: string | null;
  questions_and_answers: QuestionAnswerPair[];
}

// Spec Editor Chat API types
export type SpecChatIntent =
  | "add"
  | "modify"
  | "remove"
  | "clarify"
  | "reorder"
  | "regenerate"
  | "explain";

export interface SpecChatEditHistoryItem {
  message: string;
  response: string;
}

export interface SpecChatRequest {
  message: string;
  edit_history?: SpecChatEditHistoryItem[];
}

export interface SpecChatResponse {
  intent: SpecChatIntent;
  message: string;
  explanation: string;
  spec_output: SpecOutput;
  undo_token: string;
  next_actions: string[];
  conflicts?: Array<{
    path: string;
    description: string;
    severity: "high" | "medium" | "low";
  }>;
  warnings?: string[];
  suggestions?: string[];
  regenerate_triggered: boolean;
}

export interface SpecUndoRequest {
  undo_token: string;
}

export interface SpecUndoResponse {
  spec_output: SpecOutput;
  message: string;
}
