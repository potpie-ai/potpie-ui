export type StepStatusValue = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

export type SpecGenerationStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | null;

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
  id?: string;
  question: string;
  answer: string;
}

export interface SpecPlanRequest {
  recipe_id: string;
  qa_answers: QAAnswer[];
}

export interface SpecPlanSubmitResponse {
  recipe_id: string;
  status: 'spec_generation_started' | 'spec_generation_in_progress';
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

