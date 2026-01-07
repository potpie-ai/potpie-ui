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

export interface SpecPlanRequest {
  recipe_id: string;
  qa_answers: QAAnswer[];
}

export interface SpecPlanSubmitResponse {
  recipe_id: string;
  status: "spec_generation_started" | "spec_generation_in_progress";
  message: string;
}

export interface SpecPlanStatusResponse {
  recipe_id: string;
  spec_generation_step_status: SpecGenerationStatus;
  step_index: number | null;
  progress_percent: number | null;
  step_statuses: Record<number, StepStatus> | null;
  spec_output: SpecOutput | null;
  celery_task_id: string | null;
}

export interface CreateRecipeRequest {
  project_id: string; // UUID, required
  user_prompt: string; // required
  user_requirements?: Record<string, any>; // Optional JSON object
}

export interface CreateRecipeResponse {
  recipe_id: string; // UUID
  project_id: string; // UUID
  status: string; // e.g., "created"
  message: string; // e.g., "Recipe created successfully. Use recipe_id for subsequent operations."
}

// New recipe codegen types
export interface CreateRecipeCodegenRequest {
  user_prompt: string;
  project_id: string;
  additional_links?: string[];
}

export interface CreateRecipeCodegenResponse {
  recipe_id: string;
  project_id: string;
  status: string;
  message: string;
}

export interface RecipeQuestion {
  id: string;
  question: string;
  options: string[];
  preferred_option?: string;
  allow_custom_answer: boolean;
  optional: boolean;
  order: number;
}

export interface RecipeQuestionsResponse {
  recipe_id: string;
  recipe_status: "PENDING_QUESTIONS" | "QUESTIONS_READY" | "ERROR";
  questions: RecipeQuestion[];
}

export interface SubmitSpecGenerationRequest {
  recipe_id: string;
  qa_answers: Array<{
    question_id: string;
    answer: string;
  }>;
}

export interface SubmitSpecGenerationResponse {
  recipe_id: string;
  spec_id: string;
  status: "SUBMITTED";
  message: string;
}

export interface SpecStatusResponse {
  recipe_id: string;
  spec_id: string;
  spec_gen_status: "IN_PROGRESS" | "COMPLETED" | "FAILED";
  step_index: number;
  progress_percent: number;
  step_statuses: Record<
    string,
    {
      status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
      message: string;
    }
  >;
  spec_output: SpecOutput | null;
}

// Plan generation types
export interface PlanGenerationRequest {
  spec_id?: string;
  recipe_id?: string;
}

export interface PlanSubmitResponse {
  plan_id: string;
  status: "SUBMITTED" | "ERROR";
  message: string;
}

export interface PlanStatusResponse {
  plan_id: string;
  spec_id: string;
  recipe_id: string;
  plan_gen_status: "SUBMITTED" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  current_step: number;
  progress_percent: number | null;
  total_items: number | null;
  items_completed: number | null;
  status_message: string;
  error_message: string | null;
}

export interface FileReference {
  path: string;
  type: "create" | "modify" | "delete";
}

export interface PlanItem {
  id: string;
  item_number: number;
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